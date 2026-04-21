import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
  type DroppableProvided,
} from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import type { PdfPageLayoutMode, PdfSidePanelTab } from "@/types";
import type {
  PdfDocumentController,
  PdfDocumentMarkdown,
  PdfDocumentOutlineItem,
} from "./hooks/usePdfDocument";
import { PdfThumbnailItem } from "./PdfThumbnailItem";

const DESKTOP_PANEL_WIDTH_PX = 336;
const DESKTOP_PANEL_COLLAPSED_WIDTH_PX = 64;

const PDF_PANEL_COLORS = {
  accent: "#D8AFB5",
  surfaceSoft: "#F5EBE9",
  surfaceMuted: "#F1E2E1",
  surfacePaper: "#F8F7F5",
  surfaceBlush: "#F7EFED",
  textStrong: "#5E545B",
  textMuted: "#8C7C83",
  shadow: "0 12px 28px rgba(216, 175, 181, 0.22)",
} as const;

const PANEL_TABS = [
  {
    id: "markdown",
    label: "マークダウン",
  },
  {
    id: "outline",
    label: "アウトライン",
  },
  {
    id: "thumbnails",
    label: "サムネイル",
  },
] as const satisfies ReadonlyArray<{
  id: PdfSidePanelTab;
  label: string;
}>;

type AsyncPanelState<T> = {
  documentKey: string;
  status: "idle" | "loading" | "ready" | "error";
  data: T | null;
  error: string | null;
};

interface PdfThumbnailPanelProps {
  documentController: PdfDocumentController;
  currentPage: number;
  pageLayoutMode: PdfPageLayoutMode;
  bookmarkedPageNumbers: ReadonlySet<number>;
  orderedThumbnailPageNumbers: number[];
  selectedTab: PdfSidePanelTab;
  isMobileViewport: boolean;
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onTabChange: (nextTab: PdfSidePanelTab) => void;
  onSelectPage: (pageNumber: number) => void;
  onToggleBookmark: (pageNumber: number) => void;
  onThumbnailOrderChange: (pageNumbers: number[]) => void;
}

interface IconProps {
  className?: string;
}

const createAsyncPanelState = <T,>(documentKey: string): AsyncPanelState<T> => {
  return {
    documentKey,
    status: "idle",
    data: null,
    error: null,
  };
};

const buildPageNumbers = (numPages: number) => {
  return Array.from({ length: numPages }, (_, index) => index + 1);
};

const moveArrayItem = <T,>(values: T[], fromIndex: number, toIndex: number) => {
  const nextValues = [...values];
  const [movedValue] = nextValues.splice(fromIndex, 1);
  nextValues.splice(toIndex, 0, movedValue);
  return nextValues;
};

const getOutlineSourceLabel = (outlineItems: PdfDocumentOutlineItem[]) => {
  const hasNativeOutline = outlineItems.some((outlineItem) => {
    return outlineItem.source === "pdf-outline";
  });

  return hasNativeOutline
    ? "PDF のアウトライン"
    : "ページ先頭のテキストから自動生成";
};

const GridIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="3" y="3" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="3" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="12" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
};

const OutlineIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M4 5h3M9 5h7M4 10h3M9 10h7M4 15h3M9 15h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5.5" cy="5" r="1" fill="currentColor" />
      <circle cx="5.5" cy="10" r="1" fill="currentColor" />
      <circle cx="5.5" cy="15" r="1" fill="currentColor" />
    </svg>
  );
};

const MarkdownIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M3.5 5.25A1.75 1.75 0 0 1 5.25 3.5h9.5a1.75 1.75 0 0 1 1.75 1.75v9.5a1.75 1.75 0 0 1-1.75 1.75h-9.5A1.75 1.75 0 0 1 3.5 14.75v-9.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 13V7l2 2.5L10 7v6M12.5 11h2.5l-2.5 2.5v-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ChevronLeftIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M11.75 4.5 6.25 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ChevronRightIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="m8.25 4.5 5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const XIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

const getTabIcon = (tab: PdfSidePanelTab) => {
  if (tab === "markdown") {
    return MarkdownIcon;
  }

  if (tab === "outline") {
    return OutlineIcon;
  }

  return GridIcon;
};

const renderEmptyState = (message: string) => {
  return (
    <div
      className="px-4 py-6 text-sm"
      style={{ color: PDF_PANEL_COLORS.textMuted }}
    >
      {message}
    </div>
  );
};

const renderLoadingState = () => {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }, (_, index) => {
        return (
          <div
            key={`pdf-panel-loading-${index}`}
            className="rounded-2xl border px-4 py-3"
            style={{
              borderColor: PDF_PANEL_COLORS.surfaceMuted,
              background: PDF_PANEL_COLORS.surfacePaper,
            }}
          >
            <div className="h-3 w-28 rounded-full bg-white/80" />
            <div className="mt-3 h-3 w-full rounded-full bg-white/70" />
            <div className="mt-2 h-3 w-5/6 rounded-full bg-white/60" />
          </div>
        );
      })}
    </div>
  );
};

const PanelRailTabs = ({
  selectedTab,
  isOpen,
  onSelectTab,
}: {
  selectedTab: PdfSidePanelTab;
  isOpen: boolean;
  onSelectTab: (nextTab: PdfSidePanelTab) => void;
}) => {
  return (
    <div className="mt-2 flex w-full flex-col gap-2">
      {PANEL_TABS.map((tab) => {
        const Icon = getTabIcon(tab.id);
        const isActive = tab.id === selectedTab;

        return (
          <button
            key={tab.id}
            type="button"
            aria-label={`${tab.label} タブを開く`}
            aria-pressed={isActive}
            onClick={() => onSelectTab(tab.id)}
            className="inline-flex h-10 w-10 items-center justify-center self-center rounded-full border transition-all duration-150"
            style={{
              color: isActive
                ? PDF_PANEL_COLORS.accent
                : PDF_PANEL_COLORS.textMuted,
              background: isActive
                ? PDF_PANEL_COLORS.surfaceSoft
                : "rgba(248, 247, 245, 0.92)",
              borderColor: isActive
                ? PDF_PANEL_COLORS.accent
                : PDF_PANEL_COLORS.surfaceMuted,
              boxShadow: isOpen && isActive
                ? "0 8px 18px rgba(216, 175, 181, 0.18)"
                : "0 4px 12px rgba(216, 175, 181, 0.08)",
            }}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
};

const PanelTabsBar = ({
  selectedTab,
  onTabChange,
}: {
  selectedTab: PdfSidePanelTab;
  onTabChange: (nextTab: PdfSidePanelTab) => void;
}) => {
  return (
    <div
      className="border-b px-3 py-3"
      style={{ borderColor: PDF_PANEL_COLORS.surfaceMuted }}
    >
      <div
        className="inline-flex w-full items-center gap-1 rounded-full border p-1"
        style={{
          borderColor: PDF_PANEL_COLORS.surfaceMuted,
          background: "rgba(248, 247, 245, 0.92)",
        }}
      >
        {PANEL_TABS.map((tab) => {
          const isActive = tab.id === selectedTab;

          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onTabChange(tab.id)}
              className="inline-flex flex-1 items-center justify-center rounded-full px-3 py-2 text-[12px] font-semibold transition-colors duration-150"
              style={{
                color: isActive
                  ? PDF_PANEL_COLORS.accent
                  : PDF_PANEL_COLORS.textMuted,
                background: isActive
                  ? PDF_PANEL_COLORS.surfaceSoft
                  : "transparent",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const OutlineTree = ({
  outlineItems,
  activePageNumbers,
  onSelectPage,
}: {
  outlineItems: PdfDocumentOutlineItem[];
  activePageNumbers: ReadonlySet<number>;
  onSelectPage: (pageNumber: number) => void;
}) => {
  return (
    <div className="space-y-1 p-3">
      {outlineItems.map((outlineItem) => {
        const isCurrentPage =
          typeof outlineItem.pageNumber === "number" &&
          activePageNumbers.has(outlineItem.pageNumber);

        return (
          <div key={outlineItem.id}>
            <button
              type="button"
              disabled={outlineItem.pageNumber === null}
              onClick={() => {
                if (typeof outlineItem.pageNumber === "number") {
                  onSelectPage(outlineItem.pageNumber);
                }
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition-colors duration-150",
                outlineItem.pageNumber === null && "cursor-default opacity-80",
              )}
              style={{
                marginLeft: `${Math.min(outlineItem.depth * 10, 32)}px`,
                borderColor: isCurrentPage
                  ? PDF_PANEL_COLORS.accent
                  : PDF_PANEL_COLORS.surfaceMuted,
                background: isCurrentPage
                  ? PDF_PANEL_COLORS.surfaceSoft
                  : PDF_PANEL_COLORS.surfacePaper,
                color: isCurrentPage
                  ? PDF_PANEL_COLORS.accent
                  : PDF_PANEL_COLORS.textStrong,
              }}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {outlineItem.title}
              </span>
              {typeof outlineItem.pageNumber === "number" ? (
                <span
                  className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums"
                  style={{
                    background: PDF_PANEL_COLORS.surfaceBlush,
                    color: PDF_PANEL_COLORS.textMuted,
                  }}
                >
                  p.{outlineItem.pageNumber}
                </span>
              ) : null}
            </button>
            {outlineItem.children.length > 0 ? (
              <div className="pt-1">
                <OutlineTree
                  outlineItems={outlineItem.children}
                  activePageNumbers={activePageNumbers}
                  onSelectPage={onSelectPage}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export const PdfThumbnailPanel = ({
  documentController,
  currentPage,
  pageLayoutMode,
  bookmarkedPageNumbers,
  orderedThumbnailPageNumbers,
  selectedTab,
  isMobileViewport,
  isOpen,
  onOpenChange,
  onTabChange,
  onSelectPage,
  onToggleBookmark,
  onThumbnailOrderChange,
}: PdfThumbnailPanelProps) => {
  const [scrollRootElement, setScrollRootElement] = useState<HTMLElement | null>(
    null,
  );
  const [isDndReady, setIsDndReady] = useState(false);
  const [markdownState, setMarkdownState] = useState<AsyncPanelState<PdfDocumentMarkdown>>(
    () => createAsyncPanelState(documentController.documentKey),
  );
  const [outlineState, setOutlineState] = useState<
    AsyncPanelState<PdfDocumentOutlineItem[]>
  >(() => createAsyncPanelState(documentController.documentKey));

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

  const naturalPageNumbers = useMemo(() => {
    return buildPageNumbers(documentController.numPages);
  }, [documentController.numPages]);

  const fallbackThumbnailPageNumbers = useMemo(() => {
    return orderedThumbnailPageNumbers.length > 0
      ? orderedThumbnailPageNumbers
      : naturalPageNumbers;
  }, [naturalPageNumbers, orderedThumbnailPageNumbers]);

  const handleScrollRootRef = useCallback((element: HTMLDivElement | null) => {
    setScrollRootElement((previousElement) => {
      return previousElement === element ? previousElement : element;
    });
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsDndReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      queueMicrotask(() => {
        setIsDndReady(false);
      });
    };
  }, []);

  useEffect(() => {
    if (markdownState.documentKey === documentController.documentKey) {
      return;
    }

    setMarkdownState(createAsyncPanelState(documentController.documentKey));
  }, [documentController.documentKey, markdownState.documentKey]);

  useEffect(() => {
    if (outlineState.documentKey === documentController.documentKey) {
      return;
    }

    setOutlineState(createAsyncPanelState(documentController.documentKey));
  }, [documentController.documentKey, outlineState.documentKey]);

  useEffect(() => {
    if (
      selectedTab !== "markdown" ||
      documentController.loading ||
      documentController.error ||
      !documentController.doc
    ) {
      return;
    }

    if (
      markdownState.documentKey === documentController.documentKey &&
      (markdownState.status === "loading" || markdownState.status === "ready")
    ) {
      return;
    }

    let cancelled = false;

    setMarkdownState({
      documentKey: documentController.documentKey,
      status: "loading",
      data: null,
      error: null,
    });

    void documentController
      .getDocumentMarkdown()
      .then((markdownDocument) => {
        if (cancelled) {
          return;
        }

        setMarkdownState({
          documentKey: documentController.documentKey,
          status: "ready",
          data: markdownDocument,
          error: null,
        });
      })
      .catch((errorValue) => {
        if (cancelled) {
          return;
        }

        setMarkdownState({
          documentKey: documentController.documentKey,
          status: "error",
          data: null,
          error: errorValue instanceof Error ? errorValue.message : String(errorValue),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    documentController,
    markdownState.documentKey,
    markdownState.status,
    selectedTab,
  ]);

  useEffect(() => {
    if (
      selectedTab !== "outline" ||
      documentController.loading ||
      documentController.error ||
      !documentController.doc
    ) {
      return;
    }

    if (
      outlineState.documentKey === documentController.documentKey &&
      (outlineState.status === "loading" || outlineState.status === "ready")
    ) {
      return;
    }

    let cancelled = false;

    setOutlineState({
      documentKey: documentController.documentKey,
      status: "loading",
      data: null,
      error: null,
    });

    void documentController
      .getDocumentOutline()
      .then((outlineItems) => {
        if (cancelled) {
          return;
        }

        setOutlineState({
          documentKey: documentController.documentKey,
          status: "ready",
          data: outlineItems,
          error: null,
        });
      })
      .catch((errorValue) => {
        if (cancelled) {
          return;
        }

        setOutlineState({
          documentKey: documentController.documentKey,
          status: "error",
          data: null,
          error: errorValue instanceof Error ? errorValue.message : String(errorValue),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [documentController, outlineState.documentKey, outlineState.status, selectedTab]);

  const handleDesktopTabShortcut = useCallback(
    (nextTab: PdfSidePanelTab) => {
      onTabChange(nextTab);
      if (!isOpen) {
        onOpenChange(true);
      }
    },
    [isOpen, onOpenChange, onTabChange],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) {
        return;
      }

      if (result.destination.index === result.source.index) {
        return;
      }

      const nextPageNumbers = moveArrayItem(
        fallbackThumbnailPageNumbers,
        result.source.index,
        result.destination.index,
      );
      onThumbnailOrderChange(nextPageNumbers);
    },
    [fallbackThumbnailPageNumbers, onThumbnailOrderChange],
  );

  const thumbnailTabContent = useMemo(() => {
    if (documentController.loading && fallbackThumbnailPageNumbers.length === 0) {
      return renderLoadingState();
    }

    if (documentController.error) {
      return renderEmptyState("サムネイル一覧を準備できませんでした。");
    }

    if (fallbackThumbnailPageNumbers.length === 0) {
      return renderEmptyState("ページ情報を読み込み中です。");
    }

    const renderThumbnailList = (
      providedAttributes?: Pick<
        DroppableProvided,
        "innerRef" | "droppableProps" | "placeholder"
      >,
    ) => {
      return (
        <div
          ref={(element) => {
            handleScrollRootRef(element);
            providedAttributes?.innerRef(element);
          }}
          {...providedAttributes?.droppableProps}
          className="space-y-3 p-3"
        >
          <div
            className="rounded-2xl border px-3 py-2 text-[11px] font-medium"
            style={{
              borderColor: PDF_PANEL_COLORS.surfaceMuted,
              background: PDF_PANEL_COLORS.surfacePaper,
              color: PDF_PANEL_COLORS.textMuted,
            }}
          >
            ドラッグで並び替えできます。ページ番号は元の PDF の位置を保ちます。
          </div>

          {fallbackThumbnailPageNumbers.map((pageNumber, index) => {
            return (
              <Draggable
                key={`pdf-thumbnail-draggable-${documentController.documentKey}-${pageNumber}`}
                draggableId={`pdf-thumbnail-draggable-${documentController.documentKey}-${pageNumber}`}
                index={index}
                isDragDisabled={!isDndReady}
              >
                {(draggableProvided, draggableSnapshot) => {
                  const draggableStyle = {
                    ...(draggableProvided.draggableProps.style ?? {}),
                    zIndex: draggableSnapshot.isDragging ? 20 : undefined,
                  } satisfies CSSProperties;

                  return (
                    <PdfThumbnailItem
                      documentKey={documentController.documentKey}
                      pageNumber={pageNumber}
                      baseSize={documentController.pageSizes[pageNumber]}
                      isActive={activePageNumbers.has(pageNumber)}
                      isBookmarked={bookmarkedPageNumbers.has(pageNumber)}
                      isDragging={draggableSnapshot.isDragging}
                      dragStyle={draggableStyle}
                      outerRef={draggableProvided.innerRef}
                      draggableProps={draggableProvided.draggableProps}
                      dragHandleProps={draggableProvided.dragHandleProps}
                      onSelect={onSelectPage}
                      onToggleBookmark={onToggleBookmark}
                      rootElement={scrollRootElement}
                      acquirePage={documentController.acquirePage}
                      setPageSize={documentController.setPageSize}
                    />
                  );
                }}
              </Draggable>
            );
          })}

          {providedAttributes?.placeholder}
        </div>
      );
    };

    if (!isDndReady) {
      return renderThumbnailList();
    }

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`pdf-thumbnails-${documentController.documentKey}`}>
          {(droppableProvided) => {
            return renderThumbnailList({
              innerRef: droppableProvided.innerRef,
              droppableProps: droppableProvided.droppableProps,
              placeholder: droppableProvided.placeholder,
            });
          }}
        </Droppable>
      </DragDropContext>
    );
  }, [
    activePageNumbers,
    bookmarkedPageNumbers,
    documentController,
    fallbackThumbnailPageNumbers,
    handleDragEnd,
    handleScrollRootRef,
    isDndReady,
    onSelectPage,
    onToggleBookmark,
    scrollRootElement,
  ]);

  const markdownTabContent = useMemo(() => {
    if (documentController.loading || markdownState.status === "loading") {
      return renderLoadingState();
    }

    if (documentController.error) {
      return renderEmptyState("マークダウンを準備できませんでした。");
    }

    if (markdownState.status === "error") {
      return renderEmptyState(markdownState.error ?? "マークダウンを準備できませんでした。");
    }

    if (!markdownState.data || markdownState.data.sections.length === 0) {
      return renderEmptyState("抽出できるテキストがありませんでした。");
    }

    return (
      <div ref={handleScrollRootRef} className="space-y-3 p-3">
        {markdownState.data.sections.map((section) => {
          const isCurrentPage = activePageNumbers.has(section.pageNumber);

          return (
            <section
              key={section.id}
              className="overflow-hidden rounded-2xl border"
              style={{
                borderColor: isCurrentPage
                  ? PDF_PANEL_COLORS.accent
                  : PDF_PANEL_COLORS.surfaceMuted,
                background: PDF_PANEL_COLORS.surfacePaper,
                boxShadow: isCurrentPage
                  ? "0 10px 24px rgba(216, 175, 181, 0.16)"
                  : "0 6px 16px rgba(216, 175, 181, 0.08)",
              }}
            >
              <div
                className="flex items-center justify-between gap-3 border-b px-3 py-2"
                style={{ borderColor: PDF_PANEL_COLORS.surfaceMuted }}
              >
                <div className="min-w-0">
                  <div
                    className="text-[11px] font-semibold tracking-[0.16em]"
                    style={{ color: PDF_PANEL_COLORS.textMuted }}
                  >
                    PAGE {section.pageNumber}
                  </div>
                  <div
                    className="mt-1 truncate text-sm font-semibold"
                    style={{ color: PDF_PANEL_COLORS.textStrong }}
                  >
                    {section.title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPage(section.pageNumber)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150"
                  style={{
                    color: PDF_PANEL_COLORS.accent,
                    background: PDF_PANEL_COLORS.surfaceSoft,
                  }}
                >
                  開く
                </button>
              </div>
              <pre
                className="overflow-x-auto whitespace-pre-wrap px-3 py-3 text-[12px] leading-6"
                style={{ color: PDF_PANEL_COLORS.textStrong }}
              >
                {section.markdown}
              </pre>
            </section>
          );
        })}
      </div>
    );
  }, [activePageNumbers, documentController.error, documentController.loading, handleScrollRootRef, markdownState, onSelectPage]);

  const outlineTabContent = useMemo(() => {
    if (documentController.loading || outlineState.status === "loading") {
      return renderLoadingState();
    }

    if (documentController.error) {
      return renderEmptyState("アウトラインを準備できませんでした。");
    }

    if (outlineState.status === "error") {
      return renderEmptyState(outlineState.error ?? "アウトラインを準備できませんでした。");
    }

    if (!outlineState.data || outlineState.data.length === 0) {
      return renderEmptyState("アウトラインが見つかりませんでした。");
    }

    return (
      <div ref={handleScrollRootRef} className="p-3">
        <div
          className="mb-3 rounded-2xl border px-3 py-2 text-[11px] font-medium"
          style={{
            borderColor: PDF_PANEL_COLORS.surfaceMuted,
            background: PDF_PANEL_COLORS.surfacePaper,
            color: PDF_PANEL_COLORS.textMuted,
          }}
        >
          {getOutlineSourceLabel(outlineState.data)}
        </div>
        <OutlineTree
          outlineItems={outlineState.data}
          activePageNumbers={activePageNumbers}
          onSelectPage={onSelectPage}
        />
      </div>
    );
  }, [activePageNumbers, documentController.error, documentController.loading, handleScrollRootRef, onSelectPage, outlineState]);

  const activeTabContent = (() => {
    if (selectedTab === "markdown") {
      return markdownTabContent;
    }

    if (selectedTab === "outline") {
      return outlineTabContent;
    }

    return thumbnailTabContent;
  })();

  if (isMobileViewport) {
    const MobileToggleIcon = getTabIcon(selectedTab);

    return (
      <>
        <button
          type="button"
          aria-label={isOpen ? "サイドパネルを閉じる" : "サイドパネルを開く"}
          onClick={() => onOpenChange(!isOpen)}
          className="absolute left-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-150"
          style={{
            color: PDF_PANEL_COLORS.textStrong,
            background: "rgba(248, 247, 245, 0.94)",
            borderColor: PDF_PANEL_COLORS.surfaceMuted,
            boxShadow: "0 10px 22px rgba(216, 175, 181, 0.18)",
          }}
        >
          {isOpen ? <XIcon className="h-4 w-4" /> : <MobileToggleIcon className="h-4 w-4" />}
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
            width: "min(21rem, calc(100% - 1.5rem))",
            background: "linear-gradient(180deg, #F8F7F5 0%, #F7EFED 100%)",
            borderColor: PDF_PANEL_COLORS.surfaceMuted,
            boxShadow: PDF_PANEL_COLORS.shadow,
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateX(0)" : "translateX(calc(-100% - 1rem))",
          }}
        >
          <PanelTabsBar selectedTab={selectedTab} onTabChange={onTabChange} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {activeTabContent}
          </div>
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
        borderColor: PDF_PANEL_COLORS.surfaceMuted,
      }}
    >
      <div className="flex h-full min-w-0">
        <div
          className="flex w-16 shrink-0 flex-col items-center gap-2 border-r px-2 py-3"
          style={{ borderColor: PDF_PANEL_COLORS.surfaceMuted }}
        >
          <button
            type="button"
            aria-label={isOpen ? "サイドパネルを閉じる" : "サイドパネルを開く"}
            onClick={() => onOpenChange(!isOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-150"
            style={{
              color: PDF_PANEL_COLORS.textStrong,
              background: "rgba(248, 247, 245, 0.92)",
              borderColor: PDF_PANEL_COLORS.surfaceMuted,
              boxShadow: "0 6px 16px rgba(216, 175, 181, 0.16)",
            }}
          >
            <span className="relative inline-flex items-center justify-center">
              <GridIcon className="h-4 w-4" />
              <span
                className="absolute -right-4 top-1/2 -translate-y-1/2"
                style={{ color: PDF_PANEL_COLORS.accent }}
              >
                {isOpen ? (
                  <ChevronLeftIcon className="h-3 w-3" />
                ) : (
                  <ChevronRightIcon className="h-3 w-3" />
                )}
              </span>
            </span>
          </button>

          <PanelRailTabs
            selectedTab={selectedTab}
            isOpen={isOpen}
            onSelectTab={handleDesktopTabShortcut}
          />
        </div>

        <div
          className={cn(
            "min-w-0 flex-1 flex-col transition-opacity duration-150 ease-out",
            isOpen ? "flex opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!isOpen}
        >
          <PanelTabsBar selectedTab={selectedTab} onTabChange={onTabChange} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {activeTabContent}
          </div>
        </div>
      </div>
    </aside>
  );
};
