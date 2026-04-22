import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  defaultAnimateLayoutChanges,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FilterPanelShell } from "@/components/panel/FilterPanelShell";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import {
  SegmentedControlGroup,
  type SegmentedOption,
} from "@/components/panel/SegmentedControlGroup";
import { SurfaceButton } from "@/components/ui/surface-button";
import { cn } from "@/lib/utils";
import type { PdfPageLayoutMode, PdfSidePanelTab } from "@/types";
import type { PdfDocumentController } from "./hooks/usePdfDocument";
import { PdfThumbnailItem } from "./PdfThumbnailItem";

const DESKTOP_PANEL_WIDTH_PX = 320;
const DESKTOP_PANEL_COLLAPSED_WIDTH_PX = 56;

type OutlineEntry = {
  pageNumber: number;
  title: string;
};

interface PdfThumbnailPanelProps {
  documentController: PdfDocumentController;
  currentPage: number;
  pageLayoutMode: PdfPageLayoutMode;
  bookmarkedPageNumbers: ReadonlySet<number>;
  isMobileViewport: boolean;
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onSelectPage: (pageNumber: number) => void;
  onToggleBookmark: (pageNumber: number) => void;
  selectedTab?: PdfSidePanelTab;
  onTabChange?: (nextTab: PdfSidePanelTab) => void;
  orderedThumbnailPageNumbers?: readonly number[];
  onThumbnailOrderChange?: (nextPageNumbers: number[]) => void;
  ocrTextByPage?: Record<number, string>;
  ocrPageNumbers?: readonly number[];
  isOcrRunning?: boolean;
  onRunCurrentPageOcr?: () => void;
  onRunAllPagesOcr?: () => void;
  onClearOcr?: () => void;
}

interface IconProps {
  className?: string;
}

const GridIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
    <rect
      x="3"
      y="3"
      width="5"
      height="5"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <rect
      x="12"
      y="3"
      width="5"
      height="5"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <rect
      x="3"
      y="12"
      width="5"
      height="5"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <rect
      x="12"
      y="12"
      width="5"
      height="5"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.4"
    />
  </svg>
);

const BookmarkIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
  >
    <path d="M6.2 3.25c-.994 0-1.8.806-1.8 1.8v11.273c0 .407.46.643.79.405L10 13.552l4.81 3.176a.487.487 0 0 0 .79-.405V5.05c0-.994-.806-1.8-1.8-1.8H6.2Z" />
  </svg>
);

const ListIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
    <path
      d="M6.75 5.5h7.75M6.75 10h7.75M6.75 14.5h7.75"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <circle cx="4.25" cy="5.5" r="0.9" fill="currentColor" />
    <circle cx="4.25" cy="10" r="0.9" fill="currentColor" />
    <circle cx="4.25" cy="14.5" r="0.9" fill="currentColor" />
  </svg>
);

const OcrIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
    <rect
      x="3.5"
      y="4"
      width="13"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M6.4 12.8V7.2h2.1c1.1 0 1.9.7 1.9 1.8 0 1-.7 1.7-1.9 1.7H7.8"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M11.3 12.8V7.2h1.4c1.7 0 2.8 1.1 2.8 2.8s-1 2.8-2.8 2.8h-1.4Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const ChevronLeftIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
    <path
      d="M11.75 4.5 6.25 10l5.5 5.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRightIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
    <path
      d="m8.25 4.5 5.5 5.5-5.5 5.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const XIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
    <path
      d="m5 5 10 10M15 5 5 15"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const PANEL_TABS = [
  { id: "bookmarks", label: "ブックマーク", icon: BookmarkIcon },
  { id: "outline", label: "アウトライン", icon: ListIcon },
  { id: "ocr", label: "OCR", icon: OcrIcon },
  { id: "thumbnails", label: "サムネイル", icon: GridIcon },
] as const satisfies ReadonlyArray<{
  id: PdfSidePanelTab;
  label: string;
  icon: (props: IconProps) => JSX.Element;
}>;

const SEARCH_PLACEHOLDER_BY_TAB: Record<PdfSidePanelTab, string> = {
  bookmarks: "ページ番号やOCRを検索...",
  outline: "見出しを検索...",
  ocr: "OCRテキストを検索...",
  thumbnails: "ページ番号やOCRを検索...",
};

const clampPageNumber = (pageNumber: number, numPages: number) => {
  return Math.min(Math.max(Math.trunc(pageNumber), 1), Math.max(numPages, 1));
};

const buildDefaultPageNumbers = (numPages: number) => {
  return Array.from({ length: Math.max(0, numPages) }, (_, index) => index + 1);
};

const sanitizeOrderedPageNumbers = (
  numPages: number,
  orderedPageNumbers?: readonly number[],
) => {
  const defaultPageNumbers = buildDefaultPageNumbers(numPages);
  if (!orderedPageNumbers || orderedPageNumbers.length === 0) {
    return defaultPageNumbers;
  }

  const nextPageNumbers: number[] = [];
  const seen = new Set<number>();

  orderedPageNumbers.forEach((pageNumber) => {
    if (!Number.isFinite(pageNumber)) {
      return;
    }

    const normalizedPageNumber = clampPageNumber(pageNumber, numPages);
    if (seen.has(normalizedPageNumber)) {
      return;
    }

    seen.add(normalizedPageNumber);
    nextPageNumbers.push(normalizedPageNumber);
  });

  defaultPageNumbers.forEach((pageNumber) => {
    if (!seen.has(pageNumber)) {
      nextPageNumbers.push(pageNumber);
    }
  });

  return nextPageNumbers;
};

const extractPageText = async (
  documentController: PdfDocumentController,
  pageNumber: number,
) => {
  const textContent = await documentController.getPageTextContent(pageNumber);
  const textItems = textContent.items
    .map((item) => {
      if (typeof item !== "object" || item === null || !("str" in item)) {
        return "";
      }

      const strValue = (item as { str?: unknown }).str;
      return typeof strValue === "string" ? strValue : "";
    })
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);

  return textItems.join("\n");
};

const buildFallbackOutline = async (
  documentController: PdfDocumentController,
  pageNumbers: readonly number[],
) => {
  const nextEntries: OutlineEntry[] = [];

  for (const pageNumber of pageNumbers) {
    const pageText = await extractPageText(documentController, pageNumber);
    const firstLine = pageText
      .split(/\n+/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    nextEntries.push({
      pageNumber,
      title: firstLine ?? `ページ ${pageNumber}`,
    });
  }

  return nextEntries;
};

const normalizeSearchToken = (value: string) => {
  return value.trim().toLocaleLowerCase();
};

const matchesSearchToken = (
  searchToken: string,
  ...candidates: Array<string | number | null | undefined>
) => {
  if (searchToken.length === 0) {
    return true;
  }

  return candidates.some((candidate) => {
    if (typeof candidate === "number") {
      return String(candidate).includes(searchToken);
    }

    if (typeof candidate === "string") {
      return candidate.toLocaleLowerCase().includes(searchToken);
    }

    return false;
  });
};

const animateSortableGridLayoutChanges = (
  args: Parameters<typeof defaultAnimateLayoutChanges>[0],
) => {
  if (!args.isSorting && !args.wasDragging) {
    return false;
  }

  return defaultAnimateLayoutChanges(args);
};

const SortableThumbnailCard = ({
  pageNumber,
  children,
}: {
  pageNumber: number;
  children: ReactNode;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: String(pageNumber),
    animateLayoutChanges: animateSortableGridLayoutChanges,
  });

  const shouldApplySortableTransform = isDragging || isSorting;

  const style: CSSProperties = {
    transform: shouldApplySortableTransform
      ? CSS.Transform.toString(transform)
      : undefined,
    transition: shouldApplySortableTransform ? transition : undefined,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 30 : 1,
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="min-h-0">{children}</div>
    </div>
  );
};

export const PdfThumbnailPanel = ({
  documentController,
  currentPage,
  pageLayoutMode,
  bookmarkedPageNumbers,
  isMobileViewport,
  isOpen,
  onOpenChange,
  onSelectPage,
  onToggleBookmark,
  selectedTab = "thumbnails",
  onTabChange,
  orderedThumbnailPageNumbers,
  onThumbnailOrderChange,
  ocrTextByPage = {},
  ocrPageNumbers = [],
  isOcrRunning = false,
  onRunCurrentPageOcr,
  onRunAllPagesOcr,
  onClearOcr,
}: PdfThumbnailPanelProps) => {
  const [scrollRootElement, setScrollRootElement] =
    useState<HTMLElement | null>(null);
  const [outlineEntries, setOutlineEntries] = useState<OutlineEntry[]>([]);
  const [isOutlineLoading, setIsOutlineLoading] = useState(false);
  const [activeDragPageNumber, setActiveDragPageNumber] = useState<
    number | null
  >(null);
  const [dragOverlayWidth, setDragOverlayWidth] = useState<number | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const orderedPageNumbers = useMemo(() => {
    return sanitizeOrderedPageNumbers(
      documentController.numPages,
      orderedThumbnailPageNumbers,
    );
  }, [documentController.numPages, orderedThumbnailPageNumbers]);

  const bookmarkedPages = useMemo(() => {
    return orderedPageNumbers.filter((pageNumber) =>
      bookmarkedPageNumbers.has(pageNumber),
    );
  }, [bookmarkedPageNumbers, orderedPageNumbers]);

  const orderedOcrPageNumbers = useMemo(() => {
    const ocrPageNumberSet = new Set(ocrPageNumbers);
    return orderedPageNumbers.filter((pageNumber) =>
      ocrPageNumberSet.has(pageNumber),
    );
  }, [ocrPageNumbers, orderedPageNumbers]);

  const activePageNumbers = useMemo(() => {
    const nextActivePageNumbers = new Set<number>([currentPage]);

    if (
      pageLayoutMode === "double" &&
      currentPage >= 1 &&
      currentPage < documentController.numPages
    ) {
      nextActivePageNumbers.add(currentPage + 1);
    }

    return nextActivePageNumbers;
  }, [currentPage, documentController.numPages, pageLayoutMode]);

  const activeDragOverlayPageNumber = activeDragPageNumber;
  const normalizedSearchToken = useMemo(
    () => normalizeSearchToken(searchQuery),
    [searchQuery],
  );
  const canReorderThumbnails =
    selectedTab === "thumbnails" &&
    normalizedSearchToken.length === 0 &&
    typeof onThumbnailOrderChange === "function";

  const filteredThumbnailPageNumbers = useMemo(() => {
    return orderedPageNumbers.filter((pageNumber) =>
      matchesSearchToken(
        normalizedSearchToken,
        pageNumber,
        `p.${pageNumber}`,
        ocrTextByPage[pageNumber],
      ),
    );
  }, [normalizedSearchToken, ocrTextByPage, orderedPageNumbers]);

  const filteredBookmarkedPages = useMemo(() => {
    return bookmarkedPages.filter((pageNumber) =>
      matchesSearchToken(
        normalizedSearchToken,
        pageNumber,
        `p.${pageNumber}`,
        ocrTextByPage[pageNumber],
      ),
    );
  }, [bookmarkedPages, normalizedSearchToken, ocrTextByPage]);

  const filteredOutlineEntries = useMemo(() => {
    return outlineEntries.filter((entry) =>
      matchesSearchToken(
        normalizedSearchToken,
        entry.pageNumber,
        entry.title,
        ocrTextByPage[entry.pageNumber],
      ),
    );
  }, [normalizedSearchToken, ocrTextByPage, outlineEntries]);

  const filteredOcrPageNumbers = useMemo(() => {
    return orderedOcrPageNumbers.filter((pageNumber) =>
      matchesSearchToken(
        normalizedSearchToken,
        pageNumber,
        `p.${pageNumber}`,
        ocrTextByPage[pageNumber],
      ),
    );
  }, [normalizedSearchToken, ocrTextByPage, orderedOcrPageNumbers]);

  const selectedTabLabel = useMemo(() => {
    return (
      PANEL_TABS.find((tab) => tab.id === selectedTab)?.label ?? "サムネイル"
    );
  }, [selectedTab]);

  useEffect(() => {
    setSearchQuery("");
  }, [selectedTab]);

  useEffect(() => {
    let cancelled = false;

    if (selectedTab !== "outline" || orderedPageNumbers.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    setIsOutlineLoading(true);

    void buildFallbackOutline(documentController, orderedPageNumbers)
      .then((nextEntries) => {
        if (cancelled) {
          return;
        }

        setOutlineEntries(nextEntries);
      })
      .finally(() => {
        if (!cancelled) {
          setIsOutlineLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentController, orderedPageNumbers, selectedTab]);

  const resetDragState = useCallback(() => {
    setActiveDragPageNumber(null);
    setDragOverlayWidth(null);
  }, []);

  const handleScrollRootRef = useCallback((element: HTMLDivElement | null) => {
    setScrollRootElement((previousElement) =>
      previousElement === element ? previousElement : element,
    );
  }, []);

  useEffect(() => {
    if (canReorderThumbnails) {
      return;
    }

    setIsReorderMode(false);
    resetDragState();
  }, [canReorderThumbnails, resetDragState]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (!canReorderThumbnails || !isReorderMode) {
      return;
    }

    const nextPageNumber = Number(event.active.id);
    setActiveDragPageNumber(
      Number.isFinite(nextPageNumber) ? nextPageNumber : null,
    );
    const nextWidth = event.active.rect.current.initial?.width ?? null;
    setDragOverlayWidth(typeof nextWidth === "number" ? nextWidth : null);
  }, [canReorderThumbnails, isReorderMode]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!canReorderThumbnails || !isReorderMode) {
        resetDragState();
        return;
      }

      const activePageId = Number(event.active.id);
      const overPageId = Number(event.over?.id);

      resetDragState();

      if (!Number.isFinite(activePageId) || !Number.isFinite(overPageId)) {
        return;
      }

      if (activePageId === overPageId) {
        return;
      }

      const activeIndex = orderedPageNumbers.findIndex(
        (pageNumber) => pageNumber === activePageId,
      );
      const overIndex = orderedPageNumbers.findIndex(
        (pageNumber) => pageNumber === overPageId,
      );

      if (activeIndex < 0 || overIndex < 0) {
        return;
      }

      const nextPageNumbers = arrayMove(
        orderedPageNumbers,
        activeIndex,
        overIndex,
      );
      onThumbnailOrderChange?.(nextPageNumbers);
    },
    [
      canReorderThumbnails,
      isReorderMode,
      onThumbnailOrderChange,
      orderedPageNumbers,
      resetDragState,
    ],
  );

  const renderThumbnailCard = useCallback(
    (pageNumber: number) => {
      return (
        <PdfThumbnailItem
          key={`pdf-thumbnail-${documentController.documentKey}-${pageNumber}`}
          documentKey={documentController.documentKey}
          pageNumber={pageNumber}
          baseSize={documentController.pageSizes[pageNumber]}
          isActive={activePageNumbers.has(pageNumber)}
          isBookmarked={bookmarkedPageNumbers.has(pageNumber)}
          hasOcrText={
            typeof ocrTextByPage[pageNumber] === "string" &&
            ocrTextByPage[pageNumber].length > 0
          }
          onSelect={onSelectPage}
          onToggleBookmark={onToggleBookmark}
          rootElement={scrollRootElement}
          acquirePage={documentController.acquirePage}
          setPageSize={documentController.setPageSize}
        />
      );
    },
    [
      activePageNumbers,
      bookmarkedPageNumbers,
      documentController.acquirePage,
      documentController.documentKey,
      documentController.pageSizes,
      documentController.setPageSize,
      ocrTextByPage,
      onSelectPage,
      onToggleBookmark,
      scrollRootElement,
    ],
  );

  const renderGrid = useCallback(
    (
      pageNumbers: readonly number[],
      options: {
        emptyMessage: string;
        emptyIcon: ReactNode;
        reorderEnabled?: boolean;
      },
    ) => {
      if (documentController.loading && orderedPageNumbers.length === 0) {
        return (
          <div className="grid grid-cols-2 gap-3 p-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={`pdf-thumbnail-skeleton-${index}`}
                className="pdf-sidebar-message-card h-[11rem] rounded-[28px] border"
              />
            ))}
          </div>
        );
      }

      if (!documentController.loading && documentController.error) {
        return (
          <PanelEmptyState
            icon={options.emptyIcon}
            message="ページ一覧を準備できませんでした。"
            className="py-6"
          />
        );
      }

      if (!documentController.loading && orderedPageNumbers.length === 0) {
        return (
          <PanelEmptyState
            icon={options.emptyIcon}
            message="ページ情報を読み込み中です。"
            className="py-6"
          />
        );
      }

      if (pageNumbers.length === 0) {
        return (
          <PanelEmptyState
            icon={options.emptyIcon}
            message={options.emptyMessage}
            className="py-6"
          />
        );
      }

      if (!options.reorderEnabled) {
        return (
          <div className="grid grid-cols-2 gap-3 p-4">
            {pageNumbers.map((pageNumber) => renderThumbnailCard(pageNumber))}
          </div>
        );
      }

      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={resetDragState}
        >
          <SortableContext
            items={pageNumbers.map((pageNumber) => String(pageNumber))}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 p-4">
              {pageNumbers.map((pageNumber) => (
                <SortableThumbnailCard
                  key={`sortable-${pageNumber}`}
                  pageNumber={pageNumber}
                >
                  {renderThumbnailCard(pageNumber)}
                </SortableThumbnailCard>
              ))}
            </div>
          </SortableContext>

          <DragOverlay adjustScale={false}>
            {typeof activeDragOverlayPageNumber === "number" ? (
              <div style={{ width: dragOverlayWidth ?? undefined }}>
                <PdfThumbnailItem
                  documentKey={documentController.documentKey}
                  pageNumber={activeDragOverlayPageNumber}
                  baseSize={
                    documentController.pageSizes[activeDragOverlayPageNumber]
                  }
                  isActive={activePageNumbers.has(activeDragOverlayPageNumber)}
                  isBookmarked={bookmarkedPageNumbers.has(
                    activeDragOverlayPageNumber,
                  )}
                  hasOcrText={
                    typeof ocrTextByPage[activeDragOverlayPageNumber] ===
                      "string" &&
                    ocrTextByPage[activeDragOverlayPageNumber].length > 0
                  }
                  onSelect={() => {}}
                  onToggleBookmark={() => {}}
                  rootElement={null}
                  acquirePage={documentController.acquirePage}
                  setPageSize={documentController.setPageSize}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      );
    },
    [
      activeDragOverlayPageNumber,
      activePageNumbers,
      bookmarkedPageNumbers,
      documentController.acquirePage,
      documentController.documentKey,
      documentController.error,
      documentController.loading,
      documentController.pageSizes,
      documentController.setPageSize,
      dragOverlayWidth,
      handleDragEnd,
      handleDragStart,
      ocrTextByPage,
      orderedPageNumbers.length,
      renderThumbnailCard,
      resetDragState,
      sensors,
    ],
  );

  const renderOutline = () => {
    if (isOutlineLoading) {
      return (
        <PanelEmptyState
          icon={<ListIcon className="h-8 w-8" />}
          message="アウトラインを読み込み中です。"
          className="py-6"
        />
      );
    }

    if (filteredOutlineEntries.length === 0) {
      return (
        <PanelEmptyState
          icon={<ListIcon className="h-8 w-8" />}
          message={
            normalizedSearchToken.length > 0
              ? "一致する見出しがありません。"
              : "アウトラインが見つかりません。"
          }
          className="py-6"
        />
      );
    }

    return (
      <div className="space-y-2 p-4">
        {filteredOutlineEntries.map((entry) => (
          <button
            key={`outline-${entry.pageNumber}`}
            type="button"
            onClick={() => onSelectPage(entry.pageNumber)}
            className={cn(
              "pdf-sidebar-entry w-full rounded-2xl px-3 py-2 text-left transition-colors",
              activePageNumbers.has(entry.pageNumber) &&
                "pdf-sidebar-entry--active",
            )}
          >
            <div className="pdf-sidebar-entry__meta text-xs font-semibold">
              {entry.pageNumber}
            </div>
            <div className="mt-1 line-clamp-2 text-sm font-medium">
              {entry.title}
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderOcrPanel = () => {
    if (orderedOcrPageNumbers.length === 0) {
      return (
        <PanelEmptyState
          icon={<OcrIcon className="h-8 w-8" />}
          message="OCR結果はまだありません。スキャンPDFならツールバーのOCRを実行してください。"
          className="py-6"
        />
      );
    }

    if (filteredOcrPageNumbers.length === 0) {
      return (
        <PanelEmptyState
          icon={<OcrIcon className="h-8 w-8" />}
          message="一致するOCR結果がありません。"
          className="py-6"
        />
      );
    }

    return (
      <div className="space-y-3 p-4">
        {filteredOcrPageNumbers.map((pageNumber) => (
          <button
            key={`ocr-page-${pageNumber}`}
            type="button"
            onClick={() => onSelectPage(pageNumber)}
            className={cn(
              "pdf-sidebar-entry w-full rounded-2xl px-3 py-3 text-left transition-colors",
              activePageNumbers.has(pageNumber) && "pdf-sidebar-entry--active",
            )}
          >
            <div className="pdf-filter-badge mb-2 inline-flex border px-2 py-1 text-[11px] font-semibold">
              p.{pageNumber}
            </div>

            <div className="text-xs leading-6 whitespace-pre-wrap break-words">
              {ocrTextByPage[pageNumber] ?? ""}
            </div>
          </button>
        ))}
      </div>
    );
  };

  const panelBody = (() => {
    switch (selectedTab) {
      case "bookmarks":
        return renderGrid(filteredBookmarkedPages, {
          emptyMessage:
            normalizedSearchToken.length > 0
              ? "一致するブックマークページがありません。"
              : "ブックマークされたページはありません。",
          emptyIcon: <BookmarkIcon className="h-8 w-8" />,
        });
      case "outline":
        return renderOutline();
      case "ocr":
        return renderOcrPanel();
      default:
        return renderGrid(filteredThumbnailPageNumbers, {
          emptyMessage:
            normalizedSearchToken.length > 0
              ? "一致するページがありません。"
              : "ページ情報を読み込み中です。",
          emptyIcon: <GridIcon className="h-8 w-8" />,
          reorderEnabled: canReorderThumbnails && isReorderMode,
        });
    }
  })();

  const panelTabOptions = useMemo(() => {
    return PANEL_TABS.map((tab) => {
      const IconComponent = tab.icon;

      return {
        value: tab.id,
        label: <IconComponent className="h-4 w-4" />,
        ariaLabel: tab.label,
      };
    }) as ReadonlyArray<SegmentedOption<PdfSidePanelTab>>;
  }, []);

  const panelSections = (
    <>
      <div className="ds-filter-section flex items-center gap-2 bg-transparent px-3 py-2 text-[11px]">
        <span className="ds-filter-section__label">表示:</span>

        <SegmentedControlGroup
          value={selectedTab}
          options={panelTabOptions}
          onChange={(nextTab) => onTabChange?.(nextTab)}
          buttonClassName="h-9 w-9 px-0 py-0"
          className="ml-auto"
        />
      </div>

      {selectedTab === "thumbnails" ? (
        <div className="ds-filter-section space-y-2 bg-transparent px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="ds-filter-section__label">並び替え:</span>
            <span className="ds-filter-section__label">
              {orderedPageNumbers.length} ページ
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SurfaceButton
              type="button"
              onClick={() => {
                setIsReorderMode((previousValue) => {
                  const nextValue = !previousValue;
                  if (!nextValue) {
                    resetDragState();
                  }
                  return nextValue;
                });
              }}
              disabled={!canReorderThumbnails}
              surface={isReorderMode ? "convexActive" : "concave"}
              size="xs"
            >
              {isReorderMode ? "並び替え完了" : "並び替え開始"}
            </SurfaceButton>

            {normalizedSearchToken.length > 0 ? (
              <span className="ds-filter-section__label">
                検索中は並び替え不可
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedTab === "ocr" ? (
        <div className="ds-filter-section space-y-2 bg-transparent px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="ds-filter-section__label">OCR:</span>
            <span className="ds-filter-section__label">
              {orderedOcrPageNumbers.length} ページ
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <SurfaceButton
              type="button"
              onClick={() => onRunCurrentPageOcr?.()}
              disabled={!onRunCurrentPageOcr || isOcrRunning}
              surface="convexActive"
              size="xs"
            >
              現在OCR
            </SurfaceButton>

            <SurfaceButton
              type="button"
              onClick={() => onRunAllPagesOcr?.()}
              disabled={!onRunAllPagesOcr || isOcrRunning}
              surface="convex"
              size="xs"
            >
              全体OCR
            </SurfaceButton>

            <SurfaceButton
              type="button"
              onClick={() => onClearOcr?.()}
              disabled={!onClearOcr || isOcrRunning}
              surface="concave"
              size="xs"
            >
              OCR削除
            </SurfaceButton>
          </div>
        </div>
      ) : null}
    </>
  );

  const panelShell = (
    <FilterPanelShell
      title="PDFサイドバー"
      searchValue={searchQuery}
      searchPlaceholder={SEARCH_PLACEHOLDER_BY_TAB[selectedTab]}
      onSearchChange={setSearchQuery}
      className="pdf-filter-panel-root h-full min-h-0"
      bodyClassName="overscroll-contain p-3"
      bodyRef={handleScrollRootRef}
      headerAction={
        <div className="pdf-filter-badge text-[10px] font-semibold tabular-nums">
          {selectedTabLabel}
        </div>
      }
      sections={panelSections}
    >
      {panelBody}
    </FilterPanelShell>
  );

  if (isMobileViewport) {
    return (
      <>
        <button
          type="button"
          aria-label={isOpen ? "ページ一覧を閉じる" : "ページ一覧を開く"}
          onClick={() => onOpenChange(!isOpen)}
          className="pdf-filter-toggle-button absolute left-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-150"
        >
          {isOpen ? (
            <XIcon className="h-4 w-4" />
          ) : (
            <GridIcon className="h-4 w-4" />
          )}
        </button>

        {isOpen ? (
          <button
            type="button"
            aria-label="ページ一覧を閉じる"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 z-20 bg-black/10 backdrop-blur-[1px]"
          />
        ) : null}

        <aside
          className={cn(
            "pdf-filter-scope pdf-filter-mobile-sheet absolute inset-y-3 left-3 z-30 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[24px] border transition-all duration-150 ease-out",
            isOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          style={{
            width: "min(20rem, calc(100% - 1.5rem))",
            opacity: isOpen ? 1 : 0,
            transform: isOpen
              ? "translateX(0)"
              : "translateX(calc(-100% - 1rem))",
          }}
        >
          {panelShell}
        </aside>
      </>
    );
  }

  return (
    <aside
      className="pdf-filter-scope pdf-filter-desktop-shell relative z-10 h-full shrink-0 overflow-hidden border-r transition-[width] duration-150 ease-out"
      style={{
        width: isOpen
          ? `${DESKTOP_PANEL_WIDTH_PX}px`
          : `${DESKTOP_PANEL_COLLAPSED_WIDTH_PX}px`,
      }}
    >
      <div className="flex h-full min-w-0">
        <div className="pdf-filter-rail flex w-14 shrink-0 flex-col items-center gap-2 border-r px-2 py-3">
          <button
            type="button"
            aria-label={isOpen ? "ページ一覧を閉じる" : "ページ一覧を開く"}
            onClick={() => onOpenChange(!isOpen)}
            className="pdf-filter-toggle-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-150"
          >
            <span className="relative inline-flex items-center justify-center">
              <GridIcon className="h-4 w-4" />
              <span
                className="absolute -right-4 top-1/2 -translate-y-1/2"
                style={{ color: "var(--meta-panel-accent)" }}
              >
                {isOpen ? (
                  <ChevronLeftIcon className="h-3 w-3" />
                ) : (
                  <ChevronRightIcon className="h-3 w-3" />
                )}
              </span>
            </span>
          </button>

          <div className="pdf-filter-badge text-[10px] font-semibold tabular-nums">
            {documentController.numPages}
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col transition-opacity duration-150 ease-out",
            isOpen ? "flex opacity-100" : "pointer-events-none flex opacity-0",
          )}
          aria-hidden={!isOpen}
        >
          {panelShell}
        </div>
      </div>
    </aside>
  );
};
