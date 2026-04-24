import { cn } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { PdfThumbnailPage } from "./PdfThumbnailPage";
import { cancelPendingPdfThumbnailRenders } from "./pdfThumbnailRenderQueue";
import { usePdfWorkspace } from "./usePdfWorkspace";
import type { PageSize, PdfJsPage } from "./pdfViewerTypes";

const THUMBNAIL_CARD_WIDTH_PX = 92;
const THUMBNAIL_PAGE_BOX_WIDTH_PX = 82;
const THUMBNAIL_PAGE_BOX_HEIGHT_PX = 116;
const THUMBNAIL_GRID_GAP_PX = 8;
const INITIAL_RENDER_ROW_COUNT = 6;
const BACKGROUND_RENDER_BATCH_ROW_COUNT = 2;
const BACKGROUND_RENDER_INTERVAL_MS = 180;
const MAX_BACKGROUND_RENDER_COUNT = 96;
const THUMBNAIL_INTERSECTION_ROOT_MARGIN = "360px 0px 720px 0px";
const MIN_THUMBNAIL_COLUMNS = 2;
const MAX_THUMBNAIL_COLUMNS = 4;
const NAVIGATION_PAGE_RENDER_PRIORITY = 1_100;
const CURRENT_PAGE_RENDER_PRIORITY = 1_000;
const INTERSECTING_PAGE_RENDER_PRIORITY = 900;
const INITIAL_PAGE_RENDER_PRIORITY = 700;
const BACKGROUND_PAGE_RENDER_PRIORITY = 120;
const DRAG_ACTIVATION_DISTANCE_PX = 1;
const DRAG_CLICK_SUPPRESSION_MS = 220;
const NAVIGATION_BACKGROUND_PAUSE_MS = 900;
const OPTIMISTIC_NAVIGATION_CLEAR_MS = 1_400;
const POINTER_PREVIEW_CLEAR_MS = 650;
const DRAG_PREVIEW_FALLBACK_IMAGE_WIDTH_PX = THUMBNAIL_PAGE_BOX_WIDTH_PX;
const DRAG_PREVIEW_FALLBACK_IMAGE_HEIGHT_PX = THUMBNAIL_PAGE_BOX_HEIGHT_PX;

const getRequiredGridWidth = (columnCount: number) => {
  return (
    THUMBNAIL_CARD_WIDTH_PX * columnCount +
    THUMBNAIL_GRID_GAP_PX * Math.max(0, columnCount - 1)
  );
};

const resolveColumnCount = (availableWidthPx: number) => {
  if (!Number.isFinite(availableWidthPx) || availableWidthPx <= 0) {
    return MIN_THUMBNAIL_COLUMNS;
  }

  for (
    let candidateColumnCount = MAX_THUMBNAIL_COLUMNS;
    candidateColumnCount >= MIN_THUMBNAIL_COLUMNS;
    candidateColumnCount -= 1
  ) {
    if (availableWidthPx >= getRequiredGridWidth(candidateColumnCount)) {
      return candidateColumnCount;
    }
  }

  return MIN_THUMBNAIL_COLUMNS;
};

const resolveInitialRenderCount = ({
  columnCount,
  totalCount,
}: {
  columnCount: number;
  totalCount: number;
}) => {
  return Math.min(totalCount, columnCount * INITIAL_RENDER_ROW_COUNT);
};

const resolveBackgroundRenderTarget = (totalCount: number) => {
  return Math.min(totalCount, MAX_BACKGROUND_RENDER_COUNT);
};

const resolveBackgroundBatchSize = (columnCount: number) => {
  return Math.max(columnCount, columnCount * BACKGROUND_RENDER_BATCH_ROW_COUNT);
};

const createSortableId = (pageNumber: number) => `page:${pageNumber}`;

const parseSortableId = (value: string | number) => {
  const normalizedValue = String(value);
  if (!normalizedValue.startsWith("page:")) {
    return null;
  }

  const rawPageNumber = Number.parseInt(normalizedValue.slice(5), 10);
  if (!Number.isFinite(rawPageNumber)) {
    return null;
  }

  return Math.max(1, Math.trunc(rawPageNumber));
};

const normalizePageNumber = (pageNumber: number, numPages: number) => {
  const safeMaxPage = Math.max(1, Math.trunc(numPages));
  if (!Number.isFinite(pageNumber)) {
    return 1;
  }

  return Math.min(safeMaxPage, Math.max(1, Math.trunc(pageNumber)));
};

const normalizeSpreadStartPage = (pageNumber: number, numPages: number) => {
  const normalizedPageNumber = normalizePageNumber(pageNumber, numPages);
  return normalizedPageNumber - ((normalizedPageNumber - 1) % 2);
};

const buildActiveThumbnailPageSet = ({
  anchorPage,
  alignedCurrentPage,
  currentPage,
  numPages,
  pageLayoutMode,
}: {
  anchorPage: number | null;
  alignedCurrentPage: number;
  currentPage: number;
  numPages: number;
  pageLayoutMode: "single" | "double";
}) => {
  if (numPages <= 0) {
    return new Set<number>();
  }

  if (pageLayoutMode !== "double") {
    return new Set([normalizePageNumber(anchorPage ?? currentPage, numPages)]);
  }

  const spreadStartPage = normalizeSpreadStartPage(
    anchorPage ?? alignedCurrentPage ?? currentPage,
    numPages,
  );
  const activePages = new Set<number>([spreadStartPage]);

  if (spreadStartPage + 1 <= numPages) {
    activePages.add(spreadStartPage + 1);
  }

  return activePages;
};

const readInteractionClock = () => {
  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
};

const arePageSizesEqual = (left?: PageSize, right?: PageSize) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return !left && !right;
  }

  return left.width === right.width && left.height === right.height;
};

const resolveRenderPriority = ({
  isNavigationPage,
  isCurrentPage,
  pageIndex,
  initialRenderCount,
  eagerRenderItemCount,
}: {
  isNavigationPage: boolean;
  isCurrentPage: boolean;
  pageIndex: number;
  initialRenderCount: number;
  eagerRenderItemCount: number;
}) => {
  if (isNavigationPage) {
    return NAVIGATION_PAGE_RENDER_PRIORITY;
  }

  if (isCurrentPage) {
    return CURRENT_PAGE_RENDER_PRIORITY;
  }

  if (pageIndex < initialRenderCount) {
    return INITIAL_PAGE_RENDER_PRIORITY - pageIndex;
  }

  if (pageIndex < eagerRenderItemCount) {
    return BACKGROUND_PAGE_RENDER_PRIORITY - pageIndex / 1_000;
  }

  return 0;
};

const mergeUniquePageNumbers = (...pageNumberCollections: number[][]) => {
  const pageNumbers = new Set<number>();

  pageNumberCollections.forEach((collection) => {
    collection.forEach((pageNumber) => {
      if (Number.isFinite(pageNumber) && pageNumber > 0) {
        pageNumbers.add(Math.trunc(pageNumber));
      }
    });
  });

  return Array.from(pageNumbers);
};

const applyDocumentDragCursor = () => {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  const body = document.body;
  const documentElement = document.documentElement;
  const previousBodyCursor = body.style.cursor;
  const previousDocumentElementCursor = documentElement.style.cursor;

  body.style.cursor = "grabbing";
  documentElement.style.cursor = "grabbing";

  return () => {
    body.style.cursor = previousBodyCursor;
    documentElement.style.cursor = previousDocumentElementCursor;
  };
};

interface PdfThumbnailDragPreviewState {
  pageNumber: number;
  imageDataUrl: string;
  imageCssWidthPx: number;
  imageCssHeightPx: number;
}

const resolveElementSizePx = ({
  element,
  fallbackWidthPx,
  fallbackHeightPx,
}: {
  element: HTMLElement;
  fallbackWidthPx: number;
  fallbackHeightPx: number;
}) => {
  const rect = element.getBoundingClientRect();
  const width = rect.width || element.offsetWidth || fallbackWidthPx;
  const height = rect.height || element.offsetHeight || fallbackHeightPx;

  return {
    width: Number.isFinite(width) && width > 0 ? width : fallbackWidthPx,
    height: Number.isFinite(height) && height > 0 ? height : fallbackHeightPx,
  };
};

const captureThumbnailCanvasPreview = (
  pageNumber: number,
): PdfThumbnailDragPreviewState | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const tile = document.querySelector<HTMLElement>(
    `[data-pdf-thumbnail-tile="${pageNumber}"]`,
  );
  const canvas = tile?.querySelector<HTMLCanvasElement>("canvas") ?? null;

  if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
    return null;
  }

  try {
    const imageDataUrl = canvas.toDataURL("image/png");
    if (!imageDataUrl || imageDataUrl === "data:,") {
      return null;
    }

    const imageSize = resolveElementSizePx({
      element: canvas,
      fallbackWidthPx: DRAG_PREVIEW_FALLBACK_IMAGE_WIDTH_PX,
      fallbackHeightPx: DRAG_PREVIEW_FALLBACK_IMAGE_HEIGHT_PX,
    });

    return {
      pageNumber,
      imageDataUrl,
      imageCssWidthPx: imageSize.width,
      imageCssHeightPx: imageSize.height,
    };
  } catch {
    return null;
  }
};

interface PdfThumbnailPagePreviewProps {
  documentKey: string;
  pageNumber: number;
  eagerRender: boolean;
  renderPriority: number;
  baseSize?: PageSize;
  observerRoot: HTMLDivElement | null;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
}

type ThumbnailRenderTrigger = "idle" | "eager" | "intersection";

const PdfThumbnailPagePreviewComponent = ({
  documentKey,
  pageNumber,
  eagerRender,
  renderPriority,
  baseSize,
  observerRoot,
  acquirePage,
  onPageSize,
}: PdfThumbnailPagePreviewProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [renderTrigger, setRenderTrigger] = useState<ThumbnailRenderTrigger>(
    eagerRender ? "eager" : "idle",
  );

  useEffect(() => {
    if (!eagerRender) {
      return;
    }

    setRenderTrigger((previousTrigger) => {
      return previousTrigger === "idle" ? "eager" : previousTrigger;
    });
  }, [eagerRender]);

  useEffect(() => {
    if (renderTrigger !== "idle") {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setRenderTrigger("intersection");
      return;
    }

    const node = hostRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => {
          return entry.isIntersecting || entry.intersectionRatio > 0;
        });

        if (!isIntersecting) {
          return;
        }

        setRenderTrigger("intersection");
        observer.disconnect();
      },
      {
        root: observerRoot,
        rootMargin: THUMBNAIL_INTERSECTION_ROOT_MARGIN,
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [observerRoot, renderTrigger]);

  const shouldRender = renderTrigger !== "idle";
  const effectiveRenderPriority =
    renderTrigger === "intersection"
      ? Math.max(renderPriority, INTERSECTING_PAGE_RENDER_PRIORITY)
      : renderPriority;

  return (
    <div
      ref={hostRef}
      style={{
        width: `${THUMBNAIL_PAGE_BOX_WIDTH_PX}px`,
        height: `${THUMBNAIL_PAGE_BOX_HEIGHT_PX}px`,
      }}
    >
      {shouldRender ? (
        <PdfThumbnailPage
          documentKey={documentKey}
          pageNumber={pageNumber}
          boxWidthPx={THUMBNAIL_PAGE_BOX_WIDTH_PX}
          boxHeightPx={THUMBNAIL_PAGE_BOX_HEIGHT_PX}
          baseSize={baseSize}
          renderPriority={effectiveRenderPriority}
          acquirePage={acquirePage}
          onPageSize={onPageSize}
        />
      ) : (
        <div
          className="rounded-lg bg-slate-100"
          style={{
            width: `${THUMBNAIL_PAGE_BOX_WIDTH_PX}px`,
            height: `${THUMBNAIL_PAGE_BOX_HEIGHT_PX}px`,
          }}
        />
      )}
    </div>
  );
};

const PdfThumbnailPagePreview = memo(
  PdfThumbnailPagePreviewComponent,
  (left, right) =>
    left.documentKey === right.documentKey &&
    left.pageNumber === right.pageNumber &&
    left.eagerRender === right.eagerRender &&
    left.renderPriority === right.renderPriority &&
    arePageSizesEqual(left.baseSize, right.baseSize) &&
    left.observerRoot === right.observerRoot &&
    left.acquirePage === right.acquirePage &&
    left.onPageSize === right.onPageSize,
);

PdfThumbnailPagePreview.displayName = "PdfThumbnailPagePreview";

interface PdfThumbnailCardContentProps {
  documentKey: string;
  pageNumber: number;
  eagerRender: boolean;
  renderPriority: number;
  baseSize?: PageSize;
  isActive: boolean;
  isDragging?: boolean;
  observerRoot: HTMLDivElement | null;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
}

const PdfThumbnailCardContentComponent = ({
  documentKey,
  pageNumber,
  eagerRender,
  renderPriority,
  baseSize,
  isActive,
  isDragging = false,
  observerRoot,
  acquirePage,
  onPageSize,
}: PdfThumbnailCardContentProps) => {
  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-white p-1 shadow-sm transition-[border-color,box-shadow,opacity] duration-75",
          isActive
            ? "border-primary-500 ring-2 ring-primary-500/20"
            : "border-slate-200",
          isDragging && "opacity-30 shadow-none",
        )}
      >
        <PdfThumbnailPagePreview
          documentKey={documentKey}
          pageNumber={pageNumber}
          eagerRender={eagerRender}
          renderPriority={renderPriority}
          baseSize={baseSize}
          observerRoot={observerRoot}
          acquirePage={acquirePage}
          onPageSize={onPageSize}
        />
      </div>

      <div
        className={cn(
          "pt-1 text-center text-[11px] leading-4 transition-colors duration-75",
          isActive ? "font-semibold text-slate-900" : "text-slate-500",
        )}
      >
        {pageNumber}
      </div>
    </>
  );
};

const PdfThumbnailCardContent = memo(
  PdfThumbnailCardContentComponent,
  (left, right) =>
    left.documentKey === right.documentKey &&
    left.pageNumber === right.pageNumber &&
    left.eagerRender === right.eagerRender &&
    left.renderPriority === right.renderPriority &&
    arePageSizesEqual(left.baseSize, right.baseSize) &&
    left.isActive === right.isActive &&
    left.isDragging === right.isDragging &&
    left.observerRoot === right.observerRoot &&
    left.acquirePage === right.acquirePage &&
    left.onPageSize === right.onPageSize,
);

PdfThumbnailCardContent.displayName = "PdfThumbnailCardContent";

interface SortablePdfThumbnailTileProps extends PdfThumbnailCardContentProps {
  hasDragOverlayPreview: boolean;
  onPreviewPage: (pageNumber: number) => void;
  onOpenPage: (pageNumber: number) => void;
  shouldSuppressClick: () => boolean;
}

const SortablePdfThumbnailTileComponent = ({
  pageNumber,
  hasDragOverlayPreview,
  onPreviewPage,
  onOpenPage,
  shouldSuppressClick,
  ...contentProps
}: SortablePdfThumbnailTileProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: createSortableId(pageNumber),
  });

  const handlePointerDownCapture = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      onPreviewPage(pageNumber);
    },
    [onPreviewPage, pageNumber],
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (shouldSuppressClick()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      onOpenPage(pageNumber);
    },
    [onOpenPage, pageNumber, shouldSuppressClick],
  );

  return (
    <div
      ref={setNodeRef}
      className="shrink-0"
      style={{
        width: `${THUMBNAIL_CARD_WIDTH_PX}px`,
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        zIndex: isDragging ? 0 : 1,
        position: "relative",
        willChange: "transform",
        contain: "layout paint style",
      }}
    >
      <button
        type="button"
        aria-label={`ページ ${pageNumber} を開く。ドラッグで順序を変更`}
        data-pdf-thumbnail-tile={pageNumber}
        className={cn(
          "block w-full touch-none select-none rounded-xl text-left outline-none",
          "cursor-grab focus-visible:ring-2 focus-visible:ring-primary-500/40",
          isDragging && "cursor-grabbing",
        )}
        {...attributes}
        {...listeners}
        onPointerDownCapture={handlePointerDownCapture}
        onClick={handleClick}
      >
        <PdfThumbnailCardContent
          {...contentProps}
          pageNumber={pageNumber}
          isDragging={isDragging && hasDragOverlayPreview}
        />
      </button>
    </div>
  );
};

const SortablePdfThumbnailTile = memo(
  SortablePdfThumbnailTileComponent,
  (left, right) =>
    left.documentKey === right.documentKey &&
    left.pageNumber === right.pageNumber &&
    left.eagerRender === right.eagerRender &&
    left.renderPriority === right.renderPriority &&
    arePageSizesEqual(left.baseSize, right.baseSize) &&
    left.isActive === right.isActive &&
    left.hasDragOverlayPreview === right.hasDragOverlayPreview &&
    left.observerRoot === right.observerRoot &&
    left.acquirePage === right.acquirePage &&
    left.onPageSize === right.onPageSize &&
    left.onPreviewPage === right.onPreviewPage &&
    left.onOpenPage === right.onOpenPage &&
    left.shouldSuppressClick === right.shouldSuppressClick,
);

SortablePdfThumbnailTile.displayName = "SortablePdfThumbnailTile";

interface PdfThumbnailDragOverlayProps {
  preview: PdfThumbnailDragPreviewState;
  isActive: boolean;
}

const PdfThumbnailDragOverlay = memo(
  ({ preview, isActive }: PdfThumbnailDragOverlayProps) => {
    return (
      <div
        className="pointer-events-none select-none"
        style={{ width: `${THUMBNAIL_CARD_WIDTH_PX}px` }}
      >
        <div
          className={cn(
            "overflow-hidden rounded-xl border bg-white p-1 shadow-lg",
            isActive ? "border-primary-500" : "border-slate-200",
          )}
        >
          <div
            className="flex items-center justify-center overflow-hidden rounded-lg bg-slate-100"
            style={{
              width: `${THUMBNAIL_PAGE_BOX_WIDTH_PX}px`,
              height: `${THUMBNAIL_PAGE_BOX_HEIGHT_PX}px`,
            }}
          >
            <img
              alt=""
              aria-hidden="true"
              draggable={false}
              src={preview.imageDataUrl}
              className="block select-none"
              style={{
                width: `${preview.imageCssWidthPx}px`,
                height: `${preview.imageCssHeightPx}px`,
              }}
            />
          </div>
        </div>
        <div
          className={cn(
            "pt-1 text-center text-[11px] leading-4",
            isActive ? "font-semibold text-slate-900" : "text-slate-500",
          )}
        >
          {preview.pageNumber}
        </div>
      </div>
    );
  },
);

PdfThumbnailDragOverlay.displayName = "PdfThumbnailDragOverlay";

export const PdfThumbnailSidebar = () => {
  const {
    documentController,
    sourceUnavailable,
    currentPage,
    alignedCurrentPage,
    pageLayoutMode,
    normalizedThumbnailOrder,
    setCurrentPage,
    scrollToPage,
    reorderThumbnailOrder,
  } = usePdfWorkspace();

  const {
    acquirePage,
    doc,
    documentKey,
    error,
    loading,
    numPages,
    pageSizes,
    prefetchPageResources,
    setPageSize,
  } = documentController;

  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const releaseDragCursorRef = useRef<(() => void) | null>(null);
  const resumeBackgroundRenderTimerRef = useRef<number | null>(null);
  const clearOptimisticNavigationTimerRef = useRef<number | null>(null);
  const clearPointerPreviewTimerRef = useRef<number | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [gridHostElement, setGridHostElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [availableGridWidth, setAvailableGridWidth] = useState(0);
  const [eagerRenderItemCount, setEagerRenderItemCount] = useState(0);
  const [pendingNavigationPage, setPendingNavigationPage] = useState<
    number | null
  >(null);
  const [pointerPreviewPage, setPointerPreviewPage] = useState<number | null>(
    null,
  );
  const [activeDragPage, setActiveDragPage] = useState<number | null>(null);
  const [dragPreview, setDragPreview] =
    useState<PdfThumbnailDragPreviewState | null>(null);
  const [isNavigationPriorityMode, setIsNavigationPriorityMode] =
    useState(false);

  const handleGridHostRef = useCallback((node: HTMLDivElement | null) => {
    setGridHostElement((previousNode) =>
      previousNode === node ? previousNode : node,
    );
  }, []);

  const clearResumeBackgroundRenderTimer = useCallback(() => {
    if (resumeBackgroundRenderTimerRef.current !== null) {
      window.clearTimeout(resumeBackgroundRenderTimerRef.current);
      resumeBackgroundRenderTimerRef.current = null;
    }
  }, []);

  const clearOptimisticNavigationTimer = useCallback(() => {
    if (clearOptimisticNavigationTimerRef.current !== null) {
      window.clearTimeout(clearOptimisticNavigationTimerRef.current);
      clearOptimisticNavigationTimerRef.current = null;
    }
  }, []);

  const clearPointerPreviewTimer = useCallback(() => {
    if (clearPointerPreviewTimerRef.current !== null) {
      window.clearTimeout(clearPointerPreviewTimerRef.current);
      clearPointerPreviewTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!gridHostElement) {
      setAvailableGridWidth(0);
      return;
    }

    const updateWidth = () => {
      setAvailableGridWidth(gridHostElement.clientWidth);
    };

    const observer = new ResizeObserver(updateWidth);
    observer.observe(gridHostElement);
    updateWidth();

    return () => observer.disconnect();
  }, [gridHostElement]);

  useEffect(() => {
    return () => {
      releaseDragCursorRef.current?.();
      releaseDragCursorRef.current = null;
      clearResumeBackgroundRenderTimer();
      clearOptimisticNavigationTimer();
      clearPointerPreviewTimer();
    };
  }, [
    clearOptimisticNavigationTimer,
    clearPointerPreviewTimer,
    clearResumeBackgroundRenderTimer,
  ]);

  useEffect(() => {
    if (pendingNavigationPage === null) {
      return;
    }

    if (currentPage === pendingNavigationPage) {
      setPendingNavigationPage(null);
      clearOptimisticNavigationTimer();
    }
  }, [clearOptimisticNavigationTimer, currentPage, pendingNavigationPage]);

  const columnCount = useMemo(() => {
    return resolveColumnCount(availableGridWidth);
  }, [availableGridWidth]);

  const totalThumbnailCount = normalizedThumbnailOrder.length;
  const initialRenderCount = useMemo(() => {
    return resolveInitialRenderCount({
      columnCount,
      totalCount: totalThumbnailCount,
    });
  }, [columnCount, totalThumbnailCount]);

  const backgroundRenderTarget = useMemo(() => {
    return resolveBackgroundRenderTarget(totalThumbnailCount);
  }, [totalThumbnailCount]);

  const hasBlockingStatus =
    Boolean(error) || sourceUnavailable || (loading && numPages === 0);

  const activeThumbnailPages = useMemo(() => {
    return buildActiveThumbnailPageSet({
      anchorPage:
        pendingNavigationPage ??
        (activeDragPage === null ? pointerPreviewPage : null),
      alignedCurrentPage,
      currentPage,
      numPages,
      pageLayoutMode,
    });
  }, [
    activeDragPage,
    alignedCurrentPage,
    currentPage,
    numPages,
    pageLayoutMode,
    pendingNavigationPage,
    pointerPreviewPage,
  ]);

  useEffect(() => {
    setEagerRenderItemCount((previousCount) => {
      if (!doc || hasBlockingStatus || totalThumbnailCount === 0) {
        return 0;
      }

      return Math.min(
        totalThumbnailCount,
        Math.max(previousCount, initialRenderCount),
      );
    });
  }, [doc, hasBlockingStatus, initialRenderCount, totalThumbnailCount]);

  useEffect(() => {
    if (
      !doc ||
      hasBlockingStatus ||
      isNavigationPriorityMode ||
      activeDragPage !== null ||
      eagerRenderItemCount >= backgroundRenderTarget
    ) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setEagerRenderItemCount((previousCount) => {
        return Math.min(
          backgroundRenderTarget,
          previousCount + resolveBackgroundBatchSize(columnCount),
        );
      });
    }, BACKGROUND_RENDER_INTERVAL_MS);

    return () => window.clearTimeout(timerId);
  }, [
    activeDragPage,
    backgroundRenderTarget,
    columnCount,
    doc,
    eagerRenderItemCount,
    hasBlockingStatus,
    isNavigationPriorityMode,
  ]);

  const prefetchPageNumbers = useMemo(() => {
    if (totalThumbnailCount === 0) {
      return [];
    }

    const basePrefetchCount = Math.min(
      totalThumbnailCount,
      isNavigationPriorityMode || activeDragPage !== null
        ? initialRenderCount
        : Math.max(eagerRenderItemCount, initialRenderCount) +
            resolveBackgroundBatchSize(columnCount),
    );
    const basePrefetchPageNumbers = normalizedThumbnailOrder.slice(
      0,
      basePrefetchCount,
    );
    const interactionPageNumbers = [pendingNavigationPage, currentPage].filter(
      (pageNumber): pageNumber is number => typeof pageNumber === "number",
    );

    return mergeUniquePageNumbers(basePrefetchPageNumbers, interactionPageNumbers);
  }, [
    activeDragPage,
    columnCount,
    currentPage,
    eagerRenderItemCount,
    initialRenderCount,
    isNavigationPriorityMode,
    normalizedThumbnailOrder,
    pendingNavigationPage,
    totalThumbnailCount,
  ]);

  useEffect(() => {
    if (!doc || hasBlockingStatus || prefetchPageNumbers.length === 0) {
      return;
    }

    prefetchPageResources(prefetchPageNumbers);
  }, [doc, hasBlockingStatus, prefetchPageNumbers, prefetchPageResources]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space"],
      },
    }),
  );

  const dndMeasuring = useMemo(
    () => ({
      droppable: {
        strategy: MeasuringStrategy.BeforeDragging,
      },
    }),
    [],
  );

  const sortableItems = useMemo(() => {
    return normalizedThumbnailOrder.map((pageNumber) => createSortableId(pageNumber));
  }, [normalizedThumbnailOrder]);

  const releaseDragCursor = useCallback(() => {
    releaseDragCursorRef.current?.();
    releaseDragCursorRef.current = null;
  }, []);

  const suppressFollowingClick = useCallback(() => {
    suppressClickUntilRef.current =
      readInteractionClock() + DRAG_CLICK_SUPPRESSION_MS;
  }, []);

  const shouldSuppressClick = useCallback(() => {
    return readInteractionClock() < suppressClickUntilRef.current;
  }, []);

  const previewPage = useCallback(
    (pageNumber: number) => {
      if (activeDragPage !== null) {
        return;
      }

      clearPointerPreviewTimer();
      setPointerPreviewPage((previousPage) =>
        previousPage === pageNumber ? previousPage : pageNumber,
      );

      clearPointerPreviewTimerRef.current = window.setTimeout(() => {
        clearPointerPreviewTimerRef.current = null;
        setPointerPreviewPage((previousPage) =>
          previousPage === pageNumber ? null : previousPage,
        );
      }, POINTER_PREVIEW_CLEAR_MS);
    },
    [activeDragPage, clearPointerPreviewTimer],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activePageNumber = parseSortableId(event.active.id);
      suppressFollowingClick();
      clearPointerPreviewTimer();
      setPointerPreviewPage(null);
      setActiveDragPage(activePageNumber);
      setDragPreview(
        activePageNumber === null
          ? null
          : captureThumbnailCanvasPreview(activePageNumber),
      );
      setIsNavigationPriorityMode(true);
      cancelPendingPdfThumbnailRenders({
        maxPriority: INITIAL_PAGE_RENDER_PRIORITY,
      });
      releaseDragCursorRef.current?.();
      releaseDragCursorRef.current = applyDocumentDragCursor();
    },
    [clearPointerPreviewTimer, suppressFollowingClick],
  );

  const handleDragCancel = useCallback(() => {
    suppressFollowingClick();
    releaseDragCursor();
    setActiveDragPage(null);
    setDragPreview(null);
    setIsNavigationPriorityMode(false);
  }, [releaseDragCursor, suppressFollowingClick]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activePageNumber = parseSortableId(event.active.id);
      const overPageNumber = event.over ? parseSortableId(event.over.id) : null;

      suppressFollowingClick();
      releaseDragCursor();
      setActiveDragPage(null);
      setDragPreview(null);
      setIsNavigationPriorityMode(false);

      if (
        activePageNumber === null ||
        overPageNumber === null ||
        activePageNumber === overPageNumber
      ) {
        return;
      }

      reorderThumbnailOrder(activePageNumber, overPageNumber);
    },
    [releaseDragCursor, reorderThumbnailOrder, suppressFollowingClick],
  );

  const openPage = useCallback(
    (pageNumber: number) => {
      if (activeDragPage !== null) {
        return;
      }

      const normalizedPageNumber = Math.min(
        Math.max(1, Math.trunc(pageNumber)),
        Math.max(1, numPages),
      );

      cancelPendingPdfThumbnailRenders({
        maxPriority: INITIAL_PAGE_RENDER_PRIORITY,
      });
      clearResumeBackgroundRenderTimer();
      clearOptimisticNavigationTimer();
      clearPointerPreviewTimer();
      setPointerPreviewPage(null);
      setPendingNavigationPage(normalizedPageNumber);
      setIsNavigationPriorityMode(true);
      setCurrentPage(normalizedPageNumber);
      scrollToPage(normalizedPageNumber);

      resumeBackgroundRenderTimerRef.current = window.setTimeout(() => {
        resumeBackgroundRenderTimerRef.current = null;
        setIsNavigationPriorityMode(false);
      }, NAVIGATION_BACKGROUND_PAUSE_MS);

      clearOptimisticNavigationTimerRef.current = window.setTimeout(() => {
        clearOptimisticNavigationTimerRef.current = null;
        setPendingNavigationPage((previousPageNumber) => {
          return previousPageNumber === normalizedPageNumber
            ? null
            : previousPageNumber;
        });
      }, OPTIMISTIC_NAVIGATION_CLEAR_MS);
    },
    [
      activeDragPage,
      clearOptimisticNavigationTimer,
      clearPointerPreviewTimer,
      clearResumeBackgroundRenderTimer,
      numPages,
      scrollToPage,
      setCurrentPage,
    ],
  );

  if (!doc || hasBlockingStatus) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRootRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-2 pb-2 pt-2">
          <div ref={handleGridHostRef} className="w-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              measuring={dndMeasuring}
              onDragStart={handleDragStart}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
            >
              <div className="flex justify-center">
                <SortableContext
                  items={sortableItems}
                  strategy={rectSortingStrategy}
                >
                  <div
                    className="inline-grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${columnCount}, ${THUMBNAIL_CARD_WIDTH_PX}px)`,
                    }}
                  >
                    {normalizedThumbnailOrder.map((pageNumber, pageIndex) => {
                      const isDisplayedSpreadPage =
                        activeThumbnailPages.has(pageNumber);
                      const isCurrentPage = pageNumber === currentPage;
                      const isNavigationPage =
                        pendingNavigationPage === pageNumber;
                      const isActive = isDisplayedSpreadPage;
                      const eagerRender =
                        pageIndex < eagerRenderItemCount ||
                        isDisplayedSpreadPage ||
                        isNavigationPage;

                      return (
                        <SortablePdfThumbnailTile
                          key={pageNumber}
                          documentKey={documentKey}
                          pageNumber={pageNumber}
                          eagerRender={eagerRender}
                          renderPriority={resolveRenderPriority({
                            isNavigationPage,
                            isCurrentPage: isDisplayedSpreadPage || isCurrentPage,
                            pageIndex,
                            initialRenderCount,
                            eagerRenderItemCount,
                          })}
                          baseSize={pageSizes[pageNumber]}
                          isActive={isActive}
                          hasDragOverlayPreview={
                            activeDragPage === pageNumber &&
                            dragPreview?.pageNumber === pageNumber
                          }
                          observerRoot={scrollRootRef.current}
                          acquirePage={acquirePage}
                          onPageSize={setPageSize}
                          onPreviewPage={previewPage}
                          onOpenPage={openPage}
                          shouldSuppressClick={shouldSuppressClick}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </div>

              <DragOverlay adjustScale={false} dropAnimation={null} zIndex={40}>
                {dragPreview ? (
                  <PdfThumbnailDragOverlay
                    preview={dragPreview}
                    isActive={activeThumbnailPages.has(dragPreview.pageNumber)}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
};
