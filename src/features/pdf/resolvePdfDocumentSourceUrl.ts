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
const getPdfDocumentSourceUrlCandidates = (document: PdfDocumentSourceFields): Array<string | null | undefined> => [
  document.localUrl,
  document.blobUrl,
  document.remoteUrl,
  document.downloadUrl,
  document.googleDriveWebContentLink,
  document.googleDriveWebViewLink,
];
const resolvePdfDocumentSourceUrl = (document: PdfDocumentSourceFields): string | null => {
  for (const url of getPdfDocumentSourceUrlCandidates(document)) {
    const normalizedUrl = normalizePdfSourceUrl(url);
    if (normalizedUrl) return normalizedUrl;
  }

  return null;
};



export { resolvePdfDocumentSourceUrl };
