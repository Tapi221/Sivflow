import type { CardSet } from "@/types/domain/cardSet";
import type { Document } from "@/types/domain/document";
import type {
  AssetSyncPayload,
  SyncDeletePayload,
  SyncEntity,
  SyncPayloadByEntity,
  SyncQueueItem,
  TagSyncPayload,
} from "@/types/domain/sync";
import type { UserSettings } from "@/types/domain/user";
import type { Card, Folder } from "@/types";

export type UpsertEntity = keyof SyncPayloadByEntity;
export type DeleteEntity = Extract<
  SyncEntity,
  "card" | "folder" | "cardSet" | "document" | "tag" | "asset"
>;

export type UpsertQueueItem<TEntity extends UpsertEntity> = Extract<
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

const isCardPayload = (value: unknown): value is Card =>
  hasBaseEntityShape(value);

const isFolderPayload = (value: unknown): value is Folder => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;
  if (!hasString(value, "name")) return false;
  const folderRecord = value as Record<string, unknown>;
  const parentId = folderRecord.parentId;
  return (
    parentId === undefined || parentId === null || typeof parentId === "string"
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
  if (!isRecord(value)) return false;

  return (
    hasString(value, "id") &&
    hasString(value, "userId") &&
    hasString(value, "name") &&
    hasString(value, "nameLower") &&
    typeof value.color === "string" &&
    isDateLike(value.updatedAt) &&
    (value.createdAt === undefined || isDateLike(value.createdAt)) &&
    (value.deviceId === undefined || typeof value.deviceId === "string") &&
    (value.isDeleted === undefined || typeof value.isDeleted === "boolean") &&
    (value.deletedAt === undefined ||
      value.deletedAt === null ||
      isDateLike(value.deletedAt)) &&
    (value.categoryId === undefined || typeof value.categoryId === "string") &&
    (value.parentId === undefined || typeof value.parentId === "string")
  );
};

const isUserSettingPayload = (value: unknown): value is UserSettings =>
  hasBaseEntityShape(value);

const isAssetPayload = (value: unknown): value is AssetSyncPayload =>
  isRecord(value) && hasString(value, "id");

export const assertUpsertPayload = <TEntity extends UpsertEntity>(
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

export const assertDeletePayload = (payload: unknown): SyncDeletePayload => {
  if (isRecord(payload) && hasString(payload, "id")) {
    return { id: String(payload.id) };
  }

  throw new Error("Delete payload must include a string id");
};