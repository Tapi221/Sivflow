import type { SyncTask } from "@/services/interfaces/ISyncService";
import type { SyncQueueItem } from "@/types/domain/sync";

export const queueItemToSyncTask = (item: SyncQueueItem): SyncTask => ({
  id: item.id,
  idempotencyKey: item.idempotencyKey,
  targetId: item.targetId,
  operationType: item.operationType,
  type: item.type,
  entity: item.entity,
  payload: item.payload,
  priority: item.priority,
  createdAt: item.createdAt,
});
