import React from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useAuthSession } from "@/contexts/AuthContext";
import { resolveCardImageUrl } from "@/services/cardImageResolver";
import { getOrCreateImageBlobUrl, removeImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { deleteImageBlob, putImageBlob } from "@/services/imageFileStore";
import { getLocalDb } from "@/services/localDB";
import { persistentQueue } from "@/services/PersistentOfflineQueue";
import { FileText, Minus, Plus, Upload, X } from "@/ui/icons";
import { cn } from "@/lib/utils";
import type { AssetRecord, UploadedPdf } from "@/types/domain/assets";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PdfBlockContentProps =
  | Readonly<{
    mode: "view";
    pdf?: UploadedPdf | null;
    pageNumber?: number;
    onPageNumberChange?: (pageNumber: number) => void;
    displayMode?: "fixed" | "fluid";
    zoom?: number;
  }>
  | Readonly<{
    mode: "edit";
    pdf?: UploadedPdf | null;
    pageNumber?: number;
    onChange: (pdf: UploadedPdf | null) => void;
    onPageNumberChange?: (pageNumber: number) => void;
    displayMode?: "fixed" | "fluid";
    zoom?: number;
  }>;

type ResolvedPdf = UploadedPdf & {
  url: string | null;
  status: "pending" | "uploading" | "ready" | "failed";
};

type PdfCanvasViewerProps = Readonly<{
  pdf: ResolvedPdf;
  pageNumber: number;
  onPageNumberChange?: (pageNumber: number) => void;
  displayMode: "fixed" | "fluid";
  zoom: number;
}>;

type PdfPageCanvasProps = Readonly<{
  document: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
}>;

type LocalAssetRecordLike = {
  localBlobId?: string | null;
  localFileId?: string | null;
};

const PDF_DROPZONE_CLASS_NAME = "rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-slate-500 transition hover:border-slate-300 hover:bg-slate-50";
const PDF_VIEWER_MAX_WIDTH_PX = 780;
const PDF_VIEWER_FIXED_HEIGHT_PX = 520;
const PDF_VIEWER_FLUID_HEIGHT_PX = 640;
const PDF_PAGE_FALLBACK_WIDTH_PX = 680;
const PDF_MIN_ZOOM = 0.6;
const PDF_MAX_ZOOM = 2.4;
const PDF_ZOOM_STEP = 0.15;

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const clampPageNumber = (value: number, pageCount: number): number => {
  return clamp(Math.round(value || 1), 1, Math.max(1, pageCount));
};

const formatBytes = (size: number | null | undefined): string => {
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getLocalBlobIdFromRecord = (record: LocalAssetRecordLike | null | undefined): string | null => {
  if (isNonEmptyString(record?.localBlobId)) return record.localBlobId.trim();
  if (isNonEmptyString(record?.localFileId)) return record.localFileId.trim();
  return null;
};

const getPdfAssetKey = (pdf: UploadedPdf): string | null => {
  if (isNonEmptyString(pdf.assetId)) return pdf.assetId.trim();
  if (isNonEmptyString(pdf.id)) return pdf.id.trim();
  if (isNonEmptyString(pdf.localFileId)) return pdf.localFileId.trim();
  return null;
};

const isPdfFile = (file: File): boolean => {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
};

const createPdfRemoteKey = (userId: string, assetId: string): string => {
  return `users/${userId}/assets/${assetId}`;
};

const resolvePdf = async (pdf: UploadedPdf, userId: string | null): Promise<ResolvedPdf> => {
  const resolved = await resolveCardImageUrl(pdf, userId ?? undefined);
  return {
    ...pdf,
    assetId: resolved.assetId || pdf.assetId,
    url: resolved.url,
    status: resolved.status,
  };
};

const PdfPageCanvas = ({ document, pageNumber, zoom }: PdfPageCanvasProps) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(PDF_PAGE_FALLBACK_WIDTH_PX);
  const [isRendering, setIsRendering] = React.useState(false);
  const [renderError, setRenderError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const width = element.getBoundingClientRect().width;
      if (Number.isFinite(width) && width > 0) {
        setContainerWidth(Math.max(240, Math.min(PDF_VIEWER_MAX_WIDTH_PX, width)));
      }
    };
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    updateWidth();

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let renderTask: { promise: Promise<unknown>; cancel: () => void } | null = null;

    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setIsRendering(true);
      setRenderError(null);

      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const baseScale = containerWidth / Math.max(1, baseViewport.width);
        const viewport = page.getViewport({ scale: baseScale * zoom });
        const outputScale = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas context is unavailable");

        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (error) {
        if (!cancelled) {
          setRenderError(error instanceof Error ? error.message : "PDFページを描画できません");
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [containerWidth, document, pageNumber, zoom]);

  return (
    <div ref={containerRef} className="relative flex w-full justify-center overflow-auto bg-neutral-950/5 px-2 py-3">
      {isRendering ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">Rendering</div>
      ) : null}
      {renderError ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{renderError}</div>
      ) : (
        <canvas ref={canvasRef} className="max-w-full rounded-sm bg-white shadow-sm" aria-label={`PDF page ${pageNumber}`} />
      )}
    </div>
  );
};

const PdfCanvasViewer = ({ pdf, pageNumber, onPageNumberChange, displayMode, zoom }: PdfCanvasViewerProps) => {
  const [document, setDocument] = React.useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [localZoom, setLocalZoom] = React.useState(1);
  const viewerHeight = displayMode === "fluid" ? PDF_VIEWER_FLUID_HEIGHT_PX : PDF_VIEWER_FIXED_HEIGHT_PX;
  const effectiveZoom = clamp(localZoom * zoom, PDF_MIN_ZOOM, PDF_MAX_ZOOM);
  const pageCount = document?.numPages ?? 1;
  const safePageNumber = clampPageNumber(pageNumber, pageCount);

  React.useEffect(() => {
    if (!pdf.url) return;

    let cancelled = false;
    const loadingTask = getDocument({ url: pdf.url });
    setIsLoading(true);
    setLoadError(null);
    setDocument(null);

    void loadingTask.promise
      .then((nextDocument) => {
        if (cancelled) return;
        setDocument(nextDocument);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "PDFを読み込めません");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      void loadingTask.destroy();
    };
  }, [pdf.url]);

  React.useEffect(() => {
    if (!document) return;
    if (safePageNumber !== pageNumber) {
      onPageNumberChange?.(safePageNumber);
    }
  }, [document, onPageNumberChange, pageNumber, safePageNumber]);

  const movePage = (delta: number) => {
    onPageNumberChange?.(clampPageNumber(safePageNumber + delta, pageCount));
  };

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm" onClick={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-slate-50/90 px-3 py-2 text-xs text-slate-600">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate font-semibold text-slate-700">{pdf.filename || "PDF"}</span>
          {formatBytes(pdf.sizeBytes ?? pdf.size) ? <span className="shrink-0 text-[11px] text-slate-400">{formatBytes(pdf.sizeBytes ?? pdf.size)}</span> : null}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:opacity-40" disabled={safePageNumber <= 1} onClick={() => movePage(-1)}>前</button>
          <span className="min-w-[72px] text-center font-semibold">{safePageNumber} / {pageCount}</span>
          <button type="button" className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:opacity-40" disabled={safePageNumber >= pageCount} onClick={() => movePage(1)}>次</button>
          <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5 disabled:opacity-40" disabled={localZoom <= PDF_MIN_ZOOM} onClick={() => setLocalZoom((value) => clamp(value - PDF_ZOOM_STEP, PDF_MIN_ZOOM, PDF_MAX_ZOOM))} aria-label="PDFを縮小"><Minus className="h-3.5 w-3.5" /></button>
          <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5 disabled:opacity-40" disabled={localZoom >= PDF_MAX_ZOOM} onClick={() => setLocalZoom((value) => clamp(value + PDF_ZOOM_STEP, PDF_MIN_ZOOM, PDF_MAX_ZOOM))} aria-label="PDFを拡大"><Plus className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight: viewerHeight }}>
        {isLoading ? <div className="flex h-48 items-center justify-center text-xs font-semibold text-slate-400">PDFを読み込み中...</div> : null}
        {loadError ? <div className="m-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{loadError}</div> : null}
        {document ? <PdfPageCanvas document={document} pageNumber={safePageNumber} zoom={effectiveZoom} /> : null}
      </div>
    </section>
  );
};

const PdfUploadDropzone = ({ disabled, dragOver, onClick, onDrop, onDragOver, onDragLeave }: Readonly<{ disabled: boolean; dragOver: boolean; onClick: () => void; onDrop: React.DragEventHandler<HTMLDivElement>; onDragOver: React.DragEventHandler<HTMLDivElement>; onDragLeave: React.DragEventHandler<HTMLDivElement>; }>) => {
  return (
    <div className={cn(PDF_DROPZONE_CLASS_NAME, dragOver && "border-indigo-300 bg-indigo-50/60", disabled && "cursor-not-allowed opacity-60")} onClick={disabled ? undefined : onClick} onDrop={disabled ? undefined : onDrop} onDragOver={disabled ? undefined : onDragOver} onDragLeave={disabled ? undefined : onDragLeave}>
      <Upload className="mx-auto mb-2 h-6 w-6 opacity-60" />
      <p className="text-[10px] font-bold uppercase tracking-widest">PDFをドラッグ＆ドロップ、またはクリックして追加</p>
    </div>
  );
};

const PdfBlockContentInner = (props: PdfBlockContentProps) => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resolvedPdf, setResolvedPdf] = React.useState<ResolvedPdf | null>(null);
  const pdf = props.pdf ?? null;
  const pageNumber = props.pageNumber ?? 1;
  const displayMode = props.displayMode ?? "fixed";
  const zoom = props.zoom ?? 1;

  React.useEffect(() => {
    if (!pdf) {
      setResolvedPdf(null);
      return;
    }

    let cancelled = false;
    void resolvePdf(pdf, currentUserId).then((nextPdf) => {
      if (!cancelled) setResolvedPdf(nextPdf);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUserId, pdf]);

  const enqueuePdf = React.useCallback(async (file: File): Promise<UploadedPdf> => {
    if (!currentUserId) throw new Error("ログインが必要です");

    const assetId = crypto.randomUUID();
    const blobRecord = await putImageBlob(file, { userId: currentUserId, assetId });
    const remoteKey = createPdfRemoteKey(currentUserId, assetId);
    const assetRecord: AssetRecord = {
      id: assetId,
      userId: currentUserId,
      mime: blobRecord.mime || "application/pdf",
      size: blobRecord.size,
      localBlobId: blobRecord.localBlobId,
      localStatus: "present",
      remoteKey,
      remoteStatus: "uploading",
      remoteUrlCache: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
    };

    const db = await getLocalDb(currentUserId);
    await db.upsert("images", assetRecord);
    await getOrCreateImageBlobUrl(blobRecord.localBlobId, { userId: currentUserId });
    await persistentQueue.enqueueAssetUpload({ assetId, userId: currentUserId, remoteKey, mime: blobRecord.mime || "application/pdf", size: blobRecord.size, fileName: file.name }, file);
    void persistentQueue.processAssetQueue();

    return {
      id: assetId,
      assetId,
      filename: file.name,
      localFileId: blobRecord.localBlobId,
      remoteUrl: null,
      localUrl: null,
      storagePath: remoteKey,
      status: "uploading",
      contentType: blobRecord.mime || "application/pdf",
      size: blobRecord.size,
      sizeBytes: blobRecord.size,
      source: "local_fallback",
      updatedAt: new Date(),
    };
  }, [currentUserId]);

  const handleFiles = React.useCallback(async (files: FileList | File[]) => {
    if (props.mode !== "edit") return;

    const file = Array.from(files).find(isPdfFile);
    if (!file) {
      setError("PDFファイルを選択してください");
      return;
    }

    try {
      setError(null);
      const nextPdf = await enqueuePdf(file);
      props.onChange(nextPdf);
      props.onPageNumberChange?.(1);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "PDFを追加できません");
    }
  }, [enqueuePdf, props]);

  const handleRemove = React.useCallback(async () => {
    if (props.mode !== "edit" || !pdf) return;

    const assetKey = getPdfAssetKey(pdf);
    if (currentUserId && assetKey) {
      const db = await getLocalDb(currentUserId);
      const record = (await db.images.get(assetKey)) as LocalAssetRecordLike | undefined;
      const localBlobId = getLocalBlobIdFromRecord(record) ?? getLocalBlobIdFromRecord(pdf);
      if (localBlobId) {
        removeImageBlobUrl(localBlobId, { userId: currentUserId });
        void deleteImageBlob(localBlobId, { userId: currentUserId });
      }
    }

    props.onChange(null);
    props.onPageNumberChange?.(1);
  }, [currentUserId, pdf, props]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length) void handleFiles(files);
    event.target.value = "";
  };

  const renderInput = () => (
    <input ref={fileInputRef} hidden type="file" accept="application/pdf,.pdf" onChange={handleInputChange} aria-label="PDFをアップロード" />
  );

  if (!resolvedPdf?.url) {
    if (props.mode === "view") return null;

    return (
      <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
        {renderInput()}
        <PdfUploadDropzone disabled={!currentUserId} dragOver={dragOver} onClick={() => fileInputRef.current?.click()} onDrop={(event) => { event.preventDefault(); setDragOver(false); void handleFiles(event.dataTransfer.files); }} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} />
        {!currentUserId ? <p className="px-1 text-[11px] text-slate-400">PDFを保存するにはログインが必要です</p> : null}
        {error ? <p className="px-1 text-[11px] text-rose-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
      {props.mode === "edit" ? (
        <div className="flex justify-end">
          {renderInput()}
          <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm" onClick={handleRemove}>
            <X className="h-3.5 w-3.5" />
            削除
          </button>
        </div>
      ) : null}
      <PdfCanvasViewer pdf={resolvedPdf} pageNumber={pageNumber} onPageNumberChange={props.onPageNumberChange} displayMode={displayMode} zoom={zoom} />
      {error ? <p className="px-1 text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
};

const PdfBlockContent = React.memo(PdfBlockContentInner);

PdfBlockContent.displayName = "PdfBlockContent";

export { PdfBlockContent };
export type { PdfBlockContentProps };