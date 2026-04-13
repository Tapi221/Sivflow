import type { SyncChange } from "@/services/interfaces/ISyncService";
import { sanitizeBlobUrlsDeep } from "@/utils/blobUrlSanitizer";
import { sanitizeForLog } from "@/utils/logSanitizer";

type FirestoreRecord = Record<string, unknown>;

export type CloudEntityType =
  | "card"
  | "folder"
  | "cardSet"
  | "document"
  | "tag"
  | "asset"
  | "userSetting";

export type PullableEntityType = Exclude<CloudEntityType, "userSetting">;

export const CURRENT_TAG_COLLECTION = "tags" as const;

export const COLLECTION_BY_TYPE: Record<CloudEntityType, string> = {
  card: "cards",
  folder: "folders",
  cardSet: "cardSets",
  document: "documents",
  tag: CURRENT_TAG_COLLECTION,
  asset: "images",
  userSetting: "userSettings",
};

export const PULLABLE_ENTITY_TYPES: ReadonlyArray<PullableEntityType> = [
  "card",
  "folder",
  "cardSet",
  "document",
  "tag",
  "asset",
];

const isRecord = (value: unknown): value is FirestoreRecord =>
  typeof value === "object" && value !== null;

export const isCloudEntityType = (value: unknown): value is CloudEntityType =>
  typeof value === "string" && value in COLLECTION_BY_TYPE;

export const getRecordId = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  const id = value.id;
  return typeof id === "string" && id.length > 0 ? id : null;
};

export const getUpdatedAtMillis = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (!isRecord(value)) return 0;

  const maybeToMillis = value.toMillis;
  if (typeof maybeToMillis === "function") {
    const result = maybeToMillis.call(value);
    if (typeof result === "number") return result;
  }

  const maybeGetTime = value.getTime;
  if (typeof maybeGetTime === "function") {
    const result = maybeGetTime.call(value);
    if (typeof result === "number") return result;
  }

  return 0;
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
    if (
      typeof localUrl === "string" &&
      localUrl.startsWith("blob:")
    ) {
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

export const getChangeParts = (
  change: SyncChange,
): { type: CloudEntityType; id: string; data: unknown } | null => {
  const type = change.type;
  const id = change.id;

  if (!isCloudEntityType(type)) return null;
  if (typeof id !== "string" || id.length === 0) return null;

  return {
    type,
    id,
    data: change.data,
  };
};

export const getChangeId = (change: SyncChange): string | null => {
  const parts = getChangeParts(change);
  return parts?.id ?? null;
};
