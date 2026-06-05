import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";
import "pdfjs-dist/web/pdf_viewer.css";
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

type PdfSourceDescriptor = {
  localFileId: string;
  userId?: string;
  persistedUrl: string | null;
};

type LoadedPdfSource = { kind: "data"; data: Uint8Array } | { kind: "url"; url: string };

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

const PdfPane = ({ doc, className, viewerOptions, onDocumentUpdate }: PdfPaneProps) => {
  const sourceDescriptor = useMemo(() => resolvePdfSourceDescriptor(doc), [doc.blobUrl, doc.downloadUrl, doc.googleDriveWebContentLink, doc.googleDriveWebViewLink, doc.id, doc.localFileId, doc.localUrl, doc.remoteUrl, doc.userId]);
  const viewerEnableXfa = viewerOptions?.enableXfa;
  const viewerUseSystemFonts = viewerOptions?.useSystemFonts;
  const viewerCMapUrl = viewerOptions?.cMapUrl;
  const viewerStandardFontDataUrl = viewerOptions?.standardFontDataUrl;
  const viewerState = doc.viewerState ?? null;
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
    void onDocumentUpdate?.({ viewerState: nextViewerState });
  }, [onDocumentUpdate]);

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

    const load = async () => {
      const nextSource = await loadPdfSource(sourceDescriptor);
      if (isCancelled) return;
      const nextPdfDocument = await loadPdfDocument(nextSource, { enableXfa: viewerEnableXfa, useSystemFonts: viewerUseSystemFonts, cMapUrl: viewerCMapUrl, standardFontDataUrl: viewerStandardFontDataUrl });
      if (isCancelled) {
        void nextPdfDocument.destroy();
        return;
      }

      loadedPdfDocument = nextPdfDocument;
      pdfViewer.setDocument(nextPdfDocument);
      linkService.setDocument(nextPdfDocument, null);
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
      removeEventListeners.forEach((removeEventListener) => removeEventListener());
      releasePdfViewerDocument(pdfViewer, linkService, loadedPdfDocument);
      viewerElement.replaceChildren();
      if (pdfViewerRef.current === pdfViewer) pdfViewerRef.current = null;
    };
  }, [sourceDescriptor, updateViewerState, viewerCMapUrl, viewerEnableXfa, viewerStandardFontDataUrl, viewerUseSystemFonts]);

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
    <div className={cn("flex h-full min-h-0 min-w-0 bg-[#f6f3ee] text-[#2f2f2f]", className)}>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div ref={scrollContainerRef} className="relative min-h-0 flex-1 overflow-auto bg-[#f6f3ee] px-4 py-5">
          <div ref={pdfViewerElementRef} className="pdfViewer" />
          {isLoading ? <div className="absolute inset-0 flex items-center justify-center bg-[#f6f3ee]/80 text-[13px] text-[#6d6d6d]">PDFを読み込み中...</div> : null}
          {!isLoading && loadError ? <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[13px] leading-6 text-[#4a4640]"><div className="max-w-md rounded-[14px] border border-[#ded8cf] bg-white px-5 py-4 shadow-sm">{loadError}</div></div> : null}
        </div>
      </main>
    </div>
  );
};

export { PdfPane };
