type GoogleDrivePdfUploadInput = {
  accessToken: string;
  fileName: string;
  pdf: Blob;
};
type GoogleDrivePdfUploadResult = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  webContentLink: string | null;
};



const GOOGLE_DRIVE_UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/drive/v3/files";
const GOOGLE_DRIVE_PDF_FIELDS = "id,name,mimeType,webViewLink,webContentLink";
const PDF_MIME_TYPE = "application/pdf";



const createUploadFormData = (fileName: string, pdf: Blob): FormData => {
  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([
      JSON.stringify({
        name: fileName,
        mimeType: PDF_MIME_TYPE,
      }),
    ], { type: "application/json" }),
  );
  formData.append("file", pdf, fileName);
  return formData;
};
const readGoogleDriveErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };
    return payload.error?.message ?? `Google Drive upload failed (${response.status})`;
  } catch {
    return `Google Drive upload failed (${response.status})`;
  }
};
const uploadPdfToGoogleDrive = async ({ accessToken, fileName, pdf }: GoogleDrivePdfUploadInput): Promise<GoogleDrivePdfUploadResult> => {
  if (!accessToken.trim()) {
    throw new Error("Google Drive access token is missing");
  }

  const response = await fetch(
    `${GOOGLE_DRIVE_UPLOAD_ENDPOINT}?${new URLSearchParams({
      uploadType: "multipart",
      fields: GOOGLE_DRIVE_PDF_FIELDS,
    })}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: createUploadFormData(fileName, pdf),
    },
  );

  if (!response.ok) {
    throw new Error(await readGoogleDriveErrorMessage(response));
  }

  const payload = (await response.json()) as Partial<GoogleDrivePdfUploadResult>;
  if (!payload.id || !payload.name) {
    throw new Error("Google Drive upload response is missing file metadata");
  }

  return {
    id: payload.id,
    name: payload.name,
    mimeType: payload.mimeType ?? PDF_MIME_TYPE,
    webViewLink: payload.webViewLink ?? null,
    webContentLink: payload.webContentLink ?? null,
  };
};



export { uploadPdfToGoogleDrive };


export type { GoogleDrivePdfUploadInput, GoogleDrivePdfUploadResult };
