import type { SyncTask } from "@/services/interfaces/ISyncService";
import type { CardSet } from "@/types/domain/cardSet";
import type { Document } from "@/types/domain/document";
import type {
  AssetSyncPayload,
  SyncDeletePayload,
  SyncDirection,
  SyncEntity,
  SyncOperationType,
  SyncPayloadByEntity,
  SyncPriority,
  SyncQueueItem,
  TagSyncPayload,
} from "@/types/domain/sync";
import type { UserSettings } from "@/types/domain/user";
import type { Card, Folder } from "@/types";

type UpsertEntity = keyof SyncPayloadByEntity;
type DeleteEntity = Extract<
  SyncEntity,
  "card" | "folder" | "cardSet" | "document" | "tag" | "asset"
>;

type UpsertQueueItem<TEntity extends UpsertEntity> = Extract<
  SyncQueueItem,
  { entity: TEntity; operationType: "create" | "update" }
>;

type DateLike = Date | { toDate?: () => Date } | null | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasString = (value: Record<string, unknown>, key: string): boolean =>
  typeof value[key] === "string" && value[key].length > 0;

const hasBoolean = (value: Record<string, unknown>, key: string): boolean =>
  typeof value[key] === "boolean";

const hasNumber = (value: Record<string, unknown>, key: string): boolean =>
  typeof value[key] === "number" && Number.isFinite(value[key]);

const isDateLike = (value: unknown): value is DateLike =>
  value instanceof Date ||
  (isRecord(value) && typeof value.toDate === "function");

const hasBaseEntityShape = (value: unknown): value is { id: string } =>
  isRecord(value) &&
  hasString(value, "id") &&
  hasString(value, "userId") &&
  hasString(value, "deviceId") &&
  isDateLike(value.createdAt) &&
  isDateLike(value.updatedAt) &&
  hasBoolean(value, "isDeleted");

const isCardPayload = (value: unknown): value is Card => hasBaseEntityShape(value);

const isFolderPayload = (value: unknown): value is Folder => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;
  if (!hasString(value, "name")) return false;
  const folderRecord = value as Record<string, unknown>;
  const parentId = folderRecord.parentId;
  return (
    parentId === undefined ||
    parentId === null ||
    typeof parentId === "string"
  );
};

const isCardSetPayload = (value: unknown): value is CardSet => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;
  return hasString(value, "name") && hasNumber(value, "cardCount");
};

const isDocumentPayload = (value: unknown): value is Document => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;
  return hasString(value, "title") || hasString(value, "name");
};

const isTagPayload = (value: unknown): value is TagSyncPayload => {
  return hasBaseEntityShape(value);
};

const isUserSettingPayload = (value: unknown): value is UserSettings => {
  return hasBaseEntityShape(value);
};

const isAssetPayload = (value: unknown): value is AssetSyncPayload => {
  return isRecord(value) && hasString(value, "id");
};

const assertUpsertPayload = <TEntity extends UpsertEntity>(
  entity: TEntity,
  payload: unknown,
): SyncPayloadByEntity[TEntity] => {
  switch (entity) {
    case "card":
      if (isCardPayload(payload))
        return payload as SyncPayloadByEntity[TEntity];
      break;
    case "folder":
      if (isFolderPayload(payload))
        return payload as SyncPayloadByEntity[TEntity];
      break;
    case "cardSet":
      if (isCardSetPayload(payload))
        return payload as SyncPayloadByEntity[TEntity];
      break;
    case "document":
      if (isDocumentPayload(payload))
        return payload as SyncPayloadByEntity[TEntity];
      break;
    case "tag":
      if (isTagPayload(payload)) return payload as SyncPayloadByEntity[TEntity];
      break;
    case "userSetting":
      if (isUserSettingPayload(payload))
        return payload as SyncPayloadByEntity[TEntity];
      break;
    case "asset":
      if (isAssetPayload(payload))
        return payload as SyncPayloadByEntity[TEntity];
      break;
  }

  throw new Error(`Invalid payload for sync entity: ${entity}`);
};

const assertDeletePayload = (payload: unknown): SyncDeletePayload => {
  if (isRecord(payload) && hasString(payload, "id")) {
    return { id: String(payload.id) };
  }

  throw new Error("Delete payload must include a string id");
};

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
  if (!isRecord(payload)) return null;
  return typeof payload.id === "string" && payload.id.length > 0
    ? payload.id
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
