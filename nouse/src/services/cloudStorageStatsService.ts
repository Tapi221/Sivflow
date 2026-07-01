import { functionsClient, requireFirestoreDb } from "@platform/firebase/client";
import type { Unsubscribe } from "firebase/firestore";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { storageStatsDocPathSegments } from "@/infrastructure/firebase/firestore/paths";
import type { CloudStorageStats } from "@/types";



type RebuildStorageStatsResponse = {
  userId?: string;
  quotaBytes?: number;
  totalStorageUsedBytes?: number;
  syncedImageCount?: number;
  schemaVersion?: number;
};



const CLOUD_STORAGE_STATS_SCHEMA_VERSION = 1;
const DEFAULT_CLOUD_STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;



const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const toNonNegativeNumber = (value: unknown, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, value);
};
const toTimestampLike = (value: unknown): Date | Timestamp | null => {
  if (value instanceof Date || value instanceof Timestamp) {
    return value;
  }

  return null;
};
const parseCloudStorageStats = (
  userId: string,
  value: unknown,
): CloudStorageStats => {
  const data = isRecord(value) ? value : {};

  return {
    id: "current",
    userId: toNonEmptyString(data.userId) ?? userId,
    quotaBytes: toNonNegativeNumber(
      data.quotaBytes,
      DEFAULT_CLOUD_STORAGE_QUOTA_BYTES,
    ),
    totalStorageUsedBytes: toNonNegativeNumber(data.totalStorageUsedBytes, 0),
    syncedImageCount: toNonNegativeNumber(data.syncedImageCount, 0),
    schemaVersion: toNonNegativeNumber(
      data.schemaVersion,
      CLOUD_STORAGE_STATS_SCHEMA_VERSION,
    ),
    createdAt: toTimestampLike(data.createdAt),
    updatedAt: toTimestampLike(data.updatedAt),
    lastRebuiltAt: toTimestampLike(data.lastRebuiltAt),
  };
};
const isCloudStorageStatsOutdated = (stats: CloudStorageStats | null): boolean => {
  if (!stats) {
    return true;
  }

  return stats.schemaVersion !== CLOUD_STORAGE_STATS_SCHEMA_VERSION;
};
const subscribeToCloudStorageStats = (userId: string, onChange: (stats: CloudStorageStats | null) => void, onError: (error: unknown) => void): Unsubscribe => {
  const db = requireFirestoreDb();
  const pathSegments = storageStatsDocPathSegments(userId);

  return onSnapshot(
    doc(
      db,
      pathSegments[0] ?? "",
      pathSegments[1] ?? "",
      pathSegments[2] ?? "",
      pathSegments[3] ?? "",
    ),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      onChange(parseCloudStorageStats(userId, snapshot.data()));
    },
    onError,
  );
};
const rebuildCloudStorageStats = async (userId: string): Promise<CloudStorageStats> => {
  const callable = httpsCallable<void, RebuildStorageStatsResponse>(functionsClient, "rebuildStorageStats");
  const result = await callable();

  return parseCloudStorageStats(userId, {
    ...result.data,
    updatedAt: new Date(),
    lastRebuiltAt: new Date(),
  });
};



export { CLOUD_STORAGE_STATS_SCHEMA_VERSION, DEFAULT_CLOUD_STORAGE_QUOTA_BYTES, isCloudStorageStatsOutdated, subscribeToCloudStorageStats, rebuildCloudStorageStats };
