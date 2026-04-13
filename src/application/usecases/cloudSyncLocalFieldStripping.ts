const stripDocumentLocalFields = (
  record: Record<string, unknown>,
): Record<string, unknown> => {
  delete record.localFileId;
  delete record.blobUrl;
  if (
    typeof record.localUrl === "string" &&
    record.localUrl.startsWith("blob:")
  ) {
    record.localUrl = null;
  }
  return record;
};

const stripAssetLocalFields = (
  record: Record<string, unknown>,
): Record<string, unknown> => {
  delete record.localBlobId;
  delete record.localStatus;
  return record;
};

export const stripCloudSyncLocalOnlyFields = (
  type: string,
  record: Record<string, unknown>,
): Record<string, unknown> => {
  if (type === "document") {
    return stripDocumentLocalFields(record);
  }

  if (type === "asset") {
    return stripAssetLocalFields(record);
  }

  return record;
};
