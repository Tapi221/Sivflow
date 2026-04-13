import { isStorageRecord } from "@/domain/shared/storage/storageRecordUtils";

const readStringField = (
  record: Record<string, unknown>,
  key: string,
): string | null => {
  const candidate = record[key];
  return typeof candidate === "string" ? candidate : null;
};

const readFiniteNumberField = (
  record: Record<string, unknown>,
  key: string,
): number | null => {
  const candidate = record[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : null;
};

export const sanitizeCardStorageLayout = (layoutValue: unknown) => {
  if (!isStorageRecord(layoutValue)) return null;

  return {
    baseWidthPx: readFiniteNumberField(layoutValue, "baseWidthPx"),
    cropX: readFiniteNumberField(layoutValue, "cropX"),
  };
};

export const sanitizeCardStorageImageRef = (imageValue: unknown) => {
  if (!isStorageRecord(imageValue)) return imageValue;

  const assetId =
    readStringField(imageValue, "assetId") ?? readStringField(imageValue, "id");
  const remoteUrl = readStringField(imageValue, "remoteUrl");
  const normalizedRemoteUrl =
    remoteUrl && remoteUrl.startsWith("http") ? remoteUrl : null;

  return {
    id: readStringField(imageValue, "id") ?? assetId,
    assetId,
    localFileId: readStringField(imageValue, "localFileId") ?? assetId,
    remoteUrl: normalizedRemoteUrl,
    storagePath: readStringField(imageValue, "storagePath"),
    status:
      readStringField(imageValue, "status") ??
      (normalizedRemoteUrl ? "ready" : "uploading"),
    error: readStringField(imageValue, "error") ?? undefined,
    scale: readFiniteNumberField(imageValue, "scale") ?? 1,
    x: readFiniteNumberField(imageValue, "x") ?? 0,
    layout: sanitizeCardStorageLayout(imageValue.layout),
    naturalW: readFiniteNumberField(imageValue, "naturalW"),
    naturalH: readFiniteNumberField(imageValue, "naturalH"),
  };
};

export const sanitizeCardStorageBlockImages = (blocks: unknown[] | undefined) => {
  if (!Array.isArray(blocks)) return blocks;

  return blocks.map((block) => {
    if (!isStorageRecord(block) || !Array.isArray(block.images)) return block;

    return {
      ...block,
      images: block.images.map((image) => sanitizeCardStorageImageRef(image)),
    };
  });
};
