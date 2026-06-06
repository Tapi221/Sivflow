import type { DocumentItem } from "@/types";

type PdfDocumentSourceFields = Pick<DocumentItem, "blobUrl" | "downloadUrl" | "googleDriveWebContentLink" | "googleDriveWebViewLink" | "localUrl" | "remoteUrl">;

const isGoogleDriveViewUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== "drive.google.com") return false;
    return parsedUrl.pathname.includes("/view") || parsedUrl.pathname === "/open";
  } catch {
    return false;
  }
};

const normalizePdfSourceUrl = (url: string | null | undefined): string | null => {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl || trimmedUrl.length === 0) return null;
  if (isGoogleDriveViewUrl(trimmedUrl)) return null;
  return trimmedUrl;
};

const resolvePdfDocumentSourceUrl = (document: PdfDocumentSourceFields): string | null => {
  return normalizePdfSourceUrl(
    document.blobUrl ??
      document.localUrl ??
      document.remoteUrl ??
      document.downloadUrl ??
      document.googleDriveWebContentLink ??
      document.googleDriveWebViewLink ??
      null,
  );
};

export { resolvePdfDocumentSourceUrl };
