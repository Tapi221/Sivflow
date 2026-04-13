import type { SyncTask } from "@/services/interfaces/ISyncService";
import type {
  SyncDirection,
  SyncOperationType,
  SyncPriority,
  SyncQueueItem,
} from "@/types/domain/sync";

import type {
  DeleteEntity,
  UpsertEntity,
  UpsertQueueItem,
} from "./syncQueuePayloadGuards";
import {
  assertDeletePayload,
  assertUpsertPayload,
} from "./syncQueuePayloadGuards";

const createBaseQueueFields = ({
  targetId,
  priority,
  type,
}: {
  targetId: string;
  priority: SyncPriority;
  type: SyncDirection;
}) => {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    targetId,
    priority,
    type,
    createdAt: now,
    updatedAt: now,
    status: "pending" as const,
    retryCount: 0,
  };
};

const getTaskPayloadId = (payload: unknown): string | null => {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  return typeof record.id === "string" && record.id.length > 0
    ? record.id
    : null;
};

export const createUpsertQueueItem = <TEntity extends UpsertEntity>({
  entity,
  operationType,
  payload,
  priority = "high",
  type = "upload",
}: {
  entity: TEntity;
  operationType: Extract<SyncOperationType, "create" | "update">;
  payload: unknown;
  priority?: SyncPriority;
  type?: SyncDirection;
}): UpsertQueueItem<TEntity> => {
  const checkedPayload = assertUpsertPayload(entity, payload);

  return {
    ...createBaseQueueFields({
      targetId: checkedPayload.id,
      priority,
      type,
    }),
    entity,
    operationType,
    action: operationType,
    payload: checkedPayload,
  } as UpsertQueueItem<TEntity>;
};

export const createDeleteQueueItem = ({
  entity,
  targetId,
  priority = "high",
  type = "upload",
}: {
  entity: DeleteEntity;
  targetId: string;
  priority?: SyncPriority;
  type?: SyncDirection;
}): SyncQueueItem => {
  const deletePayload = assertDeletePayload({ id: targetId });

  return {
    ...createBaseQueueFields({
      targetId,
      priority,
      type,
    }),
    entity,
    operationType: "delete",
    action: "delete",
    payload: deletePayload,
  };
};

export const createQueueItemFromSyncTask = (task: SyncTask): SyncQueueItem =>
  ({
    id: task.id || crypto.randomUUID(),
    idempotencyKey: task.idempotencyKey || crypto.randomUUID(),
    targetId: task.targetId || getTaskPayloadId(task.payload) || "unknown",
    operationType:
      task.operationType || (task.type === "upload" ? "update" : "create"),
    type: task.type,
    entity: task.entity,
    payload: task.payload,
    priority: task.priority,
    createdAt: task.createdAt || Date.now(),
    updatedAt: Date.now(),
    retryCount: 0,
    status: "pending",
  }) as SyncQueueItem;
