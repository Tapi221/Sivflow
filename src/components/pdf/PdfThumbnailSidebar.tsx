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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfThumbnailPage } from "./PdfThumbnailPage";
import { usePdfWorkspace } from "./usePdfWorkspace";
import type { PageSize, PdfJsPage } from "./pdfViewerTypes";

const THUMBNAIL_CARD_WIDTH_PX = 92;
const THUMBNAIL_PAGE_BOX_WIDTH_PX = 82;
const THUMBNAIL_PAGE_BOX_HEIGHT_PX = 116;
const THUMBNAIL_GRID_GAP_PX = 8;
const INITIAL_RENDER_ROW_COUNT = 6;
const BACKGROUND_RENDER_BATCH_ROW_COUNT = 2;
const BACKGROUND_RENDER_INTERVAL_MS = 140;
const MAX_BACKGROUND_RENDER_COUNT = 96;
const THUMBNAIL_INTERSECTION_ROOT_MARGIN = "360px 0px 720px 0px";
const MIN_THUMBNAIL_COLUMNS = 2;
const MAX_THUMBNAIL_COLUMNS = 4;
const CURRENT_PAGE_RENDER_PRIORITY = 1_000;
const INTERSECTING_PAGE_RENDER_PRIORITY = 900;
const INITIAL_PAGE_RENDER_PRIORITY = 700;
const BACKGROUND_PAGE_RENDER_PRIORITY = 120;

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
  isCurrentPage,
  pageIndex,
  initialRenderCount,
  eagerRenderItemCount,
}: {
  isCurrentPage: boolean;
  pageIndex: number;
  initialRenderCount: number;
  eagerRenderItemCount: number;
}) => {
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
  baseSize?: PageSize;
  observerRoot: HTMLDivElement | null;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
}

type ThumbnailRenderTrigger = "idle" | "eager" | "intersection";

const PdfThumbnailPagePreview = ({
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

const PdfThumbnailCardContent = ({
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

interface SortablePdfThumbnailTileProps extends PdfThumbnailCardContentProps {
  onOpenPage: (pageNumber: number) => void;
}

const SortablePdfThumbnailTile = ({
  pageNumber,
  onOpenPage,
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

  return (
    <div
      ref={setNodeRef}
      className="shrink-0"
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
        aria-label={`ページ ${pageNumber} を開く。ドラッグで順序を変更`}
        className={cn(
          "block w-full touch-none select-none rounded-xl text-left outline-none",
          "cursor-grab focus-visible:ring-2 focus-visible:ring-primary-500/40",
          isDragging && "cursor-grabbing",
        )}
        {...attributes}
        {...listeners}
        onClick={() => onOpenPage(pageNumber)}
      >
        <PdfThumbnailCardContent
          {...contentProps}
          pageNumber={pageNumber}
          isDragging={isDragging}
        />
      </button>
    </div>
  );
};

export const PdfThumbnailSidebar = () => {
  const {
    documentController,
    sourceUnavailable,
    currentPage,
    normalizedThumbnailOrder,
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
  const [gridHostElement, setGridHostElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [availableGridWidth, setAvailableGridWidth] = useState(0);
  const [eagerRenderItemCount, setEagerRenderItemCount] = useState(0);

  const handleGridHostRef = useCallback((node: HTMLDivElement | null) => {
    setGridHostElement((previousNode) =>
      previousNode === node ? previousNode : node,
    );
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
    };
  }, []);

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
  ]);

  const prefetchPageNumbers = useMemo(() => {
    if (totalThumbnailCount === 0) {
      return [];
    }

    const prefetchCount = Math.min(
      totalThumbnailCount,
      Math.max(eagerRenderItemCount, initialRenderCount) +
        resolveBackgroundBatchSize(columnCount),
    );

    return normalizedThumbnailOrder.slice(0, prefetchCount);
  }, [
    columnCount,
    eagerRenderItemCount,
    initialRenderCount,
    normalizedThumbnailOrder,
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
      activationConstraint: { distance: 2 },
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
      scrollToPage(pageNumber);
    },
    [scrollToPage],
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
                      const eagerRender =
                        pageIndex < eagerRenderItemCount || isCurrentPage;

                      return (
                        <SortablePdfThumbnailTile
                          key={pageNumber}
                          documentKey={documentKey}
                          pageNumber={pageNumber}
                          eagerRender={eagerRender}
                          renderPriority={resolveRenderPriority({
                            isCurrentPage,
                            pageIndex,
                            initialRenderCount,
                            eagerRenderItemCount,
                          })}
                          baseSize={pageSizes[pageNumber]}
                          isActive={isCurrentPage}
                          observerRoot={scrollRootRef.current}
                          acquirePage={acquirePage}
                          onPageSize={setPageSize}
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
