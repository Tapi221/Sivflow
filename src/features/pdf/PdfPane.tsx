import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import "pdfjs-dist/legacy/web/pdf_viewer.css";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import type { PdfViewerState } from "@/types";
import { releasePdfDocumentSourceSoon, retainPdfDocumentSource, toPdfDocumentLoadSource } from "./pdfDocumentSource";
import { waitForPdfLoadingTask } from "./pdfLoadingTaskTimeout";
import { getPdfPageWindowKeepSet, getSafePdfPageNumber } from "./pdfPageWindow";
import { createPdfPerformanceTraceName, recordPdfPerformanceMark, recordPdfPerformanceMeasure } from "./pdfPerformance";
import type { PdfDocumentSource } from "./pdfDocumentSource";
import type { PdfPageWindowMetric } from "./pdfPageWindow";
import "./PdfPane.css";

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
  onLoadError?: (error: unknown) => void;
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
  annotationEditorMode: number;
  annotationMode: number;
  enableHWA: boolean;
  enableAutoLinking: boolean;
  enableDetailCanvas: boolean;
  enableOptimizedPartialRendering: boolean;
  maxCanvasPixels?: number;
  minDurationToUpdateCanvas: number;
  removePageBorders: boolean;
};

type PdfViewerPageBuffer = {
  resize?: (size: number, idsToKeep?: Set<number>) => void;
};

type PdfViewerWithPageBuffer = PdfViewerInstance & {
  _buffer?: PdfViewerPageBuffer;
};

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

type PdfScrollEventName = "scroll" | "wheel" | "touchmove";

type PdfPageElement = HTMLElement & {
  dataset: HTMLElement["dataset"] & {
    pageNumber?: string;
  };
};

type ResizePdfPageBufferOptions = {
  pageMetrics?: PdfPageWindowMetric[];
  viewerElement?: HTMLElement | null;
};

const PDF_COMPACT_VIEWPORT_MAX_WIDTH = 640;
const PDF_DEFAULT_DEVICE_MEMORY_GB = 4;
const PDF_EXPLICIT_ZOOM_SCALE_CHANGE_WINDOW_MS = 500;
const PDF_HISTORY_LIMIT = 80;
const PDF_LOW_MEMORY_DEVICE_MAX_GB = 4;
const PDF_LOW_MEMORY_MAX_CANVAS_PIXELS = 5_000_000;
const PDF_MARK_KEY_PATTERN = /^[a-z0-9]$/i;
const PDF_RANGE_CHUNK_SIZE = 65_536;
const PDF_SCROLL_CONTAINER_CLASS_NAME = "pdf-pane__scroll-container";
const PDF_SCROLL_IDLE_DELAY_MS = 200;
const PDF_SCROLLING_CLASS_NAME = "pdf-pane--scrolling";
const PDF_VIEWER_CLASS_NAME = "pdf-pane__viewer";
const PDF_VISIBLE_PAGE_CACHE_OVERSCAN = 2;
const PDFJS_ASSET_BASE_URL = "/pdfjs/";
const PDFJS_CMAP_URL = `${PDFJS_ASSET_BASE_URL}cmaps/`;
const PDFJS_STANDARD_FONT_DATA_URL = `${PDFJS_ASSET_BASE_URL}standard_fonts/`;
const PDFJS_WASM_URL = `${PDFJS_ASSET_BASE_URL}wasm/`;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const getSafePageNumber = getSafePdfPageNumber;

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

const getPdfPageNumberFromElement = (element: PdfPageElement): number | null => {
  const pageNumber = Number(element.dataset.pageNumber);
  return Number.isFinite(pageNumber) ? pageNumber : null;
};

const getPdfVisiblePageMetrics = (viewerElement: HTMLElement): PdfPageWindowMetric[] => {
  const pageMetrics: PdfPageWindowMetric[] = [];

  viewerElement.querySelectorAll<PdfPageElement>(".page").forEach((element) => {
    pageMetrics.push({
      pageNumber: getPdfPageNumberFromElement(element) ?? 0,
      offsetTop: element.offsetTop,
      offsetHeight: element.offsetHeight,
    });
  });

  return pageMetrics;
};

const resizePdfViewerPageBuffer = (pdfViewer: PdfViewerInstance, container?: HTMLElement | null, options: ResizePdfPageBufferOptions = {}, pageNumber: number = pdfViewer.currentPageNumber): void => {
  const pageCount = getPdfViewerPageCount(pdfViewer);
  if (pageCount <= 0) return;
  const pageBuffer = (pdfViewer as PdfViewerWithPageBuffer)._buffer;
  if (typeof pageBuffer?.resize !== "function") return;
  const pageMetrics = options.pageMetrics ?? (options.viewerElement ? getPdfVisiblePageMetrics(options.viewerElement) : []);
  const idsToKeep = getPdfPageWindowKeepSet(pageMetrics, container?.scrollTop ?? 0, container?.clientHeight ?? 0, pageCount, { fallbackPageNumber: pageNumber, overscanPageCount: PDF_VISIBLE_PAGE_CACHE_OVERSCAN });
  pageBuffer.resize(Math.min(Math.max(idsToKeep.size, 1), pageCount), idsToKeep);
};

const createPdfViewerRuntimeOptions = (): PdfViewerRuntimeOptions => {
  const isLowMemoryDevice = getApproxDeviceMemory() <= PDF_LOW_MEMORY_DEVICE_MAX_GB;
  return {
    annotationEditorMode: pdfjsLib.AnnotationEditorType.DISABLE,
    annotationMode: pdfjsLib.AnnotationMode.ENABLE,
    enableHWA: true,
    enableAutoLinking: false,
    enableDetailCanvas: false,
    enableOptimizedPartialRendering: true,
    maxCanvasPixels: isLowMemoryDevice ? PDF_LOW_MEMORY_MAX_CANVAS_PIXELS : undefined,
    minDurationToUpdateCanvas: 0,
    removePageBorders: true,
  };
};

const createPdfDocumentLoadOptions = (viewerOptions: PdfPaneProps["viewerOptions"], source: PdfDocumentSource | null) => {
  const isRemoteUrlSource = source?.type === "url" && source.locality === "remote";
  return {
    disableAutoFetch: isRemoteUrlSource,
    disableRange: false,
    disableStream: false,
    enableHWA: true,
    enableXfa: viewerOptions?.enableXfa,
    useSystemFonts: viewerOptions?.useSystemFonts ?? true,
    cMapUrl: viewerOptions?.cMapUrl ?? PDFJS_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: viewerOptions?.standardFontDataUrl ?? PDFJS_STANDARD_FONT_DATA_URL,
    wasmUrl: PDFJS_WASM_URL,
    rangeChunkSize: isRemoteUrlSource ? PDF_RANGE_CHUNK_SIZE : undefined,
  };
};

const loadPdfDocument = async (source: PdfDocumentSource | null, viewerOptions: PdfPaneProps["viewerOptions"]): Promise<PdfDocumentProxy> => {
  if (!source) throw new Error("表示できるPDFソースがありません。");
  return waitForPdfLoadingTask(pdfjsLib.getDocument({ ...createPdfDocumentLoadOptions(viewerOptions, source), ...toPdfDocumentLoadSource(source) }));
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

const addPassivePdfScrollListener = (element: HTMLElement, eventName: PdfScrollEventName, listener: EventListener): (() => void) => {
  element.addEventListener(eventName, listener, { passive: true });
  return () => element.removeEventListener(eventName, listener);
};

const setPdfScrollOptimizationClass = (container: HTMLElement, viewerElement: HTMLElement, isActive: boolean): void => {
  if (isActive) {
    container.classList.add(PDF_SCROLLING_CLASS_NAME);
    viewerElement.classList.add(PDF_SCROLLING_CLASS_NAME);
    return;
  }

  container.classList.remove(PDF_SCROLLING_CLASS_NAME);
  viewerElement.classList.remove(PDF_SCROLLING_CLASS_NAME);
};

const applyPdfViewerZoom = (pdfViewer: PdfViewerInstance, direction: PdfViewerZoomDirection): void => {
  const zoomableViewer = pdfViewer as PdfViewerWithZoomMethods;
  if (direction === "in") {
    zoomableViewer.increaseScale();
    return;
  }

  zoomableViewer.decreaseScale();
};

const PdfPane = ({ source, className, viewerState = null, viewerOptions, onLoadError, onViewerStateChange }: PdfPaneProps) => {
  const viewerEnableXfa = viewerOptions?.enableXfa;
  const viewerUseSystemFonts = viewerOptions?.useSystemFonts;
  const viewerCMapUrl = viewerOptions?.cMapUrl;
  const viewerStandardFontDataUrl = viewerOptions?.standardFontDataUrl;
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerElementRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerRef = useRef<PdfViewerInstance | null>(null);
  const viewerStateRef = useRef<PdfViewerState | null>(viewerState);
  const onLoadErrorRef = useRef(onLoadError);
  const onViewerStateChangeRef = useRef(onViewerStateChange);
  const isApplyingFitScaleRef = useRef(false);
  const lastExplicitZoomAtRef = useRef(0);

  useEffect(() => {
    viewerStateRef.current = viewerState;
  }, [viewerState]);

  useEffect(() => {
    onLoadErrorRef.current = onLoadError;
  }, [onLoadError]);

  useEffect(() => {
    onViewerStateChangeRef.current = onViewerStateChange;
  }, [onViewerStateChange]);

  const updateViewerState = useCallback((patch: PdfViewerState, options?: PdfViewerStateChangeOptions) => {
    const nextViewerState = { ...(viewerStateRef.current ?? {}), ...patch };
    viewerStateRef.current = nextViewerState;
    void onViewerStateChangeRef.current?.(nextViewerState, options);
  }, []);

  const resizeActivePdfViewerPageBuffer = useCallback((pageNumber?: number) => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    resizePdfViewerPageBuffer(pdfViewer, scrollContainerRef.current, { viewerElement: pdfViewerElementRef.current }, pageNumber);
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
    resizeActivePdfViewerPageBuffer(safePageNumber);
    updateViewerState({ currentPage: safePageNumber, historyBackPages: nextBackPages, historyForwardPages: shouldRecordHistory ? [] : currentViewerState.historyForwardPages }, { persistence: "deferred" });
  }, [resizeActivePdfViewerPageBuffer, updateViewerState]);

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
    resizeActivePdfViewerPageBuffer(targetPage);
    updateViewerState({ currentPage: targetPage, historyBackPages: historyBackPages.slice(0, -1), historyForwardPages: getTrimmedHistory([...historyForwardPages, currentPage]) }, { persistence: "deferred" });
  }, [resizeActivePdfViewerPageBuffer, updateViewerState]);

  const handleGoForward = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const currentViewerState = viewerStateRef.current ?? {};
    const historyBackPages = currentViewerState.historyBackPages ?? [];
    const historyForwardPages = currentViewerState.historyForwardPages ?? [];
    const targetPage = historyForwardPages.at(-1);
    if (!pdfViewer || !targetPage) return;
    const currentPage = getSafePageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    pdfViewer.currentPageNumber = targetPage;
    resizeActivePdfViewerPageBuffer(targetPage);
    updateViewerState({ currentPage: targetPage, historyBackPages: getTrimmedHistory([...historyBackPages, currentPage]), historyForwardPages: historyForwardPages.slice(0, -1) }, { persistence: "deferred" });
  }, [resizeActivePdfViewerPageBuffer, updateViewerState]);

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
    let scrollFrame: number | null = null;
    let pageChangeFrame: number | null = null;
    let pageMetricFrame: number | null = null;
    let scrollIdleFrame: number | null = null;
    let scrollIdleTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
    let isScrollOptimizationActive = false;
    let pendingPageNumber: number | null = null;
    let pageMetricCache: PdfPageWindowMetric[] = [];
    let pageMetricCacheReady = false;
    const performanceTraceName = createPdfPerformanceTraceName("viewer.load");
    const eventBus = new EventBus() as PdfEventBusLike;
    const linkService = new PDFLinkService({ eventBus });
    const pdfViewer = new PDFViewer({ container, eventBus, linkService, viewer: viewerElement, ...createPdfViewerRuntimeOptions() });
    const removeEventListeners: Array<() => void> = [];

    retainPdfDocumentSource(source);

    const refreshPageMetricCache = () => {
      pageMetricCache = getPdfVisiblePageMetrics(viewerElement);
      pageMetricCacheReady = true;
      return pageMetricCache;
    };

    const updateContainIntrinsicSizeFromPage = () => {
      const firstPageElement = viewerElement.querySelector<HTMLElement>(".page");
      if (!firstPageElement) return;
      const pageWidth = firstPageElement.offsetWidth;
      const pageHeight = firstPageElement.offsetHeight;
      if (pageWidth > 0 && pageHeight > 0) {
        viewerElement.style.setProperty("--pdf-page-width", `${pageWidth}px`);
        viewerElement.style.setProperty("--pdf-page-height", `${pageHeight}px`);
      }
    };

    const resizeVisiblePageBuffer = (pageNumber?: number, options: { refreshMetrics?: boolean } = {}) => {
      const pageMetrics = options.refreshMetrics ? refreshPageMetricCache() : (pageMetricCacheReady ? pageMetricCache : []);
      resizePdfViewerPageBuffer(pdfViewer, container, { pageMetrics }, pageNumber);
    };

    const requestPageMetricRefresh = (pageNumber?: number) => {
      if (pageMetricFrame !== null) return;
      pageMetricFrame = window.requestAnimationFrame(() => {
        pageMetricFrame = null;
        if (isCancelled) return;
        resizeVisiblePageBuffer(pageNumber, { refreshMetrics: true });
      });
    };

    const setFitScale = () => {
      isApplyingFitScaleRef.current = true;
      pdfViewer.currentScaleValue = "page-width";
      requestPageMetricRefresh();
    };

    const requestResponsiveScaleUpdate = () => {
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        if (isCancelled || !loadedPdfDocument) return;
        if (!isCompactPdfViewport(container) && viewerStateRef.current?.fitMode === "manual") {
          requestPageMetricRefresh();
          return;
        }

        setFitScale();
      });
    };

    const setScrollOptimizationActive = (isActive: boolean) => {
      if (isScrollOptimizationActive === isActive) return;
      isScrollOptimizationActive = isActive;
      setPdfScrollOptimizationClass(container, viewerElement, isActive);
      recordPdfPerformanceMark(`${performanceTraceName}.${isActive ? "scrollActive" : "scrollIdle"}`, { debugOnly: true, detail: { pageNumber: pdfViewer.currentPageNumber } });
    };

    const clearScrollIdleTimer = () => {
      if (scrollIdleTimer !== null) {
        globalThis.clearTimeout(scrollIdleTimer);
        scrollIdleTimer = null;
      }

      if (scrollIdleFrame !== null) {
        window.cancelAnimationFrame(scrollIdleFrame);
        scrollIdleFrame = null;
      }
    };

    const markScrollIdle = () => {
      scrollIdleTimer = null;
      if (isCancelled) return;
      scrollIdleFrame = window.requestAnimationFrame(() => {
        scrollIdleFrame = null;
        if (isCancelled) return;
        setScrollOptimizationActive(false);
        resizeVisiblePageBuffer(undefined, { refreshMetrics: true });
      });
    };

    const scheduleScrollIdle = () => {
      clearScrollIdleTimer();
      scrollIdleTimer = globalThis.setTimeout(markScrollIdle, PDF_SCROLL_IDLE_DELAY_MS);
    };

    const requestScrollOptimization = () => {
      scheduleScrollIdle();
      if (isScrollOptimizationActive || scrollFrame !== null) return;

      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        if (isCancelled) return;
        setScrollOptimizationActive(true);
        resizeVisiblePageBuffer();
      });
    };

    const flushPendingPageChange = () => {
      pageChangeFrame = null;
      if (isCancelled || pendingPageNumber === null) return;
      const pageNumber = pendingPageNumber;
      pendingPageNumber = null;
      if (viewerStateRef.current?.currentPage !== pageNumber) updateViewerState({ currentPage: pageNumber }, { persistence: "deferred" });
      resizeVisiblePageBuffer(pageNumber);
    };

    const requestPageChangeUpdate = (pageNumber: number) => {
      pendingPageNumber = pageNumber;
      if (pageChangeFrame !== null) return;
      pageChangeFrame = window.requestAnimationFrame(flushPendingPageChange);
    };

    recordPdfPerformanceMark(`${performanceTraceName}.start`, { detail: { sourceType: source?.type ?? null } });
    pdfViewerRef.current = pdfViewer;
    linkService.setViewer(pdfViewer);
    viewerElement.replaceChildren();
    setIsLoading(true);

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(requestResponsiveScaleUpdate);
    resizeObserver?.observe(container);
    window.addEventListener("orientationchange", requestResponsiveScaleUpdate);
    removeEventListeners.push(addPassivePdfScrollListener(container, "scroll", requestScrollOptimization));
    removeEventListeners.push(addPassivePdfScrollListener(container, "wheel", requestScrollOptimization));
    removeEventListeners.push(addPassivePdfScrollListener(container, "touchmove", requestScrollOptimization));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "pagesinit", () => {
      if (isCancelled || !loadedPdfDocument) return;
      recordPdfPerformanceMark(`${performanceTraceName}.pagesinit`, { detail: { numPages: loadedPdfDocument.numPages, sourceType: source?.type ?? null } });
      recordPdfPerformanceMeasure(`${performanceTraceName}.toPagesInit`, `${performanceTraceName}.start`, `${performanceTraceName}.pagesinit`);
      const scaleValue = getPdfViewerStateScaleValue(viewerStateRef.current, isCompactPdfViewport(container));
      if (scaleValue === "page-width") {
        setFitScale();
      } else {
        pdfViewer.currentScaleValue = scaleValue;
        requestPageMetricRefresh();
      }

      const initialPageNumber = getSafePageNumber(viewerStateRef.current?.currentPage, loadedPdfDocument.numPages);
      pdfViewer.currentPageNumber = initialPageNumber;
      resizeVisiblePageBuffer(initialPageNumber, { refreshMetrics: true });
      updateContainIntrinsicSizeFromPage();
      requestResponsiveScaleUpdate();
    }));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "pagechanging", (event: unknown) => {
      if (isCancelled) return;
      const pageNumber = (event as PdfPageChangingEvent).pageNumber;
      if (!Number.isFinite(pageNumber)) return;
      recordPdfPerformanceMark(`${performanceTraceName}.pagechanging`, { debugOnly: true, detail: { pageNumber } });
      requestPageChangeUpdate(pageNumber);
    }));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "scalechanging", (event: unknown) => {
      if (isCancelled) return;
      const scale = Number((event as PdfScaleChangingEvent).scale);
      if (!Number.isFinite(scale) || scale <= 0) return;
      recordPdfPerformanceMark(`${performanceTraceName}.scalechanging`, { debugOnly: true, detail: { scale } });
      const fitMode = isApplyingFitScaleRef.current ? "width" : "manual";
      const isExplicitZoom = Date.now() - lastExplicitZoomAtRef.current <= PDF_EXPLICIT_ZOOM_SCALE_CHANGE_WINDOW_MS;
      isApplyingFitScaleRef.current = false;
      if (isExplicitZoom) lastExplicitZoomAtRef.current = 0;
      if (viewerStateRef.current?.scale !== scale || viewerStateRef.current?.fitMode !== fitMode) updateViewerState({ scale, fitMode }, { persistence: isExplicitZoom ? "immediate" : "none" });
      requestPageMetricRefresh();
      updateContainIntrinsicSizeFromPage();
    }));

    void loadPdfDocument(source, { enableXfa: viewerEnableXfa, useSystemFonts: viewerUseSystemFonts, cMapUrl: viewerCMapUrl, standardFontDataUrl: viewerStandardFontDataUrl }).then((nextPdfDocument) => {
      recordPdfPerformanceMark(`${performanceTraceName}.loaded`, { detail: { numPages: nextPdfDocument.numPages, sourceType: source?.type ?? null } });
      recordPdfPerformanceMeasure(`${performanceTraceName}.toLoaded`, `${performanceTraceName}.start`, `${performanceTraceName}.loaded`);
      if (isCancelled) {
        void nextPdfDocument.destroy();
        return;
      }

      loadedPdfDocument = nextPdfDocument;
      pdfViewer.setDocument(nextPdfDocument);
      linkService.setDocument(nextPdfDocument, null);
    }).catch((error: unknown) => {
      recordPdfPerformanceMark(`${performanceTraceName}.error`, { detail: { message: error instanceof Error ? error.message : String(error), sourceType: source?.type ?? null } });
      recordPdfPerformanceMeasure(`${performanceTraceName}.toError`, `${performanceTraceName}.start`, `${performanceTraceName}.error`);
      if (isCancelled) return;
      console.warn("[PdfPane] PDF load failed", error);
      onLoadErrorRef.current?.(error);
    }).finally(() => {
      if (!isCancelled) setIsLoading(false);
    });

    return () => {
      isCancelled = true;
      isApplyingFitScaleRef.current = false;
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      if (pageChangeFrame !== null) window.cancelAnimationFrame(pageChangeFrame);
      if (pageMetricFrame !== null) window.cancelAnimationFrame(pageMetricFrame);
      clearScrollIdleTimer();
      setPdfScrollOptimizationClass(container, viewerElement, false);
      resizeObserver?.disconnect();
      window.removeEventListener("orientationchange", requestResponsiveScaleUpdate);
      removeEventListeners.forEach((removeEventListener) => removeEventListener());
      releasePdfViewerDocument(pdfViewer, linkService, loadedPdfDocument);
      releasePdfDocumentSourceSoon(source);
      recordPdfPerformanceMark(`${performanceTraceName}.cleanup`, { debugOnly: true, detail: { sourceType: source?.type ?? null } });
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
        <div ref={scrollContainerRef} className={cn(PDF_SCROLL_CONTAINER_CLASS_NAME, "absolute inset-0 overflow-auto overscroll-contain bg-[var(--carvepanel-surface)] px-3 py-4 [-webkit-overflow-scrolling:touch] sm:px-4 sm:py-5")}>
          <div ref={pdfViewerElementRef} className={cn("pdfViewer", PDF_VIEWER_CLASS_NAME)} />
          {isLoading ? <LoadingSpinner className="absolute inset-0 bg-[var(--carvepanel-surface)] text-[#6d6d6d]" label="PDFを読み込み中" /> : null}
        </div>
      </main>
    </div>
  );
};

export { PdfPane };
export type { PdfPaneProps, PdfViewerStateChangeOptions };
