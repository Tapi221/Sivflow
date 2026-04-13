import type { AssetRecord, UploadedImage } from "@/types";

type DocumentLike = {
  uploadStatus?: string | null;
  remoteUrl?: string | null;
  downloadUrl?: string | null;
  localFileId?: string | null;
  localUrl?: string | null;
  blobUrl?: string | null;
};

export type AssetLikeRecord = Partial<AssetRecord> & Partial<UploadedImage>;

export interface QueueItem {
  id: string;
  image: UploadedImage;
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
  retryCount: number;
  enqueuedAt: number;
}

export interface AssetUploadRequest {
  assetId: string;
  userId: string;
  remoteKey: string;
  mime: string;
  size: number;
  fileName?: string;
}

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (
  record: Record<string, unknown>,
  key: string,
): string | null => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const getNumber = (
  record: Record<string, unknown>,
  key: string,
): number | null => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getDate = (record: Record<string, unknown>, key: string): Date | null => {
  const value = record[key];
  return value instanceof Date ? value : null;
};

export const toDocumentLike = (value: unknown): DocumentLike => {
  if (!isRecord(value)) return {};

  return {
    uploadStatus: getString(value, "uploadStatus"),
    remoteUrl: getString(value, "remoteUrl"),
    downloadUrl: getString(value, "downloadUrl"),
    localFileId: getString(value, "localFileId"),
    localUrl: getString(value, "localUrl"),
    blobUrl: getString(value, "blobUrl"),
  };
};

export const toAssetLikeRecord = (value: unknown): AssetLikeRecord | null => {
  if (!isRecord(value)) return null;

  return {
    id: getString(value, "id") ?? undefined,
    userId: getString(value, "userId") ?? undefined,
    mime: getString(value, "mime") ?? undefined,
    size: getNumber(value, "size") ?? undefined,
    localBlobId: getString(value, "localBlobId") ?? undefined,
    localStatus:
      getString(value, "localStatus") === "missing" ? "missing" : "present",
    remoteKey: getString(value, "remoteKey") ?? undefined,
    remoteStatus: (() => {
      const status = getString(value, "remoteStatus");
      return status === "none" ||
        status === "uploading" ||
        status === "ready" ||
        status === "failed"
        ? status
        : undefined;
    })(),
    remoteUrlCache: getString(value, "remoteUrlCache") ?? undefined,
    createdAt: getDate(value, "createdAt") ?? undefined,
    retryCount: getNumber(value, "retryCount") ?? undefined,
  };
};

export const makeAssetRecord = ({
  existing,
  itemId,
  userId,
  mime,
  size,
  localBlobId,
  remoteKey,
  remoteStatus,
  remoteUrlCache,
  retryCount,
}: {
  existing: AssetLikeRecord | null;
  itemId: string;
  userId: string;
  mime: string;
  size: number;
  localBlobId: string;
  remoteKey: string | null;
  remoteStatus: "uploading" | "ready" | "failed";
  remoteUrlCache?: string | null;
  retryCount: number;
}): AssetRecord => {
  const now = new Date();

  return {
    id: itemId,
    userId: existing?.userId?.trim() || userId,
    mime: existing?.mime?.trim() || mime || "application/octet-stream",
    size: existing?.size ?? size,
    localBlobId: existing?.localBlobId?.trim() || localBlobId,
    localStatus: existing?.localStatus === "missing" ? "missing" : "present",
    remoteKey: remoteKey ?? existing?.remoteKey ?? null,
    remoteStatus,
    remoteUrlCache: remoteUrlCache ?? existing?.remoteUrlCache ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    retryCount,
  };
};

export const isPdfQueueItem = (
  item: Pick<QueueItem, "fileType" | "fileName">,
): boolean =>
  item.fileType === "application/pdf" ||
  (typeof item.fileName === "string" &&
    item.fileName.toLowerCase().endsWith(".pdf"));

export const isPptxQueueItem = (
  item: Pick<QueueItem, "fileType" | "fileName">,
): boolean =>
  item.fileType === PPTX_MIME ||
  (typeof item.fileName === "string" &&
    item.fileName.toLowerCase().endsWith(".pptx"));

export const isDocumentQueueItem = (
  item: Pick<QueueItem, "fileType" | "fileName">,
): boolean => isPdfQueueItem(item) || isPptxQueueItem(item);

export const getDocumentKindLabel = (
  item: Pick<QueueItem, "fileType" | "fileName">,
): "PDF" | "PPTX" | "DOC" => {
  if (isPdfQueueItem(item)) return "PDF";
  if (isPptxQueueItem(item)) return "PPTX";
  return "DOC";
};

export const isDocumentUploadReady = (doc: unknown): boolean => {
  const snapshot = toDocumentLike(doc);
  if (snapshot.uploadStatus === "ready") return true;

  return (
    (typeof snapshot.remoteUrl === "string" &&
      snapshot.remoteUrl.length > 0 &&
      snapshot.remoteUrl !== snapshot.localUrl &&
      snapshot.remoteUrl !== snapshot.blobUrl) ||
    (typeof snapshot.downloadUrl === "string" &&
      snapshot.downloadUrl.length > 0 &&
      snapshot.downloadUrl !== snapshot.localUrl &&
      snapshot.downloadUrl !== snapshot.blobUrl)
  );
};

export const createAssetQueueImage = (
  request: AssetUploadRequest,
): UploadedImage => ({
  id: request.assetId,
  assetId: request.assetId,
  localFileId: request.assetId,
  status: "uploading",
  remoteUrl: null,
  storagePath: request.remoteKey,
  contentType: request.mime,
  size: request.size,
  sizeBytes: request.size,
  retryCount: 0,
  updatedAt: new Date(),
});
