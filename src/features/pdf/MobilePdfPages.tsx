import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import type { PdfViewerState } from "@/types";
import { cn } from "@/lib/utils";

type MobilePdfPagesProps = {
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

type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;

type MobilePdfPageRecord = {
  pageNumber: number;
  wrapper: HTMLDivElement;
};

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DEFAULT_PDF_PAGE = 1;
const MOBILE_PDF_HORIZONTAL_PADDING_PX = 24;
const MOBILE_PDF_MIN_RENDER_WIDTH_PX = 240;
const MOBILE_PDF_MAX_RENDER_WIDTH_PX = 980;
const MOBILE_PDF_MAX_DEVICE_PIXEL_RATIO = 2;
const PDFJS_ASSET_BASE_URL = "/pdfjs/";
const PDFJS_CMAP_URL = `${PDFJS_ASSET_BASE_URL}cmaps/`;
const PDFJS_STANDARD_FONT_DATA_URL = `${PDFJS_ASSET_BASE_URL}standard_fonts/`;
const PDFJS_WASM_URL = `${PDFJS_ASSET_BASE_URL}wasm/`;

const createPdfDocumentLoadOptions = (viewerOptions: MobilePdfPagesProps["viewerOptions"]) => {
  return {
    enableXfa: viewerOptions?.enableXfa,
    useSystemFonts: viewerOptions?.useSystemFonts ?? true,
    cMapUrl: viewerOptions?.cMapUrl ?? PDFJS_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: viewerOptions?.standardFontDataUrl ?? PDFJS_STANDARD_FONT_DATA_URL,
    wasmUrl: PDFJS_WASM_URL,
  };
};

const loadPdfDocument = async (sourceUrl: string | null, viewerOptions: MobilePdfPagesProps["viewerOptions"]): Promise<PdfDocumentProxy> => {
  const normalizedSourceUrl = sourceUrl?.trim();
  if (!normalizedSourceUrl) throw new Error("表示できるPDFソースがありません。");
  return pdfjsLib.getDocument({ ...createPdfDocumentLoadOptions(viewerOptions), url: normalizedSourceUrl }).promise;
};

const getSafePageNumber = (pageNumber: number | null | undefined, pageCount: number): number => {
  const normalizedPageNumber = Math.floor(pageNumber ?? DEFAULT_PDF_PAGE);
  return Math.min(Math.max(normalizedPageNumber, DEFAULT_PDF_PAGE), Math.max(pageCount, DEFAULT_PDF_PAGE));
};

const getMobilePdfRenderWidth = (container: HTMLDivElement): number => {
  const availableWidth = container.clientWidth - MOBILE_PDF_HORIZONTAL_PADDING_PX;
  return Math.min(MOBILE_PDF_MAX_RENDER_WIDTH_PX, Math.max(MOBILE_PDF_MIN_RENDER_WIDTH_PX, availableWidth));
};

const createMobilePdfPageWrapper = (pageNumber: number): HTMLDivElement => {
  const wrapper = document.createElement("div");
  wrapper.dataset.pageNumber = String(pageNumber);
  wrapper.className = "mx-auto overflow-hidden rounded-[8px] border border-[#ded8cf] bg-white shadow-sm";
  return wrapper;
};

const renderMobilePdfPage = async (page: PdfPageProxy, renderWidth: number, wrapper: HTMLDivElement): Promise<void> => {
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = renderWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MOBILE_PDF_MAX_DEVICE_PIXEL_RATIO);
  const canvas = document.createElement("canvas");
  const canvasContext = canvas.getContext("2d");

  if (!canvasContext) {
    throw new Error("PDF描画用のCanvasを初期化できませんでした。");
  }

  canvas.width = Math.floor(viewport.width * pixelRatio);
  canvas.height = Math.floor(viewport.height * pixelRatio);
  canvas.style.display = "block";
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  wrapper.style.width = canvas.style.width;
  wrapper.appendChild(canvas);

  const transform = pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0];
  await page.render({ canvas, canvasContext, viewport, transform } as Parameters<PdfPageProxy["render"]>[0]).promise;
  page.cleanup();
};

const resolveVisiblePageNumber = (container: HTMLDivElement, pageRecords: MobilePdfPageRecord[]): number | null => {
  if (pageRecords.length === 0) return null;

  const containerRect = container.getBoundingClientRect();
  const anchorTop = containerRect.top + Math.min(container.clientHeight * 0.38, 280);
  let nearestPageNumber = pageRecords[0].pageNumber;
  let nearestDistance = Number.POSITIVE_INFINITY;

  pageRecords.forEach((record) => {
    const rect = record.wrapper.getBoundingClientRect();
    const visibleTop = Math.max(rect.top, containerRect.top);
    const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    if (visibleHeight <= 0) return;

    const distance = Math.abs(rect.top - anchorTop);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPageNumber = record.pageNumber;
    }
  });

  return nearestPageNumber;
};

const MobilePdfPages = ({ sourceUrl, className, viewerState = null, viewerOptions, onViewerStateChange }: MobilePdfPagesProps) => {
  const viewerEnableXfa = viewerOptions?.enableXfa;
  const viewerUseSystemFonts = viewerOptions?.useSystemFonts;
  const viewerCMapUrl = viewerOptions?.cMapUrl;
  const viewerStandardFontDataUrl = viewerOptions?.standardFontDataUrl;
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRecordsRef = useRef<MobilePdfPageRecord[]>([]);
  const viewerStateRef = useRef<PdfViewerState | null>(viewerState);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    viewerStateRef.current = viewerState;
  }, [viewerState]);

  const updateViewerState = useCallback((patch: PdfViewerState) => {
    const nextViewerState = { ...(viewerStateRef.current ?? {}), ...patch };
    viewerStateRef.current = nextViewerState;
    void onViewerStateChange?.(nextViewerState);
  }, [onViewerStateChange]);

  const updateCurrentPageFromScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentPage = resolveVisiblePageNumber(container, pageRecordsRef.current);
    if (!currentPage || viewerStateRef.current?.currentPage === currentPage) return;

    updateViewerState({ currentPage });
  }, [updateViewerState]);

  const scheduleCurrentPageUpdate = useCallback(() => {
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateCurrentPageFromScroll();
    });
  }, [updateCurrentPageFromScroll]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", scheduleCurrentPageUpdate, { passive: true });
    return () => container.removeEventListener("scroll", scheduleCurrentPageUpdate);
  }, [scheduleCurrentPageUpdate]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let resizeFrame: number | null = null;
    const requestLayoutRevision = () => {
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        setLayoutRevision((value) => value + 1);
      });
    };

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", requestLayoutRevision);
      return () => {
        window.removeEventListener("resize", requestLayoutRevision);
        if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      };
    }

    const resizeObserver = new ResizeObserver(requestLayoutRevision);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const pagesContainer = pagesContainerRef.current;
    if (!container || !pagesContainer) return;

    let isCancelled = false;
    let loadedPdfDocument: PdfDocumentProxy | null = null;

    pageRecordsRef.current = [];
    pagesContainer.replaceChildren();
    setLoadError(null);
    setIsLoading(true);

    void loadPdfDocument(sourceUrl, { enableXfa: viewerEnableXfa, useSystemFonts: viewerUseSystemFonts, cMapUrl: viewerCMapUrl, standardFontDataUrl: viewerStandardFontDataUrl }).then(async (nextPdfDocument) => {
      if (isCancelled) {
        void nextPdfDocument.destroy();
        return;
      }

      loadedPdfDocument = nextPdfDocument;
      const renderWidth = getMobilePdfRenderWidth(container);
      const pageRecords: MobilePdfPageRecord[] = [];

      for (let pageNumber = 1; pageNumber <= nextPdfDocument.numPages; pageNumber += 1) {
        if (isCancelled) return;

        const page = await nextPdfDocument.getPage(pageNumber);
        if (isCancelled) return;

        const wrapper = createMobilePdfPageWrapper(pageNumber);
        pagesContainer.appendChild(wrapper);
        pageRecords.push({ pageNumber, wrapper });
        await renderMobilePdfPage(page, renderWidth, wrapper);
      }

      if (isCancelled) return;

      pageRecordsRef.current = pageRecords;
      const initialPage = getSafePageNumber(viewerStateRef.current?.currentPage, nextPdfDocument.numPages);
      const initialWrapper = pageRecords[initialPage - 1]?.wrapper;
      if (initialWrapper) initialWrapper.scrollIntoView({ block: "start" });
      scheduleCurrentPageUpdate();
    }).catch((error: unknown) => {
      if (isCancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(message || "PDFファイルの読み込みに失敗しました。");
    }).finally(() => {
      if (!isCancelled) setIsLoading(false);
    });

    return () => {
      isCancelled = true;
      pageRecordsRef.current = [];
      pagesContainer.replaceChildren();
      if (loadedPdfDocument) void loadedPdfDocument.destroy();
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [layoutRevision, scheduleCurrentPageUpdate, sourceUrl, viewerCMapUrl, viewerEnableXfa, viewerStandardFontDataUrl, viewerUseSystemFonts]);

  return (
    <div className={cn("flex h-full min-h-[100dvh] min-w-0 bg-[var(--carvepanel-surface)] text-[#2f2f2f]", className)}>
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-auto overscroll-contain bg-[var(--carvepanel-surface)] px-3 py-4 [-webkit-overflow-scrolling:touch]">
          <div ref={pagesContainerRef} className="flex min-h-full flex-col gap-4 pb-8" />
          {isLoading ? <div className="absolute inset-0 flex items-center justify-center bg-[var(--carvepanel-surface)] text-[13px] text-[#6d6d6d]">PDFを読み込み中...</div> : null}
          {!isLoading && loadError ? <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[13px] leading-6 text-[#4a4640]"><div className="max-w-md rounded-[14px] border border-[#ded8cf] bg-white px-5 py-4 shadow-sm">{loadError}</div></div> : null}
        </div>
      </main>
    </div>
  );
};

export { MobilePdfPages };
