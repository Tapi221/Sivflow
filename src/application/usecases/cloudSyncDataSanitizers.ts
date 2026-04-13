import { sanitizeBlobUrlsDeep } from "@/utils/blobUrlSanitizer";
import { sanitizeForLog } from "@/utils/logSanitizer";

import { getCloudSyncSanitizerLogPayload } from "./cloudSyncSanitizerLogging";
import { deepStripUndefined } from "./cloudSyncValueCleaning";

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
      sanitizeForLog(
        getCloudSyncSanitizerLogPayload(type, data, sanitized.fixes),
      ),
    );
  }

  return sanitized.value;
};
