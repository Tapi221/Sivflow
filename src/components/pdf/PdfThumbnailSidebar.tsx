import { cn } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
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
import { cancelPdfThumbnailRenders } from "./pdfThumbnailRenderQueue";
import {
  usePdfWorkspaceDocument,
  usePdfWorkspaceNavigation,
} from "./usePdfWorkspace";
import type { PageSize, PdfJsPage } from "./pdfViewerTypes";

const THUMBNAIL_CARD_WIDTH_PX = 92;
const THUMBNAIL_PAGE_BOX_WIDTH_PX = 82;
const THUMBNAIL_PAGE_BOX_HEIGHT_PX = 116;
const THUMBNAIL_GRID_GAP_PX = 8;
const INITIAL_RENDER_ROW_COUNT = 6;
const BACKGROUND_RENDER_BATCH_ROW_COUNT = 2;
const BACKGROUND_RENDER_INTERVAL_MS = 220;
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
const NAVIGATION_BACKGROUND_PAUSE_MS = 1_100;
const OPTIMISTIC_NAVIGATION_CLEAR_MS = 1_600;

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

const arePageSizesEqual = (left?: PageSize, right?: PageSize) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return !left && !right;
  }

  return left.width === right.width && left.height === right.height;
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

interface PdfThumbnailPagePreviewProps {
  documentKey: string;
  pageNumber: number;
  eagerRender: boolean;
  renderPriority: number;
  renderVersion: number;
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
  renderVersion,
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
          renderVersion={renderVersion}
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
    left.renderVersion === right.renderVersion &&
    left.observerRoot === right.observerRoot &&
    left.acquirePage === right.acquirePage &&
    left.onPageSize === right.onPageSize &&
    arePageSizesEqual(left.baseSize, right.baseSize),
);

interface PdfThumbnailCardContentProps {
  documentKey: string;
  pageNumber: number;
  eagerRender: boolean;
  renderPriority: number;
  renderVersion: number;
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
  renderVersion,
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
          "overflow-hidden rounded-xl border bg-white p-1 shadow-sm",
          isActive
            ? "border-primary-500 ring-2 ring-primary-500/20"
            : "border-slate-200",
          isDragging && "shadow-lg",
        )}
      >
        <PdfThumbnailPagePreview
          documentKey={documentKey}
          pageNumber={pageNumber}
          eagerRender={eagerRender}
          renderPriority={renderPriority}
          renderVersion={renderVersion}
          baseSize={baseSize}
          observerRoot={observerRoot}
          acquirePage={acquirePage}
          onPageSize={onPageSize}
        />
      </div>

      <div
        className={cn(
          "pt-1 text-center text-[11px] leading-4",
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
    left.renderVersion === right.renderVersion &&
    left.isActive === right.isActive &&
    left.isDragging === right.isDragging &&
    left.observerRoot === right.observerRoot &&
    left.acquirePage === right.acquirePage &&
    left.onPageSize === right.onPageSize &&
    arePageSizesEqual(left.baseSize, right.baseSize),
);

interface SortablePdfThumbnailTileProps extends PdfThumbnailCardContentProps {
  onPreviewNavigation: (pageNumber: number) => void;
  onOpenPage: (pageNumber: number) => void;
}

const SortablePdfThumbnailTileComponent = ({
  pageNumber,
  onPreviewNavigation,
  onOpenPage,
  ...contentProps
}: SortablePdfThumbnailTileProps) => {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: createSortableId(pageNumber),
  });

  const handlePreviewPointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      onPreviewNavigation(pageNumber);
    },
    [onPreviewNavigation, pageNumber],
  );

  const handleClick = useCallback(() => {
    onOpenPage(pageNumber);
  }, [onOpenPage, pageNumber]);

  const stopDragHandleClickPropagation = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
    },
    [],
  );

  return (
    <div
      ref={setNodeRef}
      className="relative shrink-0"
      style={{
        width: `${THUMBNAIL_CARD_WIDTH_PX}px`,
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        zIndex: isDragging ? 10 : 1,
        position: "relative",
        willChange: isDragging ? "transform" : undefined,
      }}
    >
      <button
        type="button"
        aria-label={`ページ ${pageNumber} を開く`}
        className={cn(
          "block w-full select-none rounded-xl text-left outline-none",
          "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500/40",
        )}
        onPointerDown={handlePreviewPointerDown}
        onClick={handleClick}
      >
        <PdfThumbnailCardContent
          {...contentProps}
          pageNumber={pageNumber}
          isDragging={isDragging}
        />
      </button>

      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`ページ ${pageNumber} をドラッグして順序を変更`}
        className={cn(
          "absolute right-1 top-1 z-10 flex h-6 w-6 touch-none select-none items-center justify-center rounded-md",
          "border border-slate-200 bg-white/95 text-slate-400 shadow-sm backdrop-blur-sm",
          "cursor-grab outline-none transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-primary-500/40",
          isDragging && "cursor-grabbing text-slate-700",
        )}
        {...attributes}
        {...listeners}
        onClick={stopDragHandleClickPropagation}
      >
        <span aria-hidden="true" className="grid grid-cols-2 gap-0.5">
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
        </span>
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
    left.renderVersion === right.renderVersion &&
    left.isActive === right.isActive &&
    left.observerRoot === right.observerRoot &&
    left.acquirePage === right.acquirePage &&
    left.onPageSize === right.onPageSize &&
    left.onPreviewNavigation === right.onPreviewNavigation &&
    left.onOpenPage === right.onOpenPage &&
    arePageSizesEqual(left.baseSize, right.baseSize),
);

export const PdfThumbnailSidebar = () => {
  const {
    documentController,
    sourceUnavailable,
    normalizedThumbnailOrder,
    reorderThumbnailOrder,
  } = usePdfWorkspaceDocument();
  const { currentPage, setCurrentPage, scrollToPage } =
    usePdfWorkspaceNavigation();

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
  const [gridHostElement, setGridHostElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [availableGridWidth, setAvailableGridWidth] = useState(0);
  const [eagerRenderItemCount, setEagerRenderItemCount] = useState(0);
  const [pendingNavigationPage, setPendingNavigationPage] = useState<
    number | null
  >(null);
  const [isNavigationPriorityMode, setIsNavigationPriorityMode] =
    useState(false);
  const [renderVersion, setRenderVersion] = useState(0);

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

  const normalizePageNumber = useCallback(
    (pageNumber: number) => {
      return Math.min(
        Math.max(1, Math.trunc(pageNumber)),
        Math.max(1, numPages),
      );
    },
    [numPages],
  );

  const enterNavigationPriorityMode = useCallback(() => {
    cancelPdfThumbnailRenders({
      maxPriority: INITIAL_PAGE_RENDER_PRIORITY,
      includeActive: true,
    });
    setRenderVersion((previousVersion) => previousVersion + 1);
    clearResumeBackgroundRenderTimer();
    setIsNavigationPriorityMode(true);

    resumeBackgroundRenderTimerRef.current = window.setTimeout(() => {
      resumeBackgroundRenderTimerRef.current = null;
      setIsNavigationPriorityMode(false);
      setRenderVersion((previousVersion) => previousVersion + 1);
    }, NAVIGATION_BACKGROUND_PAUSE_MS);
  }, [clearResumeBackgroundRenderTimer]);

  const previewNavigationPage = useCallback(
    (pageNumber: number) => {
      const normalizedPageNumber = normalizePageNumber(pageNumber);
      setPendingNavigationPage(normalizedPageNumber);
    },
    [normalizePageNumber],
  );

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
    };
  }, [clearOptimisticNavigationTimer, clearResumeBackgroundRenderTimer]);

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
      isNavigationPriorityMode
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

  const sortableItems = useMemo(() => {
    return normalizedThumbnailOrder.map((pageNumber) => createSortableId(pageNumber));
  }, [normalizedThumbnailOrder]);

  const releaseDragCursor = useCallback(() => {
    releaseDragCursorRef.current?.();
    releaseDragCursorRef.current = null;
  }, []);

  const handleDragStart = useCallback(() => {
    releaseDragCursorRef.current?.();
    releaseDragCursorRef.current = applyDocumentDragCursor();
  }, []);

  const handleDragCancel = useCallback(() => {
    releaseDragCursor();
  }, [releaseDragCursor]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activePageNumber = parseSortableId(event.active.id);
      const overPageNumber = event.over ? parseSortableId(event.over.id) : null;

      releaseDragCursor();

      if (
        activePageNumber === null ||
        overPageNumber === null ||
        activePageNumber === overPageNumber
      ) {
        return;
      }

      reorderThumbnailOrder(activePageNumber, overPageNumber);
    },
    [releaseDragCursor, reorderThumbnailOrder],
  );

  const openPage = useCallback(
    (pageNumber: number) => {
      const normalizedPageNumber = normalizePageNumber(pageNumber);

      enterNavigationPriorityMode();
      clearOptimisticNavigationTimer();
      setPendingNavigationPage(normalizedPageNumber);
      setCurrentPage(normalizedPageNumber);
      scrollToPage(normalizedPageNumber);

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
      clearOptimisticNavigationTimer,
      enterNavigationPriorityMode,
      normalizePageNumber,
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
                      const isCurrentPage = pageNumber === currentPage;
                      const isNavigationPage =
                        pendingNavigationPage === pageNumber;
                      const isActive = isCurrentPage || isNavigationPage;
                      const eagerRender =
                        isActive ||
                        pageIndex < initialRenderCount ||
                        (!isNavigationPriorityMode &&
                          pageIndex < eagerRenderItemCount);
                      const tileRenderVersion =
                        isActive || !isNavigationPriorityMode ? renderVersion : 0;

                      return (
                        <SortablePdfThumbnailTile
                          key={pageNumber}
                          documentKey={documentKey}
                          pageNumber={pageNumber}
                          eagerRender={eagerRender}
                          renderPriority={resolveRenderPriority({
                            isNavigationPage,
                            isCurrentPage,
                            pageIndex,
                            initialRenderCount,
                            eagerRenderItemCount,
                          })}
                          renderVersion={tileRenderVersion}
                          baseSize={pageSizes[pageNumber]}
                          isActive={isActive}
                          observerRoot={scrollRootRef.current}
                          acquirePage={acquirePage}
                          onPageSize={setPageSize}
                          onPreviewNavigation={previewNavigationPage}
                          onOpenPage={openPage}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </div>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
};
