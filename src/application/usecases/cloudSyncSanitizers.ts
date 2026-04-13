import { sanitizeBlobUrlsDeep } from "@/utils/blobUrlSanitizer";
import { sanitizeForLog } from "@/utils/logSanitizer";

type FirestoreRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is FirestoreRecord =>
  typeof value === "object" && value !== null;

const getRecordId = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  const id = value.id;
  return typeof id === "string" && id.length > 0 ? id : null;
};

export const deepStripUndefined = (input: unknown): unknown => {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (input instanceof Date) return input;

  if (Array.isArray(input)) {
    return input.map(deepStripUndefined).filter((v) => v !== undefined);
  }

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const cleaned = deepStripUndefined(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }

  return input;
};

export const sanitizeSyncDataForCloud = (
  type: string,
  data: unknown,
): unknown => {
  if (!data) return data;

  const cleaned = deepStripUndefined(data);
  if (!cleaned || typeof cleaned !== "object") return cleaned;

  const record = { ...(cleaned as Record<string, unknown>) };

  if (type === "document") {
    delete record.localFileId;
    delete record.blobUrl;
    if (
      typeof record.localUrl === "string" &&
      record.localUrl.startsWith("blob:")
    ) {
      record.localUrl = null;
    }
    return record;
  }

  if (type === "asset") {
    delete record.localBlobId;
    delete record.localStatus;
    return record;
  }

  return record;
};

export const sanitizeSyncDataFromCloud = (
  type: string,
  data: unknown,
): unknown => {
  if (!data) return data;

  const stripped = deepStripUndefined(data);
  const record =
    stripped && typeof stripped === "object"
      ? { ...(stripped as Record<string, unknown>) }
      : stripped;

  if (type === "document" && record && typeof record === "object") {
    const documentRecord = record as Record<string, unknown>;
    delete documentRecord.localFileId;
    delete documentRecord.blobUrl;
    const localUrl = documentRecord.localUrl;
    if (typeof localUrl === "string" && localUrl.startsWith("blob:")) {
      documentRecord.localUrl = null;
    }
  }

  if (type === "asset" && record && typeof record === "object") {
    const assetRecord = record as Record<string, unknown>;
    delete assetRecord.localBlobId;
    delete assetRecord.localStatus;
  }

  const sanitized = sanitizeBlobUrlsDeep(record);
  if (sanitized.changed) {
    console.warn(
      "[CloudSyncAdapter] sanitize_blob_url_from_cloud",
      sanitizeForLog({
        type,
        id: getRecordId(data),
        fixes: sanitized.fixes,
      }),
    );
  }

  return sanitized.value;
};
