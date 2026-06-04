import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
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

type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;

type PdfOutlineItem = {
  title?: string;
  dest?: string | unknown[] | null;
  items?: PdfOutlineItem[];
};

type PdfOutlineEntry = {
  id: string;
  title: string;
  level: number;
  pageNumber: number | null;
};

type PdfSidePanelTabDefinition = {
  id: NonNullable<PdfViewerState["sidePanelTab"]>;
  label: string;
};

type PdfCanvasPageProps = {
  pageNumber: number;
  pdfDocument: PdfDocumentProxy;
  scale: number;
  className?: string;
};

type PdfDocumentPageProps = PdfCanvasPageProps & {
  isCurrent: boolean;
  registerPageElement: (pageNumber: number, element: HTMLDivElement | null) => void;
};

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PDF_SIDE_PANEL_TABS: readonly PdfSidePanelTabDefinition[] = [
  { id: "outline", label: "目次" },
  { id: "bookmarks", label: "ブックマーク" },
  { id: "highlights", label: "ハイライト" },
  { id: "thumbnails", label: "サムネイル" },
];
const DEFAULT_PDF_PAGE = 1;
const DEFAULT_PDF_SCALE = 1;
const MIN_PDF_SCALE = 0.5;
const MAX_PDF_SCALE = 3;
const PDF_SCALE_STEP = 0.15;
const PDF_THUMBNAIL_SCALE = 0.18;
const OUTLINE_EMPTY_MESSAGE = "このPDFには目次情報がありません。";
const BOOKMARK_EMPTY_MESSAGE = "ブックマークはまだありません。";
const HIGHLIGHTS_EMPTY_MESSAGE = "ハイライトはまだありません。";

const resolveDocumentTitle = (doc: PdfPaneDoc): string => {
  return doc.title?.trim() || doc.fileName?.trim() || doc.name?.trim() || "PDF";
};

const resolvePersistedUrl = (doc: PdfPaneDoc): string | null => {
  return doc.blobUrl ?? doc.localUrl ?? doc.downloadUrl ?? doc.googleDriveWebContentLink ?? doc.remoteUrl ?? doc.googleDriveWebViewLink ?? null;
};

const resolveDocumentFileId = (doc: PdfPaneDoc): string => {
  return doc.localFileId?.trim() || doc.id;
};

const clampPdfScale = (scale: number): number => {
  if (!Number.isFinite(scale)) return DEFAULT_PDF_SCALE;
  return Math.min(MAX_PDF_SCALE, Math.max(MIN_PDF_SCALE, scale));
};

const getSafePageNumber = (pageNumber: number | null | undefined, pageCount: number): number => {
  const normalizedPageNumber = Math.floor(pageNumber ?? DEFAULT_PDF_PAGE);
  return Math.min(Math.max(normalizedPageNumber, DEFAULT_PDF_PAGE), Math.max(pageCount, DEFAULT_PDF_PAGE));
};

const loadLocalPdfObjectUrl = async (doc: PdfPaneDoc): Promise<string> => {
  const blob = await getDocumentBlob(resolveDocumentFileId(doc), { userId: doc.userId });
  if (!blob) throw new Error("PDFファイル本体がローカルストアに見つかりません。");
  return URL.createObjectURL(blob);
};

const loadPdfDocument = async (sourceUrl: string, viewerOptions: PdfPaneProps["viewerOptions"]): Promise<PdfDocumentProxy> => {
  return pdfjsLib.getDocument({ url: sourceUrl, enableXfa: viewerOptions?.enableXfa, useSystemFonts: viewerOptions?.useSystemFonts ?? true, cMapUrl: viewerOptions?.cMapUrl, standardFontDataUrl: viewerOptions?.standardFontDataUrl }).promise;
};

const resolveOutlinePageNumber = async (pdfDocument: PdfDocumentProxy, item: PdfOutlineItem): Promise<number | null> => {
  if (!item.dest) return null;
  const destination = typeof item.dest === "string" ? await pdfDocument.getDestination(item.dest) : item.dest;
  const pageRef = Array.isArray(destination) ? destination[0] : null;
  if (!pageRef) return null;
  const pageIndex = await pdfDocument.getPageIndex(pageRef);
  return pageIndex + 1;
};

const flattenOutlineItems = async (pdfDocument: PdfDocumentProxy, items: readonly PdfOutlineItem[], level = 0, prefix = "outline"): Promise<PdfOutlineEntry[]> => {
  const entries = await Promise.all(items.map(async (item, index) => {
    const id = `${prefix}-${index}`;
    const pageNumber = await resolveOutlinePageNumber(pdfDocument, item).catch(() => null);
    const title = item.title?.trim() || "無題";
    const childEntries = item.items?.length ? await flattenOutlineItems(pdfDocument, item.items, level + 1, id) : [];
    return [{ id, title, level, pageNumber }, ...childEntries];
  }));
  return entries.flat();
};

const getPageNumbers = (pageCount: number): number[] => {
  return Array.from({ length: pageCount }, (_, index) => index + 1);
};

const PdfCanvasPage = ({ pageNumber, pdfDocument, scale, className }: PdfCanvasPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

    const renderPage = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const page: PdfPageProxy = await pdfDocument.getPage(pageNumber);
      if (isCancelled) return;
      const viewport = page.getViewport({ scale });
      const devicePixelRatio = window.devicePixelRatio || 1;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.floor(viewport.width * devicePixelRatio);
      canvas.height = Math.floor(viewport.height * devicePixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise.catch((error: unknown) => {
        if (!isCancelled) throw error;
      });
    };

    void renderPage().catch((error: unknown) => {
      if (!isCancelled) console.error("[PdfPane] page render failed", error);
    });

    return () => {
      isCancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdfDocument, scale]);

  return <canvas ref={canvasRef} className={className} />;
};

const PdfDocumentPage = ({ pageNumber, pdfDocument, scale, isCurrent, registerPageElement }: PdfDocumentPageProps) => {
  return (
    <div ref={(element) => registerPageElement(pageNumber, element)} data-pdf-page-number={pageNumber} className={cn("rounded-[12px] border bg-white p-3 shadow-[0_18px_48px_rgba(0,0,0,0.28)]", isCurrent ? "border-[#d8d3c9]" : "border-black/20")}>
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#6f6a5f]">
        <span>Page {pageNumber}</span>
      </div>
      <PdfCanvasPage pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} />
    </div>
  );
};

const PdfThumbnailCanvas = ({ pageNumber, pdfDocument, scale, className }: PdfCanvasPageProps) => {
  return <PdfCanvasPage pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} className={className} />;
};

const PdfPane = ({ doc, className, viewerOptions, onDocumentUpdate }: PdfPaneProps) => {
  const documentTitle = useMemo(() => resolveDocumentTitle(doc), [doc]);
  const persistedUrl = useMemo(() => resolvePersistedUrl(doc), [doc]);
  const viewerState = doc.viewerState ?? null;
  const activeSidePanelTab = viewerState?.sidePanelTab ?? "outline";
  const scale = clampPdfScale(viewerState?.scale ?? DEFAULT_PDF_SCALE);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentProxy | null>(null);
  const [outlineEntries, setOutlineEntries] = useState<PdfOutlineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageCount = pdfDocument?.numPages ?? 0;
  const currentPage = getSafePageNumber(viewerState?.currentPage, pageCount);
  const bookmarkPages = viewerState?.bookmarkPages ?? [];
  const pageNumbers = useMemo(() => getPageNumbers(pageCount), [pageCount]);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    setSourceUrl(null);
    setPdfDocument(null);
    setOutlineEntries([]);
    setLoadError(null);
    setIsLoading(true);

    const load = async () => {
      const nextSourceUrl = persistedUrl ?? await loadLocalPdfObjectUrl(doc);
      if (!persistedUrl) objectUrl = nextSourceUrl;
      if (isCancelled) return;
      setSourceUrl(nextSourceUrl);
      const nextPdfDocument = await loadPdfDocument(nextSourceUrl, viewerOptions);
      if (isCancelled) return;
      setPdfDocument(nextPdfDocument);
      const outline = await nextPdfDocument.getOutline() as PdfOutlineItem[] | null;
      if (isCancelled) return;
      setOutlineEntries(outline ? await flattenOutlineItems(nextPdfDocument, outline) : []);
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
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc, persistedUrl, viewerOptions]);

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

  const registerPageElement = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    if (element) pageElementsRef.current.set(pageNumber, element);
    else pageElementsRef.current.delete(pageNumber);
  }, []);

  const updateViewerState = useCallback((patch: PdfViewerState) => {
    void onDocumentUpdate?.({ viewerState: { ...viewerState, ...patch } });
  }, [onDocumentUpdate, viewerState]);

  const scrollToPage = useCallback((pageNumber: number) => {
    const safePageNumber = getSafePageNumber(pageNumber, pageCount);
    pageElementsRef.current.get(safePageNumber)?.scrollIntoView({ behavior: "smooth", block: "start" });
    updateViewerState({ currentPage: safePageNumber });
  }, [pageCount, updateViewerState]);

  const handleSidePanelTabSelect = (sidePanelTab: NonNullable<PdfViewerState["sidePanelTab"]>) => {
    updateViewerState({ sidePanelTab });
  };

  const handleZoomIn = () => {
    updateViewerState({ scale: clampPdfScale(scale + PDF_SCALE_STEP), fitMode: "manual" });
  };

  const handleZoomOut = () => {
    updateViewerState({ scale: clampPdfScale(scale - PDF_SCALE_STEP), fitMode: "manual" });
  };

  const handleToggleBookmark = () => {
    const nextBookmarkPages = bookmarkPages.includes(currentPage) ? bookmarkPages.filter((pageNumber) => pageNumber !== currentPage) : [...bookmarkPages, currentPage].sort((a, b) => a - b);
    updateViewerState({ bookmarkPages: nextBookmarkPages });
  };

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 bg-[#151515] text-[#f4f1ea]", className)}>
      <aside className="flex w-[292px] shrink-0 flex-col border-r border-white/10 bg-[#1f1f1f]">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9f9b93]">PDF</div>
          <div title={documentTitle} className="mt-1 truncate text-[14px] font-semibold text-[#f4f1ea]">{documentTitle}</div>
          {pageCount > 0 ? <div className="mt-1 text-[11px] text-[#9f9b93]">{currentPage} / {pageCount}</div> : null}
        </div>
        <div className="flex gap-1 border-b border-white/10 p-2">
          {PDF_SIDE_PANEL_TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => handleSidePanelTabSelect(tab.id)} className={cn("min-w-0 flex-1 rounded-[7px] px-2 py-1.5 text-[11px] font-semibold text-[#aaa59b] transition-colors hover:bg-white/10 hover:text-[#f4f1ea]", activeSidePanelTab === tab.id && "bg-white/12 text-[#f4f1ea]")}>{tab.label}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-[12px] leading-5 text-[#aaa59b]">
          {activeSidePanelTab === "outline" && outlineEntries.length === 0 ? <p className="px-1">{OUTLINE_EMPTY_MESSAGE}</p> : null}
          {activeSidePanelTab === "outline" ? outlineEntries.map((entry) => <button key={entry.id} type="button" disabled={!entry.pageNumber} onClick={() => entry.pageNumber ? scrollToPage(entry.pageNumber) : undefined} className="block w-full rounded-[7px] px-2 py-1.5 text-left text-[#d8d3c9] transition-colors hover:bg-white/10 disabled:text-[#77736b] disabled:hover:bg-transparent" style={{ paddingLeft: 8 + entry.level * 14 }}><span className="block truncate">{entry.title}</span>{entry.pageNumber ? <span className="text-[10px] text-[#88837a]">Page {entry.pageNumber}</span> : null}</button>) : null}
          {activeSidePanelTab === "bookmarks" && bookmarkPages.length === 0 ? <p className="px-1">{BOOKMARK_EMPTY_MESSAGE}</p> : null}
          {activeSidePanelTab === "bookmarks" ? bookmarkPages.map((pageNumber) => <button key={pageNumber} type="button" onClick={() => scrollToPage(pageNumber)} className="block w-full rounded-[7px] px-2 py-1.5 text-left text-[#d8d3c9] transition-colors hover:bg-white/10">Page {pageNumber}</button>) : null}
          {activeSidePanelTab === "highlights" ? <p className="px-1">{HIGHLIGHTS_EMPTY_MESSAGE}</p> : null}
          {activeSidePanelTab === "thumbnails" && pdfDocument ? <div className="grid grid-cols-2 gap-2">{pageNumbers.map((pageNumber) => <button key={pageNumber} type="button" onClick={() => scrollToPage(pageNumber)} className={cn("rounded-[8px] border p-1 text-left transition-colors hover:bg-white/10", pageNumber === currentPage ? "border-[#d8d3c9]" : "border-white/10")}><PdfThumbnailCanvas pageNumber={pageNumber} pdfDocument={pdfDocument} scale={PDF_THUMBNAIL_SCALE} className="mx-auto max-w-full bg-white" /><span className="mt-1 block text-center text-[10px] text-[#aaa59b]">{pageNumber}</span></button>)}</div> : null}
        </div>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#202020] px-3">
          <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#d8d3c9]">{documentTitle}</div>
          {pageCount > 0 ? <button type="button" onClick={handleToggleBookmark} className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">{bookmarkPages.includes(currentPage) ? "ブックマーク解除" : "ブックマーク"}</button> : null}
          <button type="button" onClick={handleZoomOut} className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">−</button>
          <div className="w-12 text-center text-[12px] font-semibold text-[#d8d3c9]">{Math.round(scale * 100)}%</div>
          <button type="button" onClick={handleZoomIn} className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">＋</button>
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">別ウィンドウで開く</a> : null}
        </div>
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-[#2b2b2b] p-5">
          {isLoading ? <div className="flex h-full items-center justify-center text-[13px] text-[#bdb8ad]">PDFを読み込み中...</div> : null}
          {!isLoading && loadError ? <div className="flex h-full items-center justify-center p-6 text-center text-[13px] leading-6 text-[#d8d3c9]"><div className="max-w-md rounded-[14px] border border-white/10 bg-[#1f1f1f] px-5 py-4">{loadError}</div></div> : null}
          {!isLoading && !loadError && pdfDocument ? <div className="flex min-w-max flex-col items-center gap-5">{pageNumbers.map((pageNumber) => <PdfDocumentPage key={pageNumber} pageNumber={pageNumber} pdfDocument={pdfDocument} scale={scale} isCurrent={pageNumber === currentPage} registerPageElement={registerPageElement} />)}</div> : null}
          {!isLoading && !loadError && !pdfDocument ? <div className="flex h-full items-center justify-center text-[13px] text-[#bdb8ad]">表示できるPDFソースがありません。</div> : null}
        </div>
      </main>
    </div>
  );
};

export { PdfPane };
