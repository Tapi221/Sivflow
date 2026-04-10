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

type DateLike = Date | { toDate?: () => Date } | null | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const hasString = (value: Record<string, unknown>, key: string): boolean => {
  return typeof value[key] === "string" && value[key].length > 0;
};

const hasBoolean = (value: Record<string, unknown>, key: string): boolean => {
  return typeof value[key] === "boolean";
};

const hasNumber = (value: Record<string, unknown>, key: string): boolean => {
  return typeof value[key] === "number" && Number.isFinite(value[key]);
};

const isDateLike = (value: unknown): value is DateLike => {
  if (value == null) return true;
  if (value instanceof Date) return true;
  return isRecord(value) && typeof value.toDate === "function";
};

const hasBaseEntityShape = (
  value: unknown,
): value is {
  id: string;
  userId: string;
  deviceId: string;
  createdAt: DateLike;
  updatedAt: DateLike;
  isDeleted: boolean;
} => {
  if (!isRecord(value)) return false;

  return (
    hasString(value, "id") &&
    hasString(value, "userId") &&
    hasString(value, "deviceId") &&
    isDateLike(value.createdAt) &&
    isDateLike(value.updatedAt) &&
    hasBoolean(value, "isDeleted")
  );
};

const isCardPayload = (value: unknown): value is Card => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;

  return isRecord(value.front) && isRecord(value.back);
};

const isFolderPayload = (value: unknown): value is Folder => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;

  return hasString(value, "folderId") && hasString(value, "folderName");
};

const isCardSetPayload = (value: unknown): value is CardSet => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;

  return (
    "folderId" in value &&
    (typeof value.folderId === "string" || value.folderId === null) &&
    hasString(value, "name") &&
    hasNumber(value, "orderIndex")
  );
};

const isDocumentPayload = (value: unknown): value is Document => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;

  return (
    (value.kind === "pdf" || value.kind === "pptx") &&
    hasString(value, "folderId") &&
    hasNumber(value, "orderIndex") &&
    hasString(value, "title") &&
    hasString(value, "fileName") &&
    hasString(value, "mimeType") &&
    hasNumber(value, "sizeBytes")
  );
};

const isTagPayload = (value: unknown): value is TagSyncPayload => {
  if (!isRecord(value)) return false;

  return (
    hasString(value, "id") &&
    hasString(value, "userId") &&
    hasString(value, "name") &&
    hasString(value, "nameLower") &&
    hasString(value, "color") &&
    value.updatedAt instanceof Date
  );
};

const isUserSettingPayload = (value: unknown): value is UserSettings => {
  return hasBaseEntityShape(value);
};

const isAssetPayload = (value: unknown): value is AssetSyncPayload => {
  return isRecord(value) && hasString(value, "id");
};

const assertUpsertPayload = (
  entity: UpsertEntity,
  payload: unknown,
): SyncPayloadByEntity[UpsertEntity] => {
  switch (entity) {
    case "card":
      if (isCardPayload(payload)) return payload;
      break;
    case "folder":
      if (isFolderPayload(payload)) return payload;
      break;
    case "cardSet":
      if (isCardSetPayload(payload)) return payload;
      break;
    case "document":
      if (isDocumentPayload(payload)) return payload;
      break;
    case "tag":
      if (isTagPayload(payload)) return payload;
      break;
    case "userSetting":
      if (isUserSettingPayload(payload)) return payload;
      break;
    case "asset":
      if (isAssetPayload(payload)) return payload;
      break;
  }

  throw new Error(`Invalid payload for sync entity: ${entity}`);
};

const assertDeletePayload = (payload: unknown): SyncDeletePayload => {
  if (isRecord(payload) && hasString(payload, "id")) {
    return { id: payload.id };
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

export const createUpsertQueueItem = ({
  entity,
  operationType,
  payload,
  priority = "high",
  type = "upload",
}: {
  entity: UpsertEntity;
  operationType: Extract<SyncOperationType, "create" | "update">;
  payload: unknown;
  priority?: SyncPriority;
  type?: SyncDirection;
}): SyncQueueItem => {
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
  };
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

export const queueItemToSyncTask = (item: SyncQueueItem): SyncTask => {
  return {
    id: item.id,
    idempotencyKey: item.idempotencyKey,
    targetId: item.targetId,
    operationType: item.operationType,
    type: item.type,
    entity: item.entity,
    payload: item.payload,
    priority: item.priority,
    createdAt: item.createdAt,
  };
};
