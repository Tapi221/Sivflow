export type GoogleDrivePdfUploadInput = {
  accessToken: string;
  fileName: string;
  pdf: Blob;
};

export type GoogleDrivePdfUploadResult = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  webContentLink: string | null;
};
