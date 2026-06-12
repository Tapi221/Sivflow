import "pdfjs-dist/legacy/web/pdf_viewer.css";
import "./PdfPane.css";
import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { EventBus, PDFLinkService, PDFViewer, RenderingStates } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import type { ChangeEvent, ComponentType, KeyboardEvent as ReactKeyboardEvent, SVGProps } from "react";
import * as stratisIcons from "stratis-ui-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import { hasDesktopRuntime } from "@/platform/detectDesktopBridge";
import type { PdfViewerState } from "@/types";
import type { PdfDocumentSource } from "./pdfDocumentSource";
import { releasePdfDocumentSourceSoon, retainPdfDocumentSource, toPdfDocumentLoadSource } from "./pdfDocumentSource";
import { waitForPdfLoadingTask } from "./pdfLoadingTaskTimeout";
import type { PdfPageWindowMetric } from "./pdfPageWindow";
import { getPdfPageWindowKeepSet, getSafePdfPageNumber } from "./pdfPageWindow";
import { PDF_TRACKPAD_ZOOM_SENSITIVITY, PDF_ZOOM_BUTTON_SCALE_FACTOR, PDF_ZOOM_MAX_SCALE, PDF_ZOOM_MIN_SCALE, PDF_ZOOM_SCALE_EPSILON } from "./pdfZoom.constants";

type PdfViewerStateChangePersistence = "immediate" | "deferred" | "none";
type PdfViewerStateChangeOptions = {
  persistence?: PdfViewerStateChangePersistence;
};
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
type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;
type PdfViewerInstance = InstanceType<typeof PDFViewer>;
type PdfLinkServiceInstance = InstanceType<typeof PDFLinkService>;
type PdfEventBusInstance = InstanceType<typeof EventBus>;
type PdfViewerWithScale = PdfViewerInstance & {
  currentScale: number;
  currentScaleValue: string;
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
type PdfPageRenderedEvent = {
  pageNumber?: number;
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
type PdfScrollAnchor = {
  fallbackContentX: number;
  fallbackContentY: number;
  localX: number;
  localY: number;
  pageNumber?: number;
  pageXRatio?: number;
  pageYRatio?: number;
  scale: number;
};
type PdfZoomPreview = {
  scale: number;
  scaleRatio: number;
  viewerOriginX: number;
  viewerOriginY: number;
  clientX?: number;
  clientY?: number;
};
type PdfZoomCommit = {
  pageNumbers: Set<number>;
};
type StratisIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const STRATIS_ICON_COMPONENTS = stratisIcons as Record<string, StratisIconComponent | undefined>;
const STRATIS_BOOKMARK_ICON_NAMES = ["StratisBookmarkIcon", "StratisBookmark01Icon", "StratisBookOpenBookmarkIcon", "StratisStarIcon", "StratisStar01Icon", "StratisStar02Icon"] as const;
const PDF_COMPACT_VIEWPORT_MAX_WIDTH = 640;
const PDF_EXPLICIT_ZOOM_SCALE_CHANGE_WINDOW_MS = 500;
const PDF_HISTORY_LIMIT = 80;
const PDF_LOW_MEMORY_DEVICE_MAX_GB = 4;
const PDF_LOW_MEMORY_MAX_CANVAS_PIXELS = 5_000_000;
const PDF_MARK_KEY_PATTERN = /^[a-z0-9]$/i;
const PDF_RANGE_CHUNK_SIZE = 65_536;
const PDF_SCROLL_CONTAINER_CLASS_NAME = "pdf-pane__scroll-container";
const PDF_SCROLLING_CLASS_NAME = "pdf-pane--scrolling";
const PDF_STANDARD_MAX_CANVAS_PIXELS = 4096 * 8192;
const PDF_TOOLBAR_BUTTON_CLASS_NAME = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-black/10 bg-white/90 px-2 text-[12px] font-medium text-[#4a4a4a] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
const PDF_TOOLBAR_INPUT_CLASS_NAME = "h-8 w-14 rounded-md border border-black/10 bg-white/90 px-2 text-center text-[12px] font-medium text-[#4a4a4a] shadow-sm outline-none focus:border-black/25";
const PDF_VISIBLE_PAGE_CACHE_OVERSCAN = 2;
const PDF_WHEEL_DELTA_LINE_HEIGHT_PX = 16;
const PDF_WHEEL_DELTA_MODE_LINE = 1;
const PDF_WHEEL_DELTA_MODE_PAGE = 2;
const PDF_ZOOM_INPUT_IDLE_COMMIT_DELAY_MS = 280;
const PDF_ZOOMING_CLASS_NAME = "pdf-pane--zooming";
const PDFJS_ASSET_BASE_URL = "/pdfjs/";
const PDFJS_CMAP_URL = `${PDFJS_ASSET_BASE_URL}cmaps/`;
const PDFJS_STANDARD_FONT_DATA_URL = `${PDFJS_ASSET_BASE_URL}standard_fonts/`;
const PDFJS_WASM_URL = `${PDFJS_ASSET_BASE_URL}wasm/`;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const resolveStratisIcon = (names: readonly string[]): StratisIconComponent | null => names.map((name) => STRATIS_ICON_COMPONENTS[name]).find((Icon): Icon is StratisIconComponent => Boolean(Icon)) ?? null;
const StratisBookmarkIcon = resolveStratisIcon(STRATIS_BOOKMARK_ICON_NAMES);
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
const getReportedDeviceMemory = (): number | null => {
  const navigatorLike = globalThis.navigator as NavigatorWithDeviceMemory | undefined;
  const deviceMemory = navigatorLike?.deviceMemory;
  return typeof deviceMemory === "number" && Number.isFinite(deviceMemory) ? deviceMemory : null;
};
const getPdfMaxCanvasPixels = (): number => {
  const deviceMemory = getReportedDeviceMemory();
  if (hasDesktopRuntime() || deviceMemory === null || deviceMemory > PDF_LOW_MEMORY_DEVICE_MAX_GB) return PDF_STANDARD_MAX_CANVAS_PIXELS;
  return PDF_LOW_MEMORY_MAX_CANVAS_PIXELS;
};
const createPdfViewerRuntimeOptions = () => {
  return {
    annotationEditorMode: pdfjsLib.AnnotationEditorType.DISABLE,
    annotationMode: pdfjsLib.AnnotationMode.ENABLE,
    enableHWA: true,
    enableAutoLinking: false,
    enableDetailCanvas: true,
    enableOptimizedPartialRendering: true,
    maxCanvasPixels: getPdfMaxCanvasPixels(),
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
  return Math.min(Math.max(scale, PDF_ZOOM_MIN_SCALE), PDF_ZOOM_MAX_SCALE);
};
const isCompactPdfViewport = (container: HTMLElement): boolean => {
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
const getPdfZoomClientPoint = (container: HTMLElement, clientX?: number, clientY?: number): { clientX: number; clientY: number; } => {
  const containerRect = container.getBoundingClientRect();
  return {
    clientX: typeof clientX === "number" && Number.isFinite(clientX) ? clientX : containerRect.left + container.clientWidth / 2,
    clientY: typeof clientY === "number" && Number.isFinite(clientY) ? clientY : containerRect.top + container.clientHeight / 2,
  };
};
const readPdfPageNumber = (pageElement: HTMLElement): number | null => {
  const rawPageNumber = pageElement.dataset.pageNumber ?? pageElement.getAttribute("data-page-number");
  const pageNumber = Number(rawPageNumber);
  return Number.isFinite(pageNumber) ? pageNumber : null;
};
const getPdfAnchorPageElement = (viewerElement: HTMLElement, clientX: number, clientY: number): HTMLElement | null => {
  let closestPageElement: HTMLElement | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const pageElement of viewerElement.querySelectorAll<HTMLElement>(".page")) {
    const rect = pageElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return pageElement;

    const distanceX = clientX < rect.left ? rect.left - clientX : Math.max(clientX - rect.right, 0);
    const distanceY = clientY < rect.top ? rect.top - clientY : Math.max(clientY - rect.bottom, 0);
    const distance = distanceX + distanceY;
    if (distance >= closestDistance) continue;
    closestDistance = distance;
    closestPageElement = pageElement;
  }

  return closestPageElement;
};
const createPdfScrollAnchor = (pdfViewer: PdfViewerInstance, container: HTMLElement, viewerElement: HTMLElement, clientX?: number, clientY?: number): PdfScrollAnchor => {
  const containerRect = container.getBoundingClientRect();
  const clientPoint = getPdfZoomClientPoint(container, clientX, clientY);
  const localX = Math.min(Math.max(clientPoint.clientX - containerRect.left, 0), container.clientWidth);
  const localY = Math.min(Math.max(clientPoint.clientY - containerRect.top, 0), container.clientHeight);
  const pageElement = getPdfAnchorPageElement(viewerElement, clientPoint.clientX, clientPoint.clientY);
  const pageNumber = pageElement ? readPdfPageNumber(pageElement) : null;
  const pageRect = pageElement?.getBoundingClientRect();
  const pageXRatio = pageElement && pageRect && pageRect.width > 0 ? Math.min(Math.max((clientPoint.clientX - pageRect.left) / pageRect.width, 0), 1) : undefined;
  const pageYRatio = pageElement && pageRect && pageRect.height > 0 ? Math.min(Math.max((clientPoint.clientY - pageRect.top) / pageRect.height, 0), 1) : undefined;

  return {
    fallbackContentX: container.scrollLeft + localX - viewerElement.offsetLeft,
    fallbackContentY: container.scrollTop + localY - viewerElement.offsetTop,
    localX,
    localY,
    pageNumber: pageNumber ?? undefined,
    pageXRatio,
    pageYRatio,
    scale: getPdfViewerCurrentScale(pdfViewer),
  };
};
const restorePdfScrollAnchor = (pdfViewer: PdfViewerInstance, container: HTMLElement, viewerElement: HTMLElement, anchor: PdfScrollAnchor): void => {
  if (typeof anchor.pageNumber === "number" && typeof anchor.pageXRatio === "number" && typeof anchor.pageYRatio === "number") {
    const pageElement = viewerElement.querySelector<HTMLElement>(`.page[data-page-number="${anchor.pageNumber}"]`);
    if (pageElement) {
      container.scrollLeft = Math.max(0, viewerElement.offsetLeft + pageElement.offsetLeft + pageElement.offsetWidth * anchor.pageXRatio - anchor.localX);
      container.scrollTop = Math.max(0, viewerElement.offsetTop + pageElement.offsetTop + pageElement.offsetHeight * anchor.pageYRatio - anchor.localY);
      return;
    }
  }

  const nextScale = getPdfViewerCurrentScale(pdfViewer);
  const scaleRatio = nextScale / anchor.scale;
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) return;
  container.scrollLeft = Math.max(0, viewerElement.offsetLeft + anchor.fallbackContentX * scaleRatio - anchor.localX);
  container.scrollTop = Math.max(0, viewerElement.offsetTop + anchor.fallbackContentY * scaleRatio - anchor.localY);
};
const applyPdfViewerScaleValueWithAnchor = (pdfViewer: PdfViewerInstance, container: HTMLElement, viewerElement: HTMLElement, scaleValue: string, clientX?: number, clientY?: number, afterRestore?: () => void): boolean => {
  if (getPdfViewerPageCount(pdfViewer) <= 0) return false;
  const anchor = createPdfScrollAnchor(pdfViewer, container, viewerElement, clientX, clientY);
  (pdfViewer as PdfViewerWithScale).currentScaleValue = scaleValue;
  requestAnimationFrame(() => {
    restorePdfScrollAnchor(pdfViewer, container, viewerElement, anchor);
    afterRestore?.();
  });
  return true;
};
const applyPdfViewerScaleWithAnchor = (pdfViewer: PdfViewerInstance, container: HTMLElement, viewerElement: HTMLElement, scale: number, clientX?: number, clientY?: number, afterRestore?: () => void): boolean => {
  const nextScale = clampPdfViewerScale(scale);
  const currentScale = getPdfViewerCurrentScale(pdfViewer);
  if (Math.abs(nextScale - currentScale) < PDF_ZOOM_SCALE_EPSILON) return false;
  return applyPdfViewerScaleValueWithAnchor(pdfViewer, container, viewerElement, String(nextScale), clientX, clientY, afterRestore);
};
const createPdfZoomPreview = (pdfViewer: PdfViewerInstance, container: HTMLElement, viewerElement: HTMLElement, nextScale: number, clientX?: number, clientY?: number): PdfZoomPreview | null => {
  const currentScale = getPdfViewerCurrentScale(pdfViewer);
  if (Math.abs(nextScale - currentScale) < PDF_ZOOM_SCALE_EPSILON) return null;
  const scaleRatio = nextScale / currentScale;
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) return null;
  const clientPoint = getPdfZoomClientPoint(container, clientX, clientY);
  const viewerRect = viewerElement.getBoundingClientRect();

  return {
    scale: nextScale,
    scaleRatio,
    viewerOriginX: viewerRect.left,
    viewerOriginY: viewerRect.top,
    clientX: clientPoint.clientX,
    clientY: clientPoint.clientY,
  };
};
const findNearestPageNumber = (viewerElement: HTMLElement, pageWindow: Set<number>): number | null => {
  for (const pageElement of viewerElement.querySelectorAll<HTMLElement>(".page")) {
    const pageNumber = readPdfPageNumber(pageElement);
    if (pageNumber !== null && pageWindow.has(pageNumber)) return pageNumber;
  }

  return null;
};
const showPdfZoomPreview = (container: HTMLElement, viewerElement: HTMLElement, preview: PdfZoomPreview): PdfZoomCommit => {
  const pageNumbers = new Set<number>();
  const viewportRect = container.getBoundingClientRect();

  container.classList.add(PDF_ZOOMING_CLASS_NAME);
  viewerElement.style.transformOrigin = `${preview.clientX ?? viewportRect.left + viewportRect.width / 2}px ${preview.clientY ?? viewportRect.top + viewportRect.height / 2}px`;
  viewerElement.style.transform = `scale(${preview.scaleRatio})`;

  for (const pageElement of viewerElement.querySelectorAll<HTMLElement>(".page")) {
    const pageNumber = readPdfPageNumber(pageElement);
    if (pageNumber === null) continue;
    const rect = pageElement.getBoundingClientRect();
    const intersects = rect.bottom >= viewportRect.top && rect.top <= viewportRect.bottom;
    if (!intersects) continue;
    pageNumbers.add(pageNumber);
  }

  if (pageNumbers.size === 0) {
    const fallbackPageNumber = findNearestPageNumber(viewerElement, getPdfPageWindowKeepSet(getSafePdfPageNumber(1), getPdfViewerPageCount(viewerElement as unknown as PdfViewerInstance), PDF_VISIBLE_PAGE_CACHE_OVERSCAN));
    if (fallbackPageNumber !== null) pageNumbers.add(fallbackPageNumber);
  }

  return { pageNumbers };
};
const clearPdfZoomPreview = (container: HTMLElement, viewerElement: HTMLElement): void => {
  container.classList.remove(PDF_ZOOMING_CLASS_NAME);
  viewerElement.style.transformOrigin = "";
  viewerElement.style.transform = "";
};
const getVisiblePdfPageMetrics = (viewerElement: HTMLElement, container: HTMLElement): PdfPageWindowMetric[] => {
  const containerRect = container.getBoundingClientRect();
  const metrics: PdfPageWindowMetric[] = [];

  for (const pageElement of viewerElement.querySelectorAll<HTMLElement>(".page")) {
    const pageNumber = readPdfPageNumber(pageElement);
    if (pageNumber === null) continue;
    const rect = pageElement.getBoundingClientRect();
    metrics.push({
      pageNumber,
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
    });
  }

  return metrics;
};
const updatePageRenderingWindow = (pdfViewer: PdfViewerInstance, viewerElement: HTMLElement, container: HTMLElement, currentPage: number): void => {
  const pageWindow = getPdfPageWindowKeepSet(currentPage, getPdfViewerPageCount(pdfViewer), PDF_VISIBLE_PAGE_CACHE_OVERSCAN);
  const visibleMetrics = getVisiblePdfPageMetrics(viewerElement, container);
  for (const metric of visibleMetrics) pageWindow.add(metric.pageNumber);

  for (let index = 1; index <= getPdfViewerPageCount(pdfViewer); index += 1) {
    const pageView = pdfViewer.getPageView(index - 1);
    if (!pageView) continue;
    if (!pageWindow.has(index) && pageView.renderingState !== RenderingStates.RUNNING) {
      pageView.reset();
    }
  }
};
const createDefaultToolbarState = (): PdfToolbarState => ({
  currentPage: 1,
  pageCount: 0,
  scale: 1,
  isBookmarked: false,
});

const StratisFallbackBookmarkIcon = ({ className, active }: { className?: string; active?: boolean; }) => (
  <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 4.25C6.5 3.56 7.06 3 7.75 3h8.5c.69 0 1.25.56 1.25 1.25v16.1l-5.5-3.3-5.5 3.3V4.25Z" />
  </svg>
);
const PdfPane = ({ source, className, viewerState = null, viewerOptions, onLoadError, onViewerStateChange }: PdfPaneProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerRef = useRef<PdfViewerInstance | null>(null);
  const linkServiceRef = useRef<PdfLinkServiceInstance | null>(null);
  const eventBusRef = useRef<PdfEventBusInstance | null>(null);
  const pdfDocumentRef = useRef<PdfDocumentProxy | null>(null);
  const loadTaskAbortRef = useRef<AbortController | null>(null);
  const sourceReleaseTimerRef = useRef<number | null>(null);
  const sourceLoadKeyRef = useRef<string | null>(null);
  const pendingZoomRef = useRef<PendingPdfZoom | null>(null);
  const zoomPreviewRef = useRef<PdfZoomPreview | null>(null);
  const zoomCommitRef = useRef<PdfZoomCommit | null>(null);
  const zoomPreviewFrameRef = useRef<number | null>(null);
  const zoomIdleCommitTimerRef = useRef<number | null>(null);
  const zoomInputCommitTimerRef = useRef<number | null>(null);
  const lastExplicitZoomAtRef = useRef(0);
  const lastAutoFitAtRef = useRef(0);
  const savedScaleAppliedRef = useRef(false);
  const gestureBaseScaleRef = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const toolbarScaleInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(source));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toolbarState, setToolbarState] = useState<PdfToolbarState>(createDefaultToolbarState);
  const [zoomInputValue, setZoomInputValue] = useState("100");

  const notifyViewerStateChange = useCallback(
    (nextViewerState: PdfViewerState, options?: PdfViewerStateChangeOptions) => {
      void onViewerStateChange?.(nextViewerState, options);
    },
    [onViewerStateChange],
  );

  const updateToolbarState = useCallback((nextState: Partial<PdfToolbarState>) => {
    setToolbarState((currentState) => ({ ...currentState, ...nextState }));
  }, []);

  const applyZoomScale = useCallback((scale: number, clientX?: number, clientY?: number) => {
    const pdfViewer = pdfViewerRef.current;
    const container = containerRef.current;
    const viewerElement = viewerRef.current;
    if (!pdfViewer || !container || !viewerElement) return false;
    const didApply = applyPdfViewerScaleWithAnchor(pdfViewer, container, viewerElement, scale, clientX, clientY, () => {
      updatePageRenderingWindow(pdfViewer, viewerElement, container, getSafePdfPageNumber(toolbarState.currentPage));
    });
    if (didApply) {
      lastExplicitZoomAtRef.current = performance.now();
      savedScaleAppliedRef.current = true;
      notifyViewerStateChange(
        {
          page: getSafePdfPageNumber(toolbarState.currentPage),
          scale: clampPdfViewerScale(scale),
          fitMode: "manual",
          history: getTrimmedHistory([...(viewerState?.history ?? []), getSafePdfPageNumber(toolbarState.currentPage)]),
          bookmark: toolbarState.isBookmarked,
        },
        { persistence: "deferred" },
      );
    }
    return didApply;
  }, [notifyViewerStateChange, toolbarState.currentPage, toolbarState.isBookmarked, viewerState?.history]);

  const commitZoomPreview = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const container = containerRef.current;
    const viewerElement = viewerRef.current;
    const preview = zoomPreviewRef.current;
    if (!pdfViewer || !container || !viewerElement || !preview) return false;
    const commit = zoomCommitRef.current;
    clearPdfZoomPreview(container, viewerElement);
    zoomPreviewRef.current = null;
    zoomCommitRef.current = null;

    if (commit) {
      for (const pageNumber of commit.pageNumbers) {
        const pageView = pdfViewer.getPageView(pageNumber - 1);
        if (!pageView || pageView.renderingState === RenderingStates.RUNNING) continue;
        pageView.reset();
      }
    }

    return applyZoomScale(preview.scale, preview.clientX, preview.clientY);
  }, [applyZoomScale]);

  const scheduleZoomPreviewCommit = useCallback(() => {
    if (zoomIdleCommitTimerRef.current !== null) {
      window.clearTimeout(zoomIdleCommitTimerRef.current);
      zoomIdleCommitTimerRef.current = null;
    }

    zoomIdleCommitTimerRef.current = window.setTimeout(() => {
      zoomIdleCommitTimerRef.current = null;
      commitZoomPreview();
    }, 80);
  }, [commitZoomPreview]);

  const requestZoom = useCallback((scale: number, clientX?: number, clientY?: number) => {
    const pdfViewer = pdfViewerRef.current;
    const container = containerRef.current;
    const viewerElement = viewerRef.current;
    if (!pdfViewer || !container || !viewerElement) return false;
    const nextScale = clampPdfViewerScale(scale);
    const preview = createPdfZoomPreview(pdfViewer, container, viewerElement, nextScale, clientX, clientY);
    if (!preview) return false;

    zoomPreviewRef.current = preview;
    if (zoomPreviewFrameRef.current !== null) {
      cancelAnimationFrame(zoomPreviewFrameRef.current);
      zoomPreviewFrameRef.current = null;
    }

    zoomPreviewFrameRef.current = requestAnimationFrame(() => {
      zoomPreviewFrameRef.current = null;
      const activePreview = zoomPreviewRef.current;
      if (!activePreview) return;
      zoomCommitRef.current = showPdfZoomPreview(container, viewerElement, activePreview);
      scheduleZoomPreviewCommit();
    });

    return true;
  }, [scheduleZoomPreviewCommit]);

  const updateScaleFromViewer = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const scale = getPdfViewerCurrentScale(pdfViewer);
    updateToolbarState({ scale });
    setZoomInputValue(String(Math.round(scale * 100)));
  }, [updateToolbarState]);

  const setViewerPage = useCallback((pageNumber: number) => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    pdfViewer.currentPageNumber = Math.min(Math.max(pageNumber, 1), getPdfViewerPageCount(pdfViewer));
  }, []);

  const persistCurrentViewerState = useCallback((options?: PdfViewerStateChangeOptions) => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    const currentPage = getSafePdfPageNumber(pdfViewer.currentPageNumber);
    notifyViewerStateChange(
      {
        page: currentPage,
        scale: getPdfViewerCurrentScale(pdfViewer),
        fitMode: "manual",
        history: getTrimmedHistory([...(viewerState?.history ?? []), currentPage]),
        bookmark: toolbarState.isBookmarked,
      },
      options,
    );
  }, [notifyViewerStateChange, toolbarState.isBookmarked, viewerState?.history]);

  const scheduleZoomInputCommit = useCallback((scale: number) => {
    if (zoomInputCommitTimerRef.current !== null) {
      window.clearTimeout(zoomInputCommitTimerRef.current);
      zoomInputCommitTimerRef.current = null;
    }

    zoomInputCommitTimerRef.current = window.setTimeout(() => {
      zoomInputCommitTimerRef.current = null;
      persistCurrentViewerState({ persistence: "deferred" });
    }, PDF_ZOOM_INPUT_IDLE_COMMIT_DELAY_MS);

    applyZoomScale(scale);
  }, [applyZoomScale, persistCurrentViewerState]);

  const goToPreviousPage = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    setViewerPage(getSafePdfPageNumber(pdfViewer.currentPageNumber) - 1);
  }, [setViewerPage]);

  const goToNextPage = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    setViewerPage(getSafePdfPageNumber(pdfViewer.currentPageNumber) + 1);
  }, [setViewerPage]);

  const zoomIn = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    applyZoomScale(getPdfViewerCurrentScale(pdfViewer) * PDF_ZOOM_BUTTON_SCALE_FACTOR);
  }, [applyZoomScale]);

  const zoomOut = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    if (!pdfViewer) return;
    applyZoomScale(getPdfViewerCurrentScale(pdfViewer) / PDF_ZOOM_BUTTON_SCALE_FACTOR);
  }, [applyZoomScale]);

  const applyPageWidth = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const container = containerRef.current;
    const viewerElement = viewerRef.current;
    if (!pdfViewer || !container || !viewerElement) return;
    applyPdfViewerScaleValueWithAnchor(pdfViewer, container, viewerElement, "page-width", undefined, undefined, () => {
      updatePageRenderingWindow(pdfViewer, viewerElement, container, getSafePdfPageNumber(toolbarState.currentPage));
      updateScaleFromViewer();
      lastExplicitZoomAtRef.current = performance.now();
      savedScaleAppliedRef.current = false;
      notifyViewerStateChange(
        {
          page: getSafePdfPageNumber(toolbarState.currentPage),
          scale: getPdfViewerCurrentScale(pdfViewer),
          fitMode: "page-width",
          history: getTrimmedHistory([...(viewerState?.history ?? []), getSafePdfPageNumber(toolbarState.currentPage)]),
          bookmark: toolbarState.isBookmarked,
        },
        { persistence: "immediate" },
      );
    });
  }, [notifyViewerStateChange, toolbarState.currentPage, toolbarState.isBookmarked, updateScaleFromViewer, viewerState?.history]);

  const handlePageInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextPage = Number(event.target.value);
    if (Number.isFinite(nextPage)) setViewerPage(nextPage);
  }, [setViewerPage]);

  const handleZoomInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setZoomInputValue(nextValue);
    const nextPercent = Number(nextValue);
    if (!Number.isFinite(nextPercent) || nextPercent <= 0) return;
    scheduleZoomInputCommit(nextPercent / 100);
  }, [scheduleZoomInputCommit]);

  const handleZoomInputKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const nextPercent = Number(zoomInputValue);
    if (!Number.isFinite(nextPercent) || nextPercent <= 0) return;
    if (zoomInputCommitTimerRef.current !== null) {
      window.clearTimeout(zoomInputCommitTimerRef.current);
      zoomInputCommitTimerRef.current = null;
    }
    applyZoomScale(nextPercent / 100);
    persistCurrentViewerState({ persistence: "immediate" });
    toolbarScaleInputRef.current?.blur();
  }, [applyZoomScale, persistCurrentViewerState, zoomInputValue]);

  const toggleBookmark = useCallback(() => {
    const pdfViewer = pdfViewerRef.current;
    const nextBookmark = !toolbarState.isBookmarked;
    updateToolbarState({ isBookmarked: nextBookmark });
    notifyViewerStateChange(
      {
        page: getSafePdfPageNumber(pdfViewer?.currentPageNumber ?? toolbarState.currentPage),
        scale: pdfViewer ? getPdfViewerCurrentScale(pdfViewer) : toolbarState.scale,
        fitMode: "manual",
        history: getTrimmedHistory([...(viewerState?.history ?? []), getSafePdfPageNumber(pdfViewer?.currentPageNumber ?? toolbarState.currentPage)]),
        bookmark: nextBookmark,
      },
      { persistence: "immediate" },
    );
  }, [notifyViewerStateChange, toolbarState.currentPage, toolbarState.isBookmarked, toolbarState.scale, updateToolbarState, viewerState?.history]);

  const goBackInHistory = useCallback(() => {
    const history = viewerState?.history ?? [];
    const previousPage = history.length >= 2 ? history[history.length - 2] : null;
    if (previousPage === null) return;
    setViewerPage(previousPage);
    notifyViewerStateChange(
      {
        page: previousPage,
        scale: toolbarState.scale,
        fitMode: viewerState?.fitMode ?? "manual",
        history: getTrimmedHistory(history.slice(0, -1)),
        bookmark: toolbarState.isBookmarked,
      },
      { persistence: "immediate" },
    );
  }, [notifyViewerStateChange, setViewerPage, toolbarState.isBookmarked, toolbarState.scale, viewerState?.fitMode, viewerState?.history]);

  useEffect(() => {
    const container = containerRef.current;
    const viewerElement = viewerRef.current;
    if (!container || !viewerElement) return;

    const eventBus = new EventBus();
    const linkService = new PDFLinkService({ eventBus });
    const pdfViewer = new PDFViewer({
      container,
      viewer: viewerElement,
      eventBus,
      linkService,
      textLayerMode: 1,
      annotationMode: pdfjsLib.AnnotationMode.ENABLE,
      ...createPdfViewerRuntimeOptions(),
    });

    eventBusRef.current = eventBus;
    linkServiceRef.current = linkService;
    pdfViewerRef.current = pdfViewer;
    linkService.setViewer(pdfViewer);

    const removePageChanging = addPdfViewerEventListener(eventBus, "pagechanging", (event) => {
      const pageNumber = getSafePdfPageNumber((event as PdfPageChangingEvent).pageNumber ?? 1);
      updateToolbarState({ currentPage: pageNumber });
      notifyViewerStateChange(
        {
          page: pageNumber,
          scale: getPdfViewerCurrentScale(pdfViewer),
          fitMode: savedScaleAppliedRef.current ? "manual" : (viewerState?.fitMode ?? "page-width"),
          history: getTrimmedHistory([...(viewerState?.history ?? []), pageNumber]),
          bookmark: toolbarState.isBookmarked,
        },
        { persistence: isUserScrollingRef.current ? "deferred" : "immediate" },
      );
    });

    const removeScaleChanging = addPdfViewerEventListener(eventBus, "scalechanging", (event) => {
      const nextScale = Number((event as PdfScaleChangingEvent).scale);
      if (Number.isFinite(nextScale) && nextScale > 0) {
        updateToolbarState({ scale: nextScale });
        setZoomInputValue(String(Math.round(nextScale * 100)));
      }
    });

    const removePageRendered = addPdfViewerEventListener(eventBus, "pagerendered", (event) => {
      const pageNumber = getSafePdfPageNumber((event as PdfPageRenderedEvent).pageNumber ?? 1);
      updatePageRenderingWindow(pdfViewer, viewerElement, container, pageNumber);
    });

    return () => {
      removePageChanging();
      removeScaleChanging();
      removePageRendered();
      if (zoomPreviewFrameRef.current !== null) cancelAnimationFrame(zoomPreviewFrameRef.current);
      if (zoomIdleCommitTimerRef.current !== null) window.clearTimeout(zoomIdleCommitTimerRef.current);
      if (zoomInputCommitTimerRef.current !== null) window.clearTimeout(zoomInputCommitTimerRef.current);
      if (scrollIdleTimerRef.current !== null) window.clearTimeout(scrollIdleTimerRef.current);
      clearPdfZoomPreview(container, viewerElement);
      releasePdfViewerDocument(pdfViewer, linkService, pdfDocumentRef.current);
      pdfViewerRef.current = null;
      linkServiceRef.current = null;
      eventBusRef.current = null;
      pdfDocumentRef.current = null;
    };
  }, [notifyViewerStateChange, toolbarState.isBookmarked, updateToolbarState, viewerState?.fitMode, viewerState?.history]);

  useEffect(() => {
    if (!source) {
      setIsLoading(false);
      setErrorMessage(null);
      setToolbarState(createDefaultToolbarState());
      setZoomInputValue("100");
      return;
    }

    const pdfViewer = pdfViewerRef.current;
    const linkService = linkServiceRef.current;
    if (!pdfViewer || !linkService) return;

    const abortController = new AbortController();
    loadTaskAbortRef.current?.abort();
    loadTaskAbortRef.current = abortController;
    setIsLoading(true);
    setErrorMessage(null);
    savedScaleAppliedRef.current = false;
    gestureBaseScaleRef.current = null;

    const sourceLoadKey = JSON.stringify(source);
    sourceLoadKeyRef.current = sourceLoadKey;
    retainPdfDocumentSource(source);
    if (sourceReleaseTimerRef.current !== null) {
      window.clearTimeout(sourceReleaseTimerRef.current);
      sourceReleaseTimerRef.current = null;
    }

    void loadPdfDocument(source, viewerOptions)
      .then((pdfDocument) => {
        if (abortController.signal.aborted || sourceLoadKeyRef.current !== sourceLoadKey) {
          void pdfDocument.destroy();
          return;
        }

        releasePdfViewerDocument(pdfViewer, linkService, pdfDocumentRef.current);
        pdfDocumentRef.current = pdfDocument;
        linkService.setDocument(pdfDocument, null);
        pdfViewer.setDocument(pdfDocument);
        setToolbarState({
          currentPage: getSafePdfPageNumber(viewerState?.page ?? 1),
          pageCount: pdfDocument.numPages,
          scale: viewerState?.scale ?? 1,
          isBookmarked: Boolean(viewerState?.bookmark),
        });
        setZoomInputValue(String(Math.round((viewerState?.scale ?? 1) * 100)));
        setIsLoading(false);

        requestAnimationFrame(() => {
          if (abortController.signal.aborted) return;
          const forcePageWidth = isCompactPdfViewport(containerRef.current ?? document.documentElement);
          (pdfViewer as PdfViewerWithScale).currentScaleValue = getPdfViewerStateScaleValue(viewerState, forcePageWidth);
          pdfViewer.currentPageNumber = getSafePdfPageNumber(viewerState?.page ?? 1);
          savedScaleAppliedRef.current = viewerState?.fitMode === "manual";
          updateScaleFromViewer();
        });
      })
      .catch((error) => {
        if (abortController.signal.aborted) return;
        setIsLoading(false);
        const message = error instanceof Error ? error.message : "PDFの読み込みに失敗しました。";
        setErrorMessage(message);
        onLoadError?.(error);
      });

    return () => {
      abortController.abort();
      if (loadTaskAbortRef.current === abortController) loadTaskAbortRef.current = null;
      sourceReleaseTimerRef.current = window.setTimeout(() => {
        releasePdfDocumentSourceSoon(source);
        sourceReleaseTimerRef.current = null;
      }, 0);
    };
  }, [onLoadError, source, updateScaleFromViewer, viewerOptions, viewerState]);

  useEffect(() => {
    const container = containerRef.current;
    const viewerElement = viewerRef.current;
    if (!container || !viewerElement) return;

    const handleScroll = () => {
      const pdfViewer = pdfViewerRef.current;
      if (!pdfViewer) return;
      isUserScrollingRef.current = true;
      container.classList.add(PDF_SCROLLING_CLASS_NAME);
      updatePageRenderingWindow(pdfViewer, viewerElement, container, getSafePdfPageNumber(pdfViewer.currentPageNumber));
      if (scrollIdleTimerRef.current !== null) window.clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = window.setTimeout(() => {
        isUserScrollingRef.current = false;
        container.classList.remove(PDF_SCROLLING_CLASS_NAME);
        persistCurrentViewerState({ persistence: "deferred" });
      }, 160);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [persistCurrentViewerState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (!isPdfTrackpadZoomWheelEvent(event)) return;
      const normalizedDeltaY = getNormalizedPdfWheelDeltaY(event, container);
      if (!Number.isFinite(normalizedDeltaY) || normalizedDeltaY === 0) return;
      const pdfViewer = pdfViewerRef.current;
      if (!pdfViewer) return;
      event.preventDefault();
      const baseScale = getPdfViewerCurrentScale(pdfViewer);
      requestZoom(baseScale * Math.exp(-normalizedDeltaY * PDF_TRACKPAD_ZOOM_SENSITIVITY), event.clientX, event.clientY);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [requestZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleGestureStart = (event: Event) => {
      const pdfViewer = pdfViewerRef.current;
      if (!pdfViewer) return;
      event.preventDefault();
      gestureBaseScaleRef.current = getPdfViewerCurrentScale(pdfViewer);
    };

    const handleGestureChange = (event: Event) => {
      const pdfViewer = pdfViewerRef.current;
      if (!pdfViewer) return;
      const gestureEvent = event as PdfGestureEvent;
      const gestureScale = Number(gestureEvent.scale);
      if (!Number.isFinite(gestureScale) || gestureScale <= 0) return;
      event.preventDefault();
      requestZoom((gestureBaseScaleRef.current ?? getPdfViewerCurrentScale(pdfViewer)) * gestureScale, gestureEvent.clientX, gestureEvent.clientY);
    };

    const handleGestureEnd = (event: Event) => {
      event.preventDefault();
      gestureBaseScaleRef.current = null;
      commitZoomPreview();
    };

    container.addEventListener("gesturestart", handleGestureStart, { passive: false });
    container.addEventListener("gesturechange", handleGestureChange, { passive: false });
    container.addEventListener("gestureend", handleGestureEnd, { passive: false });

    return () => {
      container.removeEventListener("gesturestart", handleGestureStart);
      container.removeEventListener("gesturechange", handleGestureChange);
      container.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [commitZoomPreview, requestZoom]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandlePdfKeyboardEvent(event)) return;

      if ((event.ctrlKey || event.metaKey) && event.key === "+") {
        event.preventDefault();
        zoomIn();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        zoomOut();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "0") {
        event.preventDefault();
        applyPageWidth();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goToPreviousPage();
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        goToNextPage();
        return;
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleBookmark();
        return;
      }

      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        goBackInHistory();
        return;
      }

      if (PDF_MARK_KEY_PATTERN.test(event.key)) {
        notifyViewerStateChange(
          {
            page: toolbarState.currentPage,
            scale: toolbarState.scale,
            fitMode: viewerState?.fitMode ?? "manual",
            history: getTrimmedHistory([...(viewerState?.history ?? []), toolbarState.currentPage]),
            bookmark: toolbarState.isBookmarked,
            mark: event.key.toLowerCase(),
          },
          { persistence: "immediate" },
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [applyPageWidth, goBackInHistory, goToNextPage, goToPreviousPage, notifyViewerStateChange, toolbarState.currentPage, toolbarState.isBookmarked, toolbarState.scale, toggleBookmark, viewerState?.fitMode, viewerState?.history, zoomIn, zoomOut]);

  const isReady = !isLoading && !errorMessage && toolbarState.pageCount > 0;

  return (
    <section className={cn("pdf-pane", className)} aria-label="PDFビューア">
      <div className="pdf-pane__toolbar" role="toolbar" aria-label="PDF操作">
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={goToPreviousPage} disabled={!isReady || toolbarState.currentPage <= 1}>
          前
        </button>
        <input
          className={PDF_TOOLBAR_INPUT_CLASS_NAME}
          type="number"
          min={1}
          max={toolbarState.pageCount ?? 1}
          value={toolbarState.currentPage}
          onChange={handlePageInputChange}
          disabled={!isReady}
          aria-label="ページ番号"
        />
        <span className="pdf-pane__toolbar-label">/ {toolbarState.pageCount ?? "-"}</span>
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={goToNextPage} disabled={!isReady || toolbarState.currentPage >= toolbarState.pageCount}>
          次
        </button>
        <span className="pdf-pane__toolbar-separator" aria-hidden="true" />
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={zoomOut} disabled={!isReady}>
          -
        </button>
        <input
          ref={toolbarScaleInputRef}
          className={PDF_TOOLBAR_INPUT_CLASS_NAME}
          type="number"
          min={Math.round(PDF_ZOOM_MIN_SCALE * 100)}
          max={Math.round(PDF_ZOOM_MAX_SCALE * 100)}
          value={zoomInputValue}
          onChange={handleZoomInputChange}
          onKeyDown={handleZoomInputKeyDown}
          disabled={!isReady}
          aria-label="ズーム倍率"
        />
        <span className="pdf-pane__toolbar-label">%</span>
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={zoomIn} disabled={!isReady}>
          +
        </button>
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={applyPageWidth} disabled={!isReady}>
          幅
        </button>
        <span className="pdf-pane__toolbar-separator" aria-hidden="true" />
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={toggleBookmark} disabled={!isReady} aria-pressed={toolbarState.isBookmarked} aria-label={toolbarState.isBookmarked ? "ブックマークを解除" : "ブックマークを追加"}>
          {StratisBookmarkIcon ? <StratisBookmarkIcon className={cn("h-4 w-4", toolbarState.isBookmarked ? "fill-current" : "fill-none")} aria-hidden="true" focusable="false" /> : <StratisFallbackBookmarkIcon className={cn("h-4 w-4", toolbarState.isBookmarked ? "fill-current" : "fill-none")} active={toolbarState.isBookmarked} />}
        </button>
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={goBackInHistory} disabled={!isReady || (viewerState?.history?.length ?? 0) < 2}>
          戻る
        </button>
      </div>
      <div ref={containerRef} className={PDF_SCROLL_CONTAINER_CLASS_NAME}>
        <div ref={viewerRef} className="pdfViewer" />
        {isLoading ? (
          <div className="pdf-pane__overlay" role="status" aria-live="polite">
            <LoadingSpinner size="md" text="PDFを読み込み中..." />
          </div>
        ) : null}
        {errorMessage ? (
          <div className="pdf-pane__error" role="alert">
            {errorMessage}
          </div>
        ) : null}
        {!source ? (
          <div className="pdf-pane__empty">PDFを選択してください。</div>
        ) : null}
      </div>
    </section>
  );
};

export { PdfPane };
