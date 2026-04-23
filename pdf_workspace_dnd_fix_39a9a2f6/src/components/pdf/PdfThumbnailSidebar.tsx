
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "@/ui/icons";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PdfPage } from "@/components/pdf/PdfPage";
import { usePdfWorkspace } from "@/components/pdf/usePdfWorkspace";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsPage,
  PdfJsTextContent,
} from "@/components/pdf/pdfViewerTypes";

const THUMBNAIL_CARD_WIDTH_PX = 92;
const THUMBNAIL_PREVIEW_WIDTH_PX = 80;
const THUMBNAIL_GRID_GAP_PX = 8;
const FALLBACK_THUMBNAIL_SCALE = 0.18;
const INITIAL_VISIBLE_PAGE_COUNT = 6;
const MIN_THUMBNAIL_COLUMNS = 2;
const MAX_THUMBNAIL_COLUMNS = 4;

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

const buildThumbnailItemId = (pageNumber: number) => {
  return `page:${pageNumber}`;
};

const parseThumbnailItemId = (value: string | number) => {
  if (typeof value !== "string") {
    return null;
  }

  if (!value.startsWith("page:")) {
    return null;
  }

  const numericValue = Number.parseInt(value.slice(5), 10);
  return Number.isFinite(numericValue) ? numericValue : null;
};

interface PdfThumbnailTileProps {
  pdf: PdfJsDocument;
  documentKey: string;
  pageNumber: number;
  scale: number;
  baseSize?: PageSize;
  isActive: boolean;
  observerRoot: HTMLDivElement | null;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  getPageTextContent: (pageNumber: number) => Promise<PdfJsTextContent>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
  forceRender?: boolean;
  onClick?: () => void;
  isDragging?: boolean;
}

const PdfThumbnailTile = ({
  pdf,
  documentKey,
  pageNumber,
  scale,
  baseSize,
  isActive,
  observerRoot,
  acquirePage,
  getPageTextContent,
  onPageSize,
  forceRender = false,
  onClick,
  isDragging = false,
}: PdfThumbnailTileProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(
    pageNumber <= INITIAL_VISIBLE_PAGE_COUNT,
  );

  useEffect(() => {
    if (forceRender || shouldRender) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
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

        setShouldRender(true);
        observer.disconnect();
      },
      {
        root: observerRoot,
        rootMargin: "240px 0px 240px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [forceRender, observerRoot, shouldRender]);

  const placeholderHeight =
    baseSize && baseSize.width > 0
      ? Math.max(96, Math.floor(baseSize.height * scale))
      : 144;

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative shrink-0",
        onClick && "cursor-pointer",
        isDragging && "opacity-40",
      )}
      style={{ width: `${THUMBNAIL_CARD_WIDTH_PX}px` }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-white p-1 shadow-sm transition-shadow",
          isActive
            ? "border-primary-500 ring-2 ring-primary-500/20"
            : "border-slate-200",
          onClick && "hover:shadow-md",
        )}
      >
        {forceRender || shouldRender ? (
          <PdfPage
            className="pointer-events-none"
            documentKey={documentKey}
            pdf={pdf}
            pageNumber={pageNumber}
            scale={scale}
            baseSize={baseSize}
            opaqueCanvas={false}
            renderTextLayer={false}
            acquirePage={acquirePage}
            getPageTextContent={getPageTextContent}
            onPageSize={onPageSize}
          />
        ) : (
          <div
            className="rounded-lg bg-slate-100"
            style={{ height: `${placeholderHeight}px` }}
          />
        )}
      </div>

      <div
        className={cn(
          "pt-1 text-center text-[11px] leading-4",
          isActive ? "font-semibold text-slate-900" : "text-slate-500",
        )}
      >
        {pageNumber}
      </div>
    </div>
  );
};

interface SortablePdfThumbnailTileProps
  extends Omit<PdfThumbnailTileProps, "forceRender" | "isDragging"> {
  onSelect: (pageNumber: number) => void;
}

const SortablePdfThumbnailTile = ({
  pageNumber,
  onSelect,
  ...tileProps
}: SortablePdfThumbnailTileProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: buildThumbnailItemId(pageNumber),
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("relative", isDragging && "z-30")}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <PdfThumbnailTile
        {...tileProps}
        pageNumber={pageNumber}
        isDragging={isDragging}
        onClick={() => onSelect(pageNumber)}
      />
      <button
        type="button"
        aria-label={`ページ ${pageNumber} を並び替え`}
        className="absolute right-2 top-2 z-10 rounded-md border border-slate-200 bg-white/95 p-1 text-slate-400 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5 cursor-grab active:cursor-grabbing" />
      </button>
    </div>
  );
};

export const PdfThumbnailSidebar = () => {
  const {
    doc,
    documentController,
    currentPage,
    normalizedThumbnailOrder,
    reorderThumbnailOrder,
    scrollToPage,
    sourceUnavailable,
    localDataStatus,
    firstPageSize,
  } = usePdfWorkspace();
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const [gridHostElement, setGridHostElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [availableGridWidth, setAvailableGridWidth] = useState(0);
  const [activeDragPageNumber, setActiveDragPageNumber] = useState<number | null>(
    null,
  );

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columnCount = useMemo(() => {
    return resolveColumnCount(availableGridWidth);
  }, [availableGridWidth]);

  const thumbnailScale = useMemo(() => {
    if (!firstPageSize || firstPageSize.width <= 0) {
      return FALLBACK_THUMBNAIL_SCALE;
    }

    return Number(
      (THUMBNAIL_PREVIEW_WIDTH_PX / firstPageSize.width).toFixed(3),
    );
  }, [firstPageSize]);

  const statusMessage = useMemo(() => {
    if (documentController.error) {
      return documentController.error;
    }

    if (sourceUnavailable) {
      if (localDataStatus === "loading") {
        return "ローカルPDFを復元中...";
      }

      if (localDataStatus === "failed") {
        return "PDFの復元に失敗しました。";
      }

      return "PDFソースがありません。";
    }

    if (documentController.loading && documentController.numPages === 0) {
      return "サムネイルを読み込み中...";
    }

    return null;
  }, [
    documentController.error,
    documentController.loading,
    documentController.numPages,
    localDataStatus,
    sourceUnavailable,
  ]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const nextPageNumber = parseThumbnailItemId(event.active.id);
    setActiveDragPageNumber(nextPageNumber);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragPageNumber(null);

      const activePageNumber = parseThumbnailItemId(event.active.id);
      const overPageNumber = parseThumbnailItemId(event.over?.id ?? "");

      if (
        activePageNumber === null ||
        overPageNumber === null ||
        activePageNumber === overPageNumber
      ) {
        return;
      }

      reorderThumbnailOrder(activePageNumber, overPageNumber);
    },
    [reorderThumbnailOrder],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragPageNumber(null);
  }, []);

  const activeDragPreviewPageNumber = useMemo(() => {
    if (activeDragPageNumber === null) {
      return null;
    }

    return normalizedThumbnailOrder.includes(activeDragPageNumber)
      ? activeDragPageNumber
      : null;
  }, [activeDragPageNumber, normalizedThumbnailOrder]);

  if (doc.kind !== "pdf") {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRootRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-2 pb-2 pt-2">
          <div ref={handleGridHostRef} className="w-full">
            {!documentController.doc || statusMessage ? (
              <div className="flex min-h-0 items-start justify-center">
                <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                  {statusMessage ?? "サムネイルを初期化中..."}
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="flex justify-center">
                  <SortableContext
                    items={normalizedThumbnailOrder.map(buildThumbnailItemId)}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      className="inline-grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${columnCount}, ${THUMBNAIL_CARD_WIDTH_PX}px)`,
                      }}
                    >
                      {normalizedThumbnailOrder.map((pageNumber) => (
                        <SortablePdfThumbnailTile
                          key={`${doc.id}:thumbnail:${pageNumber}`}
                          pdf={documentController.doc}
                          documentKey={documentController.documentKey}
                          pageNumber={pageNumber}
                          scale={thumbnailScale}
                          baseSize={
                            documentController.pageSizes[pageNumber] ??
                            firstPageSize ??
                            undefined
                          }
                          isActive={pageNumber === currentPage}
                          observerRoot={scrollRootRef.current}
                          acquirePage={documentController.acquirePage}
                          getPageTextContent={documentController.getPageTextContent}
                          onPageSize={documentController.setPageSize}
                          onSelect={scrollToPage}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>

                <DragOverlay>
                  {activeDragPreviewPageNumber !== null ? (
                    <PdfThumbnailTile
                      pdf={documentController.doc}
                      documentKey={documentController.documentKey}
                      pageNumber={activeDragPreviewPageNumber}
                      scale={thumbnailScale}
                      baseSize={
                        documentController.pageSizes[activeDragPreviewPageNumber] ??
                        firstPageSize ??
                        undefined
                      }
                      isActive={activeDragPreviewPageNumber === currentPage}
                      observerRoot={null}
                      acquirePage={documentController.acquirePage}
                      getPageTextContent={documentController.getPageTextContent}
                      onPageSize={documentController.setPageSize}
                      forceRender
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
