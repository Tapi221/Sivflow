const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isObjectUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("blob") && value[4] === ":";
const stripDocumentLocalFields = (
  record: Record<string, unknown>,
): Record<string, unknown> => {
  delete record.localFileId;
  delete record.blobUrl;
  if (isObjectUrl(record.localUrl)) {
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
const stripCardImageLocalFields = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const image = { ...value };
  delete image.localFileId;
  delete image.local_file_id;
  delete image.localUrl;
  delete image.local_url;
  delete image.blobUrl;
  delete image.blob_url;
  if (isObjectUrl(image.url)) image.url = null;
  return image;
};
const stripImageArray = (value: unknown): unknown => {
  if (!Array.isArray(value)) return value;
  return value.map(stripCardImageLocalFields);
};
const stripBlockImages = (value: unknown): unknown => {
  if (!isRecord(value) || !Array.isArray(value.images)) return value;
  return { ...value, images: stripImageArray(value.images) };
};
const stripFaceImages = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const face = { ...value };
  if (Array.isArray(face.blocks)) face.blocks = face.blocks.map(stripBlockImages);
  if (isRecord(face.attachments)) {
    face.attachments = { ...face.attachments, images: stripImageArray(face.attachments.images) };
  }
  if (Array.isArray(face.images)) face.images = stripImageArray(face.images);
  return face;
};
const stripCardLocalFields = (
  record: Record<string, unknown>,
): Record<string, unknown> => {
  delete record.lastSyncedAt;
  delete record.syncState;
  delete record.lastSyncedByDeviceId;
  record.front = stripFaceImages(record.front);
  record.back = stripFaceImages(record.back);
  for (const key of ["images", "questionImages", "answerImages", "frontImages", "backImages"]) {
    if (Array.isArray(record[key])) record[key] = stripImageArray(record[key]);
  }
  return record;
};
const stripCloudSyncLocalOnlyFields = (type: string, record: Record<string, unknown>): Record<string, unknown> => {
  if (type === "card") {
    return stripCardLocalFields(record);
  }

  if (type === "document") {
    return stripDocumentLocalFields(record);
  }

  if (type === "asset") {
    return stripAssetLocalFields(record);
  }

  return record;
};



export { stripCloudSyncLocalOnlyFields };
