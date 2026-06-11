type DocumentSourceFields = {
  googleDriveFileId?: unknown;
  googleDriveWebContentLink?: unknown;
  googleDriveWebViewLink?: unknown;
  downloadUrl?: unknown;
  remoteUrl?: unknown;
  storagePath?: unknown;
};

const hasRemoteRecoverableDocumentSource = (document: DocumentSourceFields): boolean => {
  return Boolean(document.googleDriveFileId || document.googleDriveWebContentLink || document.downloadUrl || document.remoteUrl || document.storagePath);
};

export { hasRemoteRecoverableDocumentSource };
