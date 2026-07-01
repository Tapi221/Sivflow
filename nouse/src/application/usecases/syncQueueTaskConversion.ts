import type { SyncTask } from "@/services/interfaces/ISyncService";
import type { SyncQueueItem } from "@/types/domain/sync";



type RemovalQueueItem = Extract<SyncQueueItem, { operationType: "delete"; }>;



const isRemovalQueueItem = (item: SyncQueueItem): item is RemovalQueueItem => item.operationType === "delete";
const buildRemovalTombstonePayload = (item: RemovalQueueItem): Record<string, unknown> => {
  const removedAt = new Date(item.updatedAt || item.createdAt || Date.now());
  const basePayload = item.payload && typeof item.payload === "object" ? item.payload : {};

  return {
    ...basePayload,
    id: item.targetId,
    isDeleted: true,
    deletedAt: removedAt,
    updatedAt: removedAt,
  };
};
const getSyncTaskPayload = (item: SyncQueueItem): unknown => {
  if (isRemovalQueueItem(item)) return buildRemovalTombstonePayload(item);
  return item.payload;
};
const queueItemToSyncTask = (item: SyncQueueItem): SyncTask => ({ id: item.id, idempotencyKey: item.idempotencyKey, targetId: item.targetId, operationType: item.operationType, type: item.type, entity: item.entity, payload: getSyncTaskPayload(item), priority: item.priority, createdAt: item.createdAt });



export { queueItemToSyncTask };
