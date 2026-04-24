import { cn } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  DragOverlay,
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
const THUMBNAIL_PAGE_BOX_WIDTH_PX = 80;
const THUMBNAIL_PAGE_BOX_HEIGHT_PX = 116;
const THUMBNAIL_GRID_GAP_PX = 8;
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

interface PdfThumbnailPagePreviewProps {
  documentKey: string;
  pageNumber: number;
  baseSize?: PageSize;
  observerRoot: HTMLDivElement | null;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
  forceRender?: boolean;
}

const PdfThumbnailPagePreview = ({
  documentKey,
  pageNumber,
  baseSize,
  observerRoot,
  acquirePage,
  onPageSize,
  forceRender = false,
}: PdfThumbnailPagePreviewProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(
    forceRender || pageNumber <= INITIAL_VISIBLE_PAGE_COUNT,
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
  baseSize?: PageSize;
  isActive: boolean;
  isDragging?: boolean;
  observerRoot: HTMLDivElement | null;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
  forceRender?: boolean;
}

const PdfThumbnailCardContent = ({
  documentKey,
  pageNumber,
  baseSize,
  isActive,
  isDragging = false,
  observerRoot,
  acquirePage,
  onPageSize,
  forceRender = false,
}: PdfThumbnailCardContentProps) => {
  return (
    <>
      <div
        className={cn(
          "flex justify-center overflow-hidden rounded-xl border bg-white p-1 shadow-sm transition-shadow",
          isActive
            ? "border-primary-500 ring-2 ring-primary-500/20"
            : "border-slate-200",
          isDragging && "shadow-lg",
        )}
      >
        <PdfThumbnailPagePreview
          documentKey={documentKey}
          pageNumber={pageNumber}
          baseSize={baseSize}
          observerRoot={observerRoot}
          acquirePage={acquirePage}
          onPageSize={onPageSize}
          forceRender={forceRender}
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
        transition,
        zIndex: isDragging ? 2 : 1,
      }}
    >
      <button
        type="button"
        aria-label={`ページ ${pageNumber} を開く。ドラッグで順序を変更`}
        title="ドラッグで順序を変更"
        className={cn(
          "block w-full touch-none select-none rounded-xl text-left outline-none transition-transform",
          "focus-visible:ring-2 focus-visible:ring-primary-500/40",
          isDragging ? "cursor-grabbing" : "cursor-grab hover:-translate-y-0.5",
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

  const columnCount = useMemo(() => {
    return resolveColumnCount(availableGridWidth);
  }, [availableGridWidth]);

  const hasBlockingStatus =
    Boolean(documentController.error) ||
    sourceUnavailable ||
    (documentController.loading && documentController.numPages === 0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveDragPageNumber(parseSortableId(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragPageNumber(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activePageNumber = parseSortableId(event.active.id);
      const overPageNumber = event.over ? parseSortableId(event.over.id) : null;

      setActiveDragPageNumber(null);

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

  const activeDragBaseSize =
    activeDragPageNumber !== null
      ? documentController.pageSizes[activeDragPageNumber] ?? undefined
      : undefined;

  const openPage = useCallback(
    (pageNumber: number) => {
      scrollToPage(pageNumber);
    },
    [scrollToPage],
  );

  if (!documentController.doc || hasBlockingStatus) {
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
                    {normalizedThumbnailOrder.map((pageNumber) => (
                      <SortablePdfThumbnailTile
                        key={pageNumber}
                        documentKey={documentController.documentKey}
                        pageNumber={pageNumber}
                        baseSize={documentController.pageSizes[pageNumber]}
                        isActive={pageNumber === currentPage}
                        observerRoot={scrollRootRef.current}
                        acquirePage={documentController.acquirePage}
                        onPageSize={documentController.setPageSize}
                        onOpenPage={openPage}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>

              <DragOverlay>
                {activeDragPageNumber !== null ? (
                  <div
                    className="shrink-0"
                    style={{ width: `${THUMBNAIL_CARD_WIDTH_PX}px` }}
                  >
                    <PdfThumbnailCardContent
                      documentKey={documentController.documentKey}
                      pageNumber={activeDragPageNumber}
                      baseSize={activeDragBaseSize}
                      isActive={activeDragPageNumber === currentPage}
                      isDragging
                      observerRoot={null}
                      acquirePage={documentController.acquirePage}
                      onPageSize={documentController.setPageSize}
                      forceRender
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
};
