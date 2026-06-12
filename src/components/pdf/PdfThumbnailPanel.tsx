import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, } from "react";

import { createPortal } from "react-dom";

import { DragDropContext, Draggable, Droppable, type DropResult, } from "@hello-pangea/dnd";

import type { PdfPageLayoutMode } from "@/types";

import { cn } from "@/lib/utils";

import type { PdfDocumentController } from "./hooks/usePdfDocument";

import { PdfThumbnailItem } from "./PdfThumbnailItem";

import { isPdfTextItem } from "./pdfViewerTypes";



type PdfSidePanelTab = "markdown" | "outline" | "thumbnails";

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
}

interface IconProps {
  className?: string;
}

interface OutlineItem {
  pageNumber: number;
  title: string;
}

interface MarkdownItem {
  pageNumber: number;
  content: string;
}



const DESKTOP_PANEL_WIDTH_PX = 320;

const DESKTOP_PANEL_COLLAPSED_WIDTH_PX = 56;

const PDF_THUMBNAIL_PANEL_COLORS = {
  accent: "#D8AFB5",
  surfaceSoft: "#F5EBE9",
  surfaceMuted: "#F1E2E1",
  surfacePaper: "#F8F7F5",
  surfaceBlush: "#F7EFED",
  textStrong: "#5E545B",
  textMuted: "#8C7C83",
  shadow: "0 12px 28px rgba(216, 175, 181, 0.22)",
} as const;

const SIDE_PANEL_TABS = [
  { id: "markdown", label: "マークダウン" },
  { id: "outline", label: "アウトライン" },
  { id: "thumbnails", label: "サムネイル" },
] as const satisfies ReadonlyArray<{
  id: PdfSidePanelTab;
  label: string;
}>;



const buildNaturalPageNumbers = (numPages: number) => {
  return Array.from({ length: numPages }, (_, index) => index + 1);
};

const normalizeOrderedPageNumbers = (
  orderedPageNumbers: readonly number[] | undefined,
  numPages: number,
) => {
  const naturalPageNumbers = buildNaturalPageNumbers(numPages);
  if (!orderedPageNumbers || orderedPageNumbers.length === 0) {
    return naturalPageNumbers;
  }

  const naturalPageNumberSet = new Set(naturalPageNumbers);
  const normalizedPageNumbers = orderedPageNumbers.filter((pageNumber) => {
    return naturalPageNumberSet.has(pageNumber);
  });
  const seenPageNumbers = new Set(normalizedPageNumbers);

  naturalPageNumbers.forEach((pageNumber) => {
    if (!seenPageNumbers.has(pageNumber)) {
      normalizedPageNumbers.push(pageNumber);
    }
  });

  return normalizedPageNumbers;
};

const reorderPageNumbers = (
  pageNumbers: readonly number[],
  sourceIndex: number,
  destinationIndex: number,
) => {
  if (
    sourceIndex < 0 ||
    destinationIndex < 0 ||
    sourceIndex >= pageNumbers.length ||
    destinationIndex >= pageNumbers.length
  ) {
    return [...pageNumbers];
  }

  const nextPageNumbers = [...pageNumbers];
  const [movedPageNumber] = nextPageNumbers.splice(sourceIndex, 1);
  nextPageNumbers.splice(destinationIndex, 0, movedPageNumber);
  return nextPageNumbers;
};

const buildOutlineItems = (markdownItems: readonly MarkdownItem[]): OutlineItem[] => {
  return markdownItems.map(({ pageNumber, content }) => {
    const firstLine = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    return {
      pageNumber,
      title: firstLine ?? `ページ ${pageNumber}`,
    };
  });
};

const buildMarkdownTextFromItems = (items: readonly unknown[]) => {
  return items
    .filter(isPdfTextItem)
    .map((item) => item.str.replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0)
    .join("\n");
};



const GridIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <rect x="3" y="3" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="3" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="12" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
};

const ChevronLeftIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="M11.75 4.5 6.25 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const ChevronRightIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="m8.25 4.5 5.5 5.5-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const XIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
};

const MarkdownIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M3.5 5.5h13v9h-13z" stroke="currentColor" strokeWidth="1.4" rx="1.4" />
      <path
        d="M6.2 11.8V8.3l1.8 2.1 1.8-2.1v3.5M12.5 8.5v3.2m0 0-1.3-1.2m1.3 1.2 1.3-1.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const OutlineIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="5" cy="6" r="1.2" fill="currentColor" />
      <circle cx="5" cy="10" r="1.2" fill="currentColor" />
      <circle cx="5" cy="14" r="1.2" fill="currentColor" />
      <path
        d="M8 6h7M8 10h7M8 14h7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
};



const TAB_ICONS: Record<PdfSidePanelTab, (props: IconProps) => JSX.Element> = {
  markdown: MarkdownIcon,
  outline: OutlineIcon,
  thumbnails: GridIcon,
};



export const PdfThumbnailPanel = ({ documentController, currentPage, pageLayoutMode, bookmarkedPageNumbers, isMobileViewport, isOpen, onOpenChange, onSelectPage, onToggleBookmark, selectedTab = "thumbnails", onTabChange, orderedThumbnailPageNumbers, onThumbnailOrderChange, }: PdfThumbnailPanelProps) => { const [scrollRootElement, setScrollRootElement] = useState<HTMLElement | null>(null);
  const [markdownItems, setMarkdownItems] = useState<MarkdownItem[]>([]);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [previewOrderedThumbnailPageNumbers, setPreviewOrderedThumbnailPageNumbers] =
    useState<number[] | null>(null);
  const draggingPageNumberRef = useRef<number | null>(null);
  const itemWidthByPageNumberRef = useRef<Record<number, number>>({});
  const transparentDragImageRef = useRef<HTMLCanvasElement | null>(null);

  const normalizedOrderedThumbnailPageNumbers = useMemo(() => {
    return normalizeOrderedPageNumbers(
      orderedThumbnailPageNumbers,
      documentController.numPages,
    );
  }, [documentController.numPages, orderedThumbnailPageNumbers]);

  const displayedOrderedThumbnailPageNumbers =
    previewOrderedThumbnailPageNumbers ?? normalizedOrderedThumbnailPageNumbers;

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

  const outlineItems = useMemo(() => {
    return buildOutlineItems(markdownItems);
  }, [markdownItems]);

  const handleScrollRootRef = useCallback((element: HTMLDivElement | null) => {
    setScrollRootElement((previousElement) =>
      previousElement === element ? previousElement : element,
    );
  }, []);

  useEffect(() => {
    if (selectedTab === "thumbnails") {
      return;
    }

    if (documentController.numPages <= 0) {
      setMarkdownItems([]);
      return;
    }

    let cancelled = false;
    setIsTextLoading(true);

    void Promise.all(
      buildNaturalPageNumbers(documentController.numPages).map(async (pageNumber) => {
        const textContent = await documentController.getPageTextContent(pageNumber);
        return {
          pageNumber,
          content: buildMarkdownTextFromItems(textContent.items),
        } satisfies MarkdownItem;
      }),
    )
      .then((nextMarkdownItems) => {
        if (cancelled) {
          return;
        }

        setMarkdownItems(nextMarkdownItems);
      })
      .catch((errorValue) => {
        console.warn("[PdfThumbnailPanel] Failed to build markdown/outline", errorValue);
        if (!cancelled) {
          setMarkdownItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsTextLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentController, selectedTab]);

  const handleDragStart = useCallback((pageNumber: number) => {
    draggingPageNumberRef.current = pageNumber;
    setPreviewOrderedThumbnailPageNumbers(normalizedOrderedThumbnailPageNumbers);
  }, [normalizedOrderedThumbnailPageNumbers]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      draggingPageNumberRef.current = null;

      if (!result.destination) {
        setPreviewOrderedThumbnailPageNumbers(null);
        return;
      }

      if (result.destination.index === result.source.index) {
        setPreviewOrderedThumbnailPageNumbers(null);
        return;
      }

      const nextPageNumbers = reorderPageNumbers(
        normalizedOrderedThumbnailPageNumbers,
        result.source.index,
        result.destination.index,
      );

      setPreviewOrderedThumbnailPageNumbers(null);
      onThumbnailOrderChange?.(nextPageNumbers);
    },
    [normalizedOrderedThumbnailPageNumbers, onThumbnailOrderChange],
  );

  const handleDragUpdate = useCallback(
    (result: DropResult) => {
      if (!result.destination) {
        return;
      }

      const nextPageNumbers = reorderPageNumbers(
        normalizedOrderedThumbnailPageNumbers,
        result.source.index,
        result.destination.index,
      );

      setPreviewOrderedThumbnailPageNumbers((previousPageNumbers) => {
        const currentPageNumbers = previousPageNumbers ?? normalizedOrderedThumbnailPageNumbers;
        if (
          currentPageNumbers.length === nextPageNumbers.length &&
          currentPageNumbers.every((pageNumber, index) => pageNumber === nextPageNumbers[index])
        ) {
          return currentPageNumbers;
        }

        return nextPageNumbers;
      });
    },
    [normalizedOrderedThumbnailPageNumbers],
  );

  const handleTabSelect = useCallback(
    (nextTab: PdfSidePanelTab) => {
      if (nextTab === selectedTab) {
        return;
      }

      onTabChange?.(nextTab);
    },
    [onTabChange, selectedTab],
  );

  const thumbnailPanelContent = (
    <DragDropContext onDragUpdate={handleDragUpdate} onDragEnd={handleDragEnd}>
      <Droppable droppableId="pdf-thumbnail-grid" direction="vertical">
        {(droppableProvided) => (
          <div
            {...droppableProvided.droppableProps}
            ref={(element) => {
              droppableProvided.innerRef(element);
              handleScrollRootRef(element);
            }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {documentController.loading && displayedOrderedThumbnailPageNumbers.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 p-4">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={`pdf-thumbnail-skeleton-${index}`}
                    className="aspect-[0.72] rounded-[24px] border"
                    style={{
                      borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                      background: PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
                    }}
                  />
                ))}
              </div>
            ) : null}

            {!documentController.loading && documentController.error ? (
              <div
                className="px-4 py-6 text-sm"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
              >
                ページ一覧を準備できませんでした。
              </div>
            ) : null}

            {!documentController.loading &&
            !documentController.error &&
            displayedOrderedThumbnailPageNumbers.length === 0 ? (
              <div
                className="px-4 py-6 text-sm"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
              >
                ページ情報を読み込み中です。
              </div>
            ) : null}

            {displayedOrderedThumbnailPageNumbers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 p-4">
                {displayedOrderedThumbnailPageNumbers.map((pageNumber, index) => (
                  <Draggable
                    key={`pdf-thumbnail-draggable-${pageNumber}`}
                    draggableId={`pdf-thumbnail-draggable-${pageNumber}`}
                    index={index}
                    disableInteractiveElementBlocking
                  >
                    {(draggableProvided, snapshot) => {
                      const draggableStyle = {
                        ...draggableProvided.draggableProps.style,
                        width: snapshot.isDragging
                          ? itemWidthByPageNumberRef.current[pageNumber]
                          : undefined,
                        zIndex: snapshot.isDragging ? 9999 : 1,
                      } satisfies CSSProperties;

                      const draggableNode = (
                        <div
                          ref={(element) => {
                            draggableProvided.innerRef(element);

                            if (element) {
                              itemWidthByPageNumberRef.current[pageNumber] =
                                element.getBoundingClientRect().width;
                            }
                          }}
                          {...draggableProvided.draggableProps}
                          {...draggableProvided.dragHandleProps}
                          className={cn(
                            "transition-transform duration-150 ease-out",
                            snapshot.isDragging && "cursor-grabbing",
                          )}
                          style={draggableStyle}
                        >
                          <PdfThumbnailItem
                            documentKey={documentController.documentKey}
                            pageNumber={pageNumber}
                            baseSize={documentController.pageSizes[pageNumber]}
                            isActive={activePageNumbers.has(pageNumber)}
                            isBookmarked={bookmarkedPageNumbers.has(pageNumber)}
                            onSelect={onSelectPage}
                            onToggleBookmark={onToggleBookmark}
                            rootElement={scrollRootElement}
                            acquirePage={documentController.acquirePage}
                            setPageSize={documentController.setPageSize}
                          />
                        </div>
                      );

                      if (
                        snapshot.isDragging &&
                        typeof document !== "undefined" &&
                        document.body
                      ) {
                        return createPortal(draggableNode, document.body);
                      }

                      return draggableNode;
                    }}
                  </Draggable>
                ))}
                {droppableProvided.placeholder}
              </div>
            ) : null}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );

  const markdownPanelContent = (
    <div
      ref={handleScrollRootRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
    >
      {isTextLoading ? (
        <div className="text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          読み込み中...
        </div>
      ) : null}

      {!isTextLoading && markdownItems.length === 0 ? (
        <div className="text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          取得できるテキストがありません。
        </div>
      ) : null}

      <div className="space-y-4">
        {markdownItems.map((item) => (
          <button
            key={`pdf-markdown-${item.pageNumber}`}
            type="button"
            onClick={() => onSelectPage(item.pageNumber)}
            className="w-full rounded-[20px] border px-4 py-3 text-left"
            style={{
              borderColor: activePageNumbers.has(item.pageNumber)
                ? PDF_THUMBNAIL_PANEL_COLORS.accent
                : PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
              background: activePageNumbers.has(item.pageNumber)
                ? PDF_THUMBNAIL_PANEL_COLORS.surfaceBlush
                : PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
            }}
          >
            <div
              className="text-sm font-semibold"
              style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textStrong }}
            >
              {item.pageNumber}
            </div>
            <pre
              className="mt-2 whitespace-pre-wrap break-words text-xs leading-6"
              style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
            >
              {item.content ?? "テキストなし"}
            </pre>
          </button>
        ))}
      </div>
    </div>
  );

  const outlinePanelContent = (
    <div
      ref={handleScrollRootRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
    >
      {isTextLoading ? (
        <div className="text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          読み込み中...
        </div>
      ) : null}

      {!isTextLoading && outlineItems.length === 0 ? (
        <div className="text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          アウトラインがありません。
        </div>
      ) : null}

      <div className="space-y-2">
        {outlineItems.map((item) => (
          <button
            key={`pdf-outline-${item.pageNumber}`}
            type="button"
            onClick={() => onSelectPage(item.pageNumber)}
            className="flex w-full items-start gap-3 rounded-[16px] border px-3 py-3 text-left"
            style={{
              borderColor: activePageNumbers.has(item.pageNumber)
                ? PDF_THUMBNAIL_PANEL_COLORS.accent
                : PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
              background: activePageNumbers.has(item.pageNumber)
                ? PDF_THUMBNAIL_PANEL_COLORS.surfaceBlush
                : PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
            }}
          >
            <div
              className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold"
              style={{
                background: PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft,
                color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
              }}
            >
              {item.pageNumber}
            </div>
            <div
              className="min-w-0 text-sm leading-6"
              style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
            >
              {item.title}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const tabContent =
    selectedTab === "markdown"
      ? markdownPanelContent
      : selectedTab === "outline"
        ? outlinePanelContent
        : thumbnailPanelContent;

  const panelHeader = (
    <div
      className="border-b px-3 py-3"
      style={{ borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted }}
    >
      <div
        className="grid grid-cols-3 gap-2 rounded-full border p-1"
        style={{
          borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
          background: "rgba(248, 247, 245, 0.72)",
        }}
      >
        {SIDE_PANEL_TABS.map((tab) => {
          const TabIcon = TAB_ICONS[tab.id];
          const isActive = selectedTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              aria-pressed={isActive}
              onClick={() => handleTabSelect(tab.id)}
              className="inline-flex h-11 items-center justify-center rounded-full transition-colors duration-150"
              style={{
                background: isActive
                  ? PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft
                  : "transparent",
                color: isActive
                  ? PDF_THUMBNAIL_PANEL_COLORS.accent
                  : PDF_THUMBNAIL_PANEL_COLORS.textMuted,
              }}
            >
              <TabIcon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isMobileViewport) {
    return (
      <>
        <button
          type="button"
          aria-label={isOpen ? "サイドパネルを閉じる" : "サイドパネルを開く"}
          onClick={() => onOpenChange(!isOpen)}
          className="absolute left-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-150"
          style={{
            color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
            background: "rgba(248, 247, 245, 0.94)",
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            boxShadow: "0 10px 22px rgba(216, 175, 181, 0.18)",
          }}
        >
          {isOpen ? <XIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
        </button>

        {isOpen ? (
          <button
            type="button"
            aria-label="サイドパネルを閉じる"
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
            transform: isOpen ? "translateX(0)" : "translateX(calc(-100% - 1rem))",
          }}
        >
          {panelHeader}
          {tabContent}
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
          style={{ borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted }}
        >
          <button
            type="button"
            aria-label={isOpen ? "サイドパネルを閉じる" : "サイドパネルを開く"}
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
          {panelHeader}
          {tabContent}
        </div>
      </div>
    </aside>
  );
};
