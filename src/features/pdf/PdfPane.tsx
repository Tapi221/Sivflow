import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";
import "pdfjs-dist/web/pdf_viewer.css";
import type { PdfViewerState } from "@/types";
import { cn } from "@/lib/utils";

type PdfPaneProps = {
  sourceUrl: string | null;
  className?: string;
  viewerState?: PdfViewerState | null;
  viewerOptions?: {
    enableXfa?: boolean;
    useSystemFonts?: boolean;
    cMapUrl?: string;
    standardFontDataUrl?: string;
    opaqueCanvas?: boolean;
  };
  onViewerStateChange?: (viewerState: PdfViewerState) => Promise<void> | void;
};

type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;

type PdfViewerInstance = InstanceType<typeof PDFViewer>;

type PdfLinkServiceInstance = InstanceType<typeof PDFLinkService>;

type PdfEventBusInstance = InstanceType<typeof EventBus>;

type PdfEventBusLike = PdfEventBusInstance & {
  off?: (eventName: string, listener: (event: unknown) => void) => void;
  _off?: (eventName: string, listener: (event: unknown) => void) => void;
};

type PdfPageChangingEvent = {
  pageNumber?: number;
};

type PdfScaleChangingEvent = {
  scale?: number;
};

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DEFAULT_PDF_PAGE = 1;
const DEFAULT_PDF_SCALE = 1;
const MIN_PDF_SCALE = 0.5;
const MAX_PDF_SCALE = 3;
const PDF_SCALE_STEP = 0.15;
const PDF_HISTORY_LIMIT = 80;
const PDF_MARK_KEY_PATTERN = /^[a-z0-9]$/i;
const PDFJS_ASSET_BASE_URL = "/pdfjs/";
const PDFJS_CMAP_URL = `${PDFJS_ASSET_BASE_URL}cmaps/`;
const PDFJS_STANDARD_FONT_DATA_URL = `${PDFJS_ASSET_BASE_URL}standard_fonts/`;
const PDFJS_WASM_URL = `${PDFJS_ASSET_BASE_URL}wasm/`;

const clampPdfScale = (scale: number): number => {
  if (!Number.isFinite(scale)) return DEFAULT_PDF_SCALE;
  return Math.min(MAX_PDF_SCALE, Math.max(MIN_PDF_SCALE, scale));
};

const getSafePageNumber = (pageNumber: number | null | undefined, pageCount: number): number => {
  const normalizedPageNumber = Math.floor(pageNumber ?? DEFAULT_PDF_PAGE);
  return Math.min(Math.max(normalizedPageNumber, DEFAULT_PDF_PAGE), Math.max(pageCount, DEFAULT_PDF_PAGE));
};

const getTrimmedHistory = (pages: number[]): number[] => {
  return pages.slice(-PDF_HISTORY_LIMIT);
};

const getPdfViewerScale = (pdfViewer: PdfViewerInstance): number => {
  const scale = Number(pdfViewer.currentScale);
  return Number.isFinite(scale) && scale > 0 ? clampPdfScale(scale) : DEFAULT_PDF_SCALE;
};

const getPdfViewerPageCount = (pdfViewer: PdfViewerInstance): number => {
  const pageCount = Number(pdfViewer.pagesCount);
  return Number.isFinite(pageCount) ? pageCount : 0;
};

const getPdfViewerStateScaleValue = (viewerState: PdfViewerState | null): string => {
  if (viewerState?.fitMode === "manual" && typeof viewerState.scale === "number") return String(clampPdfScale(viewerState.scale));
  return "page-width";
};

const shouldHandlePdfKeyboardEvent = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement | null;
  if (!target) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName !== "input" && tagName !== "textarea" && !target.isContentEditable;
};

const createPdfDocumentLoadOptions = (viewerOptions: PdfPaneProps["viewerOptions"]) => {
  return {
    enableXfa: viewerOptions?.enableXfa,
    useSystemFonts: viewerOptions?.useSystemFonts ?? true,
    cMapUrl: viewerOptions?.cMapUrl ?? PDFJS_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: viewerOptions?.standardFontDataUrl ?? PDFJS_STANDARD_FONT_DATA_URL,
    wasmUrl: PDFJS_WASM_URL,
  };
};

const loadPdfDocument = async (sourceUrl: string | null, viewerOptions: PdfPaneProps["viewerOptions"]): Promise<PdfDocumentProxy> => {
  const normalizedSourceUrl = sourceUrl?.trim();
  if (!normalizedSourceUrl) throw new Error("表示できるPDFソースがありません。");
  return pdfjsLib.getDocument({ ...createPdfDocumentLoadOptions(viewerOptions), url: normalizedSourceUrl }).promise;
};

const releasePdfViewerDocument = (pdfViewer: PdfViewerInstance, linkService: PdfLinkServiceInstance, pdfDocument: PdfDocumentProxy | null): void => {
  try {
    pdfViewer.setDocument(null);
  } catch {
    // PDF.js viewer cleanup should not block React unmount.
  }

  try {
    linkService.setDocument(null);
  } catch {
    // PDF.js link service cleanup should not block React unmount.
  }

  if (pdfDocument) void pdfDocument.destroy();
};

const addPdfViewerEventListener = (eventBus: PdfEventBusLike, eventName: string, listener: (event: unknown) => void): (() => void) => {
  eventBus.on(eventName, listener);
  return () => {
    if (eventBus.off) {
      eventBus.off(eventName, listener);
      return;
    }

    eventBus._off?.(eventName, listener);
  };
};

const PdfPane = ({ sourceUrl, className, viewerState = null, viewerOptions, onViewerStateChange }: PdfPaneProps) => {
  const viewerEnableXfa = viewerOptions?.enableXfa;
  const viewerUseSystemFonts = viewerOptions?.useSystemFonts;
  const viewerCMapUrl = viewerOptions?.cMapUrl;
  const viewerStandardFontDataUrl = viewerOptions?.standardFontDataUrl;
  const bookmarkPages = viewerState?.bookmarkPages ?? [];
  const markPages = viewerState?.markPages ?? {};
  const historyBackPages = viewerState?.historyBackPages ?? [];
  const historyForwardPages = viewerState?.historyForwardPages ?? [];
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerElementRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerRef = useRef<PdfViewerInstance | null>(null);
  const viewerStateRef = useRef<PdfViewerState | null>(viewerState);

  useEffect(() => {
    viewerStateRef.current = viewerState;
  }, [viewerState]);

  const updateViewerState = useCallback((patch: PdfViewerState) => {
    const nextViewerState = { ...(viewerStateRef.current ?? {}), ...patch };
    viewerStateRef.current = nextViewerState;
    void onViewerStateChange?.(nextViewerState);
  }, [onViewerStateChange]);

  const setViewerPage = useCallback((pageNumber: number, options?: { recordHistory?: boolean }) => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const pageCount = getPdfViewerPageCount(pdfViewer);
    const safePageNumber = getSafePageNumber(pageNumber, pageCount);
    const currentPage = getSafePageNumber(pdfViewer.currentPageNumber, pageCount);
    const shouldRecordHistory = options?.recordHistory ?? true;
    const currentViewerState = viewerStateRef.current ?? {};
    const nextBackPages = shouldRecordHistory && safePageNumber !== currentPage ? getTrimmedHistory([...(currentViewerState.historyBackPages ?? []), currentPage]) : currentViewerState.historyBackPages;
    pdfViewer.currentPageNumber = safePageNumber;
    updateViewerState({ currentPage: safePageNumber, historyBackPages: nextBackPages, historyForwardPages: shouldRecordHistory ? [] : currentViewerState.historyForwardPages });
  }, [updateViewerState]);

  const handleZoomIn = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const nextScale = clampPdfScale(getPdfViewerScale(pdfViewer) + PDF_SCALE_STEP);
    pdfViewer.currentScaleValue = String(nextScale);
    updateViewerState({ scale: nextScale, fitMode: "manual" });
  }, [updateViewerState]);

  const handleZoomOut = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const nextScale = clampPdfScale(getPdfViewerScale(pdfViewer) - PDF_SCALE_STEP);
    pdfViewer.currentScaleValue = String(nextScale);
    updateViewerState({ scale: nextScale, fitMode: "manual" });
  }, [updateViewerState]);

  const handleToggleBookmark = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const currentPage = getSafePageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    const nextBookmarkPages = bookmarkPages.includes(currentPage) ? bookmarkPages.filter((pageNumber) => pageNumber !== currentPage) : [...bookmarkPages, currentPage].sort((a, b) => a - b);
    updateViewerState({ bookmarkPages: nextBookmarkPages });
  }, [bookmarkPages, updateViewerState]);

  const handleGoBack = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const targetPage = historyBackPages.at(-1);
    if (!pdfViewer || !targetPage) return;
    const currentPage = getSafePageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    pdfViewer.currentPageNumber = targetPage;
    updateViewerState({ currentPage: targetPage, historyBackPages: historyBackPages.slice(0, -1), historyForwardPages: getTrimmedHistory([...historyForwardPages, currentPage]) });
  }, [historyBackPages, historyForwardPages, updateViewerState]);

  const handleGoForward = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const targetPage = historyForwardPages.at(-1);
    if (!pdfViewer || !targetPage) return;
    const currentPage = getSafePageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    pdfViewer.currentPageNumber = targetPage;
    updateViewerState({ currentPage: targetPage, historyBackPages: getTrimmedHistory([...historyBackPages, currentPage]), historyForwardPages: historyForwardPages.slice(0, -1) });
  }, [historyBackPages, historyForwardPages, updateViewerState]);

  const handleSetMark = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const rawKey = window.prompt("現在ページに設定する mark キーを入力してください（a-z / 0-9）", "a")?.trim().slice(0, 1).toLowerCase();
    if (!rawKey || !PDF_MARK_KEY_PATTERN.test(rawKey)) return;
    updateViewerState({ markPages: { ...markPages, [rawKey]: getSafePageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer)) } });
  }, [markPages, updateViewerState]);

  const handleJumpToMark = useCallback(() => {
    const rawKey = window.prompt("移動する mark キーを入力してください", "a")?.trim().slice(0, 1).toLowerCase();
    if (!rawKey) return;
    const targetPage = markPages[rawKey];
    if (!targetPage) return;
    setViewerPage(targetPage);
  }, [markPages, setViewerPage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const viewerElement = pdfViewerElementRef.current;
    if (!container || !viewerElement) return;

    let isCancelled = false;
    let loadedPdfDocument: PdfDocumentProxy | null = null;
    const eventBus = new EventBus() as PdfEventBusLike;
    const linkService = new PDFLinkService({ eventBus });
    const pdfViewer = new PDFViewer({ container, eventBus, linkService, viewer: viewerElement });
    const removeEventListeners: Array<() => void> = [];

    pdfViewerRef.current = pdfViewer;
    linkService.setViewer(pdfViewer);
    viewerElement.replaceChildren();
    setLoadError(null);
    setIsLoading(true);

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "pagesinit", () => {
      if (isCancelled || !loadedPdfDocument) return;
      pdfViewer.currentScaleValue = getPdfViewerStateScaleValue(viewerStateRef.current);
      pdfViewer.currentPageNumber = getSafePageNumber(viewerStateRef.current?.currentPage, loadedPdfDocument.numPages);
    }));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "pagechanging", (event: unknown) => {
      if (isCancelled) return;
      const pageNumber = (event as PdfPageChangingEvent).pageNumber;
      if (!Number.isFinite(pageNumber)) return;
      updateViewerState({ currentPage: pageNumber });
    }));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "scalechanging", (event: unknown) => {
      if (isCancelled) return;
      const scale = (event as PdfScaleChangingEvent).scale;
      if (!Number.isFinite(scale)) return;
      updateViewerState({ scale: clampPdfScale(scale), fitMode: "manual" });
    }));

    void loadPdfDocument(sourceUrl, { enableXfa: viewerEnableXfa, useSystemFonts: viewerUseSystemFonts, cMapUrl: viewerCMapUrl, standardFontDataUrl: viewerStandardFontDataUrl }).then((nextPdfDocument) => {
      if (isCancelled) {
        void nextPdfDocument.destroy();
        return;
      }

      loadedPdfDocument = nextPdfDocument;
      pdfViewer.setDocument(nextPdfDocument);
      linkService.setDocument(nextPdfDocument, null);
    }).catch((error: unknown) => {
      if (isCancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(message || "PDFファイルの読み込みに失敗しました。");
    }).finally(() => {
      if (!isCancelled) setIsLoading(false);
    });

    return () => {
      isCancelled = true;
      removeEventListeners.forEach((removeEventListener) => removeEventListener());
      releasePdfViewerDocument(pdfViewer, linkService, loadedPdfDocument);
      viewerElement.replaceChildren();
      if (pdfViewerRef.current === pdfViewer) pdfViewerRef.current = null;
    };
  }, [sourceUrl, updateViewerState, viewerCMapUrl, viewerEnableXfa, viewerStandardFontDataUrl, viewerUseSystemFonts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandlePdfKeyboardEvent(event)) return;
      const pdfViewer = pdfViewerRef.current;
      if (!pdfViewer) return;

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
        setViewerPage(pdfViewer.currentPageNumber + 1);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "k") {
        event.preventDefault();
        setViewerPage(pdfViewer.currentPageNumber - 1);
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
  }, [handleGoBack, handleGoForward, handleJumpToMark, handleSetMark, handleToggleBookmark, handleZoomIn, handleZoomOut, setViewerPage]);

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 bg-white text-[#2f2f2f]", className)}>
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-auto bg-white px-4 py-5">
          <div ref={pdfViewerElementRef} className="pdfViewer" />
          {isLoading ? <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-[13px] text-[#6d6d6d]">PDFを読み込み中...</div> : null}
          {!isLoading && loadError ? <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[13px] leading-6 text-[#4a4640]"><div className="max-w-md rounded-[14px] border border-[#ded8cf] bg-white px-5 py-4 shadow-sm">{loadError}</div></div> : null}
        </div>
      </main>
    </div>
  );
};

export { PdfPane };
export type { PdfPaneProps };
