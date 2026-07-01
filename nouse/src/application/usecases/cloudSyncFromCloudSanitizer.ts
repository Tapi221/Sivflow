import { stripCloudSyncLocalOnlyFields } from "./cloudSyncLocalFieldStripping";
import { getCloudSyncSanitizerLogPayload } from "./cloudSyncSanitizerLogging";
import { deepStripUndefined } from "./cloudSyncValueCleaning";
import { sanitizeBlobUrlsDeep } from "@/utils/blobUrlSanitizer";
import { sanitizeForLog } from "@/utils/logSanitizer";



const sanitizeSyncDataFromCloud = (type: string, data: unknown): unknown => {
  if (!data) return data;

  const stripped = deepStripUndefined(data);
  const record =
    stripped && typeof stripped === "object"
      ? stripCloudSyncLocalOnlyFields(type, {
        ...(stripped as Record<string, unknown>),
      })
      : stripped;

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



export { sanitizeSyncDataFromCloud };
