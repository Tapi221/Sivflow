import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import "pdfjs-dist/legacy/web/pdf_viewer.css";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import type { PdfViewerState } from "@/types";
import { releasePdfDocumentSourceSoon, retainPdfDocumentSource, toPdfDocumentLoadSource } from "./pdfDocumentSource";
import { waitForPdfLoadingTask } from "./pdfLoadingTaskTimeout";
import { getPdfPageWindowKeepSet, getSafePdfPageNumber, type PdfPageWindowMetric } from "./pdfPageWindow";
import { createPdfPerformanceTraceName, recordPdfPerformanceMark, recordPdfPerformanceMeasure } from "./pdfPerformance";
import type { PdfDocumentSource } from "./pdfDocumentSource";
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
type PdfLinkServiceInstance = InstanceType<typeof PDFLinkService>;
type PdfEventBusInstance = InstanceType<typeof EventBus>;

type PdfViewerWithScale = PdfViewerInstance & {
  currentScale: number;
  currentScaleValue: string;
};

type PdfViewerWithZoomMethods = PdfViewerInstance & {
  increaseScale?: () => void;
  decreaseScale?: () => void;
};

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

type PdfGestureEvent = Event & {
  clientX?: number;
  clientY?: number;
  scale?: number;
};

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

type PdfToolbarState = {
  currentPage: number;
  pageCount: number;
  scale: number;
  isBookmarked: boolean;
};

type PendingPdfZoom = {
  scale: number;
  clientX?: number;
  clientY?: number;
};

const PDF_COMPACT_VIEWPORT_MAX_WIDTH = 640;
const PDF_DEFAULT_DEVICE_MEMORY_GB = 4;
const PDF_EXPLICIT_ZOOM_SCALE_CHANGE_WINDOW_MS = 500;
const PDF_HISTORY_LIMIT = 80;
const PDF_LOW_MEMORY_DEVICE_MAX_GB = 4;
const PDF_LOW_MEMORY_MAX_CANVAS_PIXELS = 5_000_000;
const PDF_MARK_KEY_PATTERN = /^[a-z0-9]$/i;
const PDF_MAX_SCALE = 5;
const PDF_MIN_SCALE = 0.25;
const PDF_RANGE_CHUNK_SIZE = 65_536;
const PDF_SCALE_EPSILON = 0.001;
const PDF_SCROLL_CONTAINER_CLASS_NAME = "pdf-pane__scroll-container";
const PDF_SCROLL_IDLE_DELAY_MS = 200;
const PDF_SCROLLING_CLASS_NAME = "pdf-pane--scrolling";
const PDF_TOOLBAR_BUTTON_CLASS_NAME = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-black/10 bg-white/90 px-2 text-[12px] font-medium text-[#4a4a4a] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
const PDF_TOOLBAR_INPUT_CLASS_NAME = "h-8 w-14 rounded-md border border-black/10 bg-white/90 px-2 text-center text-[12px] font-medium text-[#4a4a4a] shadow-sm outline-none focus:border-black/25";
const PDF_TRACKPAD_ZOOM_SENSITIVITY = 0.0015;
const PDF_VISIBLE_PAGE_CACHE_OVERSCAN = 2;
const PDF_WHEEL_DELTA_LINE_HEIGHT_PX = 16;
const PDF_WHEEL_DELTA_MODE_LINE = 1;
const PDF_WHEEL_DELTA_MODE_PAGE = 2;
const PDFJS_ASSET_BASE_URL = "/pdfjs/";
const PDFJS_CMAP_URL = `${PDFJS_ASSET_BASE_URL}cmaps/`;
const PDFJS_STANDARD_FONT_DATA_URL = `${PDFJS_ASSET_BASE_URL}standard_fonts/`;
const PDFJS_WASM_URL = `${PDFJS_ASSET_BASE_URL}wasm/`;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const getTrimmedHistory = (pages: number[]): number[] => {
  return pages.slice(-PDF_HISTORY_LIMIT);
};

const getPdfViewerPageCount = (pdfViewer: PdfViewerInstance): number => {
  const pageCount = Number(pdfViewer.pagesCount);
  return Number.isFinite(pageCount) ? pageCount : 0;
};

const getPdfViewerCurrentScale = (pdfViewer: PdfViewerInstance): number => {
  const currentScale = Number((pdfViewer as PdfViewerWithScale).currentScale);
  return Number.isFinite(currentScale) && currentScale > 0 ? currentScale : 1;
};

const getApproxDeviceMemory = (): number => {
  const navigatorLike = globalThis.navigator as NavigatorWithDeviceMemory | undefined;
  const deviceMemory = navigatorLike?.deviceMemory;
  return typeof deviceMemory === "number" && Number.isFinite(deviceMemory) ? deviceMemory : PDF_DEFAULT_DEVICE_MEMORY_GB;
};

const createPdfViewerRuntimeOptions = () => {
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

const clampPdfViewerScale = (scale: number): number => {
  return Math.min(Math.max(scale, PDF_MIN_SCALE), PDF_MAX_SCALE);
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

const getNormalizedPdfWheelDeltaY = (event: WheelEvent, container: HTMLElement): number => {
  if (event.deltaMode === PDF_WHEEL_DELTA_MODE_LINE) return event.deltaY * PDF_WHEEL_DELTA_LINE_HEIGHT_PX;
  if (event.deltaMode === PDF_WHEEL_DELTA_MODE_PAGE) return event.deltaY * Math.max(container.clientHeight, 1);
  return event.deltaY;
};

const isPdfTrackpadZoomWheelEvent = (event: WheelEvent): boolean => {
  return event.ctrlKey || event.metaKey;
};

const getPdfZoomClientPoint = (container: HTMLElement, clientX?: number, clientY?: number): { clientX: number; clientY: number } => {
  const containerRect = container.getBoundingClientRect();
  return {
    clientX: typeof clientX === "number" && Number.isFinite(clientX) ? clientX : containerRect.left + container.clientWidth / 2,
    clientY: typeof clientY === "number" && Number.isFinite(clientY) ? clientY : containerRect.top + container.clientHeight / 2,
  };
};

const applyPdfViewerScaleAtClientPoint = (pdfViewer: PdfViewerInstance, container: HTMLElement, scale: number, clientX?: number, clientY?: number): boolean => {
  if (getPdfViewerPageCount(pdfViewer) <= 0) return false;
  const currentScale = getPdfViewerCurrentScale(pdfViewer);
  const nextScale = clampPdfViewerScale(scale);
  if (Math.abs(nextScale - currentScale) < PDF_SCALE_EPSILON) return false;

  const containerRect = container.getBoundingClientRect();
  const clientPoint = getPdfZoomClientPoint(container, clientX, clientY);
  const localX = Math.min(Math.max(clientPoint.clientX - containerRect.left, 0), container.clientWidth);
  const localY = Math.min(Math.max(clientPoint.clientY - containerRect.top, 0), container.clientHeight);
  const anchorX = container.scrollLeft + localX;
  const anchorY = container.scrollTop + localY;
  const scaleRatio = nextScale / currentScale;

  (pdfViewer as PdfViewerWithScale).currentScaleValue = String(nextScale);
  container.scrollLeft = Math.max(0, anchorX * scaleRatio - localX);
  container.scrollTop = Math.max(0, anchorY * scaleRatio - localY);
  return true;
};

const applyPdfViewerZoom = (pdfViewer: PdfViewerInstance, direction: "in" | "out"): void => {
  const zoomableViewer = pdfViewer as PdfViewerWithZoomMethods;
  if (direction === "in") {
    zoomableViewer.increaseScale?.();
    return;
  }

  zoomableViewer.decreaseScale?.();
};

const readPdfPageNumber = (pageElement: HTMLElement): number | null => {
  const rawPageNumber = pageElement.dataset.pageNumber ?? pageElement.getAttribute("data-page-number");
  const pageNumber = Number(rawPageNumber);
  return Number.isFinite(pageNumber) ? pageNumber : null;
};

const collectPdfPageWindowMetrics = (viewerElement: HTMLElement): PdfPageWindowMetric[] => {
  return Array.from(viewerElement.querySelectorAll<HTMLElement>(".page")).flatMap((pageElement) => {
    const pageNumber = readPdfPageNumber(pageElement);
    if (pageNumber === null) return [];
    return [{ pageNumber, offsetTop: pageElement.offsetTop, offsetHeight: pageElement.offsetHeight }];
  });
};

const updatePdfViewerVisiblePageWindow = (pdfViewer: PdfViewerInstance, container: HTMLElement, viewerElement: HTMLElement, fallbackPageNumber: number = pdfViewer.currentPageNumber): void => {
  const pageCount = getPdfViewerPageCount(pdfViewer);
  const pageMetrics = collectPdfPageWindowMetrics(viewerElement);
  if (pageCount <= 0 || pageMetrics.length === 0) return;

  const idsToKeep = getPdfPageWindowKeepSet(pageMetrics, container.scrollTop, container.clientHeight, pageCount, { fallbackPageNumber, overscanPageCount: PDF_VISIBLE_PAGE_CACHE_OVERSCAN });
  viewerElement.querySelectorAll<HTMLElement>(".page").forEach((pageElement) => {
    const pageNumber = readPdfPageNumber(pageElement);
    if (pageNumber === null) return;
    pageElement.dataset.windowRetained = idsToKeep.has(pageNumber) ? "true" : "false";
  });
};

const createPdfToolbarState = (pdfViewer: PdfViewerInstance | null, viewerState: PdfViewerState | null): PdfToolbarState => {
  if (!pdfViewer) {
    const currentPage = getSafePdfPageNumber(viewerState?.currentPage, 1);
    return {
      currentPage,
      pageCount: 0,
      scale: typeof viewerState?.scale === "number" && Number.isFinite(viewerState.scale) ? viewerState.scale : 1,
      isBookmarked: Boolean(viewerState?.bookmarkPages?.includes(currentPage)),
    };
  }

  const pageCount = getPdfViewerPageCount(pdfViewer);
  const currentPage = getSafePdfPageNumber(pdfViewer.currentPageNumber, pageCount);
  return {
    currentPage,
    pageCount,
    scale: getPdfViewerCurrentScale(pdfViewer),
    isBookmarked: Boolean(viewerState?.bookmarkPages?.includes(currentPage)),
  };
};

const formatPdfScalePercent = (scale: number): string => {
  return `${Math.round(clampPdfViewerScale(scale) * 100)}%`;
};

const PdfPane = ({ source, className, viewerState = null, viewerOptions, onLoadError, onViewerStateChange }: PdfPaneProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [toolbarState, setToolbarState] = useState<PdfToolbarState>(() => createPdfToolbarState(null, viewerState));
  const [pageInputValue, setPageInputValue] = useState(() => String(createPdfToolbarState(null, viewerState).currentPage));
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerElementRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerRef = useRef<PdfViewerInstance | null>(null);
  const viewerStateRef = useRef<PdfViewerState | null>(viewerState);
  const onLoadErrorRef = useRef(onLoadError);
  const onViewerStateChangeRef = useRef(onViewerStateChange);
  const isApplyingFitScaleRef = useRef(false);
  const lastExplicitZoomAtRef = useRef(0);

  const refreshPdfToolbarState = useCallback(() => {
    const nextToolbarState = createPdfToolbarState(pdfViewerRef.current, viewerStateRef.current);
    setToolbarState(nextToolbarState);
    setPageInputValue(String(nextToolbarState.currentPage));
  }, []);

  const updateActivePdfPageWindow = useCallback((pageNumber?: number) => {
    const pdfViewer = pdfViewerRef.current;
    const container = scrollContainerRef.current;
    const viewerElement = pdfViewerElementRef.current;
    if (!pdfViewer || !container || !viewerElement) return;
    updatePdfViewerVisiblePageWindow(pdfViewer, container, viewerElement, pageNumber);
  }, []);

  useEffect(() => {
    viewerStateRef.current = viewerState;
    refreshPdfToolbarState();
  }, [refreshPdfToolbarState, viewerState]);

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
    refreshPdfToolbarState();
  }, [refreshPdfToolbarState]);

  const setViewerPage = useCallback((pageNumber: number, options?: { recordHistory?: boolean }) => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const pageCount = getPdfViewerPageCount(pdfViewer);
    const safePageNumber = getSafePdfPageNumber(pageNumber, pageCount);
    const currentPage = getSafePdfPageNumber(pdfViewer.currentPageNumber, pageCount);
    const shouldRecordHistory = options?.recordHistory ?? true;
    const currentViewerState = viewerStateRef.current ?? {};
    const nextBackPages = shouldRecordHistory && safePageNumber !== currentPage ? getTrimmedHistory([...(currentViewerState.historyBackPages ?? []), currentPage]) : currentViewerState.historyBackPages;
    pdfViewer.currentPageNumber = safePageNumber;
    updateActivePdfPageWindow(safePageNumber);
    updateViewerState({ currentPage: safePageNumber, historyBackPages: nextBackPages, historyForwardPages: shouldRecordHistory ? [] : currentViewerState.historyForwardPages }, { persistence: "deferred" });
    refreshPdfToolbarState();
  }, [refreshPdfToolbarState, updateActivePdfPageWindow, updateViewerState]);

  const handleZoomIn = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    lastExplicitZoomAtRef.current = Date.now();
    applyPdfViewerZoom(pdfViewer, "in");
    updateActivePdfPageWindow();
    refreshPdfToolbarState();
  }, [refreshPdfToolbarState, updateActivePdfPageWindow]);

  const handleZoomOut = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    lastExplicitZoomAtRef.current = Date.now();
    applyPdfViewerZoom(pdfViewer, "out");
    updateActivePdfPageWindow();
    refreshPdfToolbarState();
  }, [refreshPdfToolbarState, updateActivePdfPageWindow]);

  const handleFitWidth = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    isApplyingFitScaleRef.current = true;
    (pdfViewer as PdfViewerWithScale).currentScaleValue = "page-width";
    updateActivePdfPageWindow();
    refreshPdfToolbarState();
  }, [refreshPdfToolbarState, updateActivePdfPageWindow]);

  const handleToggleBookmark = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const currentViewerState = viewerStateRef.current ?? {};
    const bookmarkPages = currentViewerState.bookmarkPages ?? [];
    const currentPage = getSafePdfPageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    const nextBookmarkPages = bookmarkPages.includes(currentPage) ? bookmarkPages.filter((pageNumber) => pageNumber !== currentPage) : [...bookmarkPages, currentPage].sort((a, b) => a - b);
    updateViewerState({ bookmarkPages: nextBookmarkPages }, { persistence: "immediate" });
    refreshPdfToolbarState();
  }, [refreshPdfToolbarState, updateViewerState]);

  const handleGoBack = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const currentViewerState = viewerStateRef.current ?? {};
    const targetPage = currentViewerState.historyBackPages?.at(-1);
    if (!pdfViewer || !targetPage) return;
    const currentPage = getSafePdfPageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    pdfViewer.currentPageNumber = targetPage;
    updateActivePdfPageWindow(targetPage);
    updateViewerState({ currentPage: targetPage, historyBackPages: currentViewerState.historyBackPages?.slice(0, -1), historyForwardPages: getTrimmedHistory([...(currentViewerState.historyForwardPages ?? []), currentPage]) }, { persistence: "deferred" });
    refreshPdfToolbarState();
  }, [refreshPdfToolbarState, updateActivePdfPageWindow, updateViewerState]);

  const handleGoForward = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const currentViewerState = viewerStateRef.current ?? {};
    const targetPage = currentViewerState.historyForwardPages?.at(-1);
    if (!pdfViewer || !targetPage) return;
    const currentPage = getSafePdfPageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer));
    pdfViewer.currentPageNumber = targetPage;
    updateActivePdfPageWindow(targetPage);
    updateViewerState({ currentPage: targetPage, historyBackPages: getTrimmedHistory([...(currentViewerState.historyBackPages ?? []), currentPage]), historyForwardPages: currentViewerState.historyForwardPages?.slice(0, -1) }, { persistence: "deferred" });
    refreshPdfToolbarState();
  }, [refreshPdfToolbarState, updateActivePdfPageWindow, updateViewerState]);

  const handleSetMark = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const markPages = viewerStateRef.current?.markPages ?? {};
    const rawKey = window.prompt("現在ページに設定する mark キーを入力してください（a-z / 0-9）", "a")?.trim().slice(0, 1).toLowerCase();
    if (!rawKey || !PDF_MARK_KEY_PATTERN.test(rawKey)) return;
    updateViewerState({ markPages: { ...markPages, [rawKey]: getSafePdfPageNumber(pdfViewer.currentPageNumber, getPdfViewerPageCount(pdfViewer)) } }, { persistence: "immediate" });
  }, [updateViewerState]);

  const handleJumpToMark = useCallback(() => {
    const markPages = viewerStateRef.current?.markPages ?? {};
    const rawKey = window.prompt("移動する mark キーを入力してください", "a")?.trim().slice(0, 1).toLowerCase();
    if (!rawKey) return;
    const targetPage = markPages[rawKey];
    if (!targetPage) return;
    setViewerPage(targetPage);
  }, [setViewerPage]);

  const handlePageInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(event.target.value);
  }, []);

  const commitPageInputValue = useCallback(() => {
    const parsedPage = Number(pageInputValue);
    if (!Number.isFinite(parsedPage)) {
      refreshPdfToolbarState();
      return;
    }

    setViewerPage(parsedPage);
  }, [pageInputValue, refreshPdfToolbarState, setViewerPage]);

  const handlePageInputKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitPageInputValue();
    event.currentTarget.blur();
  }, [commitPageInputValue]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const viewerElement = pdfViewerElementRef.current;
    if (!container || !viewerElement || !source) return;

    let isCancelled = false;
    let loadedPdfDocument: PdfDocumentProxy | null = null;
    let scrollIdleTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
    let scrollIdleFrame: number | null = null;
    let resizeFrame: number | null = null;
    let zoomFrame: number | null = null;
    let pendingDeferredPageStateNumber: number | null = null;
    let pendingZoom: PendingPdfZoom | null = null;
    let gestureBaseScale: number | null = null;
    let isScrollOptimizationActive = false;
    const performanceTraceName = createPdfPerformanceTraceName("viewer.load");
    const eventBus = new EventBus() as PdfEventBusLike;
    const linkService = new PDFLinkService({ eventBus });
    const pdfViewer = new PDFViewer({ container, eventBus, linkService, viewer: viewerElement, ...createPdfViewerRuntimeOptions() });
    const removeEventListeners: Array<() => void> = [];

    const setScrollOptimizationActive = (isActive: boolean) => {
      if (isScrollOptimizationActive === isActive) return;
      isScrollOptimizationActive = isActive;
      container.classList.toggle(PDF_SCROLLING_CLASS_NAME, isActive);
      viewerElement.classList.toggle(PDF_SCROLLING_CLASS_NAME, isActive);
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

    const updateVisiblePageWindow = (pageNumber?: number) => {
      window.requestAnimationFrame(() => {
        if (isCancelled) return;
        updatePdfViewerVisiblePageWindow(pdfViewer, container, viewerElement, pageNumber);
        refreshPdfToolbarState();
      });
    };

    const markScrollIdle = () => {
      scrollIdleTimer = null;
      scrollIdleFrame = window.requestAnimationFrame(() => {
        scrollIdleFrame = null;
        if (isCancelled) return;
        setScrollOptimizationActive(false);
        updateVisiblePageWindow();
        if (pendingDeferredPageStateNumber !== null) {
          const pageNumber = pendingDeferredPageStateNumber;
          pendingDeferredPageStateNumber = null;
          updateViewerState({ currentPage: pageNumber }, { persistence: "deferred" });
        }
      });
    };

    const requestScrollOptimization = () => {
      setScrollOptimizationActive(true);
      clearScrollIdleTimer();
      scrollIdleTimer = globalThis.setTimeout(markScrollIdle, PDF_SCROLL_IDLE_DELAY_MS);
      updateVisiblePageWindow();
    };

    const requestResponsiveScaleUpdate = () => {
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        if (isCancelled || !loadedPdfDocument) return;
        if (!isCompactPdfViewport(container) && viewerStateRef.current?.fitMode === "manual") {
          updateVisiblePageWindow();
          return;
        }
        isApplyingFitScaleRef.current = true;
        (pdfViewer as PdfViewerWithScale).currentScaleValue = "page-width";
        updateVisiblePageWindow();
      });
    };

    const flushPendingZoom = () => {
      zoomFrame = null;
      const nextZoom = pendingZoom;
      pendingZoom = null;
      if (isCancelled || !loadedPdfDocument || !nextZoom) return;
      lastExplicitZoomAtRef.current = Date.now();
      if (!applyPdfViewerScaleAtClientPoint(pdfViewer, container, nextZoom.scale, nextZoom.clientX, nextZoom.clientY)) return;
      updateVisiblePageWindow();
    };

    const requestZoom = (scale: number, clientX?: number, clientY?: number) => {
      pendingZoom = { scale: clampPdfViewerScale(scale), clientX, clientY };
      if (zoomFrame !== null) return;
      zoomFrame = window.requestAnimationFrame(flushPendingZoom);
    };

    retainPdfDocumentSource(source);
    recordPdfPerformanceMark(`${performanceTraceName}.start`, { detail: { sourceType: source.type } });
    pdfViewerRef.current = pdfViewer;
    linkService.setViewer(pdfViewer);
    viewerElement.replaceChildren();
    setIsLoading(true);
    refreshPdfToolbarState();

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(requestResponsiveScaleUpdate);
    resizeObserver?.observe(container);
    window.addEventListener("orientationchange", requestResponsiveScaleUpdate);
    container.addEventListener("scroll", requestScrollOptimization, { passive: true });
    container.addEventListener("touchmove", requestScrollOptimization, { passive: true });
    const handleWheelScrollOptimization = (event: WheelEvent) => {
      if (isPdfTrackpadZoomWheelEvent(event)) return;
      requestScrollOptimization();
    };
    container.addEventListener("wheel", handleWheelScrollOptimization, { passive: true });
    removeEventListeners.push(() => container.removeEventListener("scroll", requestScrollOptimization));
    removeEventListeners.push(() => container.removeEventListener("touchmove", requestScrollOptimization));
    removeEventListeners.push(() => container.removeEventListener("wheel", handleWheelScrollOptimization));

    const handleTrackpadZoomWheel = (event: WheelEvent) => {
      if (isCancelled || !loadedPdfDocument || !isPdfTrackpadZoomWheelEvent(event)) return;
      const normalizedDeltaY = getNormalizedPdfWheelDeltaY(event, container);
      if (normalizedDeltaY === 0) return;
      event.preventDefault();
      const baseScale = pendingZoom?.scale ?? getPdfViewerCurrentScale(pdfViewer);
      requestZoom(baseScale * Math.exp(-normalizedDeltaY * PDF_TRACKPAD_ZOOM_SENSITIVITY), event.clientX, event.clientY);
    };

    const handleGestureStart = (event: PdfGestureEvent) => {
      if (isCancelled || !loadedPdfDocument) return;
      event.preventDefault();
      gestureBaseScale = pendingZoom?.scale ?? getPdfViewerCurrentScale(pdfViewer);
    };

    const handleGestureChange = (event: PdfGestureEvent) => {
      if (isCancelled || !loadedPdfDocument) return;
      const gestureScale = Number(event.scale);
      if (!Number.isFinite(gestureScale) || gestureScale <= 0) return;
      event.preventDefault();
      const baseScale = gestureBaseScale ?? pendingZoom?.scale ?? getPdfViewerCurrentScale(pdfViewer);
      requestZoom(baseScale * gestureScale, event.clientX, event.clientY);
    };

    const handleGestureEnd = (event: PdfGestureEvent) => {
      if (gestureBaseScale === null) return;
      event.preventDefault();
      gestureBaseScale = null;
    };

    container.addEventListener("wheel", handleTrackpadZoomWheel, { passive: false });
    container.addEventListener("gesturestart", handleGestureStart as EventListener, { passive: false });
    container.addEventListener("gesturechange", handleGestureChange as EventListener, { passive: false });
    container.addEventListener("gestureend", handleGestureEnd as EventListener, { passive: false });
    removeEventListeners.push(() => container.removeEventListener("wheel", handleTrackpadZoomWheel));
    removeEventListeners.push(() => container.removeEventListener("gesturestart", handleGestureStart as EventListener));
    removeEventListeners.push(() => container.removeEventListener("gesturechange", handleGestureChange as EventListener));
    removeEventListeners.push(() => container.removeEventListener("gestureend", handleGestureEnd as EventListener));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "pagesinit", () => {
      if (isCancelled || !loadedPdfDocument) return;
      recordPdfPerformanceMark(`${performanceTraceName}.pagesinit`, { detail: { numPages: loadedPdfDocument.numPages, sourceType: source.type } });
      recordPdfPerformanceMeasure(`${performanceTraceName}.toPagesInit`, `${performanceTraceName}.start`, `${performanceTraceName}.pagesinit`);
      const initialPageNumber = getSafePdfPageNumber(viewerStateRef.current?.currentPage, loadedPdfDocument.numPages);
      const scaleValue = getPdfViewerStateScaleValue(viewerStateRef.current, isCompactPdfViewport(container));
      pdfViewer.currentPageNumber = initialPageNumber;
      (pdfViewer as PdfViewerWithScale).currentScaleValue = scaleValue;
      updateVisiblePageWindow(initialPageNumber);
      updateContainIntrinsicSizeFromPage();
      refreshPdfToolbarState();
      requestResponsiveScaleUpdate();
    }));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "pagechanging", (event: unknown) => {
      if (isCancelled) return;
      const pageNumber = (event as PdfPageChangingEvent).pageNumber;
      if (typeof pageNumber !== "number" || !Number.isFinite(pageNumber)) return;
      recordPdfPerformanceMark(`${performanceTraceName}.pagechanging`, { debugOnly: true, detail: { pageNumber } });
      if (viewerStateRef.current?.currentPage !== pageNumber) {
        if (isScrollOptimizationActive) {
          viewerStateRef.current = { ...(viewerStateRef.current ?? {}), currentPage: pageNumber };
          pendingDeferredPageStateNumber = pageNumber;
          refreshPdfToolbarState();
        } else {
          updateViewerState({ currentPage: pageNumber }, { persistence: "deferred" });
        }
      }
      updateVisiblePageWindow(pageNumber);
    }));

    removeEventListeners.push(addPdfViewerEventListener(eventBus, "scalechanging", (event: unknown) => {
      if (isCancelled) return;
      const scale = Number((event as PdfScaleChangingEvent).scale);
      if (!Number.isFinite(scale) || scale <= 0) return;
      const fitMode = isApplyingFitScaleRef.current ? "width" : "manual";
      const isExplicitZoom = Date.now() - lastExplicitZoomAtRef.current <= PDF_EXPLICIT_ZOOM_SCALE_CHANGE_WINDOW_MS;
      isApplyingFitScaleRef.current = false;
      if (isExplicitZoom) lastExplicitZoomAtRef.current = 0;
      if (viewerStateRef.current?.scale !== scale || viewerStateRef.current?.fitMode !== fitMode) updateViewerState({ scale, fitMode }, { persistence: isExplicitZoom ? "immediate" : "none" });
      updateVisiblePageWindow();
      updateContainIntrinsicSizeFromPage();
      refreshPdfToolbarState();
    }));

    void loadPdfDocument(source, viewerOptions).then((nextPdfDocument) => {
      recordPdfPerformanceMark(`${performanceTraceName}.loaded`, { detail: { numPages: nextPdfDocument.numPages, sourceType: source.type } });
      recordPdfPerformanceMeasure(`${performanceTraceName}.toLoaded`, `${performanceTraceName}.start`, `${performanceTraceName}.loaded`);
      if (isCancelled) {
        void nextPdfDocument.destroy();
        return;
      }

      loadedPdfDocument = nextPdfDocument;
      pdfViewer.setDocument(nextPdfDocument);
      linkService.setDocument(nextPdfDocument, null);
    }).catch((error: unknown) => {
      recordPdfPerformanceMark(`${performanceTraceName}.error`, { detail: { message: error instanceof Error ? error.message : String(error), sourceType: source.type } });
      recordPdfPerformanceMeasure(`${performanceTraceName}.toError`, `${performanceTraceName}.start`, `${performanceTraceName}.error`);
      if (isCancelled) return;
      console.warn("[PdfPane] PDF load failed", error);
      onLoadErrorRef.current?.(error);
    }).finally(() => {
      if (!isCancelled) setIsLoading(false);
    });

    return () => {
      isCancelled = true;
      pendingZoom = null;
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      if (zoomFrame !== null) window.cancelAnimationFrame(zoomFrame);
      clearScrollIdleTimer();
      setScrollOptimizationActive(false);
      resizeObserver?.disconnect();
      window.removeEventListener("orientationchange", requestResponsiveScaleUpdate);
      removeEventListeners.forEach((removeEventListener) => removeEventListener());
      releasePdfViewerDocument(pdfViewer, linkService, loadedPdfDocument);
      releasePdfDocumentSourceSoon(source);
      recordPdfPerformanceMark(`${performanceTraceName}.cleanup`, { debugOnly: true, detail: { sourceType: source.type } });
      viewerElement.replaceChildren();
      if (pdfViewerRef.current === pdfViewer) pdfViewerRef.current = null;
      refreshPdfToolbarState();
    };
  }, [refreshPdfToolbarState, source, updateViewerState, viewerOptions]);

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
    <div className={cn("flex h-full min-h-0 w-full min-w-0 bg-[var(--carvepanel-surface)] text-[#2f2f2f] max-sm:min-h-[100dvh]", className)}>
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-black/10 bg-white/80 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.10)] backdrop-blur" data-testid="pdf-toolbar">
          <button type="button" className={PDF_TOOLBAR_BUTTON_CLASS_NAME} onClick={handleGoBack} aria-label="前の履歴へ戻る">戻る</button>
          <button type="button" className={PDF_TOOLBAR_BUTTON_CLASS_NAME} onClick={() => setViewerPage(toolbarState.currentPage - 1)} disabled={toolbarState.currentPage <= 1} aria-label="前のページ">←</button>
          <label className="flex items-center gap-1 text-[12px] text-[#5f5f5f]">
            <span className="sr-only">PDFページ番号</span>
            <input className={PDF_TOOLBAR_INPUT_CLASS_NAME} value={pageInputValue} inputMode="numeric" onChange={handlePageInputChange} onBlur={commitPageInputValue} onKeyDown={handlePageInputKeyDown} aria-label="PDFページ番号" />
            <span>/ {toolbarState.pageCount || "?"}</span>
          </label>
          <button type="button" className={PDF_TOOLBAR_BUTTON_CLASS_NAME} onClick={() => setViewerPage(toolbarState.currentPage + 1)} disabled={toolbarState.pageCount > 0 && toolbarState.currentPage >= toolbarState.pageCount} aria-label="次のページ">→</button>
          <button type="button" className={PDF_TOOLBAR_BUTTON_CLASS_NAME} onClick={handleGoForward} aria-label="次の履歴へ進む">進む</button>
          <span className="mx-1 h-5 w-px bg-black/10" aria-hidden="true" />
          <button type="button" className={PDF_TOOLBAR_BUTTON_CLASS_NAME} onClick={handleZoomOut} aria-label="縮小">−</button>
          <span className="min-w-12 text-center text-[12px] font-medium text-[#5f5f5f]" data-testid="pdf-scale-label">{formatPdfScalePercent(toolbarState.scale)}</span>
          <button type="button" className={PDF_TOOLBAR_BUTTON_CLASS_NAME} onClick={handleZoomIn} aria-label="拡大">＋</button>
          <button type="button" className={PDF_TOOLBAR_BUTTON_CLASS_NAME} onClick={handleFitWidth} aria-label="幅に合わせる">幅</button>
          <span className="mx-1 h-5 w-px bg-black/10" aria-hidden="true" />
          <button type="button" className={cn(PDF_TOOLBAR_BUTTON_CLASS_NAME, toolbarState.isBookmarked ? "bg-[#fff7d6] text-[#8a6a00]" : undefined)} onClick={handleToggleBookmark} aria-pressed={toolbarState.isBookmarked} aria-label="ブックマーク切替">★</button>
        </div>
        <div ref={scrollContainerRef} className={cn(PDF_SCROLL_CONTAINER_CLASS_NAME, "absolute inset-0 overflow-auto overscroll-contain bg-[var(--carvepanel-surface)] px-3 py-14 [-webkit-overflow-scrolling:touch] sm:px-4 sm:py-16")} data-testid="pdf-pane-scroll-container">
          <div ref={pdfViewerElementRef} className="pdfViewer pdf-pane__viewer" />
          {isLoading ? <LoadingSpinner className="absolute inset-0 bg-[var(--carvepanel-surface)] text-[#6d6d6d]" label="PDFを読み込み中" /> : null}
        </div>
      </main>
    </div>
  );
};

export { PdfPane };
export type { PdfPaneProps, PdfViewerStateChangeOptions };
