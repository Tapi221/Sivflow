import type { QueueItem } from "./persistentOfflineQueueTypes";

type DocumentLike = {
  uploadStatus?: string | null;
  remoteUrl?: string | null;
  downloadUrl?: string | null;
  localFileId?: string | null;
  localUrl?: string | null;
  blobUrl?: string | null;
};

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
