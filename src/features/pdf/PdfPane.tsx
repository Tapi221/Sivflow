import "./PdfPane.css";
import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import type { PdfViewerState } from "@/types";
import type { PdfDocumentSource } from "./pdfDocumentSource";
import { releasePdfDocumentSourceSoon, retainPdfDocumentSource, toPdfDocumentLoadSource } from "./pdfDocumentSource";
import { waitForPdfLoadingTask } from "./pdfLoadingTaskTimeout";
import { getSafePdfPageNumber } from "./pdfPageWindow";
import { PDF_ZOOM_BUTTON_SCALE_FACTOR, PDF_ZOOM_MAX_SCALE, PDF_ZOOM_MIN_SCALE } from "./pdfZoom.constants";

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

const PDF_COMPACT_VIEWPORT_MAX_WIDTH = 640;
const PDF_HISTORY_LIMIT = 80;
const PDF_PAGE_WIDTH_PADDING_PX = 48;
const PDF_SCROLL_CONTAINER_CLASS_NAME = "pdf-pane__scroll-container";
const PDF_TOOLBAR_BUTTON_CLASS_NAME = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-black/10 bg-white/90 px-2 text-[12px] font-medium text-[#4a4a4a] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
const PDF_TOOLBAR_INPUT_CLASS_NAME = "h-8 w-14 rounded-md border border-black/10 bg-white/90 px-2 text-center text-[12px] font-medium text-[#4a4a4a] shadow-sm outline-none focus:border-black/25";
const PDF_MARK_KEY_PATTERN = /^[a-z0-9]$/i;
const PDF_RANGE_CHUNK_SIZE = 65_536;
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
  return Math.min(Math.max(scale, PDF_ZOOM_MIN_SCALE), PDF_ZOOM_MAX_SCALE);
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

const PdfPane = ({ source, className, viewerState = null, viewerOptions, onLoadError, onViewerStateChange }: PdfPaneProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocumentRef = useRef<PdfDocumentProxy | null>(null);
  const renderTaskRef = useRef<PdfRenderTask | null>(null);
  const sourceReleaseTimerRef = useRef<number | null>(null);
  const viewerStateRef = useRef<PdfViewerState | null>(viewerState);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(source));
  const [isRendering, setIsRendering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toolbarState, setToolbarState] = useState<PdfToolbarState>(createDefaultToolbarState);
  const [bookmarkPages, setBookmarkPages] = useState<number[]>(() => getViewerStateBookmarkPages(viewerState));
  const [zoomInputValue, setZoomInputValue] = useState(String(Math.round(getViewerStateScale(viewerState) * 100)));

  useEffect(() => {
    viewerStateRef.current = viewerState;
  }, [viewerState]);

  useEffect(() => {
    setZoomInputValue(String(Math.round(toolbarState.scale * 100)));
  }, [toolbarState.scale]);

  const setActiveDocument = useCallback((nextDocument: PdfDocumentProxy | null) => {
    const currentDocument = pdfDocumentRef.current;
    if (currentDocument && currentDocument !== nextDocument) void currentDocument.destroy();
    pdfDocumentRef.current = nextDocument;
    setPdfDocument(nextDocument);
  }, []);

  const emitViewerStateChange = useCallback((nextState: PdfViewerState, options?: PdfViewerStateChangeOptions) => {
    void onViewerStateChange?.(nextState, options);
  }, [onViewerStateChange]);

  const buildViewerState = useCallback((updates: Partial<PdfViewerState>): PdfViewerState => {
    const currentViewerState = viewerStateRef.current ?? {};
    return {
      ...currentViewerState,
      ...updates,
    };
  }, []);

  const persistViewerState = useCallback((updates: Partial<PdfViewerState>, options?: PdfViewerStateChangeOptions) => {
    emitViewerStateChange(buildViewerState(updates), options);
  }, [buildViewerState, emitViewerStateChange]);

  const updatePageState = useCallback((pageNumber: number, options?: PdfViewerStateChangeOptions) => {
    const nextPage = clampPdfPageNumber(pageNumber, toolbarState.pageCount);
    const nextHistoryBackPages = appendHistoryPage(getViewerStateHistoryBackPages(viewerStateRef.current), nextPage);
    setToolbarState((currentState) => ({ ...currentState, currentPage: nextPage, isBookmarked: isBookmarkedPage(bookmarkPages, nextPage) }));
    persistViewerState({ currentPage: nextPage, historyBackPages: nextHistoryBackPages }, options);
  }, [bookmarkPages, persistViewerState, toolbarState.pageCount]);

  const updateScaleState = useCallback((scale: number, fitMode: PdfViewerState["fitMode"], options?: PdfViewerStateChangeOptions) => {
    const nextScale = clampPdfViewerScale(scale);
    setToolbarState((currentState) => ({ ...currentState, scale: nextScale }));
    persistViewerState({ scale: nextScale, fitMode }, options);
  }, [persistViewerState]);

  const goToPreviousPage = useCallback(() => {
    updatePageState(toolbarState.currentPage - 1, { persistence: "immediate" });
  }, [toolbarState.currentPage, updatePageState]);

  const goToNextPage = useCallback(() => {
    updatePageState(toolbarState.currentPage + 1, { persistence: "immediate" });
  }, [toolbarState.currentPage, updatePageState]);

  const zoomIn = useCallback(() => {
    updateScaleState(toolbarState.scale * PDF_ZOOM_BUTTON_SCALE_FACTOR, "manual", { persistence: "deferred" });
  }, [toolbarState.scale, updateScaleState]);

  const zoomOut = useCallback(() => {
    updateScaleState(toolbarState.scale / PDF_ZOOM_BUTTON_SCALE_FACTOR, "manual", { persistence: "deferred" });
  }, [toolbarState.scale, updateScaleState]);

  const applyPageWidth = useCallback(() => {
    const currentDocument = pdfDocumentRef.current;
    const container = containerRef.current;
    if (!currentDocument || !container) return;

    void currentDocument.getPage(toolbarState.currentPage).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(container.clientWidth - PDF_PAGE_WIDTH_PADDING_PX, 1);
      updateScaleState(availableWidth / viewport.width, "width", { persistence: "immediate" });
    }).catch((error: unknown) => {
      setErrorMessage(getErrorMessage(error, "PDFページ幅の取得に失敗しました。"));
    });
  }, [toolbarState.currentPage, updateScaleState]);

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
    persistViewerState({ bookmarkPages: nextBookmarkPages }, { persistence: "immediate" });
  }, [bookmarkPages, persistViewerState, toolbarState.currentPage]);

  const goBackInHistory = useCallback(() => {
    const historyBackPages = getViewerStateHistoryBackPages(viewerStateRef.current);
    const previousPage = historyBackPages.length >= 2 ? historyBackPages[historyBackPages.length - 2] : null;
    if (previousPage === null) return;
    const nextHistoryBackPages = historyBackPages.slice(0, -1);
    setToolbarState((currentState) => ({ ...currentState, currentPage: previousPage, isBookmarked: isBookmarkedPage(bookmarkPages, previousPage) }));
    persistViewerState({ currentPage: previousPage, historyBackPages: nextHistoryBackPages }, { persistence: "immediate" });
  }, [bookmarkPages, persistViewerState]);

  useEffect(() => {
    if (!source) {
      setActiveDocument(null);
      setIsLoading(false);
      setIsRendering(false);
      setErrorMessage(null);
      setToolbarState(createDefaultToolbarState());
      setBookmarkPages([]);
      setZoomInputValue("100");
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
        setActiveDocument(loadedDocument);
        setBookmarkPages(nextBookmarkPages);
        setToolbarState({ currentPage: nextPage, pageCount: nextPageCount, scale: nextScale, isBookmarked: isBookmarkedPage(nextBookmarkPages, nextPage) });
        setIsLoading(false);
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
  }, [onLoadError, setActiveDocument, source, viewerOptions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdfDocument || !canvas || toolbarState.pageCount <= 0) return;

    let isCancelled = false;
    const currentPage = clampPdfPageNumber(toolbarState.currentPage, toolbarState.pageCount);
    const currentScale = clampPdfViewerScale(toolbarState.scale);

    const renderPage = async () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      setIsRendering(true);
      setErrorMessage(null);
      const page = await pdfDocument.getPage(currentPage);
      if (isCancelled) return;

      const viewport = page.getViewport({ scale: currentScale });
      const outputScale = Math.max(globalThis.devicePixelRatio || 1, 1);
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

    void renderPage()
      .catch((error: unknown) => {
        if (isCancelled || isRenderingCancelled(error)) return;
        setErrorMessage(getErrorMessage(error, "PDFページの描画に失敗しました。"));
      })
      .finally(() => {
        if (!isCancelled) setIsRendering(false);
      });

    return () => {
      isCancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [pdfDocument, toolbarState.currentPage, toolbarState.pageCount, toolbarState.scale]);

  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      setActiveDocument(null);
      if (sourceReleaseTimerRef.current !== null) globalThis.clearTimeout(sourceReleaseTimerRef.current);
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
        persistViewerState({ markPages }, { persistence: "immediate" });
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [applyPageWidth, goBackInHistory, goToNextPage, goToPreviousPage, persistViewerState, toolbarState.currentPage, toggleBookmark, zoomIn, zoomOut]);

  const isReady = !isLoading && !errorMessage && toolbarState.pageCount > 0;
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
          max={toolbarState.pageCount || 1}
          value={toolbarState.currentPage}
          onChange={handlePageInputChange}
          disabled={!isReady}
          aria-label="ページ番号"
        />
        <span className="pdf-pane__toolbar-label">/ {toolbarState.pageCount || "-"}</span>
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
          {toolbarState.isBookmarked ? "★" : "☆"}
        </button>
        <button className={PDF_TOOLBAR_BUTTON_CLASS_NAME} type="button" onClick={goBackInHistory} disabled={!isReady || getViewerStateHistoryBackPages(viewerStateRef.current).length < 2}>
          戻る
        </button>
      </div>
      <div ref={containerRef} className={PDF_SCROLL_CONTAINER_CLASS_NAME}>
        <div className="pdf-pane__single-page">
          <canvas ref={canvasRef} className="pdf-pane__canvas" />
        </div>
        {isLoading || isRendering ? (
          <div className="pdf-pane__overlay" role="status" aria-live="polite">
            <LoadingSpinner size="md" text={isLoading ? "PDFを読み込み中..." : "PDFページを描画中..."} />
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