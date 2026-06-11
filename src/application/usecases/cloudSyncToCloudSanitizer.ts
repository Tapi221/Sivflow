import { stripCloudSyncLocalOnlyFields } from "./cloudSyncLocalFieldStripping";
import { deepStripUndefined } from "./cloudSyncValueCleaning";



const sanitizeSyncDataForCloud = (type: string, data: unknown): unknown => {
  if (!data) return data;

  const cleaned = deepStripUndefined(data);
  if (!cleaned || typeof cleaned !== "object") return cleaned;

  return stripCloudSyncLocalOnlyFields(type, {
    ...(cleaned as Record<string, unknown>),
  });
};



export { sanitizeSyncDataForCloud };
