import {
  type CloudEntityType,
  isCloudEntityType,
} from "./cloudSyncEntityMetadata";

import type { SyncChange } from "@/services/interfaces/ISyncService";

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
