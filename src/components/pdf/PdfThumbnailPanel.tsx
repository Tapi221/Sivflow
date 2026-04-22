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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PdfPageLayoutMode, PdfSidePanelTab } from "@/types";
import { cn } from "@/lib/utils";
import type { PdfDocumentController } from "./hooks/usePdfDocument";
import { PdfThumbnailItem } from "./PdfThumbnailItem";

const DESKTOP_PANEL_WIDTH_PX = 320;
const DESKTOP_PANEL_COLLAPSED_WIDTH_PX = 56;

type OutlineEntry = {
  pageNumber: number;
  title: string;
};

const PDF_THUMBNAIL_PANEL_COLORS = {
  accent: "#D8AFB5",
  surfaceSoft: "#F5EBE9",
  surfaceMuted: "#F1E2E1",
  surfacePaper: "#F8F7F5",
  surfaceBlush: "#F7EFED",
  textStrong: "#5E545B",
  textMuted: "#8C7C83",
  shadow: "0 12px 28px rgba(216, 175, 181, 0.18)",
} as const;

const PANEL_TABS = [
  { id: "bookmarks", label: "ブックマーク" },
  { id: "outline", label: "アウトライン" },
  { id: "ocr", label: "OCR" },
  { id: "thumbnails", label: "サムネイル" },
] as const satisfies ReadonlyArray<{
  id: PdfSidePanelTab;
  label: string;
}>;

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
  } = useSortable({
    id: String(pageNumber),
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 30 : 1,
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
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

  const handleScrollRootRef = useCallback((element: HTMLDivElement | null) => {
    setScrollRootElement((previousElement) =>
      previousElement === element ? previousElement : element,
    );
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const nextPageNumber = Number(event.active.id);
    setActiveDragPageNumber(
      Number.isFinite(nextPageNumber) ? nextPageNumber : null,
    );
    const nextWidth = event.active.rect.current.initial?.width ?? null;
    setDragOverlayWidth(typeof nextWidth === "number" ? nextWidth : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activePageId = Number(event.active.id);
      const overPageId = Number(event.over?.id);

      setActiveDragPageNumber(null);
      setDragOverlayWidth(null);

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
    [onThumbnailOrderChange, orderedPageNumbers],
  );

  const renderThumbnailGrid = () => {
    if (documentController.loading && orderedPageNumbers.length === 0) {
      return (
        <div className="grid grid-cols-2 gap-3 p-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={`pdf-thumbnail-skeleton-${index}`}
              className="h-[11rem] rounded-[28px] border"
              style={{
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                background: PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
              }}
            />
          ))}
        </div>
      );
    }

    if (!documentController.loading && documentController.error) {
      return (
        <div
          className="px-4 py-6 text-sm"
          style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
        >
          ページ一覧を準備できませんでした。
        </div>
      );
    }

    if (!documentController.loading && orderedPageNumbers.length === 0) {
      return (
        <div
          className="px-4 py-6 text-sm"
          style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
        >
          ページ情報を読み込み中です。
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
        onDragCancel={() => {
          setActiveDragPageNumber(null);
          setDragOverlayWidth(null);
        }}
      >
        <SortableContext
          items={orderedPageNumbers.map((pageNumber) => String(pageNumber))}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-3 p-4">
            {orderedPageNumbers.map((pageNumber) => (
              <SortableThumbnailCard
                key={`sortable-${pageNumber}`}
                pageNumber={pageNumber}
              >
                <PdfThumbnailItem
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
  };

  const renderBookmarkedGrid = () => {
    if (bookmarkedPages.length === 0) {
      return (
        <div
          className="px-4 py-6 text-sm"
          style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
        >
          ブックマークされたページはありません。
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3 p-4">
        {bookmarkedPages.map((pageNumber) => (
          <PdfThumbnailItem
            key={`pdf-bookmark-${documentController.documentKey}-${pageNumber}`}
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
        ))}
      </div>
    );
  };

  const renderOutline = () => {
    if (isOutlineLoading) {
      return (
        <div
          className="px-4 py-6 text-sm"
          style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
        >
          アウトラインを読み込み中です。
        </div>
      );
    }

    return (
      <div className="space-y-2 p-4">
        {outlineEntries.map((entry) => (
          <button
            key={`outline-${entry.pageNumber}`}
            type="button"
            onClick={() => onSelectPage(entry.pageNumber)}
            className="w-full rounded-2xl border px-3 py-2 text-left transition-colors"
            style={{
              borderColor: activePageNumbers.has(entry.pageNumber)
                ? PDF_THUMBNAIL_PANEL_COLORS.accent
                : PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
              background: activePageNumbers.has(entry.pageNumber)
                ? PDF_THUMBNAIL_PANEL_COLORS.surfaceBlush
                : PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
            }}
          >
            <div
              className="text-xs font-semibold"
              style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
            >
              {entry.pageNumber}
            </div>
            <div
              className="mt-1 text-sm font-medium line-clamp-2"
              style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textStrong }}
            >
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
        <div className="space-y-3 p-4">
          <div
            className="rounded-2xl border px-4 py-4 text-sm"
            style={{
              borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
              background: PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
              color: PDF_THUMBNAIL_PANEL_COLORS.textMuted,
            }}
          >
            OCR結果はまだありません。スキャンPDFならツールバーのOCRを実行してください。
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRunCurrentPageOcr?.()}
              disabled={isOcrRunning}
              className="rounded-full border px-3 py-2 text-xs font-semibold"
              style={{
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                background: PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft,
                color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
              }}
            >
              現在ページをOCR
            </button>
            <button
              type="button"
              onClick={() => onRunAllPagesOcr?.()}
              disabled={isOcrRunning}
              className="rounded-full border px-3 py-2 text-xs font-semibold"
              style={{
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                background: PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
                color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
              }}
            >
              全ページOCR
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            className="text-xs font-semibold"
            style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
          >
            OCR済み {orderedOcrPageNumbers.length} ページ
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRunCurrentPageOcr?.()}
              disabled={isOcrRunning}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold"
              style={{
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                background: PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft,
                color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
              }}
            >
              現在OCR
            </button>
            <button
              type="button"
              onClick={() => onRunAllPagesOcr?.()}
              disabled={isOcrRunning}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold"
              style={{
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                background: PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
                color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
              }}
            >
              全体OCR
            </button>
            <button
              type="button"
              onClick={() => onClearOcr?.()}
              disabled={isOcrRunning}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold"
              style={{
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                background: "rgba(255,255,255,0.9)",
                color: PDF_THUMBNAIL_PANEL_COLORS.textMuted,
              }}
            >
              OCR削除
            </button>
          </div>
        </div>

        {orderedOcrPageNumbers.map((pageNumber) => (
          <button
            key={`ocr-page-${pageNumber}`}
            type="button"
            onClick={() => onSelectPage(pageNumber)}
            className="w-full rounded-2xl border px-3 py-3 text-left transition-colors"
            style={{
              borderColor: activePageNumbers.has(pageNumber)
                ? PDF_THUMBNAIL_PANEL_COLORS.accent
                : PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
              background: activePageNumbers.has(pageNumber)
                ? PDF_THUMBNAIL_PANEL_COLORS.surfaceBlush
                : PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
            }}
          >
            <div
              className="mb-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold"
              style={{
                background: PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft,
                color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
              }}
            >
              p.{pageNumber}
            </div>
            <div
              className="text-xs leading-6 whitespace-pre-wrap break-words"
              style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textStrong }}
            >
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
        return renderBookmarkedGrid();
      case "outline":
        return renderOutline();
      case "ocr":
        return renderOcrPanel();
      default:
        return renderThumbnailGrid();
    }
  })();

  const tabList = (
    <div className="px-3 pb-3 pt-3">
      <div
        className="grid grid-cols-4 gap-2 rounded-full border p-1"
        style={{
          borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
          background: "rgba(248, 247, 245, 0.75)",
        }}
      >
        {PANEL_TABS.map((tab) => {
          const IconComponent =
            tab.id === "bookmarks"
              ? BookmarkIcon
              : tab.id === "outline"
                ? ListIcon
                : tab.id === "ocr"
                  ? OcrIcon
                  : GridIcon;
          const isSelected = selectedTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              aria-pressed={isSelected}
              onClick={() => onTabChange?.(tab.id)}
              className="inline-flex h-10 items-center justify-center rounded-full transition-colors"
              style={{
                color: isSelected
                  ? PDF_THUMBNAIL_PANEL_COLORS.accent
                  : PDF_THUMBNAIL_PANEL_COLORS.textMuted,
                background: isSelected
                  ? PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft
                  : "transparent",
              }}
            >
              <IconComponent className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );

  const scroller = (
    <div
      ref={handleScrollRootRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      {panelBody}
    </div>
  );

  if (isMobileViewport) {
    return (
      <>
        <button
          type="button"
          aria-label={isOpen ? "ページ一覧を閉じる" : "ページ一覧を開く"}
          onClick={() => onOpenChange(!isOpen)}
          className="absolute left-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-150"
          style={{
            color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
            background: "rgba(248, 247, 245, 0.94)",
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            boxShadow: "0 10px 22px rgba(216, 175, 181, 0.18)",
          }}
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
            "absolute inset-y-3 left-3 z-30 flex min-w-0 flex-col overflow-hidden rounded-[24px] border transition-all duration-150 ease-out",
            isOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          style={{
            width: "min(20rem, calc(100% - 1.5rem))",
            background: "linear-gradient(180deg, #F8F7F5 0%, #F7EFED 100%)",
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            boxShadow: PDF_THUMBNAIL_PANEL_COLORS.shadow,
            opacity: isOpen ? 1 : 0,
            transform: isOpen
              ? "translateX(0)"
              : "translateX(calc(-100% - 1rem))",
          }}
        >
          {tabList}
          {scroller}
        </aside>
      </>
    );
  }

  return (
    <aside
      className="relative z-10 h-full shrink-0 overflow-hidden border-r transition-[width] duration-150 ease-out"
      style={{
        width: isOpen
          ? `${DESKTOP_PANEL_WIDTH_PX}px`
          : `${DESKTOP_PANEL_COLLAPSED_WIDTH_PX}px`,
        background: "linear-gradient(180deg, #F8F7F5 0%, #F7EFED 100%)",
        borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
      }}
    >
      <div className="flex h-full min-w-0">
        <div
          className="flex w-14 shrink-0 flex-col items-center gap-2 border-r px-2 py-3"
          style={{
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
          }}
        >
          <button
            type="button"
            aria-label={isOpen ? "ページ一覧を閉じる" : "ページ一覧を開く"}
            onClick={() => onOpenChange(!isOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-150"
            style={{
              color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
              background: "rgba(248, 247, 245, 0.92)",
              borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
              boxShadow: "0 6px 16px rgba(216, 175, 181, 0.16)",
            }}
          >
            <span className="relative inline-flex items-center justify-center">
              <GridIcon className="h-4 w-4" />
              <span
                className="absolute -right-4 top-1/2 -translate-y-1/2"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.accent }}
              >
                {isOpen ? (
                  <ChevronLeftIcon className="h-3 w-3" />
                ) : (
                  <ChevronRightIcon className="h-3 w-3" />
                )}
              </span>
            </span>
          </button>

          <div
            className="rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums shadow-sm"
            style={{
              background: PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft,
              color: PDF_THUMBNAIL_PANEL_COLORS.textMuted,
              boxShadow: "0 4px 12px rgba(216, 175, 181, 0.12)",
            }}
          >
            {documentController.numPages}
          </div>
        </div>

        <div
          className={cn(
            "min-w-0 flex-1 flex-col transition-opacity duration-150 ease-out",
            isOpen ? "flex opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!isOpen}
        >
          {tabList}
          {scroller}
        </div>
      </div>
    </aside>
  );
};
