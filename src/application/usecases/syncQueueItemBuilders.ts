import type { DeleteEntity, UpsertEntity, UpsertQueueItem } from "./syncQueuePayloadGuards";
import { assertDeletePayload, assertUpsertPayload } from "./syncQueuePayloadGuards";
import type { SyncTask } from "@/services/interfaces/ISyncService";
import type { SyncDirection, SyncOperationType, SyncPriority, SyncQueueItem } from "@/types/domain/sync";



const normalizeForStableHash = (value: unknown): unknown => {
  if (value instanceof Date) {
    return { $date: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForStableHash(entry));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        const entryValue = record[key];
        if (entryValue === undefined) return accumulator;
        accumulator[key] = normalizeForStableHash(entryValue);
        return accumulator;
      }, {});
  }

  return value;
};
const stableStringify = (value: unknown): string => {
  return JSON.stringify(normalizeForStableHash(value));
};
const hashString = (input: string): string => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
};
const buildDeterministicQueueId = ({
  entity,
  operationType,
  targetId,
  payload,
  type,
}: {
  entity: string;
  operationType: SyncOperationType;
  targetId: string;
  payload: unknown;
  type: SyncDirection;
}): string => {
  const identitySource = stableStringify({
    entity,
    operationType,
    targetId,
    type,
    payload,
  });

  return `sync_${hashString(identitySource)}`;
};
const getTaskPayloadId = (payload: unknown): string | null => {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  return typeof record.id === "string" && record.id.length > 0
    ? record.id
    : null;
};
const createBaseQueueFields = ({
  entity,
  operationType,
  payload,
  priority,
  targetId,
  type,
}: {
  entity: string;
  operationType: SyncOperationType;
  payload: unknown;
  priority: SyncPriority;
  targetId: string;
  type: SyncDirection;
}) => {
  const now = Date.now();
  const deterministicId = buildDeterministicQueueId({
    entity,
    operationType,
    payload,
    targetId,
    type,
  });

  return {
    id: deterministicId,
    idempotencyKey: deterministicId,
    targetId,
    priority,
    type,
    createdAt: now,
    updatedAt: now,
    status: "pending" as const,
    retryCount: 0,
    nextRetryAt: now,
  };
};
const createUpsertQueueItem = <TEntity extends UpsertEntity>({ entity, operationType, payload, priority = "high", type = "upload" }: { entity: TEntity;
  operationType: Extract<SyncOperationType, "create" | "update">;
  payload: unknown;
  priority?: SyncPriority;
  type?: SyncDirection;
}): UpsertQueueItem<TEntity> => {
  const checkedPayload = assertUpsertPayload(entity, payload);

  return {
    ...createBaseQueueFields({
      entity,
      operationType,
      payload: checkedPayload,
      priority,
      targetId: checkedPayload.id,
      type,
    }),
    entity,
    operationType,
    action: operationType,
    payload: checkedPayload,
  } as UpsertQueueItem<TEntity>;
};
const createDeleteQueueItem = ({ entity, targetId, id, priority = "high", type = "upload" }: { entity: DeleteEntity;
  targetId?: string;
  id?: string;
  userId?: string;
  priority?: SyncPriority;
  type?: SyncDirection;
}): SyncQueueItem => {
  const resolvedTargetId = targetId ?? id;
  if (!resolvedTargetId) throw new Error("Delete queue item targetId is required");
  const deletePayload = assertDeletePayload({ id: resolvedTargetId });

  return {
    ...createBaseQueueFields({
      entity,
      operationType: "delete",
      payload: deletePayload,
      priority,
      targetId: resolvedTargetId,
      type,
    }),
    entity,
    operationType: "delete",
    action: "delete",
    payload: deletePayload,
  };
};
const createQueueItemFromSyncTask = (task: SyncTask): SyncQueueItem => {
  const targetId = (task.targetId || getTaskPayloadId(task.payload)) ?? "unknown";
  const operationType =
    task.operationType || (task.type === "upload" ? "update" : "create");
  const deterministicId = buildDeterministicQueueId({
    entity: task.entity,
    operationType,
    payload: task.payload,
    targetId,
    type: task.type,
  });
  const createdAt = task.createdAt || Date.now();

  return {
    id: task.id || deterministicId,
    idempotencyKey: task.idempotencyKey || deterministicId,
    targetId,
    operationType,
    type: task.type,
    entity: task.entity,
    payload: task.payload,
    priority: task.priority,
    createdAt,
    updatedAt: Date.now(),
    retryCount: 0,
    status: "pending",
    nextRetryAt: createdAt,
  } as SyncQueueItem;
};



export { createUpsertQueueItem, createDeleteQueueItem, createQueueItemFromSyncTask };
