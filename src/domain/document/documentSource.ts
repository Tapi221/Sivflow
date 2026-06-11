type DocumentSourceFields = {
  googleDriveFileId?: unknown;
  googleDriveWebContentLink?: unknown;
  googleDriveWebViewLink?: unknown;
  downloadUrl?: unknown;
  remoteUrl?: unknown;
  storagePath?: unknown;
};
type SyncableDocumentRecord = DocumentSourceFields & {
  isDeleted?: unknown;
};



const GOOGLE_DRIVE_STORAGE_PATH_PREFIX = "google-drive://";
const LOCAL_BLOB_URL_PREFIX = "blob:";
const GOOGLE_DRIVE_FILE_PATH_PATTERN = /\/file\/d\/([^/]+)/;



const getTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const resolveGoogleDriveFileIdFromStoragePath = (storagePath: unknown): string | null => {
  const trimmedStoragePath = getTrimmedString(storagePath);
  if (!trimmedStoragePath?.startsWith(GOOGLE_DRIVE_STORAGE_PATH_PREFIX)) return null;
  const fileId = trimmedStoragePath.slice(GOOGLE_DRIVE_STORAGE_PATH_PREFIX.length).trim();
  return fileId.length > 0 ? fileId : null;
};
const resolveGoogleDriveFileIdFromUrl = (url: unknown): string | null => {
  const trimmedUrl = getTrimmedString(url);
  if (!trimmedUrl) return null;

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.hostname !== "drive.google.com") return null;

    const queryFileId = getTrimmedString(parsedUrl.searchParams.get("id"));
    if (queryFileId) return queryFileId;

    const pathFileId = parsedUrl.pathname.match(GOOGLE_DRIVE_FILE_PATH_PATTERN)?.[1];
    return getTrimmedString(pathFileId ? decodeURIComponent(pathFileId) : null);
  } catch {
    return null;
  }
};
const isRemotePdfUrl = (url: unknown): boolean => {
  const trimmedUrl = getTrimmedString(url);
  return Boolean(trimmedUrl && !trimmedUrl.startsWith(LOCAL_BLOB_URL_PREFIX));
};
const resolveDocumentGoogleDriveFileId = (document: DocumentSourceFields): string | null => {
  return getTrimmedString(document.googleDriveFileId) ?? resolveGoogleDriveFileIdFromStoragePath(document.storagePath) ?? resolveGoogleDriveFileIdFromUrl(document.googleDriveWebContentLink) ?? resolveGoogleDriveFileIdFromUrl(document.googleDriveWebViewLink);
};
const hasRemoteRecoverableDocumentSource = (document: DocumentSourceFields): boolean => {
  return Boolean(resolveDocumentGoogleDriveFileId(document) || isRemotePdfUrl(document.remoteUrl) || isRemotePdfUrl(document.downloadUrl) || isRemotePdfUrl(document.googleDriveWebContentLink));
};
const shouldSyncDocumentRecord = (record: SyncableDocumentRecord): boolean => {
  if (record.isDeleted === true) return true;
  return hasRemoteRecoverableDocumentSource(record);
};



export { hasRemoteRecoverableDocumentSource, resolveDocumentGoogleDriveFileId, shouldSyncDocumentRecord };
