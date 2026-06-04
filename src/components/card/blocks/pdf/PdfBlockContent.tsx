import React from "react";
import { useAuthSession } from "@/contexts/AuthContext";
import { resolveCardImageUrl } from "@/services/cardImageResolver";
import { getOrCreateImageBlobUrl, removeImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { deleteImageBlob, getImageBlob, putImageBlob } from "@/services/imageFileStore";
import { getLocalDb } from "@/services/localDB";
import { persistentQueue } from "@/services/PersistentOfflineQueue";
import { ExternalLink, FileText, Upload, X } from "@/ui/icons";
import { cn } from "@/lib/utils";
import type { AssetRecord, UploadedPdf } from "@/types/domain/assets";

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

type PdfNativeViewerProps = Readonly<{
  pdf: ResolvedPdf;
  pageNumber: number;
  displayMode: "fixed" | "fluid";
  zoom: number;
  userId: string | null;
}>;

type LocalAssetRecordLike = {
  localBlobId?: string | null;
  localFileId?: string | null;
};

const PDF_DROPZONE_CLASS_NAME = "rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-slate-500 transition hover:border-slate-300 hover:bg-slate-50";
const PDF_VIEWER_FIXED_HEIGHT_PX = 520;
const PDF_VIEWER_FLUID_HEIGHT_PX = 640;

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
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

const blobToNumberArray = async (blob: Blob): Promise<number[]> => {
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
};

const readPdfBlob = async (pdf: UploadedPdf, userId: string | null): Promise<Blob | null> => {
  const assetKey = getPdfAssetKey(pdf);
  if (assetKey && userId) {
    const db = await getLocalDb(userId);
    const record = (await db.images.get(assetKey)) as LocalAssetRecordLike | undefined;
    const localBlobId = getLocalBlobIdFromRecord(record) ?? getLocalBlobIdFromRecord(pdf);
    if (localBlobId) {
      const blob = await getImageBlob(localBlobId, { userId });
      if (blob) return blob;
    }
  }

  if (!pdf.remoteUrl) return null;
  const response = await fetch(pdf.remoteUrl);
  if (!response.ok) return null;
  return response.blob();
};

const PdfNativeViewer = ({ pdf, pageNumber, displayMode, zoom, userId }: PdfNativeViewerProps) => {
  const [error, setError] = React.useState<string | null>(null);
  const [isOpening, setIsOpening] = React.useState(false);
  const viewerHeight = displayMode === "fluid" ? PDF_VIEWER_FLUID_HEIGHT_PX : PDF_VIEWER_FIXED_HEIGHT_PX;
  const objectUrl = pdf.url ? `${pdf.url}#page=${Math.max(1, Math.round(pageNumber || 1))}&zoom=${Math.max(50, Math.round(100 * zoom))}` : null;
  const canOpenSioyek = typeof window !== "undefined" && Boolean(window.desktop?.pdf?.openInSioyek);

  const openInSioyek = React.useCallback(async () => {
    if (!canOpenSioyek) {
      setError("デスクトップ版でSioyek連携を利用できます");
      return;
    }

    setIsOpening(true);
    setError(null);

    try {
      const blob = await readPdfBlob(pdf, userId);
      if (!blob) throw new Error("PDFデータを取得できません");
      await window.desktop?.pdf.openInSioyek({
        fileName: pdf.filename || "document.pdf",
        data: await blobToNumberArray(blob),
        pageNumber: Math.max(1, Math.round(pageNumber || 1)),
      });
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "SioyekでPDFを開けません");
    } finally {
      setIsOpening(false);
    }
  }, [canOpenSioyek, pageNumber, pdf, userId]);

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm" onClick={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-slate-50/90 px-3 py-2 text-xs text-slate-600">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate font-semibold text-slate-700">{pdf.filename || "PDF"}</span>
          {formatBytes(pdf.sizeBytes ?? pdf.size) ? <span className="shrink-0 text-[11px] text-slate-400">{formatBytes(pdf.sizeBytes ?? pdf.size)}</span> : null}
        </div>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm disabled:opacity-50" onClick={openInSioyek} disabled={isOpening}>
          <ExternalLink className="h-3.5 w-3.5" />
          {isOpening ? "起動中" : "Sioyekで開く"}
        </button>
      </div>
      <div className="bg-neutral-950/5" style={{ height: viewerHeight }}>
        {objectUrl ? <object data={objectUrl} type="application/pdf" className="h-full w-full"><iframe src={objectUrl} title={pdf.filename || "PDF"} className="h-full w-full border-0" /></object> : <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">PDFを表示できません</div>}
      </div>
      {error ? <div className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}
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
      <PdfNativeViewer pdf={resolvedPdf} pageNumber={pageNumber} displayMode={displayMode} zoom={zoom} userId={currentUserId} />
      {error ? <p className="px-1 text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
};

const PdfBlockContent = React.memo(PdfBlockContentInner);

PdfBlockContent.displayName = "PdfBlockContent";

export { PdfBlockContent };
export type { PdfBlockContentProps };