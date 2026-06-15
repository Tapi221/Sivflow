type GoogleDrivePdfDownloadInput = {
  accessToken: string;
  fileId: string;
};



const GOOGLE_DRIVE_DOWNLOAD_ENDPOINT = "https://www.googleapis.com/drive/v3/files";
const PDF_MIME_TYPE = "application/pdf";



const readGoogleDriveErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };
    return payload.error?.message ?? `Google Drive download failed (${response.status})`;
  } catch {
    return `Google Drive download failed (${response.status})`;
  }
};
const createGoogleDrivePdfDownloadUrl = (fileId: string): string => {
  return `${GOOGLE_DRIVE_DOWNLOAD_ENDPOINT}/${encodeURIComponent(fileId)}?${new URLSearchParams({ alt: "media" })}`;
};
const normalizePdfBlob = (blob: Blob): Blob => {
  return blob.type === PDF_MIME_TYPE ? blob : new Blob([blob], { type: PDF_MIME_TYPE });
};
const downloadPdfFromGoogleDrive = async ({ accessToken, fileId }: GoogleDrivePdfDownloadInput): Promise<Blob> => {
  if (!accessToken.trim()) throw new Error("Google Drive access token is missing");
  if (!fileId.trim()) throw new Error("Google Drive file id is missing");

  const response = await fetch(createGoogleDrivePdfDownloadUrl(fileId), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) throw new Error(await readGoogleDriveErrorMessage(response));

  return normalizePdfBlob(await response.blob());
};



export { downloadPdfFromGoogleDrive };


export type { GoogleDrivePdfDownloadInput };
