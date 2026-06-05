import type { DocumentItem } from "@/types";

type PdfDocumentSourceFields = Pick<DocumentItem, "blobUrl" | "downloadUrl" | "googleDriveWebContentLink" | "googleDriveWebViewLink" | "localUrl" | "remoteUrl">;

const normalizePdfSourceUrl = (url: string | null | undefined): string | null => {
  const trimmedUrl = url?.trim();
  return trimmedUrl && trimmedUrl.length > 0 ? trimmedUrl : null;
};

const resolvePdfDocumentSourceUrl = (document: PdfDocumentSourceFields): string | null => {
  return normalizePdfSourceUrl(document.blobUrl ?? document.localUrl ?? document.downloadUrl ?? document.googleDriveWebContentLink ?? document.remoteUrl ?? document.googleDriveWebViewLink ?? null);
};

export { resolvePdfDocumentSourceUrl };
