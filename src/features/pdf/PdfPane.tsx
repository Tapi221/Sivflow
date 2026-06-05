import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PdfViewerState } from "@/types";
import type { BlobUrl } from "@/types/core/branded";
import { cn } from "@/lib/utils";
import { getDocumentBlob } from "@/services/documentFileStore";
import { resolvePdfRenderBackingStore } from "./pdfRenderQuality";

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
};

type PdfTextLayerProps = {
  pageNumber: number;
  pdfDocument: PdfDocumentProxy;
  scale: number;
};

type PdfDocumentPageProps = PdfCanvasPageProps & {
  currentPage: number;
  registerPageElement: (pageNumber: number, element: HTMLDivElement | null) => void;
  shouldRender: boolean;
};

type PdfDocumentPageSlotProps = PdfDocumentPageProps;

type PdfRenderTask = {
  cancel: () => void;
  promise: Promise<unknown>;
};

type ActivePdfCanvasRender = {
  cancel: () => void;
  done: Promise<void>;
};

type PdfSourceDescriptor = {
  localFileId: string;
  userId?: string;
  persistedUrl: string | null;
};

type LoadedPdfSource = { kind: "data"; data: Uint8Array } | { kind: "url"; url: string };

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DEFAULT_PDF_PAGE = 1;
const DEFAULT_PDF_SCALE = 1;
const MIN_PDF_SCALE = 0.5;
const MAX_PDF_SCALE = 3;
const PDF_SCALE_STEP = 0.15;
const PDF_PAGE_RENDER_RADIUS = 3;
const PDF_PAGE_PLACEHOLDER_HEIGHT = 920;
const PDF_HISTORY_LIMIT = 80;
const PDF_MARK_KEY_PATTERN = /^[a-z0-9]$/i;
const PDF_CANVAS_BACKGROUND = "#ffffff";
const PDF_MIN_RENDER_DEVICE_PIXEL_RATIO = 2;
const PDF_MAX_RENDER_DEVICE_PIXEL_RATIO = 3;
const PDF_MAX_RENDER_CANVAS_PIXELS = 16_777_216;
const PDFJS_ASSET_BASE_URL = "/pdfjs/";
const PDFJS_CMAP_URL = `${PDFJS_ASSET_BASE_URL}cmaps/`;
const PDFJS_STANDARD_FONT_DATA_URL = `${PDFJS_ASSET_BASE_URL}standard_fonts/`;
const PDFJS_WASM_URL = `${PDFJS_ASSET_BASE_URL}wasm/`;
const activePdfCanvasRenders = new WeakMap<HTMLCanvasElement, ActivePdfCanvasRender>();

const resolvePersistedUrl = (doc: PdfPaneDoc): string | null => {
  return doc.blobUrl ?? doc.localUrl ?? doc.downloadUrl ?? doc.googleDriveWebContentLink ?? doc.remoteUrl ?? doc.googleDriveWebViewLink ?? null;
};

const resolveDocumentFileId = (doc: PdfPaneDoc): string => {
  return doc.localFileId?.trim() || doc.id;
};

const resolvePdfSourceDescriptor = (doc: PdfPaneDoc): PdfSourceDescriptor => {
  return {
    localFileId: resolveDocumentFileId(doc),
    userId: doc.userId,
    persistedUrl: resolvePersistedUrl(doc),
  };
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

const isPdfRenderCancellationError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();
  return name.includes("renderingcancelled") || message.includes("cancel");
};

const cancelPdfRenderTask = (task: { cancel: () => void }): void => {
  try {
    task.cancel();
  } catch {
    // PDF.js can throw when a render task has already settled.
  }
};

const waitForPreviousCanvasRender = async (canvas: HTMLCanvasElement): Promise<void> => {
  const previousRender = activePdfCanvasRenders.get(canvas);
  if (!previousRender) return;
  cancelPdfRenderTask(previousRender);
  await previousRender.done.catch(() => undefined);
};

const getTextContentItemText = (item: unknown): string => {
  const textItem = item as PdfTextItem;
  return typeof textItem.str === "string" ? textItem.str : "";
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

const loadLocalPdfData = async (source: PdfSourceDescriptor): Promise<Uint8Array | null> => {
  const blob = await getDocumentBlob(source.localFileId, { userId: source.userId });
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
};

const loadPdfSource = async (source: PdfSourceDescriptor): Promise<LoadedPdfSource> => {
  let localError: unknown = null;

  try {
    const data = await loadLocalPdfData(source);
    if (data) return { kind: "data", data };
  } catch (error) {
    localError = error;
  }

  if (source.persistedUrl) return { kind: "url", url: source.persistedUrl };
  if (localError instanceof Error) throw localError;
  throw new Error("表示できるPDFソースがありません。");
};

const loadPdfDocument = async (source: LoadedPdfSource, viewerOptions: PdfPaneProps["viewerOptions"]): Promise<PdfDocumentProxy> => {
  const options = createPdfDocumentLoadOptions(viewerOptions);
  return source.kind === "data" ? pdfjsLib.getDocument({ ...options, data: source.data }).promise : pdfjsLib.getDocument({ ...options, url: source.url }).promise;
};

const PdfCanvasPage = ({ pageNumber, pdfDocument, scale, className }: PdfCanvasPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: PdfRenderTask | null = null;

    const renderPage = async () => {
      setRenderError(null);
      const canvas = canvasRef.current;
      if (!canvas) return;
      await waitForPreviousCanvasRender(canvas);
      if (isCancelled) return;
      const page = await pdfDocument.getPage(pageNumber);
      if (isCancelled) return;
      const viewport = page.getViewport({ scale });
      const backingStore = resolvePdfRenderBackingStore({
        viewportWidthPx: viewport.width,
        viewportHeightPx: viewport.height,
        devicePixelRatio: window.devicePixelRatio,
        minimumDevicePixelRatio: PDF_MIN_RENDER_DEVICE_PIXEL_RATIO,
        maximumDevicePixelRatio: PDF_MAX_RENDER_DEVICE_PIXEL_RATIO,
        maximumCanvasPixels: PDF_MAX_RENDER_CANVAS_PIXELS,
      });
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("PDF描画用のCanvas contextを取得できませんでした。");
      canvas.width = backingStore.canvasWidthPx;
      canvas.height = backingStore.canvasHeightPx;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = PDF_CANVAS_BACKGROUND;
      context.fillRect(0, 0, canvas.width, canvas.height);
      renderTask = page.render({ canvas, canvasContext: context, viewport, transform: backingStore.scaleX === 1 && backingStore.scaleY === 1 ? undefined : [backingStore.scaleX, 0, 0, backingStore.scaleY, 0, 0], background: PDF_CANVAS_BACKGROUND });
      const done = renderTask.promise.then(() => undefined).catch((error: unknown) => {
        if (!isPdfRenderCancellationError(error)) throw error;
      }).finally(() => {
        if (activePdfCanvasRenders.get(canvas)?.done === done) {
          activePdfCanvasRenders.delete(canvas);
        }
      });
      activePdfCanvasRenders.set(canvas, {
        cancel: () => cancelPdfRenderTask(renderTask!),
        done,
      });
      await done;
    };

    void renderPage().catch((error: unknown) => {
      if (isCancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setRenderError(message || "PDFページの描画に失敗しました。");
      console.error("[PdfPane] page render failed", error);
    });

    return () => {
      isCancelled = true;
      if (renderTask) cancelPdfRenderTask(renderTask);
    };
  }, [pageNumber, pdfDocument, scale]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className={cn("block bg-white", className)} />
      {renderError ? <div className="absolute inset-0 flex items-center justify-center bg-white/95 p-6 text-center text-[12px] leading-5 text-[#7a2f2f]"><div className="max-w-sm rounded-[12px] border border-[#ecd1d1] bg-white px-4 py-3 shadow-sm">{renderError}</div></div> : null}
    </div>
  );
};

const PdfTextLayer = ({ pageNumber, pdfDocument, scale }: PdfTextLayerProps) => {
  const [textSpans, setTextSpans] = useState<PdfTextSpan[]>([]);

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
        };
      }).filter((span) => span.text.length > 0));
    };

    void loadTextLayer().catch((error: unknown) => {
      if (!isCancelled) console.error("[PdfPane] text layer failed", error);
    });

    return () => {
      isCancelled = true;
    };
  }, [pageNumber, pdfDocument, scale]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-transparent selection:bg-[#d5b14b]/35 selection:text-transparent" aria-hidden="true">
      {textSpans.map((span) => <span key={span.id} className="pointer-events-auto absolute origin-left whitespace-pre" style={span.style}>{span.text}</span>)}
    </div>
  );
};

const PdfDocumentPage = ({ pageNumber, pdfDocument, scale, currentPage, registerPageElement, shouldRender }: PdfDocumentPageProps) => {
  const isCurrent = pageNumber === currentPage;

  return (
    <div ref={(element) => registerPageElement(pageNumber, element)} data-pdf-page-number={pageNumber} className={cn("relative overflow-hidden rounded-[12px] border bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]", isCurrent ? "border-[#cfc9bf]" : "border-[#e4ded4]")} style={shouldRender ? undefined : { height: Math.round(PDF_PAGE_PLACEHOLDER_HEIGHT * scale) }}>
      {shouldRender ? <div className="relative"><PdfCanvasPage pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} /><PdfTextLayer pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} /></div> : null}
    </div>
  );
};

const PdfDocumentPageSlot = (props: PdfDocumentPageSlotProps) => {
  return <PdfDocumentPage {...props} />;
};

const PdfPane = ({ doc, className, viewerOptions, onDocumentUpdate }: PdfPaneProps) => {
  const sourceDescriptor = useMemo(() => resolvePdfSourceDescriptor(doc), [doc.blobUrl, doc.downloadUrl, doc.googleDriveWebContentLink, doc.googleDriveWebViewLink, doc.id, doc.localFileId, doc.localUrl, doc.remoteUrl, doc.userId]);
  const viewerEnableXfa = viewerOptions?.enableXfa;
  const viewerUseSystemFonts = viewerOptions?.useSystemFonts;
  const viewerCMapUrl = viewerOptions?.cMapUrl;
  const viewerStandardFontDataUrl = viewerOptions?.standardFontDataUrl;
  const viewerState = doc.viewerState ?? null;
  const scale = clampPdfScale(viewerState?.scale ?? DEFAULT_PDF_SCALE);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageCount = pdfDocument?.numPages ?? 0;
  const currentPage = getSafePageNumber(viewerState?.currentPage, pageCount);
  const bookmarkPages = viewerState?.bookmarkPages ?? [];
  const markPages = viewerState?.markPages ?? {};
  const historyBackPages = viewerState?.historyBackPages ?? [];
  const historyForwardPages = viewerState?.historyForwardPages ?? [];
  const pageNumbers = useMemo(() => getPageNumbers(pageCount), [pageCount]);

  useEffect(() => {
    let isCancelled = false;
    let loadedPdfDocument: PdfDocumentProxy | null = null;

    setPdfDocument(null);
    setLoadError(null);
    setIsLoading(true);

    const load = async () => {
      const nextSource = await loadPdfSource(sourceDescriptor);
      if (isCancelled) return;
      const nextPdfDocument = await loadPdfDocument(nextSource, { enableXfa: viewerEnableXfa, useSystemFonts: viewerUseSystemFonts, cMapUrl: viewerCMapUrl, standardFontDataUrl: viewerStandardFontDataUrl });
      if (isCancelled) {
        void nextPdfDocument.destroy();
        return;
      }
      loadedPdfDocument = nextPdfDocument;
      setPdfDocument(nextPdfDocument);
    };

    void load().catch((error: unknown) => {
      if (isCancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(message || "PDFファイルの読み込みに失敗しました。");
    }).finally(() => {
      if (!isCancelled) setIsLoading(false);
    });

    return () => {
      isCancelled = true;
      if (loadedPdfDocument) void loadedPdfDocument.destroy();
    };
  }, [sourceDescriptor, viewerCMapUrl, viewerEnableXfa, viewerStandardFontDataUrl, viewerUseSystemFonts]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandlePdfKeyboardEvent(event)) return;
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
    <div className={cn("flex h-full min-h-0 min-w-0 bg-[#ffffff] text-[#2f2f2f]", className)}>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-[#ffffff] p-5">
          {isLoading ? <div className="flex h-full items-center justify-center text-[13px] text-[#6d6d6d]">PDFを読み込み中...</div> : null}
          {!isLoading && loadError ? <div className="flex h-full items-center justify-center p-6 text-center text-[13px] leading-6 text-[#4a4640]"><div className="max-w-md rounded-[14px] border border-[#ded8cf] bg-white px-5 py-4 shadow-sm">{loadError}</div></div> : null}
          {!isLoading && !loadError && pdfDocument ? <div className="flex min-w-max flex-col items-center gap-5">{pageNumbers.map((pageNumber) => <PdfDocumentPageSlot key={pageNumber} pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} currentPage={currentPage} registerPageElement={registerPageElement} shouldRender={shouldRenderNearbyPage(pageNumber, currentPage, PDF_PAGE_RENDER_RADIUS)} />)}</div> : null}
          {!isLoading && !loadError && !pdfDocument ? <div className="flex h-full items-center justify-center text-[13px] text-[#6d6d6d]">表示できるPDFソースがありません。</div> : null}
        </div>
      </main>
    </div>
  );
};

export { PdfPane };
