
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactElement,
} from "react";
import type { PdfPageLayoutMode, PdfSidePanelTab } from "@/types";
import { cn } from "@/lib/utils";
import type { PdfDocumentController } from "./hooks/usePdfDocument";
import {
  isPdfJsReference,
  isPdfTextItem,
  type PdfJsDocument,
  type PdfJsOutlineDestination,
  type PdfJsOutlineItem,
} from "./pdfViewerTypes";
import { PdfThumbnailItem } from "./PdfThumbnailItem";

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

type AsyncStatus = "idle" | "loading" | "ready" | "error";

interface PdfOutlineEntry {
  id: string;
  title: string;
  pageNumber: number | null;
  items: PdfOutlineEntry[];
}

interface PdfMarkdownState {
  status: AsyncStatus;
  content: string;
}

interface PdfOutlineState {
  status: AsyncStatus;
  items: PdfOutlineEntry[];
}

interface PdfThumbnailPanelProps {
  documentController: PdfDocumentController;
  currentPage: number;
  pageLayoutMode: PdfPageLayoutMode;
  bookmarkedPageNumbers: ReadonlySet<number>;
  selectedTab?: PdfSidePanelTab;
  orderedThumbnailPageNumbers?: number[];
  isMobileViewport: boolean;
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onTabChange?: (nextTab: PdfSidePanelTab) => void;
  onSelectPage: (pageNumber: number) => void;
  onToggleBookmark: (pageNumber: number) => void;
  onThumbnailOrderChange?: (pageNumbers: number[]) => void;
}

interface IconProps {
  className?: string;
}

const TAB_ITEMS = [
  { id: "markdown", label: "マークダウン" },
  { id: "outline", label: "アウトライン" },
  { id: "thumbnails", label: "サムネイル" },
] as const satisfies ReadonlyArray<{
  id: PdfSidePanelTab;
  label: string;
}>;

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

const OutlineIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path d="M5 5.5h10M5 10h10M5 14.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="3.5" cy="5.5" r="0.8" fill="currentColor" />
      <circle cx="3.5" cy="10" r="0.8" fill="currentColor" />
      <circle cx="3.5" cy="14.5" r="0.8" fill="currentColor" />
    </svg>
  );
};

const MarkdownIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path d="M3.5 5.5h13v9h-13z" stroke="currentColor" strokeWidth="1.4" rx="1.6" />
      <path d="M6.2 12.8V7.2l2.1 2.5 2.1-2.5v5.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13 8.2 1.6 1.8H13.6v2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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

const TAB_ICON_BY_ID: Record<PdfSidePanelTab, (props: IconProps) => ReactElement> = {
  markdown: MarkdownIcon,
  outline: OutlineIcon,
  thumbnails: GridIcon,
};

const buildPageNumbers = (numPages: number) => {
  return Array.from({ length: numPages }, (_, index) => index + 1);
};

const normalizeThumbnailOrder = (pageNumbers: number[] | undefined, numPages: number) => {
  const defaultPageNumbers = buildPageNumbers(numPages);

  if (numPages <= 0) {
    return [];
  }

  if (!Array.isArray(pageNumbers) || pageNumbers.length === 0) {
    return defaultPageNumbers;
  }

  const seen = new Set<number>();
  const normalizedPageNumbers: number[] = [];

  pageNumbers.forEach((pageNumber) => {
    if (typeof pageNumber !== "number" || !Number.isFinite(pageNumber)) {
      return;
    }

    const normalizedPageNumber = Math.max(1, Math.trunc(pageNumber));
    if (normalizedPageNumber > numPages || seen.has(normalizedPageNumber)) {
      return;
    }

    seen.add(normalizedPageNumber);
    normalizedPageNumbers.push(normalizedPageNumber);
  });

  defaultPageNumbers.forEach((pageNumber) => {
    if (seen.has(pageNumber)) {
      return;
    }

    normalizedPageNumbers.push(pageNumber);
  });

  return normalizedPageNumbers;
};


const extractPageText = async ({
  getPageTextContent,
  cache,
  pageNumber,
}: {
  getPageTextContent: PdfDocumentController["getPageTextContent"];
  cache: Map<number, string>;
  pageNumber: number;
}) => {
  const cachedText = cache.get(pageNumber);
  if (typeof cachedText === "string") {
    return cachedText;
  }

  const textContent = await getPageTextContent(pageNumber);
  const nextText = textContent.items
    .filter(isPdfTextItem)
    .map((item) => item.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  cache.set(pageNumber, nextText);
  return nextText;
};

const truncateOutlineTitle = (value: string) => {
  if (value.length <= 48) {
    return value;
  }

  return `${value.slice(0, 48)}…`;
};

const resolveOutlineDestinationToPageNumber = async (
  doc: PdfJsDocument,
  dest: PdfJsOutlineDestination | undefined,
): Promise<number | null> => {
  if (!dest) {
    return null;
  }

  let resolvedDestination: PdfJsOutlineDestination = dest;

  if (typeof resolvedDestination === "string") {
    if (typeof doc.getDestination !== "function") {
      return null;
    }

    resolvedDestination = await doc.getDestination(resolvedDestination);
  }

  if (!Array.isArray(resolvedDestination) || resolvedDestination.length === 0) {
    return null;
  }

  const [target] = resolvedDestination;

  if (typeof target === "number" && Number.isFinite(target)) {
    return Math.max(1, Math.trunc(target) + 1);
  }

  if (isPdfJsReference(target) && typeof doc.getPageIndex === "function") {
    try {
      const pageIndex = await doc.getPageIndex(target);
      if (Number.isFinite(pageIndex)) {
        return Math.max(1, Math.trunc(pageIndex) + 1);
      }
    } catch {
      return null;
    }
  }

  return null;
};

const normalizeOutlineItems = async ({
  items,
  doc,
  parentId,
}: {
  items: PdfJsOutlineItem[];
  doc: PdfJsDocument;
  parentId: string;
}): Promise<PdfOutlineEntry[]> => {
  const normalizedItems: PdfOutlineEntry[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const id = `${parentId}-${index}`;
    const pageNumber = await resolveOutlineDestinationToPageNumber(doc, item.dest);
    const children = Array.isArray(item.items) && item.items.length > 0
      ? await normalizeOutlineItems({
          items: item.items,
          doc,
          parentId: id,
        })
      : [];

    normalizedItems.push({
      id,
      title: truncateOutlineTitle(item.title?.trim() || `Section ${index + 1}`),
      items: children,
    });
  }

  return normalizedItems;
};

const buildFallbackOutlineEntries = async ({
  getPageTextContent,
  pageNumbers,
  cache,
}: {
  getPageTextContent: PdfDocumentController["getPageTextContent"];
  pageNumbers: number[];
  cache: Map<number, string>;
}) => {
  const fallbackEntries: PdfOutlineEntry[] = [];

  for (const pageNumber of pageNumbers) {
    const text = await extractPageText({
      getPageTextContent,
      cache,
    });
    const firstMeaningfulLine =
      text
        .split(/(?<=[。.!?])\s+/)
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? `Page ${pageNumber}`;

    fallbackEntries.push({
      id: `fallback-outline-${pageNumber}`,
      title: truncateOutlineTitle(firstMeaningfulLine),
      items: [],
    });
  }

  return fallbackEntries;
};

const renderOutlineEntries = ({
  items,
  depth,
  onSelectPage,
}: {
  items: PdfOutlineEntry[];
  depth: number;
  onSelectPage: (pageNumber: number) => void;
}) => {
  return items.map((item) => {
    return (
      <div key={item.id} className="min-w-0">
        <button
          type="button"
          onClick={() => {
            if (typeof item.pageNumber === "number") {
              onSelectPage(item.pageNumber);
            }
          }}
          className="flex w-full min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors duration-150"
          style={{
            marginLeft: `${depth * 12}px`,
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            background: "rgba(248, 247, 245, 0.78)",
            color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
          }}
          disabled={typeof item.pageNumber !== "number"}
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {item.title}
          </span>
          {typeof item.pageNumber === "number" ? (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              style={{
                background: PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft,
                color: PDF_THUMBNAIL_PANEL_COLORS.textMuted,
              }}
            >
              {item.pageNumber}
            </span>
          ) : null}
        </button>

        {item.items.length > 0 ? (
          <div className="mt-2 space-y-2">
            {renderOutlineEntries({
              items: item.items,
              depth: depth + 1,
              onSelectPage,
            })}
          </div>
        ) : null}
      </div>
    );
  });
};

export const PdfThumbnailPanel = ({
  documentController,
  currentPage,
  pageLayoutMode,
  bookmarkedPageNumbers,
  selectedTab = "thumbnails",
  orderedThumbnailPageNumbers,
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
  const [markdownState, setMarkdownState] = useState<PdfMarkdownState>({
    status: "idle",
    content: "",
  });
  const [outlineState, setOutlineState] = useState<PdfOutlineState>({
    status: "idle",
    items: [],
  });
  const [draggingPageNumber, setDraggingPageNumber] = useState<number | null>(null);
  const [dropTargetPageNumber, setDropTargetPageNumber] = useState<number | null>(
    null,
  );
  const [previewThumbnailPageNumbers, setPreviewThumbnailPageNumbers] = useState<
    number[] | null
  >(null);

  const pageTextCacheRef = useRef<Map<number, string>>(new Map());
  const didDropRef = useRef(false);

  const normalizedTab: PdfSidePanelTab =
    selectedTab === "markdown" ||
    selectedTab === "outline" ||
    selectedTab === "thumbnails"
      ? selectedTab
      : "thumbnails";

  const pageNumbers = useMemo(
    () => buildPageNumbers(documentController.numPages),
    [documentController.numPages],
  );

  const normalizedOrderedThumbnailPageNumbers = useMemo(
    () =>
      normalizeThumbnailOrder(
        orderedThumbnailPageNumbers,
        documentController.numPages,
      ),
    [documentController.numPages, orderedThumbnailPageNumbers],
  );

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

  const handleScrollRootRef = useCallback((element: HTMLDivElement | null) => {
    setScrollRootElement((previousElement) =>
      previousElement === element ? previousElement : element,
    );
  }, []);

  const handleTabChange = useCallback(
    (nextTab: PdfSidePanelTab) => {
      onTabChange?.(nextTab);
    },
    [onTabChange],
  );

  const handleSelectPage = useCallback(
    (pageNumber: number) => {
      onSelectPage(pageNumber);
    },
    [onSelectPage],
  );

  const reorderPageNumbers = useCallback(
    (
      pageNumbers: number[],
      sourcePageNumber: number,
      destinationPageNumber: number,
    ) => {
      const sourceIndex = pageNumbers.indexOf(sourcePageNumber);
      const destinationIndex = pageNumbers.indexOf(destinationPageNumber);

      if (
        sourceIndex < 0 ||
        destinationIndex < 0 ||
        sourceIndex === destinationIndex
      ) {
        return pageNumbers;
      }

      const nextPageNumbers = [...pageNumbers];
      const [movedPageNumber] = nextPageNumbers.splice(sourceIndex, 1);
      nextPageNumbers.splice(destinationIndex, 0, movedPageNumber);
      return nextPageNumbers;
    },
    [],
  );

  const displayedThumbnailPageNumbers =
    previewThumbnailPageNumbers ?? normalizedOrderedThumbnailPageNumbers;

  const handleDragStart = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, pageNumber: number) => {
      didDropRef.current = false;
      setDraggingPageNumber(pageNumber);
      setDropTargetPageNumber(pageNumber);
      setPreviewThumbnailPageNumbers(normalizedOrderedThumbnailPageNumbers);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(pageNumber));
    },
    [normalizedOrderedThumbnailPageNumbers],
  );

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, pageNumber: number) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      const draggedPageNumberText =
        event.dataTransfer.getData("text/plain") || String(draggingPageNumber ?? "");
      const draggedPageNumber = Number(draggedPageNumberText);

      if (!Number.isFinite(draggedPageNumber)) {
        return;
      }

      const normalizedDraggedPageNumber = Math.trunc(draggedPageNumber);
      setDropTargetPageNumber((previousPageNumber) =>
        previousPageNumber === pageNumber ? previousPageNumber : pageNumber,
      );
      setPreviewThumbnailPageNumbers((previousPageNumbers) => {
        const basePageNumbers = previousPageNumbers ?? normalizedOrderedThumbnailPageNumbers;
        const nextPageNumbers = reorderPageNumbers(
          basePageNumbers,
          normalizedDraggedPageNumber,
            );

        if (nextPageNumbers === basePageNumbers) {
          return previousPageNumbers ?? basePageNumbers;
        }

        return nextPageNumbers;
      });
    },
    [draggingPageNumber, normalizedOrderedThumbnailPageNumbers, reorderPageNumbers],
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, pageNumber: number) => {
      event.preventDefault();
      didDropRef.current = true;

      const draggedPageNumberText =
        event.dataTransfer.getData("text/plain") || String(draggingPageNumber ?? "");
      const draggedPageNumber = Number(draggedPageNumberText);

      if (!Number.isFinite(draggedPageNumber)) {
        setDraggingPageNumber(null);
        setDropTargetPageNumber(null);
        setPreviewThumbnailPageNumbers(null);
        return;
      }

      const normalizedDraggedPageNumber = Math.trunc(draggedPageNumber);
      const committedPageNumbers = reorderPageNumbers(
        displayedThumbnailPageNumbers,
        normalizedDraggedPageNumber,
        pageNumber,
      );

      if (committedPageNumbers !== displayedThumbnailPageNumbers) {
        onThumbnailOrderChange?.(committedPageNumbers);
      } else if (previewThumbnailPageNumbers !== null) {
        onThumbnailOrderChange?.(previewThumbnailPageNumbers);
      }

      setDraggingPageNumber(null);
      setDropTargetPageNumber(null);
      setPreviewThumbnailPageNumbers(null);
    },
    [
      displayedThumbnailPageNumbers,
      draggingPageNumber,
      onThumbnailOrderChange,
      previewThumbnailPageNumbers,
      reorderPageNumbers,
    ],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingPageNumber(null);
    setDropTargetPageNumber(null);

    if (!didDropRef.current) {
      setPreviewThumbnailPageNumbers(null);
    }

    didDropRef.current = false;
  }, []);

  useEffect(() => {
    pageTextCacheRef.current.clear();
    setMarkdownState({
      status: "idle",
      content: "",
    });
    setOutlineState({
      status: "idle",
      items: [],
    });
    setDraggingPageNumber(null);
    setDropTargetPageNumber(null);
    setPreviewThumbnailPageNumbers(null);
  }, [documentController.documentKey]);

  useEffect(() => {
    if (normalizedTab !== "markdown") {
      return;
    }

    if (markdownState.status === "loading" || markdownState.status === "ready") {
      return;
    }

    let cancelled = false;
    setMarkdownState({
      status: "loading",
      content: "",
    });

    void (async () => {
      try {
        const markdownSections: string[] = [];

        for (const pageNumber of normalizedOrderedThumbnailPageNumbers) {
          const text = await extractPageText({
            getPageTextContent: documentController.getPageTextContent,
            cache: pageTextCacheRef.current,
                });
          markdownSections.push(`## Page ${pageNumber}\n\n${text || "_No text_"}\n`);
        }

        if (cancelled) {
          return;
        }

        setMarkdownState({
          status: "ready",
          content: markdownSections.join("\n"),
        });
      } catch (errorValue) {
        if (cancelled) {
          return;
        }

        console.error("[PdfThumbnailPanel] Failed to build markdown", errorValue);
        setMarkdownState({
          status: "error",
          content: "",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    documentController.documentKey,
    documentController.getPageTextContent,
    markdownState.status,
    normalizedOrderedThumbnailPageNumbers,
    normalizedTab,
  ]);

  useEffect(() => {
    if (normalizedTab !== "outline") {
      return;
    }

    if (outlineState.status === "loading" || outlineState.status === "ready") {
      return;
    }

    let cancelled = false;
    setOutlineState({
      status: "loading",
      items: [],
    });

    void (async () => {
      try {
        const doc = documentController.doc;
        let nextItems: PdfOutlineEntry[] = [];

        if (doc && typeof doc.getOutline === "function") {
          const outlineItems = await doc.getOutline();
          if (Array.isArray(outlineItems) && outlineItems.length > 0) {
            nextItems = await normalizeOutlineItems({
              items: outlineItems,
              doc,
              parentId: "outline",
            });
          }
        }

        if (nextItems.length === 0) {
          nextItems = await buildFallbackOutlineEntries({
            getPageTextContent: documentController.getPageTextContent,
            pageNumbers: normalizedOrderedThumbnailPageNumbers,
            cache: pageTextCacheRef.current,
          });
        }

        if (cancelled) {
          return;
        }

        setOutlineState({
          status: "ready",
          items: nextItems,
        });
      } catch (errorValue) {
        if (cancelled) {
          return;
        }

        console.error("[PdfThumbnailPanel] Failed to build outline", errorValue);
        setOutlineState({
          status: "error",
          items: [],
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    documentController.doc,
    documentController.documentKey,
    documentController.getPageTextContent,
    normalizedOrderedThumbnailPageNumbers,
    normalizedTab,
    outlineState.status,
  ]);

  const renderTabs = (
    <div
      className="border-b px-3 py-3"
      style={{ borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted }}
    >
      <div
        role="tablist"
        aria-label="PDF サイドパネル"
        className="grid grid-cols-3 gap-2 rounded-[22px] border p-2"
        style={{
          borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
          background: "rgba(248, 247, 245, 0.68)",
        }}
      >
        {TAB_ITEMS.map((item) => {
          const Icon = TAB_ICON_BY_ID[item.id];
          const isSelected = normalizedTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={item.label}
              title={item.label}
              onClick={() => handleTabChange(item.id)}
              className="inline-flex h-11 items-center justify-center rounded-[18px] border transition-colors duration-150"
              style={{
                borderColor: isSelected
                  ? PDF_THUMBNAIL_PANEL_COLORS.accent
                  : "transparent",
                background: isSelected
                  ? PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft
                  : "transparent",
                color: isSelected
                  ? PDF_THUMBNAIL_PANEL_COLORS.accent
                  : PDF_THUMBNAIL_PANEL_COLORS.textMuted,
              }}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMarkdownContent = () => {
    if (markdownState.status === "loading" || markdownState.status === "idle") {
      return (
        <div className="px-4 py-5 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          マークダウンを生成中です。
        </div>
      );
    }

    if (markdownState.status === "error") {
      return (
        <div className="px-4 py-5 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          マークダウンを生成できませんでした。
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        {displayedThumbnailPageNumbers.map((pageNumber) => {
          const heading = `Page ${pageNumber}`;
          const text = pageTextCacheRef.current.get(pageNumber) ?? "";

          return (
            <button
              key={`markdown-page-${pageNumber}`}
              type="button"
              onClick={() => handleSelectPage(pageNumber)}
              className="block w-full rounded-[20px] border px-4 py-3 text-left transition-colors duration-150"
              style={{
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                background: "rgba(248, 247, 245, 0.78)",
              }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textStrong }}
              >
                {heading}
              </div>
              <div
                className="mt-2 whitespace-pre-wrap text-xs leading-6"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
              >
                {text || "テキストが見つかりません。"}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderOutlineContent = () => {
    if (outlineState.status === "loading" || outlineState.status === "idle") {
      return (
        <div className="px-4 py-5 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          アウトラインを生成中です。
        </div>
      );
    }

    if (outlineState.status === "error") {
      return (
        <div className="px-4 py-5 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          アウトラインを生成できませんでした。
        </div>
      );
    }

    if (outlineState.items.length === 0) {
      return (
        <div className="px-4 py-5 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          アウトラインはありません。
        </div>
      );
    }

    return (
      <div className="space-y-2 p-4">
        {renderOutlineEntries({
          items: outlineState.items,
          depth: 0,
          onSelectPage: handleSelectPage,
        })}
      </div>
    );
  };

  const renderThumbnailContent = () => {
    if (documentController.loading && displayedThumbnailPageNumbers.length === 0) {
      return (
        <div className="grid grid-cols-2 gap-3 p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={`pdf-thumbnail-skeleton-${index}`}
              className="flex flex-col gap-2 rounded-[20px] border p-2"
              style={{
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                background: PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
              }}
            >
              <div
                className="aspect-[210/297] rounded-[16px] border"
                style={{
                  borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                  background: PDF_THUMBNAIL_PANEL_COLORS.surfaceBlush,
                }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (!documentController.loading && documentController.error) {
      return (
        <div className="px-4 py-6 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          サムネイルを準備できませんでした。
        </div>
      );
    }

    if (
      !documentController.loading &&
      !documentController.error &&
      displayedThumbnailPageNumbers.length === 0
    ) {
      return (
        <div className="px-4 py-6 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          ページ情報を読み込み中です。
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3 p-4">
        {displayedThumbnailPageNumbers.map((pageNumber) => {
          return (
            <PdfThumbnailItem
              key={`pdf-thumbnail-${documentController.documentKey}-${pageNumber}`}
              documentKey={documentController.documentKey}
              pageNumber={pageNumber}
              baseSize={documentController.pageSizes[pageNumber]}
              isActive={activePageNumbers.has(pageNumber)}
              isBookmarked={bookmarkedPageNumbers.has(pageNumber)}
              isDragging={draggingPageNumber === pageNumber}
              isDropTarget={
                dropTargetPageNumber === pageNumber &&
                draggingPageNumber !== null &&
                draggingPageNumber !== pageNumber
              }
              onSelect={handleSelectPage}
              onToggleBookmark={onToggleBookmark}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              rootElement={scrollRootElement}
              acquirePage={documentController.acquirePage}
              setPageSize={documentController.setPageSize}
            />
          );
        })}
      </div>
    );
  };

  const panelContent = (
    <>
      {renderTabs}
      <div
        ref={handleScrollRootRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {normalizedTab === "markdown"
          ? renderMarkdownContent()
          : normalizedTab === "outline"
            ? renderOutlineContent()
            : renderThumbnailContent()}
      </div>
    </>
  );

  if (isMobileViewport) {
    const SelectedTabIcon = TAB_ICON_BY_ID[normalizedTab];

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
          {isOpen ? (
            <XIcon className="h-4 w-4" />
          ) : (
            <SelectedTabIcon className="h-4 w-4" />
          )}
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
          {panelContent}
        </aside>
      </>
    );
  }

  const CurrentTabIcon = TAB_ICON_BY_ID[normalizedTab];

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
              <CurrentTabIcon className="h-4 w-4" />
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
          {panelContent}
        </div>
      </div>
    </aside>
  );
};
