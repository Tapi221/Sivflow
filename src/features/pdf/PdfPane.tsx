import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PdfViewerState } from "@/types";
import type { BlobUrl } from "@/types/core/branded";
import { cn } from "@/lib/utils";
import { getDocumentBlob } from "@/services/documentFileStore";

type PdfPaneDoc = {
  id: string;
  userId?: string;
  name?: string;
  title?: string;
  fileName?: string;
  remoteUrl?: string | null;
  blobUrl?: BlobUrl | null;
  localUrl?: BlobUrl | null;
  localFileId?: string | null;
  downloadUrl?: string | null;
  googleDriveWebViewLink?: string | null;
  googleDriveWebContentLink?: string | null;
  uploadStatus?: "pending" | "queued" | "uploading" | "ready" | "failed" | null;
  updatedAt?: unknown;
  mimeType?: string;
  viewerState?: PdfViewerState | null;
};

type PdfPaneProps = {
  doc: PdfPaneDoc;
  className?: string;
  viewerOptions?: {
    enableXfa?: boolean;
    useSystemFonts?: boolean;
    cMapUrl?: string;
    standardFontDataUrl?: string;
    opaqueCanvas?: boolean;
  };
  onDocumentUpdate?: (updates: Partial<PdfPaneDoc>) => Promise<void> | void;
};

type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;

type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;

type PdfOutlineItem = {
  title?: string;
  dest?: string | unknown[] | null;
  items?: PdfOutlineItem[];
};

type PdfOutlineEntry = {
  id: string;
  title: string;
  level: number;
  pageNumber: number | null;
};

type PdfSidePanelTabDefinition = {
  id: NonNullable<PdfViewerState["sidePanelTab"]>;
  label: string;
};

type PdfCanvasPageProps = {
  pageNumber: number;
  pdfDocument: PdfDocumentProxy;
  scale: number;
  className?: string;
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

type PdfTextSpan = {
  id: string;
  text: string;
  style: CSSProperties;
  isSearchMatch: boolean;
};

type PdfTextLayerProps = {
  pageNumber: number;
  pdfDocument: PdfDocumentProxy;
  scale: number;
  searchQuery: string;
};

type PdfDocumentPageProps = PdfCanvasPageProps & {
  currentPage: number;
  registerPageElement: (pageNumber: number, element: HTMLDivElement | null) => void;
  searchQuery: string;
  shouldRender: boolean;
};

type PdfDocumentPageSlotProps = PdfDocumentPageProps;

type PdfSearchResult = {
  id: string;
  pageNumber: number;
  snippet: string;
};

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PDF_SIDE_PANEL_TABS: readonly PdfSidePanelTabDefinition[] = [
  { id: "outline", label: "目次" },
  { id: "bookmarks", label: "ブックマーク" },
  { id: "highlights", label: "ハイライト" },
  { id: "thumbnails", label: "サムネイル" },
];
const DEFAULT_PDF_PAGE = 1;
const DEFAULT_PDF_SCALE = 1;
const MIN_PDF_SCALE = 0.5;
const MAX_PDF_SCALE = 3;
const PDF_SCALE_STEP = 0.15;
const PDF_THUMBNAIL_SCALE = 0.18;
const PDF_PAGE_RENDER_RADIUS = 3;
const PDF_THUMBNAIL_RENDER_RADIUS = 8;
const PDF_PAGE_PLACEHOLDER_HEIGHT = 920;
const PDF_SEARCH_SNIPPET_MARGIN = 24;
const PDF_HISTORY_LIMIT = 80;
const PDF_MARK_KEY_PATTERN = /^[a-z0-9]$/i;
const OUTLINE_EMPTY_MESSAGE = "このPDFには目次情報がありません。";
const BOOKMARK_EMPTY_MESSAGE = "ブックマークはまだありません。";
const HIGHLIGHTS_EMPTY_MESSAGE = "検索語を入力すると、該当箇所をページ上にハイライトします。";
const SEARCHING_MESSAGE = "テキストを解析中...";

const resolveDocumentTitle = (doc: PdfPaneDoc): string => {
  return doc.title?.trim() || doc.fileName?.trim() || doc.name?.trim() || "PDF";
};

const resolvePersistedUrl = (doc: PdfPaneDoc): string | null => {
  return doc.blobUrl ?? doc.localUrl ?? doc.downloadUrl ?? doc.googleDriveWebContentLink ?? doc.remoteUrl ?? doc.googleDriveWebViewLink ?? null;
};

const resolveDocumentFileId = (doc: PdfPaneDoc): string => {
  return doc.localFileId?.trim() || doc.id;
};

const clampPdfScale = (scale: number): number => {
  if (!Number.isFinite(scale)) return DEFAULT_PDF_SCALE;
  return Math.min(MAX_PDF_SCALE, Math.max(MIN_PDF_SCALE, scale));
};

const getSafePageNumber = (pageNumber: number | null | undefined, pageCount: number): number => {
  const normalizedPageNumber = Math.floor(pageNumber ?? DEFAULT_PDF_PAGE);
  return Math.min(Math.max(normalizedPageNumber, DEFAULT_PDF_PAGE), Math.max(pageCount, DEFAULT_PDF_PAGE));
};

const getPageNumbers = (pageCount: number): number[] => {
  return Array.from({ length: pageCount }, (_, index) => index + 1);
};

const getNormalizedSearchQuery = (value: string): string => {
  return value.trim().toLowerCase();
};

const getSortedMarkEntries = (markPages: Record<string, number>): [string, number][] => {
  return Object.entries(markPages).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
};

const getTrimmedHistory = (pages: number[]): number[] => {
  return pages.slice(-PDF_HISTORY_LIMIT);
};

const shouldHandlePdfKeyboardEvent = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement | null;
  if (!target) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName !== "input" && tagName !== "textarea" && !target.isContentEditable;
};

const shouldRenderNearbyPage = (pageNumber: number, currentPage: number, radius: number): boolean => {
  return Math.abs(pageNumber - currentPage) <= radius || pageNumber === DEFAULT_PDF_PAGE;
};

const getTextContentItemText = (item: unknown): string => {
  const textItem = item as PdfTextItem;
  return typeof textItem.str === "string" ? textItem.str : "";
};

const createSearchSnippet = (text: string, query: string): string => {
  const normalizedText = text.toLowerCase();
  const matchIndex = normalizedText.indexOf(query);
  if (matchIndex < 0) return text.slice(0, PDF_SEARCH_SNIPPET_MARGIN * 2).trim();
  const startIndex = Math.max(0, matchIndex - PDF_SEARCH_SNIPPET_MARGIN);
  const endIndex = Math.min(text.length, matchIndex + query.length + PDF_SEARCH_SNIPPET_MARGIN);
  const prefix = startIndex > 0 ? "…" : "";
  const suffix = endIndex < text.length ? "…" : "";
  return `${prefix}${text.slice(startIndex, endIndex).trim()}${suffix}`;
};

const multiplyPdfTransform = (left: number[], right: number[]): number[] => {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
};

const createTextSpanStyle = (viewportTransform: number[], item: PdfTextItem): CSSProperties => {
  const itemTransform = Array.isArray(item.transform) && item.transform.length >= 6 ? item.transform : [1, 0, 0, 1, 0, 0];
  const transform = multiplyPdfTransform(viewportTransform, itemTransform);
  const fontSize = Math.max(1, Math.hypot(transform[2], transform[3]));
  const left = transform[4];
  const top = transform[5] - fontSize;
  const width = Math.max(1, (item.width ?? 0) * Math.hypot(viewportTransform[0], viewportTransform[1]));

  return {
    left,
    top,
    width,
    fontSize,
  };
};

const loadLocalPdfObjectUrl = async (doc: PdfPaneDoc): Promise<string> => {
  const blob = await getDocumentBlob(resolveDocumentFileId(doc), { userId: doc.userId });
  if (!blob) throw new Error("PDFファイル本体がローカルストアに見つかりません。");
  return URL.createObjectURL(blob);
};

const loadPdfDocument = async (sourceUrl: string, viewerOptions: PdfPaneProps["viewerOptions"]): Promise<PdfDocumentProxy> => {
  return pdfjsLib.getDocument({ url: sourceUrl, enableXfa: viewerOptions?.enableXfa, useSystemFonts: viewerOptions?.useSystemFonts ?? true, cMapUrl: viewerOptions?.cMapUrl, standardFontDataUrl: viewerOptions?.standardFontDataUrl }).promise;
};

const loadPdfPageTextMap = async (pdfDocument: PdfDocumentProxy): Promise<Map<number, string>> => {
  const map = new Map<number, string>();
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(getTextContentItemText).filter(Boolean).join(" ");
    map.set(pageNumber, text);
  }
  return map;
};

const buildPdfSearchResults = (pageTextMap: Map<number, string>, searchQuery: string): PdfSearchResult[] => {
  const query = getNormalizedSearchQuery(searchQuery);
  if (!query) return [];
  return Array.from(pageTextMap.entries()).flatMap(([pageNumber, text]) => {
    const normalizedText = text.toLowerCase();
    if (!normalizedText.includes(query)) return [];
    return [{ id: `${pageNumber}-${normalizedText.indexOf(query)}`, pageNumber, snippet: createSearchSnippet(text, query) }];
  });
};

const resolveOutlinePageNumber = async (pdfDocument: PdfDocumentProxy, item: PdfOutlineItem): Promise<number | null> => {
  if (!item.dest) return null;
  const destination = typeof item.dest === "string" ? await pdfDocument.getDestination(item.dest) : item.dest;
  const pageRef = Array.isArray(destination) ? destination[0] : null;
  if (!pageRef) return null;
  const pageIndex = await pdfDocument.getPageIndex(pageRef);
  return pageIndex + 1;
};

const flattenOutlineItems = async (pdfDocument: PdfDocumentProxy, items: readonly PdfOutlineItem[], level = 0, prefix = "outline"): Promise<PdfOutlineEntry[]> => {
  const entries = await Promise.all(items.map(async (item, index) => {
    const id = `${prefix}-${index}`;
    const pageNumber = await resolveOutlinePageNumber(pdfDocument, item).catch(() => null);
    const title = item.title?.trim() || "無題";
    const childEntries = item.items?.length ? await flattenOutlineItems(pdfDocument, item.items, level + 1, id) : [];
    return [{ id, title, level, pageNumber }, ...childEntries];
  }));
  return entries.flat();
};

const PdfCanvasPage = ({ pageNumber, pdfDocument, scale, className }: PdfCanvasPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

    const renderPage = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const page: PdfPageProxy = await pdfDocument.getPage(pageNumber);
      if (isCancelled) return;
      const viewport = page.getViewport({ scale });
      const devicePixelRatio = window.devicePixelRatio || 1;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.floor(viewport.width * devicePixelRatio);
      canvas.height = Math.floor(viewport.height * devicePixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise.catch((error: unknown) => {
        if (!isCancelled) throw error;
      });
    };

    void renderPage().catch((error: unknown) => {
      if (!isCancelled) console.error("[PdfPane] page render failed", error);
    });

    return () => {
      isCancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdfDocument, scale]);

  return <canvas ref={canvasRef} className={className} />;
};

const PdfTextLayer = ({ pageNumber, pdfDocument, scale, searchQuery }: PdfTextLayerProps) => {
  const [textSpans, setTextSpans] = useState<PdfTextSpan[]>([]);
  const normalizedSearchQuery = getNormalizedSearchQuery(searchQuery);

  useEffect(() => {
    let isCancelled = false;

    const loadTextLayer = async () => {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const textContent = await page.getTextContent();
      if (isCancelled) return;
      setTextSpans(textContent.items.map((item, index) => {
        const textItem = item as PdfTextItem;
        const text = getTextContentItemText(item);
        return {
          id: `${pageNumber}-${index}`,
          text,
          style: createTextSpanStyle(viewport.transform, textItem),
          isSearchMatch: normalizedSearchQuery.length > 0 && text.toLowerCase().includes(normalizedSearchQuery),
        };
      }).filter((span) => span.text.length > 0));
    };

    void loadTextLayer().catch((error: unknown) => {
      if (!isCancelled) console.error("[PdfPane] text layer failed", error);
    });

    return () => {
      isCancelled = true;
    };
  }, [normalizedSearchQuery, pageNumber, pdfDocument, scale]);

  return (
    <div className="pointer-events-none absolute inset-3 overflow-hidden text-transparent selection:bg-[#d5b14b]/35 selection:text-transparent" aria-hidden="true">
      {textSpans.map((span) => <span key={span.id} className={cn("pointer-events-auto absolute origin-left whitespace-pre", span.isSearchMatch && "rounded-[2px] bg-[#f1c94b]/45 ring-1 ring-[#c79722]/55")} style={span.style}>{span.text}</span>)}
    </div>
  );
};

const PdfDocumentPage = ({ pageNumber, pdfDocument, scale, currentPage, registerPageElement, searchQuery, shouldRender }: PdfDocumentPageProps) => {
  const isCurrent = pageNumber === currentPage;

  return (
    <div ref={(element) => registerPageElement(pageNumber, element)} data-pdf-page-number={pageNumber} className={cn("relative rounded-[12px] border bg-white p-3 shadow-[0_18px_48px_rgba(0,0,0,0.28)]", isCurrent ? "border-[#d8d3c9]" : "border-black/20")} style={shouldRender ? undefined : { height: Math.round(PDF_PAGE_PLACEHOLDER_HEIGHT * scale) }}>
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#6f6a5f]">
        <span>Page {pageNumber}</span>
        {!shouldRender ? <span>省メモリ表示</span> : null}
      </div>
      {shouldRender ? <div className="relative"><PdfCanvasPage pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} /><PdfTextLayer pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} searchQuery={searchQuery} /></div> : null}
    </div>
  );
};

const PdfDocumentPageSlot = (props: PdfDocumentPageSlotProps) => {
  return <PdfDocumentPage {...props} />;
};

const PdfThumbnailCanvas = ({ pageNumber, pdfDocument, scale, className }: PdfCanvasPageProps) => {
  return <PdfCanvasPage pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} className={className} />;
};

const PdfPane = ({ doc, className, viewerOptions, onDocumentUpdate }: PdfPaneProps) => {
  const documentTitle = useMemo(() => resolveDocumentTitle(doc), [doc]);
  const persistedUrl = useMemo(() => resolvePersistedUrl(doc), [doc]);
  const viewerState = doc.viewerState ?? null;
  const activeSidePanelTab = viewerState?.sidePanelTab ?? "outline";
  const scale = clampPdfScale(viewerState?.scale ?? DEFAULT_PDF_SCALE);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentProxy | null>(null);
  const [outlineEntries, setOutlineEntries] = useState<PdfOutlineEntry[]>([]);
  const [pageTextMap, setPageTextMap] = useState<Map<number, string>>(() => new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [pageJumpValue, setPageJumpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pageJumpInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageCount = pdfDocument?.numPages ?? 0;
  const currentPage = getSafePageNumber(viewerState?.currentPage, pageCount);
  const bookmarkPages = viewerState?.bookmarkPages ?? [];
  const markPages = viewerState?.markPages ?? {};
  const historyBackPages = viewerState?.historyBackPages ?? [];
  const historyForwardPages = viewerState?.historyForwardPages ?? [];
  const pageNumbers = useMemo(() => getPageNumbers(pageCount), [pageCount]);
  const searchResults = useMemo(() => buildPdfSearchResults(pageTextMap, searchQuery), [pageTextMap, searchQuery]);
  const markEntries = useMemo(() => getSortedMarkEntries(markPages), [markPages]);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    setSourceUrl(null);
    setPdfDocument(null);
    setOutlineEntries([]);
    setPageTextMap(new Map());
    setLoadError(null);
    setIsLoading(true);
    setIsTextLoading(false);

    const load = async () => {
      const nextSourceUrl = persistedUrl ?? await loadLocalPdfObjectUrl(doc);
      if (!persistedUrl) objectUrl = nextSourceUrl;
      if (isCancelled) return;
      setSourceUrl(nextSourceUrl);
      const nextPdfDocument = await loadPdfDocument(nextSourceUrl, viewerOptions);
      if (isCancelled) return;
      setPdfDocument(nextPdfDocument);
      const outline = await nextPdfDocument.getOutline() as PdfOutlineItem[] | null;
      if (isCancelled) return;
      setOutlineEntries(outline ? await flattenOutlineItems(nextPdfDocument, outline) : []);
      setIsTextLoading(true);
      const nextPageTextMap = await loadPdfPageTextMap(nextPdfDocument);
      if (isCancelled) return;
      setPageTextMap(nextPageTextMap);
      setIsTextLoading(false);
    };

    void load().catch((error: unknown) => {
      if (isCancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(message || "PDFファイルの読み込みに失敗しました。");
      setIsTextLoading(false);
    }).finally(() => {
      if (!isCancelled) setIsLoading(false);
    });

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc, persistedUrl, viewerOptions]);

  const updateViewerState = useCallback((patch: PdfViewerState) => {
    void onDocumentUpdate?.({ viewerState: { ...viewerState, ...patch } });
  }, [onDocumentUpdate, viewerState]);

  const registerPageElement = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    if (element) pageElementsRef.current.set(pageNumber, element);
    else pageElementsRef.current.delete(pageNumber);
  }, []);

  const scrollToPage = useCallback((pageNumber: number, options?: { recordHistory?: boolean }) => {
    const safePageNumber = getSafePageNumber(pageNumber, pageCount);
    const shouldRecordHistory = options?.recordHistory ?? true;
    const nextBackPages = shouldRecordHistory && safePageNumber !== currentPage ? getTrimmedHistory([...historyBackPages, currentPage]) : historyBackPages;
    updateViewerState({ currentPage: safePageNumber, historyBackPages: nextBackPages, historyForwardPages: shouldRecordHistory ? [] : historyForwardPages });
    window.requestAnimationFrame(() => {
      pageElementsRef.current.get(safePageNumber)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [currentPage, historyBackPages, historyForwardPages, pageCount, updateViewerState]);

  useEffect(() => {
    if (!pdfDocument || !scrollContainerRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const [visibleEntry] = visibleEntries;
      const pageNumber = Number((visibleEntry?.target as HTMLElement | undefined)?.dataset.pdfPageNumber);
      if (!Number.isFinite(pageNumber) || pageNumber === currentPage) return;
      void onDocumentUpdate?.({ viewerState: { ...viewerState, currentPage: pageNumber } });
    }, { root: scrollContainerRef.current, threshold: [0.2, 0.45, 0.7] });
    pageElementsRef.current.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [currentPage, onDocumentUpdate, pdfDocument, viewerState]);

  const handleSidePanelTabSelect = (sidePanelTab: NonNullable<PdfViewerState["sidePanelTab"]>) => {
    updateViewerState({ sidePanelTab });
  };

  const handleZoomIn = useCallback(() => {
    updateViewerState({ scale: clampPdfScale(scale + PDF_SCALE_STEP), fitMode: "manual" });
  }, [scale, updateViewerState]);

  const handleZoomOut = useCallback(() => {
    updateViewerState({ scale: clampPdfScale(scale - PDF_SCALE_STEP), fitMode: "manual" });
  }, [scale, updateViewerState]);

  const handleToggleBookmark = useCallback(() => {
    const nextBookmarkPages = bookmarkPages.includes(currentPage) ? bookmarkPages.filter((pageNumber) => pageNumber !== currentPage) : [...bookmarkPages, currentPage].sort((a, b) => a - b);
    updateViewerState({ bookmarkPages: nextBookmarkPages });
  }, [bookmarkPages, currentPage, updateViewerState]);

  const handleGoBack = useCallback(() => {
    const targetPage = historyBackPages.at(-1);
    if (!targetPage) return;
    updateViewerState({ currentPage: targetPage, historyBackPages: historyBackPages.slice(0, -1), historyForwardPages: getTrimmedHistory([...historyForwardPages, currentPage]) });
    window.requestAnimationFrame(() => {
      pageElementsRef.current.get(targetPage)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [currentPage, historyBackPages, historyForwardPages, updateViewerState]);

  const handleGoForward = useCallback(() => {
    const targetPage = historyForwardPages.at(-1);
    if (!targetPage) return;
    updateViewerState({ currentPage: targetPage, historyBackPages: getTrimmedHistory([...historyBackPages, currentPage]), historyForwardPages: historyForwardPages.slice(0, -1) });
    window.requestAnimationFrame(() => {
      pageElementsRef.current.get(targetPage)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [currentPage, historyBackPages, historyForwardPages, updateViewerState]);

  const handleSetMark = useCallback(() => {
    const rawKey = window.prompt("現在ページに設定する mark キーを入力してください（a-z / 0-9）", "a")?.trim().slice(0, 1).toLowerCase();
    if (!rawKey || !PDF_MARK_KEY_PATTERN.test(rawKey)) return;
    updateViewerState({ markPages: { ...markPages, [rawKey]: currentPage } });
  }, [currentPage, markPages, updateViewerState]);

  const handleJumpToMark = useCallback(() => {
    const rawKey = window.prompt("移動する mark キーを入力してください", "a")?.trim().slice(0, 1).toLowerCase();
    if (!rawKey) return;
    const targetPage = markPages[rawKey];
    if (!targetPage) return;
    scrollToPage(targetPage);
  }, [markPages, scrollToPage]);

  const handlePageJump = useCallback(() => {
    const pageNumber = Number(pageJumpValue);
    if (!Number.isFinite(pageNumber)) return;
    scrollToPage(pageNumber);
    setPageJumpValue("");
  }, [pageJumpValue, scrollToPage]);

  const handlePageJumpKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handlePageJump();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandlePdfKeyboardEvent(event)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((event.altKey || event.metaKey) && event.key === "ArrowLeft") {
        event.preventDefault();
        handleGoBack();
        return;
      }
      if ((event.altKey || event.metaKey) && event.key === "ArrowRight") {
        event.preventDefault();
        handleGoForward();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "j") {
        event.preventDefault();
        scrollToPage(currentPage + 1);
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "k") {
        event.preventDefault();
        scrollToPage(currentPage - 1);
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        handleZoomIn();
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        handleZoomOut();
        return;
      }
      if (event.key === "b") {
        event.preventDefault();
        handleToggleBookmark();
        return;
      }
      if (event.key === "g") {
        event.preventDefault();
        pageJumpInputRef.current?.focus();
        return;
      }
      if (event.key === "m") {
        event.preventDefault();
        handleSetMark();
        return;
      }
      if (event.key === "'") {
        event.preventDefault();
        handleJumpToMark();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, handleGoBack, handleGoForward, handleJumpToMark, handleSetMark, handleToggleBookmark, handleZoomIn, handleZoomOut, scrollToPage]);

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 bg-[#151515] text-[#f4f1ea]", className)}>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#202020] px-3">
          <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#d8d3c9]">{documentTitle}</div>
          {pageCount > 0 ? <button type="button" onClick={handleToggleBookmark} className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">{bookmarkPages.includes(currentPage) ? "ブックマーク解除" : "ブックマーク"}</button> : null}
          <button type="button" onClick={handleZoomOut} className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">−</button>
          <div className="w-12 text-center text-[12px] font-semibold text-[#d8d3c9]">{Math.round(scale * 100)}%</div>
          <button type="button" onClick={handleZoomIn} className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">＋</button>
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">別ウィンドウで開く</a> : null}
        </div>
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-[#2b2b2b] p-5">
          {isLoading ? <div className="flex h-full items-center justify-center text-[13px] text-[#bdb8ad]">PDFを読み込み中...</div> : null}
          {!isLoading && loadError ? <div className="flex h-full items-center justify-center p-6 text-center text-[13px] leading-6 text-[#d8d3c9]"><div className="max-w-md rounded-[14px] border border-white/10 bg-[#1f1f1f] px-5 py-4">{loadError}</div></div> : null}
          {!isLoading && !loadError && pdfDocument ? <div className="flex min-w-max flex-col items-center gap-5">{pageNumbers.map((pageNumber) => <PdfDocumentPageSlot key={pageNumber} pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} currentPage={currentPage} registerPageElement={registerPageElement} searchQuery={searchQuery} shouldRender={shouldRenderNearbyPage(pageNumber, currentPage, PDF_PAGE_RENDER_RADIUS)} />)}</div> : null}
          {!isLoading && !loadError && !pdfDocument ? <div className="flex h-full items-center justify-center text-[13px] text-[#bdb8ad]">表示できるPDFソースがありません。</div> : null}
        </div>
      </main>
    </div>
  );
};

export { PdfPane };
