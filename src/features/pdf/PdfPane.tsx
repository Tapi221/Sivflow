import "./PdfPane.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@web-renderer/components/common/LoadingSpinner";
import { cn } from "@web-renderer/lib/utils";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { PdfDocumentSource } from "./pdfDocumentSource";
import { releasePdfDocumentSourceSoon, retainPdfDocumentSource, toPdfDocumentLoadSource } from "./pdfDocumentSource";
import { waitForPdfLoadingTask } from "./pdfLoadingTaskTimeout";
import { getSafePdfPageNumber } from "./pdfPageWindow";
import { PDF_TRACKPAD_ZOOM_SENSITIVITY, PDF_ZOOM_BUTTON_SCALE_FACTOR, PDF_ZOOM_MAX_SCALE, PDF_ZOOM_MIN_SCALE, PDF_ZOOM_SCALE_EPSILON } from "./pdfZoom.constants";
import { clampScale, computeNextScaleFromGesture, normalizeScale } from "./pdfZoom.utils";
import type { PdfViewerState } from "@/types";



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
type LegacyPdfViewerState = PdfViewerState & {
  bookmark?: boolean;
  history?: number[];
  mark?: string;
  page?: number;
};
type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;
type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;
type PdfRenderTask = ReturnType<PdfPageProxy["render"]>;
type PdfToolbarState = {
  currentPage: number;
  pageCount: number;
  scale: number;
  isBookmarked: boolean;
};
type PdfPageSize = {
  width: number;
  height: number;
};
type PdfPageCanvasProps = {
  pdfDocument: PdfDocumentProxy;
  pageNumber: number;
  pageSize: PdfPageSize | null;
  registerPageElement: (pageNumber: number, element: HTMLDivElement | null) => void;
  scale: number;
  scrollRoot: HTMLDivElement | null;
  onPageSizeChange: (pageNumber: number, pageSize: PdfPageSize) => void;
};
type PdfZoomAnchor = {
  clientX: number;
  clientY: number;
};



const PDF_COMPACT_VIEWPORT_MAX_WIDTH = 640;
const PDF_FALLBACK_PAGE_SIZE: PdfPageSize = { width: 612, height: 792 };
const PDF_HISTORY_LIMIT = 80;
const PDF_INTERSECTION_ROOT_MARGIN = "1400px 0px";
const PDF_PAGE_WIDTH_PADDING_PX = 48;
const PDF_RENDER_OUTPUT_SCALE_MAX = 2;
const PDF_SCROLL_CONTAINER_CLASS_NAME = "pdf-pane__scroll-container";
const PDF_SCROLL_IDLE_DELAY_MS = 180;
const PDF_TOOLBAR_BUTTON_CLASS_NAME = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-black/10 bg-white/90 px-2 text-xs font-medium text-neutral-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
const PDF_TOOLBAR_INPUT_CLASS_NAME = "h-8 w-14 rounded-md border border-black/10 bg-white/90 px-2 text-center text-xs font-medium text-neutral-600 shadow-sm outline-none focus:border-black/25";
const PDF_MARK_KEY_PATTERN = /^[a-z0-9]$/i;
const PDF_RANGE_CHUNK_SIZE = 65_536;
const PDF_WHEEL_DELTA_LINE_HEIGHT_PX = 16;
const PDF_WHEEL_DELTA_MODE_LINE = 1;
const PDF_WHEEL_DELTA_MODE_PAGE = 2;
const PDFJS_ASSET_BASE_URL = "/pdfjs/";
const PDFJS_CMAP_URL = `${PDFJS_ASSET_BASE_URL}cmaps/`;
const PDFJS_STANDARD_FONT_DATA_URL = `${PDFJS_ASSET_BASE_URL}standard_fonts/`;
const PDFJS_WASM_URL = `${PDFJS_ASSET_BASE_URL}wasm/`;



pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const createDefaultToolbarState = (): PdfToolbarState => ({
  currentPage: 1,
  pageCount: 0,
  scale: 1,
  isBookmarked: false,
});
const getLegacyViewerState = (viewerState: PdfViewerState | null | undefined): LegacyPdfViewerState | null => {
  return viewerState ? viewerState as LegacyPdfViewerState : null;
};
const clampPdfViewerScale = (scale: number): number => {
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return normalizeScale(clampScale(scale, PDF_ZOOM_MIN_SCALE, PDF_ZOOM_MAX_SCALE));
};
const clampPdfPageNumber = (pageNumber: number, pageCount: number): number => {
  const safePageNumber = getSafePdfPageNumber(pageNumber);
  const safePageCount = Math.max(getSafePdfPageNumber(pageCount), 1);
  return Math.min(Math.max(safePageNumber, 1), safePageCount);
};
const getViewerStatePage = (viewerState: PdfViewerState | null | undefined): number => {
  const legacyViewerState = getLegacyViewerState(viewerState);
  return getSafePdfPageNumber(viewerState?.currentPage ?? legacyViewerState?.page ?? 1);
};
const getViewerStateScale = (viewerState: PdfViewerState | null | undefined): number => {
  return clampPdfViewerScale(viewerState?.scale ?? 1);
};
const getTrimmedHistory = (pages: number[]): number[] => {
  return pages.slice(-PDF_HISTORY_LIMIT);
};
const getViewerStateHistoryBackPages = (viewerState: PdfViewerState | null | undefined): number[] => {
  const legacyViewerState = getLegacyViewerState(viewerState);
  return viewerState?.historyBackPages ?? legacyViewerState?.history ?? [];
};
const getViewerStateBookmarkPages = (viewerState: PdfViewerState | null | undefined): number[] => {
  const currentPage = getViewerStatePage(viewerState);
  const legacyViewerState = getLegacyViewerState(viewerState);
  if (viewerState?.bookmarkPages) return viewerState.bookmarkPages;
  return legacyViewerState?.bookmark ? [currentPage] : [];
};
const isBookmarkedPage = (bookmarkPages: number[], pageNumber: number): boolean => {
  return bookmarkPages.includes(pageNumber);
};
const appendHistoryPage = (historyPages: number[], pageNumber: number): number[] => {
  if (historyPages[historyPages.length - 1] === pageNumber) return historyPages;
  return getTrimmedHistory([...historyPages, pageNumber]);
};
const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error && error.message ? error.message : fallback;
};
const isRenderingCancelled = (error: unknown): boolean => {
  return error instanceof Error && error.name === "RenderingCancelledException";
};
const shouldHandlePdfKeyboardEvent = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement | null;
  if (!target) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName !== "input" && tagName !== "textarea" && !target.isContentEditable;
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
const getRenderedPageSize = (pageSize: PdfPageSize | null, scale: number): PdfPageSize => {
  const safePageSize = pageSize ?? PDF_FALLBACK_PAGE_SIZE;
  const safeScale = clampPdfViewerScale(scale);
  return {
    width: safePageSize.width * safeScale,
    height: safePageSize.height * safeScale,
  };
};
const getNearestPageNumber = (container: HTMLElement, pageElements: Map<number, HTMLElement>): number | null => {
  const containerRect = container.getBoundingClientRect();
  const anchorY = containerRect.top + Math.min(containerRect.height * 0.35, 220);
  let nearestPageNumber: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const [pageNumber, pageElement] of pageElements) {
    const rect = pageElement.getBoundingClientRect();
    const intersects = rect.bottom >= containerRect.top && rect.top <= containerRect.bottom;
    if (!intersects) continue;
    const distance = Math.abs(rect.top - anchorY);
    if (distance >= nearestDistance) continue;
    nearestDistance = distance;
    nearestPageNumber = pageNumber;
  }
  return nearestPageNumber;
};
const getNormalizedPdfWheelDeltaY = (event: WheelEvent, container: HTMLElement): number => {
  if (event.deltaMode === PDF_WHEEL_DELTA_MODE_LINE) return event.deltaY * PDF_WHEEL_DELTA_LINE_HEIGHT_PX;
  if (event.deltaMode === PDF_WHEEL_DELTA_MODE_PAGE) return event.deltaY * Math.max(container.clientHeight, 1);
  return event.deltaY;
};
const computeNextScaleFromTrackpadWheel = (currentScale: number, deltaY: number): number | null => {
  if (!Number.isFinite(currentScale) || currentScale <= 0) return null;
  if (!Number.isFinite(deltaY) || deltaY === 0) return null;
  const rawNextScale = currentScale * Math.exp(-deltaY * PDF_TRACKPAD_ZOOM_SENSITIVITY);
  if (!Number.isFinite(rawNextScale)) return null;
  return normalizeScale(clampScale(rawNextScale, PDF_ZOOM_MIN_SCALE, PDF_ZOOM_MAX_SCALE));
};
const getPdfGestureScale = (event: Event): number | null => {
  const gestureScale = (event as { scale?: unknown }).scale;
  return typeof gestureScale === "number" && Number.isFinite(gestureScale) && gestureScale > 0 ? gestureScale : null;
};
const preventPdfZoomDefault = (event: Event): void => {
  if (event.cancelable) event.preventDefault();
};
const getPdfZoomAnchor = (event: Event, container: HTMLElement): PdfZoomAnchor => {
  const rect = container.getBoundingClientRect();
  const eventPosition = event as Partial<Pick<MouseEvent, "clientX" | "clientY">>;
  const clientX = typeof eventPosition.clientX === "number" && Number.isFinite(eventPosition.clientX) ? eventPosition.clientX : rect.left + rect.width / 2;
  const clientY = typeof eventPosition.clientY === "number" && Number.isFinite(eventPosition.clientY) ? eventPosition.clientY : rect.top + rect.height / 2;
  return { clientX, clientY };
};
const restorePdfZoomAnchor = (container: HTMLElement, anchor: PdfZoomAnchor, previousScale: number, nextScale: number): void => {
  if (!Number.isFinite(previousScale) || previousScale <= 0 || !Number.isFinite(nextScale) || nextScale <= 0) return;
  const rect = container.getBoundingClientRect();
  const anchorLeft = anchor.clientX - rect.left;
  const anchorTop = anchor.clientY - rect.top;
  const contentLeft = container.scrollLeft + anchorLeft;
  const contentTop = container.scrollTop + anchorTop;
  const scaleRatio = nextScale / previousScale;
  globalThis.requestAnimationFrame(() => {
    container.scrollLeft = contentLeft * scaleRatio - anchorLeft;
    container.scrollTop = contentTop * scaleRatio - anchorTop;
  });
};



const PdfPageCanvas = ({ pdfDocument, pageNumber, pageSize, registerPageElement, scale, scrollRoot, onPageSizeChange }: PdfPageCanvasProps) => {
  const pageElementRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<PdfRenderTask | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [renderErrorMessage, setRenderErrorMessage] = useState<string | null>(null);
  const renderedPageSize = getRenderedPageSize(pageSize, scale);
  const setPageElement = useCallback(
    (element: HTMLDivElement | null) => {
      pageElementRef.current = element;
      registerPageElement(pageNumber, element);
    },
    [pageNumber, registerPageElement],
  );
  useEffect(() => {
    const pageElement = pageElementRef.current;
    if (!pageElement) return;
    if (!scrollRoot || !("IntersectionObserver" in globalThis)) {
      setIsNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearViewport(entry.isIntersecting);
      },
      { root: scrollRoot, rootMargin: PDF_INTERSECTION_ROOT_MARGIN },
    );
    observer.observe(pageElement);
    return () => {
      observer.disconnect();
    };
  }, [scrollRoot]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isNearViewport) return;
    let isCancelled = false;
    const renderPage = async () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      setRenderErrorMessage(null);
      const page = await pdfDocument.getPage(pageNumber);
      if (isCancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });
      onPageSizeChange(pageNumber, { width: baseViewport.width, height: baseViewport.height });
      const viewport = page.getViewport({ scale: clampPdfViewerScale(scale) });
      const outputScale = Math.min(Math.max(globalThis.devicePixelRatio ?? 1, 1), PDF_RENDER_OUTPUT_SCALE_MAX);
      const canvasContext = canvas.getContext("2d");
      if (!canvasContext) throw new Error("PDF Canvas を初期化できませんでした。");
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvasContext.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      canvasContext.clearRect(0, 0, viewport.width, viewport.height);
      const renderParameters = { canvas, canvasContext, viewport } as Parameters<PdfPageProxy["render"]>[0];
      const renderTask = page.render(renderParameters);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      if (renderTaskRef.current === renderTask) renderTaskRef.current = null;
    };
    void renderPage().catch((error: unknown) => {
      if (isCancelled || isRenderingCancelled(error)) return;
      setRenderErrorMessage(getErrorMessage(error, "PDFページの描画に失敗しました。"));
    });
    return () => {
      isCancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [isNearViewport, onPageSizeChange, pageNumber, pdfDocument, scale]);
  return (
    <div ref={setPageElement} className="pdf-pane__page" data-page-number={pageNumber} style={{ width: `${renderedPageSize.width}px`, minHeight: `${renderedPageSize.height}px` }}>
      <canvas ref={canvasRef} className="pdf-pane__page-canvas" aria-label={`PDF ${pageNumber} ページ`} />
      {!isNearViewport ? <div className="pdf-pane__page-placeholder" aria-hidden="true" /> : null}
      {renderErrorMessage ? <div className="pdf-pane__page-error" role="alert">{renderErrorMessage}</div> : null}
    </div>
  );
};
const PdfPane = ({ source, className, viewerState = null, viewerOptions, onLoadError, onViewerStateChange }: PdfPaneProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gestureBaseScaleRef = useRef<number | null>(null);
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const pdfDocumentRef = useRef<PdfDocumentProxy | null>(null);
  const scrollIdleTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const sourceReleaseTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const toolbarScaleRef = useRef(getViewerStateScale(viewerState));
  const viewerStateRef = useRef<PdfViewerState | null>(viewerState);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentProxy | null>(null);
  const [pageSizes, setPageSizes] = useState<Array<PdfPageSize | null>>([]);
  const [isLoading, setIsLoading] = useState(Boolean(source));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toolbarState, setToolbarState] = useState<PdfToolbarState>(createDefaultToolbarState);
  const [bookmarkPages, setBookmarkPages] = useState<number[]>(() => getViewerStateBookmarkPages(viewerState));
  const [zoomInputValue, setZoomInputValue] = useState(String(Math.round(getViewerStateScale(viewerState) * 100)));
  useEffect(() => {
    viewerStateRef.current = viewerState;
  }, [viewerState]);
  useEffect(() => {
    toolbarScaleRef.current = toolbarState.scale;
    setZoomInputValue(String(Math.round(toolbarState.scale * 100)));
  }, [toolbarState.scale]);
  const handleContainerRef = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
    setScrollRoot(element);
  }, []);
  const setActiveDocument = useCallback((nextDocument: PdfDocumentProxy | null) => {
    const currentDocument = pdfDocumentRef.current;
    if (currentDocument && currentDocument !== nextDocument) void currentDocument.destroy();
    pdfDocumentRef.current = nextDocument;
    setPdfDocument(nextDocument);
  }, []);
  const emitViewerStateChange = useCallback((nextState: PdfViewerState, options?: PdfViewerStateChangeOptions) => {
    void onViewerStateChange?.(nextState, options);
  }, [onViewerStateChange]);
  const buildViewerState = useCallback((updates: Partial<LegacyPdfViewerState>): PdfViewerState => {
    const currentViewerState = (viewerStateRef.current ?? {}) as LegacyPdfViewerState;
    return {
      ...currentViewerState,
      ...updates,
    } as PdfViewerState;
  }, []);
  const persistViewerState = useCallback((updates: Partial<LegacyPdfViewerState>, options?: PdfViewerStateChangeOptions) => {
    const nextState = buildViewerState(updates);
    viewerStateRef.current = nextState;
    emitViewerStateChange(nextState, options);
  }, [buildViewerState, emitViewerStateChange]);
  const registerPageElement = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    if (element) {
      pageElementsRef.current.set(pageNumber, element);
      return;
    }
    pageElementsRef.current.delete(pageNumber);
  }, []);
  const scrollToPage = useCallback((pageNumber: number) => {
    const pageElement = pageElementsRef.current.get(pageNumber);
    pageElement?.scrollIntoView({ block: "start" });
  }, []);
  const updatePageState = useCallback((pageNumber: number, options?: PdfViewerStateChangeOptions, shouldScroll = true) => {
    const nextPage = clampPdfPageNumber(pageNumber, toolbarState.pageCount);
    const nextHistoryBackPages = appendHistoryPage(getViewerStateHistoryBackPages(viewerStateRef.current), nextPage);
    setToolbarState((currentState) => ({ ...currentState, currentPage: nextPage, isBookmarked: isBookmarkedPage(bookmarkPages, nextPage) }));
    persistViewerState({ currentPage: nextPage, page: nextPage, history: nextHistoryBackPages, historyBackPages: nextHistoryBackPages }, options);
    if (shouldScroll) globalThis.requestAnimationFrame(() => scrollToPage(nextPage));
  }, [bookmarkPages, persistViewerState, scrollToPage, toolbarState.pageCount]);
  const updateScaleState = useCallback((scale: number, fitMode: PdfViewerState["fitMode"], options?: PdfViewerStateChangeOptions, anchor?: PdfZoomAnchor) => {
    const currentScale = toolbarScaleRef.current;
    const nextScale = clampPdfViewerScale(scale);
    if (Math.abs(nextScale - currentScale) < PDF_ZOOM_SCALE_EPSILON) return;
    const container = containerRef.current;
    toolbarScaleRef.current = nextScale;
    setToolbarState((currentState) => ({ ...currentState, scale: nextScale }));
    persistViewerState({ scale: nextScale, fitMode }, options);
    if (anchor && container) restorePdfZoomAnchor(container, anchor, currentScale, nextScale);
  }, [persistViewerState]);
  const updatePageSize = useCallback((pageNumber: number, nextPageSize: PdfPageSize) => {
    setPageSizes((currentPageSizes) => {
      const index = pageNumber - 1;
      const currentPageSize = currentPageSizes[index];
      if (currentPageSize?.width === nextPageSize.width && currentPageSize.height === nextPageSize.height) return currentPageSizes;
      const nextPageSizes = currentPageSizes.slice();
      nextPageSizes[index] = nextPageSize;
      return nextPageSizes;
    });
  }, []);
  const goToPreviousPage = useCallback(() => {
    updatePageState(toolbarState.currentPage - 1, { persistence: "immediate" });
  }, [toolbarState.currentPage, updatePageState]);
  const goToNextPage = useCallback(() => {
    updatePageState(toolbarState.currentPage + 1, { persistence: "immediate" });
  }, [toolbarState.currentPage, updatePageState]);
  const zoomIn = useCallback(() => {
    updateScaleState(toolbarScaleRef.current * PDF_ZOOM_BUTTON_SCALE_FACTOR, "manual", { persistence: "deferred" });
  }, [updateScaleState]);
  const zoomOut = useCallback(() => {
    updateScaleState(toolbarScaleRef.current / PDF_ZOOM_BUTTON_SCALE_FACTOR, "manual", { persistence: "deferred" });
  }, [updateScaleState]);
  const applyPageWidth = useCallback(() => {
    const container = containerRef.current;
    const currentPageSize = pageSizes[toolbarState.currentPage - 1] ?? PDF_FALLBACK_PAGE_SIZE;
    if (!container) return;
    const availableWidth = Math.max(container.clientWidth - PDF_PAGE_WIDTH_PADDING_PX, 1);
    updateScaleState(availableWidth / currentPageSize.width, "width", { persistence: "immediate" });
  }, [pageSizes, toolbarState.currentPage, updateScaleState]);
  const handlePageInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextPage = Number(event.target.value);
    if (Number.isFinite(nextPage)) updatePageState(nextPage, { persistence: "immediate" });
  }, [updatePageState]);
  const handleZoomInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setZoomInputValue(nextValue);
    const nextPercent = Number(nextValue);
    if (!Number.isFinite(nextPercent) || nextPercent <= 0) return;
    updateScaleState(nextPercent / 100, "manual", { persistence: "deferred" });
  }, [updateScaleState]);
  const handleZoomInputKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const nextPercent = Number(zoomInputValue);
    if (!Number.isFinite(nextPercent) || nextPercent <= 0) return;
    updateScaleState(nextPercent / 100, "manual", { persistence: "immediate" });
    event.currentTarget.blur();
  }, [updateScaleState, zoomInputValue]);
  const toggleBookmark = useCallback(() => {
    const currentPage = toolbarState.currentPage;
    const nextBookmarkPages = isBookmarkedPage(bookmarkPages, currentPage)
      ? bookmarkPages.filter((pageNumber) => pageNumber !== currentPage)
      : [...bookmarkPages, currentPage].sort((left, right) => left - right);
    setBookmarkPages(nextBookmarkPages);
    setToolbarState((currentState) => ({ ...currentState, isBookmarked: isBookmarkedPage(nextBookmarkPages, currentPage) }));
    persistViewerState({ bookmark: isBookmarkedPage(nextBookmarkPages, currentPage), bookmarkPages: nextBookmarkPages }, { persistence: "immediate" });
  }, [bookmarkPages, persistViewerState, toolbarState.currentPage]);
  const goBackInHistory = useCallback(() => {
    const historyBackPages = getViewerStateHistoryBackPages(viewerStateRef.current);
    const previousPage = historyBackPages.length >= 2 ? historyBackPages[historyBackPages.length - 2] : null;
    if (previousPage === null) return;
    const nextHistoryBackPages = historyBackPages.slice(0, -1);
    setToolbarState((currentState) => ({ ...currentState, currentPage: previousPage, isBookmarked: isBookmarkedPage(bookmarkPages, previousPage) }));
    persistViewerState({ currentPage: previousPage, page: previousPage, history: nextHistoryBackPages, historyBackPages: nextHistoryBackPages }, { persistence: "immediate" });
    globalThis.requestAnimationFrame(() => scrollToPage(previousPage));
  }, [bookmarkPages, persistViewerState, scrollToPage]);
  const isReady = !isLoading && !errorMessage && toolbarState.pageCount > 0;
  useEffect(() => {
    if (!source) {
      setActiveDocument(null);
      setIsLoading(false);
      setErrorMessage(null);
      setToolbarState(createDefaultToolbarState());
      setBookmarkPages([]);
      setPageSizes([]);
      setZoomInputValue("100");
      gestureBaseScaleRef.current = null;
      pageElementsRef.current.clear();
      return;
    }
    let isCancelled = false;
    const activeViewerState = viewerStateRef.current;
    retainPdfDocumentSource(source);
    if (sourceReleaseTimerRef.current !== null) {
      globalThis.clearTimeout(sourceReleaseTimerRef.current);
      sourceReleaseTimerRef.current = null;
    }
    setIsLoading(true);
    setErrorMessage(null);
    void loadPdfDocument(source, viewerOptions)
      .then((loadedDocument) => {
        if (isCancelled) {
          void loadedDocument.destroy();
          return;
        }
        const nextPageCount = loadedDocument.numPages;
        const nextPage = clampPdfPageNumber(getViewerStatePage(activeViewerState), nextPageCount);
        const nextScale = getViewerStateScale(activeViewerState);
        const nextBookmarkPages = getViewerStateBookmarkPages(activeViewerState);
        toolbarScaleRef.current = nextScale;
        setActiveDocument(loadedDocument);
        setPageSizes(Array.from({ length: nextPageCount }, () => null));
        setBookmarkPages(nextBookmarkPages);
        setToolbarState({ currentPage: nextPage, pageCount: nextPageCount, scale: nextScale, isBookmarked: isBookmarkedPage(nextBookmarkPages, nextPage) });
        setIsLoading(false);
        globalThis.requestAnimationFrame(() => {
          globalThis.requestAnimationFrame(() => scrollToPage(nextPage));
        });
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setActiveDocument(null);
        setIsLoading(false);
        const message = getErrorMessage(error, "PDFの読み込みに失敗しました。");
        setErrorMessage(message);
        onLoadError?.(error);
      });
    return () => {
      isCancelled = true;
      sourceReleaseTimerRef.current = globalThis.setTimeout(() => {
        releasePdfDocumentSourceSoon(source);
        sourceReleaseTimerRef.current = null;
      }, 0);
    };
  }, [onLoadError, scrollToPage, setActiveDocument, source, viewerOptions]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const nearestPage = getNearestPageNumber(container, pageElementsRef.current);
      if (nearestPage === null) return;
      setToolbarState((currentState) => currentState.currentPage === nearestPage ? currentState : { ...currentState, currentPage: nearestPage, isBookmarked: isBookmarkedPage(bookmarkPages, nearestPage) });
      if (scrollIdleTimerRef.current !== null) globalThis.clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = globalThis.setTimeout(() => {
        const nextHistoryBackPages = appendHistoryPage(getViewerStateHistoryBackPages(viewerStateRef.current), nearestPage);
        persistViewerState({ currentPage: nearestPage, page: nearestPage, history: nextHistoryBackPages, historyBackPages: nextHistoryBackPages }, { persistence: "deferred" });
        scrollIdleTimerRef.current = null;
      }, PDF_SCROLL_IDLE_DELAY_MS);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollIdleTimerRef.current !== null) globalThis.clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = null;
    };
  }, [bookmarkPages, persistViewerState, scrollRoot]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      if (!isReady || !event.ctrlKey && !event.metaKey) return;
      preventPdfZoomDefault(event);
      const currentScale = toolbarScaleRef.current;
      const nextScale = computeNextScaleFromTrackpadWheel(currentScale, getNormalizedPdfWheelDeltaY(event, container));
      if (nextScale === null || Math.abs(nextScale - currentScale) < PDF_ZOOM_SCALE_EPSILON) return;
      updateScaleState(nextScale, "manual", { persistence: "deferred" }, getPdfZoomAnchor(event, container));
    };
    const handleGestureStart = (event: Event) => {
      if (!isReady) return;
      preventPdfZoomDefault(event);
      gestureBaseScaleRef.current = toolbarScaleRef.current;
    };
    const handleGestureChange = (event: Event) => {
      if (!isReady) return;
      const gestureScale = getPdfGestureScale(event);
      if (gestureScale === null) return;
      preventPdfZoomDefault(event);
      const currentScale = toolbarScaleRef.current;
      const nextScale = computeNextScaleFromGesture({ currentScale, baseScale: gestureBaseScaleRef.current, gestureScale, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE });
      if (nextScale === null || Math.abs(nextScale - currentScale) < PDF_ZOOM_SCALE_EPSILON) return;
      updateScaleState(nextScale, "manual", { persistence: "deferred" }, getPdfZoomAnchor(event, container));
    };
    const handleGestureEnd = () => {
      gestureBaseScaleRef.current = null;
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("gesturestart", handleGestureStart, { passive: false });
    container.addEventListener("gesturechange", handleGestureChange, { passive: false });
    container.addEventListener("gestureend", handleGestureEnd);
    container.addEventListener("gesturecancel", handleGestureEnd);
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("gesturestart", handleGestureStart);
      container.removeEventListener("gesturechange", handleGestureChange);
      container.removeEventListener("gestureend", handleGestureEnd);
      container.removeEventListener("gesturecancel", handleGestureEnd);
      gestureBaseScaleRef.current = null;
    };
  }, [isReady, scrollRoot, updateScaleState]);
  useEffect(() => {
    return () => {
      setActiveDocument(null);
      if (sourceReleaseTimerRef.current !== null) globalThis.clearTimeout(sourceReleaseTimerRef.current);
      if (scrollIdleTimerRef.current !== null) globalThis.clearTimeout(scrollIdleTimerRef.current);
    };
  }, [setActiveDocument]);
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
        const markPages = {
          ...(viewerStateRef.current?.markPages ?? {}),
          [event.key.toLowerCase()]: toolbarState.currentPage,
        };
        persistViewerState({ mark: event.key.toLowerCase(), markPages }, { persistence: "immediate" });
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [applyPageWidth, goBackInHistory, goToNextPage, goToPreviousPage, persistViewerState, toolbarState.currentPage, toggleBookmark, zoomIn, zoomOut]);
  const shouldUseCompactWidth = containerRef.current ? containerRef.current.clientWidth <= PDF_COMPACT_VIEWPORT_MAX_WIDTH : false;
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
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={applyPageWidth} disabled={!isReady || shouldUseCompactWidth}>
          幅
        </button>
        <span className="pdf-pane__toolbar-separator" aria-hidden="true" />
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={toggleBookmark} disabled={!isReady} aria-pressed={toolbarState.isBookmarked} aria-label={toolbarState.isBookmarked ? "ブックマークを解除" : "ブックマークを追加"}>
          {toolbarState.isBookmarked ? "解除" : "保存"}
        </button>
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={goBackInHistory} disabled={!isReady || getViewerStateHistoryBackPages(viewerStateRef.current).length < 2}>
          戻る
        </button>
      </div>
      <div ref={handleContainerRef} className={PDF_SCROLL_CONTAINER_CLASS_NAME}>
        {pdfDocument ? (
          <div className="pdf-pane__pages">
            {Array.from({ length: toolbarState.pageCount }, (_, index) => {
              const pageNumber = index + 1;
              return <PdfPageCanvas key={pageNumber} pdfDocument={pdfDocument} pageNumber={pageNumber} pageSize={pageSizes[index] ?? null} registerPageElement={registerPageElement} scale={toolbarState.scale} scrollRoot={scrollRoot} onPageSizeChange={updatePageSize} />;
            })}
          </div>
        ) : null}
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
