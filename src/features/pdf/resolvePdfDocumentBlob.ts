import { downloadPdfFromGoogleDrive } from "@/integration/google-integration/googleDrive.pdfDownload";
import { requestGoogleDriveFileAccessToken } from "@/integration/google-integration/googleDrive.oauth";
import { auth } from "@/services/firebase";
import { getDocumentBlob, saveDocumentBlob } from "@/services/documentFileStore";
import type { DocumentItem } from "@/types";

type PdfDocumentBlobFields = Pick<
  DocumentItem,
  "id" | "localFileId" | "userId" | "googleDriveFileId"
>;

const getUniqueValues = (
  values: Array<string | null | undefined>,
): string[] => {
  return [
    ...new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
};

const resolveDocumentFileIds = (
  document: Pick<DocumentItem, "id" | "localFileId">,
): string[] => {
  return getUniqueValues([document.localFileId, document.id]);
};

const resolveDocumentBlobUserIds = (
  documentUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): Array<string | undefined> => {
  const userIds = getUniqueValues([documentUserId, currentUserId]);
  return [...userIds, undefined];
};

const resolvePreferredDocumentUserId = (
  documentUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): string | null => {
  return getUniqueValues([documentUserId, currentUserId])[0] ?? null;
};

const resolveGoogleDriveFileId = (
  fileId: string | null | undefined,
): string | null => {
  const trimmed = fileId?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const findLocalPdfBlob = async ( document: Pick<DocumentItem, "id" | "localFileId" | "userId">, currentUserId: string | null | undefined, ): Promise<Blob | null> => { const fileIds = resolveDocumentFileIds(document);
  const userIds = resolveDocumentBlobUserIds(document.userId, currentUserId);

  for (const userId of userIds) {
    for (const fileId of fileIds) {
      const blob = await getDocumentBlob(fileId, { userId });
      if (blob) return blob;
    }
  }

  return null;
};

export const resolvePdfDocumentBlob = async ( document: PdfDocumentBlobFields, currentUserId: string | null | undefined, ): Promise<Blob | null> => { const localBlob = await findLocalPdfBlob(document, currentUserId);
  if (localBlob) return localBlob;

  const googleDriveFileId = resolveGoogleDriveFileId(document.googleDriveFileId);
  if (!googleDriveFileId) return null;

  const accessToken = await requestGoogleDriveFileAccessToken(auth);
  const downloadedBlob = await downloadPdfFromGoogleDrive({
    accessToken,
    fileId: googleDriveFileId,
  });
  const preferredFileId = resolveDocumentFileIds(document)[0];
  const preferredUserId = resolvePreferredDocumentUserId(
    document.userId,
    currentUserId,
  );

  if (preferredFileId && preferredUserId) {
    void saveDocumentBlob(preferredFileId, downloadedBlob, {
      userId: preferredUserId,
    }).catch((error: unknown) => {
      console.warn("[resolvePdfDocumentBlob] Failed to cache Drive PDF locally", {
        error,
        fileId: preferredFileId,
        userId: preferredUserId,
      });
    });
  }

  return downloadedBlob;
};
