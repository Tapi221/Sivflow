import { requestGoogleDriveFileAccessToken } from "@/integration/google-integration/googleDrive.oauth";
import { downloadPdfFromGoogleDrive } from "@/integration/google-integration/googleDrive.pdfDownload";
import { getDocumentBlob, saveDocumentBlob } from "@/services/documentFileStore";
import { auth } from "@/services/firebase";
import type { DocumentItem } from "@/types";



type PdfDocumentBlobFields = Pick<DocumentItem, "id" | "localFileId" | "userId" | "googleDriveFileId" | "googleDriveWebContentLink" | "googleDriveWebViewLink" | "storagePath">;



const GOOGLE_DRIVE_STORAGE_PATH_PREFIX = "google-drive://";
const GOOGLE_DRIVE_FILE_PATH_PATTERN = /\/file\/d\/([^/]+)/;



const getUniqueValues = (values: Array<string | null | undefined>): string[] => {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
};
const resolveDocumentFileIds = (document: Pick<DocumentItem, "id" | "localFileId">): string[] => {
  return getUniqueValues([document.localFileId, document.id]);
};
const resolveDocumentBlobUserIds = (documentUserId: string | null | undefined, currentUserId: string | null | undefined): Array<string | undefined> => {
  const userIds = getUniqueValues([documentUserId, currentUserId]);
  return [...userIds, undefined];
};
const resolvePreferredDocumentUserId = (documentUserId: string | null | undefined, currentUserId: string | null | undefined): string | null => {
  return getUniqueValues([documentUserId, currentUserId])[0] ?? null;
};
const resolveStringValue = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};
const resolveGoogleDriveFileIdFromStoragePath = (storagePath: string | null | undefined): string | null => {
  const trimmedStoragePath = resolveStringValue(storagePath);
  if (!trimmedStoragePath?.startsWith(GOOGLE_DRIVE_STORAGE_PATH_PREFIX)) return null;
  return resolveStringValue(trimmedStoragePath.slice(GOOGLE_DRIVE_STORAGE_PATH_PREFIX.length));
};
const resolveGoogleDriveFileIdFromUrl = (url: string | null | undefined): string | null => {
  const trimmedUrl = resolveStringValue(url);
  if (!trimmedUrl) return null;

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.hostname !== "drive.google.com") return null;
    const queryFileId = resolveStringValue(parsedUrl.searchParams.get("id"));
    if (queryFileId) return queryFileId;
    const pathFileId = parsedUrl.pathname.match(GOOGLE_DRIVE_FILE_PATH_PATTERN)?.[1];
    return resolveStringValue(pathFileId ? decodeURIComponent(pathFileId) : null);
  } catch {
    return null;
  }
};
const resolveGoogleDriveFileId = (document: Pick<PdfDocumentBlobFields, "googleDriveFileId" | "googleDriveWebContentLink" | "googleDriveWebViewLink" | "storagePath">): string | null => {
  return resolveStringValue(document.googleDriveFileId) ?? resolveGoogleDriveFileIdFromStoragePath(document.storagePath) ?? resolveGoogleDriveFileIdFromUrl(document.googleDriveWebContentLink) ?? resolveGoogleDriveFileIdFromUrl(document.googleDriveWebViewLink);
};
const findLocalPdfBlob = async (document: Pick<DocumentItem, "id" | "localFileId" | "userId">, currentUserId: string | null | undefined): Promise<Blob | null> => {
  const fileIds = resolveDocumentFileIds(document);
  const userIds = resolveDocumentBlobUserIds(document.userId, currentUserId);

  for (const userId of userIds) {
    for (const fileId of fileIds) {
      const blob = await getDocumentBlob(fileId, { userId });
      if (blob) return blob;
    }
  }

  return null;
};
const resolvePdfDocumentBlob = async (document: PdfDocumentBlobFields, currentUserId: string | null | undefined): Promise<Blob | null> => {
  const localBlob = await findLocalPdfBlob(document, currentUserId);
  if (localBlob) return localBlob;

  const googleDriveFileId = resolveGoogleDriveFileId(document);
  if (!googleDriveFileId) return null;

  const accessToken = await requestGoogleDriveFileAccessToken(auth);
  const downloadedBlob = await downloadPdfFromGoogleDrive({ accessToken, fileId: googleDriveFileId });
  const preferredFileId = resolveDocumentFileIds(document)[0];
  const preferredUserId = resolvePreferredDocumentUserId(document.userId, currentUserId);

  if (preferredFileId && preferredUserId) {
    void saveDocumentBlob(preferredFileId, downloadedBlob, { userId: preferredUserId }).catch((error: unknown) => {
      console.warn("[resolvePdfDocumentBlob] Failed to cache Drive PDF locally", { error, fileId: preferredFileId, userId: preferredUserId });
    });
  }

  return downloadedBlob;
};



export { findLocalPdfBlob, resolvePdfDocumentBlob };
