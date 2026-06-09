import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import "pdfjs-dist/legacy/web/pdf_viewer.css";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import type { PdfViewerState } from "@/types";
import { releasePdfDocumentSource, toPdfDocumentLoadSource } from "./pdfDocumentSource";
import { waitForPdfLoadingTask } from "./pdfLoadingTaskTimeout";
import type { PdfDocumentSource } from "./pdfDocumentSource";

type PdfPaneProps = {
  source: PdfDocumentSource | null;
  className?: string;
  viewerState?: PdfViewerState | null;
  viewerOptions?: {
    enableXfa?: boolean;
    useSystemFonts?: boolean;
    cMapUrl?: string;
    standardFontDataUrl?: string;
    opaqueCanvas?: boolean;
  };
  onViewerStateChange?: (viewerState: PdfViewerState, options?: PdfViewerStateChangeOptions) => Promise<void> | void;
};

type PdfViewerStateChangePersistence = "immediate" | "deferred" | "none";

type PdfViewerStateChangeOptions = {
  persistence?: PdfViewerStateChangePersistence;
};

type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;

type PdfViewerInstance = InstanceType<typeof PDFViewer>;

type PdfViewerZoomDirection = "in" | "out";

type PdfViewerWithZoomMethods = PdfViewerInstance & {
  increaseScale: () => void;
  decreaseScale: () => void;
};

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

type PdfViewerRuntimeOptions = {
  enableOptimizedPartialRendering: boolean;
  maxCanvasPixels?: number;
  removePageBorders: boolean;
};

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

const DEFAULT_PDF_PAGE = 1;
const PDF_HISTORY_LIMIT = 80;
const PDF_MARK_KEY_PATTERN = /^[a-z0-9]$/i;
const PDFJS_ASSET_BASE_URL = "/pdfjs/";
const PDFJS_CMAP_URL = `${PDFJS_ASSET_BASE_URL}cmaps/`;
const PDFJS_STANDARD_FONT_DATA_URL = `${PDFJS_ASSET_BASE_URL}standard_fonts/`;
const PDFJS_WASM_URL = `${PDFJS_ASSET_BASE_URL}wasm/`;
const PDF_COMPACT_VIEWPORT_MAX_WIDTH = 767;
const PDF_EXPLICIT_ZOOM_SCALE_CHANGE_WINDOW_MS = 1_000;
const PDF_LOW_MEMORY_DEVICE_MAX_GB = 4;
const PDF_LOW_MEMORY_MAX_CANVAS_PIXELS = 16 * 1024 * 1024;
const PDF_DEFAULT_DEVICE_MEMORY_GB = 8;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const getSafePageNumber = (pageNumber: number | null | undefined, pageCount: number): number => {
  const normalizedPageNumber = Math.floor(pageNumber ?? DEFAULT_PDF_PAGE);
  return Math.min(Math.max(normalizedPageNumber, DEFAULT_PDF_PAGE), Math.max(pageCount, DEFAULT_PDF_PAGE));
};

const getTrimmedHistory = (pages: number[]): number[] => {
  return pages.slice(-PDF_HISTORY_LIMIT);
};

const getPdfViewerPageCount = (pdfViewer: PdfViewerInstance): number => {
  const pageCount = Number(pdfViewer.pagesCount);
  return Number.isFinite(pageCount) ? pageCount : 0;
};

const isCompactPdfViewport = (container: HTMLDivElement): boolean => {
  return container.clientWidth <= PDF_COMPACT_VIEWPORT_MAX_WIDTH;
};

const getPdfViewerStateScaleValue = (viewerState: PdfViewerState | null, forcePageWidth: boolean): string => {
  if (!forcePageWidth && viewerState?.fitMode === "manual" && typeof viewerState.scale === "number" && Number.isFinite(viewerState.scale) && viewerState.scale > 0) return String(viewerState.scale);
  return "page-width";
};

const shouldHandlePdfKeyboardEvent = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement | null;
  if (!target) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName !== "input" && tagName !== "textarea" && !target.isContentEditable;
};

const getApproxDeviceMemory = (): number => {
  const navigatorLike = globalThis.navigator as NavigatorWithDeviceMemory | undefined;
  const deviceMemory = navigatorLike?.deviceMemory;
  return typeof deviceMemory === "number" && Number.isFinite(deviceMemory) ? deviceMemory : PDF_DEFAULT_DEVICE_MEMORY_GB;
};

const createPdfViewerRuntimeOptions = (): PdfViewerRuntimeOptions => {
  const isLowMemoryDevice = getApproxDeviceMemory() <= PDF_LOW_MEMORY_DEVICE_MAX_GB;
  return {
    enableOptimizedPartialRendering: true,
    maxCanvasPixels: isLowMemoryDevice ? PDF_LOW_MEMORY_MAX_CANVAS_PIXELS : undefined,
    removePageBorders: true,
  };
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

const loadPdfDocument = async (source: PdfDocumentSource | null, viewerOptions: PdfPaneProps["viewerOptions"]): Promise<PdfDocumentProxy> => {
  if (!source) throw new Error("表示できるPDFソースがありません。");
  return waitForPdfLoadingTask(pdfjsLib.getDocument({ ...createPdfDocumentLoadOptions(viewerOptions), ...toPdfDocumentLoadSource(source) }));
};

const releasePdfViewerDocument = (pdfViewer: PdfViewerInstance, linkService: PdfLinkServiceInstance, pdfDocument: PdfDocumentProxy | null): void => {
  try {
    pdfViewer.cleanup();
  } catch {
    // PDF.js viewer cleanup should not block React unmount.
  }

  try {
    linkService.setDocument(null, null);
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

const applyPdfViewerZoom = (pdfViewer: PdfViewerInstance, direction: PdfViewerZoomDirection): void => {
  const zoomableViewer = pdfViewer as PdfViewerWithZoomMethods;
  if (direction === "in") {
    zoomableViewer.increaseScale();
    return;
  }

  zoomableViewer.decreaseScale();
};

const PdfPane = ({ source, className, viewerState = null, viewerOptions, onViewerStateChange }: PdfPaneProps) => {
  const viewerEnableXfa = viewerOptions?.enableXfa;
  const viewerUseSystemFonts = viewerOptions?.useSystemFonts;
  const viewerCMapUrl = viewerOptions?.cMapUrl;
  const viewerStandardFontDataUrl = viewerOptions?.standardFontDataUrl;
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerElementRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerRef = useRef<PdfViewerInstance | null>(null);
  const viewerStateRef = useRef<PdfViewerState | null>(viewerState);
  const onViewerStateChangeRef = useRef(onViewerStateChange);
  const isApplyingFitScaleRef = useRef(false);
  const lastExplicitZoomAtRef = useRef(0);

  useEffect(() => {
    viewerStateRef.current = viewerState;
  }, [viewerState]);

  useEffect(() => {
    onViewerStateChangeRef.current = onViewerStateChange;
  }, [onViewerStateChange]);

  const updateViewerState = useCallback((patch: PdfViewerState, options?: PdfViewerStateChangeOptions) => {
    const nextViewerState = { ...(viewerStateRef.current ?? {}), ...patch };
    viewerStateRef.current = nextViewerState;
    void onViewerStateChangeRef.current?.(nextViewerState, options);
  }, []);

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
    updateViewerState({ currentPage: safePageNumber, historyBackPages: nextBackPages, historyForwardPages: shouldRecordHistory ? [] : currentViewerState.historyForwardPages }, { persistence: "deferred" });
  }, [updateViewerState]);

  const handleZoomIn = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    lastExplicitZoomAtRef.current = Date.now();
    applyPdfViewerZoom(pdfViewer, "in");
  }, []);

  const handleZoomOut = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    lastExplicitZoomAtRef.current = Date.now();
    applyPdfViewerZoom(pdfViewer, "out");
  }, []);

  const handleToggleBookmark = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const currentViewerState = viewerStateRef.current ?? {};
    const bookmarkPages = currentViewerState.bookmarkPages ?? [];
    const currentPage = getSafePageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    const nextBookmarkPages = bookmarkPages.includes(currentPage) ? bookmarkPages.filter((pageNumber) => pageNumber !== currentPage) : [...bookmarkPages, currentPage].sort((a, b) => a - b);
    updateViewerState({ bookmarkPages: nextBookmarkPages }, { persistence: "immediate" });
  }, [updateViewerState]);

  const handleGoBack = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const currentViewerState = viewerStateRef.current ?? {};
    const historyBackPages = currentViewerState.historyBackPages ?? [];
    const historyForwardPages = currentViewerState.historyForwardPages ?? [];
    const targetPage = historyBackPages.at(-1);
    if (!pdfViewer || !targetPage) return;
    const currentPage = getSafePageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    pdfViewer.currentPageNumber = targetPage;
    updateViewerState({ currentPage: targetPage, historyBackPages: historyBackPages.slice(0, -1), historyForwardPages: getTrimmedHistory([...historyForwardPages, currentPage]) }, { persistence: "deferred" });
  }, [updateViewerState]);

  const handleGoForward = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const currentViewerState = viewerStateRef.current ?? {};
    const historyBackPages = currentViewerState.historyBackPages ?? [];
    const historyForwardPages = currentViewerState.historyForwardPages ?? [];
    const targetPage = historyForwardPages.at(-1);
    if (!pdfViewer || !targetPage) return;
    const currentPage = getSafePageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    pdfViewer.currentPageNumber = targetPage;
    updateViewerState({ currentPage: targetPage, historyBackPages: getTrimmedHistory([...historyBackPages, currentPage]), historyForwardPages: historyForwardPages.slice(0, -1) }, { persistence: "deferred" });
  }, [updateViewerState]);

  const handleSetMark = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const markPages = viewerStateRef.current?.markPages ?? {};
    const rawKey = window.prompt("現在ページに設定する mark キーを入力してください（a-z / 0-9）", "a")?.trim().slice(0, 1).toLowerCase();
    if (!rawKey || !PDF_MARK_KEY_PATTERN.test(rawKey)) return;
    updateViewerState({ markPages: { ...markPages, [rawKey]: getSafePageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer)) } }, { persistence: "immediate" });
  }, [updateViewerState]);

  const handleJumpToMark = useCallback(() => {
    const markPages = viewerStateRef.current?.markPages ?? {};
    const rawKey = window.prompt("移動する mark キーを入力してください", "a")?.trim().slice(0, 1).toLowerCase();
    if (!rawKey) return;
    const targetPage = markPages[rawKey];
    if (!targetPage) return;
    setViewerPage(targetPage);
  }, [setViewerPage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const viewerElement = pdfViewerElementRef.current;
    if (!container || !viewerElement) return;

    let isCancelled = false;
    let loadedPdfDocument: PdfDocumentProxy | null = null;
    let resizeFrame: number | null = null;
    const eventBus = new EventBus() as PdfEventBusLike;
    const linkService = new PDFLinkService({ eventBus });
    const pdfViewer = new PDFViewer({ container, eventBus, linkService, viewer: viewerElement, ...createPdfViewerRuntimeOptions() });
    const removeEventListeners: Array<() => void> = [];

    const setFitScale = () => {
      isApplyingFitScaleRef.current = true;
      pdfViewer.currentScaleValue = "page-width";
    };

    const requestResponsiveScaleUpdate = () => {
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        if (isCancelled || !loadedPdfDocument) return;
        if (!isCompactPdfViewport(container) && viewerStateRef.current?.fitMode === "manual") return;
        setFitScale();
      });
    };

    pdfViewerRef.current = pdfViewer;
    linkService.setViewer(pdfViewer);
    viewerElement.replaceChildren();
    setIsLoading(true);

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(requestResponsiveScaleUpdate);
    resizeObserver?.observe(container);
    window.addEventListener("orientationchange", requestResponsiveScaleUpdate);

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "pagesinit", () => {
      if (isCancelled || !loadedPdfDocument) return;
      const scaleValue = getPdfViewerStateScaleValue(viewerStateRef.current, isCompactPdfViewport(container));
      if (scaleValue === "page-width") {
        setFitScale();
      } else {
        pdfViewer.currentScaleValue = scaleValue;
      }
      pdfViewer.currentPageNumber = getSafePageNumber(viewerStateRef.current?.currentPage, loadedPdfDocument.numPages);
      requestResponsiveScaleUpdate();
    }));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "pagechanging", (event: unknown) => {
      if (isCancelled) return;
      const pageNumber = (event as PdfPageChangingEvent).pageNumber;
      if (!Number.isFinite(pageNumber)) return;
      if (viewerStateRef.current?.currentPage === pageNumber) return;
      updateViewerState({ currentPage: pageNumber }, { persistence: "deferred" });
    }));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "scalechanging", (event: unknown) => {
      if (isCancelled) return;
      const scale = Number((event as PdfScaleChangingEvent).scale);
      if (!Number.isFinite(scale) || scale <= 0) return;
      const fitMode = isApplyingFitScaleRef.current ? "width" : "manual";
      const isExplicitZoom = Date.now() - lastExplicitZoomAtRef.current <= PDF_EXPLICIT_ZOOM_SCALE_CHANGE_WINDOW_MS;
      isApplyingFitScaleRef.current = false;
      if (isExplicitZoom) lastExplicitZoomAtRef.current = 0;
      if (viewerStateRef.current?.scale === scale && viewerStateRef.current?.fitMode === fitMode) return;
      updateViewerState({ scale, fitMode }, { persistence: isExplicitZoom ? "immediate" : "none" });
    }));

    void loadPdfDocument(source, { enableXfa: viewerEnableXfa, useSystemFonts: viewerUseSystemFonts, cMapUrl: viewerCMapUrl, standardFontDataUrl: viewerStandardFontDataUrl }).then((nextPdfDocument) => {
      if (isCancelled) {
        void nextPdfDocument.destroy();
        return;
      }

      loadedPdfDocument = nextPdfDocument;
      pdfViewer.setDocument(nextPdfDocument);
      linkService.setDocument(nextPdfDocument, null);
    }).catch((error: unknown) => {
      if (isCancelled) return;
      console.warn("[PdfPane] PDF load failed", error);
    }).finally(() => {
      if (!isCancelled) setIsLoading(false);
    });

    return () => {
      isCancelled = true;
      isApplyingFitScaleRef.current = false;
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("orientationchange", requestResponsiveScaleUpdate);
      removeEventListeners.forEach((removeEventListener) => removeEventListener());
      releasePdfViewerDocument(pdfViewer, linkService, loadedPdfDocument);
      releasePdfDocumentSource(source);
      viewerElement.replaceChildren();
      if (pdfViewerRef.current === pdfViewer) pdfViewerRef.current = null;
    };
  }, [source, updateViewerState, viewerCMapUrl, viewerEnableXfa, viewerStandardFontDataUrl, viewerUseSystemFonts]);

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
    <div className={cn("flex h-full min-h-0 min-w-0 bg-[var(--carvepanel-surface)] text-[#2f2f2f] max-sm:min-h-[100dvh]", className)}>
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-auto overscroll-contain bg-[var(--carvepanel-surface)] px-3 py-4 [-webkit-overflow-scrolling:touch] sm:px-4 sm:py-5">
          <div ref={pdfViewerElementRef} className="pdfViewer" />
          {isLoading ? <LoadingSpinner className="absolute inset-0 bg-[var(--carvepanel-surface)] text-[#6d6d6d]" label="PDFを読み込み中" /> : null}
        </div>
      </main>
    </div>
  );
};

export { PdfPane };
export type { PdfPaneProps, PdfViewerStateChangeOptions };
