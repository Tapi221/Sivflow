import type { Card, Folder } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";
import type { Document } from "@/types/domain/document";
import type { AssetSyncPayload, ProjectMapSyncPayload, SyncDeletePayload, SyncEntity, SyncPayloadByEntity, SyncQueueItem, TagSyncPayload } from "@/types/domain/sync";
import type { UserSettings } from "@/types/domain/user";



type UpsertEntity = keyof SyncPayloadByEntity;
type DeleteEntity = Extract<SyncEntity, "card" | "folder" | "cardSet" | "document" | "tag" | "asset" | "projectMap">;
type UpsertQueueItem<TEntity extends UpsertEntity> = Extract<SyncQueueItem, { entity: TEntity; operationType: "create" | "update"; }>;
type DateLike = Date | { toDate?: () => Date; } | null | undefined;



const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const hasString = (value: Record<string, unknown>, key: string): boolean => typeof value[key] === "string" && value[key].length > 0;
const hasOptionalString = (value: Record<string, unknown>, key: string): boolean => {
  const field = value[key];
  return field === undefined || field === null || typeof field === "string";
};
const hasBoolean = (value: Record<string, unknown>, key: string): boolean => typeof value[key] === "boolean";
const hasOptionalNumber = (value: Record<string, unknown>, key: string): boolean => {
  const field = value[key];
  return field === undefined || (typeof field === "number" && Number.isFinite(field));
};
const hasNumber = (value: Record<string, unknown>, key: string): boolean => typeof value[key] === "number" && Number.isFinite(value[key]);
const hasOptionalStringArray = (value: Record<string, unknown>, key: string): boolean => {
  const field = value[key];
  return field === undefined || (Array.isArray(field) && field.every((item) => typeof item === "string"));
};
const isDateLike = (value: unknown): value is DateLike => value instanceof Date || (isRecord(value) && typeof value.toDate === "function");
const toRequiredString = (value: unknown): string | null => typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
const toOptionalString = (value: unknown): string | undefined => typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
const toOptionalNumber = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const toDateOrNull = (value: unknown): Date | null => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (isRecord(value) && typeof value.toDate === "function") {
    const converted = value.toDate();
    return converted instanceof Date && Number.isFinite(converted.getTime()) ? converted : null;
  }
  if (typeof value === "number" || typeof value === "string") {
    const converted = new Date(value);
    return Number.isFinite(converted.getTime()) ? converted : null;
  }
  return null;
};
const normalizeTagPayload = (value: unknown): TagSyncPayload | null => {
  if (!isRecord(value)) return null;
  const id = toRequiredString(value.id);
  const userId = toRequiredString(value.userId);
  const name = toRequiredString(value.name);
  if (!id || !userId || !name) return null;

  const now = new Date();
  const updatedAt = toDateOrNull(value.updatedAt) ?? now;
  const deletedAt = value.deletedAt === undefined || value.deletedAt === null ? null : (toDateOrNull(value.deletedAt) ?? updatedAt);
  const tagPayload: TagSyncPayload = {
    id,
    userId,
    name,
    nameLower: toRequiredString(value.nameLower) ?? name.toLowerCase(),
    color: typeof value.color === "string" ? value.color : "",
    updatedAt,
    createdAt: toDateOrNull(value.createdAt) ?? updatedAt,
    deviceId: toOptionalString(value.deviceId),
    isDeleted: typeof value.isDeleted === "boolean" ? value.isDeleted : false,
    deletedAt,
    categoryId: toOptionalString(value.categoryId),
    parentId: toOptionalString(value.parentId),
    orderIndex: toOptionalNumber(value.orderIndex),
  };
  return tagPayload;
};
const hasBaseEntityShape = (value: unknown): value is Record<string, unknown> => isRecord(value) && hasString(value, "id") && hasString(value, "userId") && hasString(value, "deviceId") && isDateLike(value.createdAt) && isDateLike(value.updatedAt) && hasBoolean(value, "isDeleted");
const isCardPayload = (value: unknown): value is Card => hasBaseEntityShape(value) && isRecord(value) && hasOptionalStringArray(value, "tagIds");
const isFolderPayload = (value: unknown): value is Folder => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;
  const hasFolderName = hasString(value, "folderName") || hasString(value, "name");
  if (!hasFolderName) return false;
  return hasOptionalString(value, "parentFolderId") && hasOptionalString(value, "parentId") && hasOptionalNumber(value, "orderIndex") && hasOptionalStringArray(value, "tags");
};
const isCardSetPayload = (value: unknown): value is CardSet => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;
  return hasString(value, "name") && hasOptionalString(value, "folderId") && hasOptionalNumber(value, "orderIndex") && (value.cardCount === undefined || hasNumber(value, "cardCount")) && hasOptionalStringArray(value, "tags");
};
const isDocumentPayload = (value: unknown): value is Document => {
  if (!hasBaseEntityShape(value) || !isRecord(value)) return false;
  return (hasString(value, "title") || hasString(value, "name")) && hasOptionalStringArray(value, "tags");
};
const isUserSettingPayload = (value: unknown): value is UserSettings => hasBaseEntityShape(value);
const isAssetPayload = (value: unknown): value is AssetSyncPayload => isRecord(value) && hasString(value, "id");
const isProjectMapPayload = (value: unknown): value is ProjectMapSyncPayload => isRecord(value) && hasString(value, "id") && hasString(value, "userId");
const assertUpsertPayload = <TEntity extends UpsertEntity>(entity: TEntity, payload: unknown): SyncPayloadByEntity[TEntity] => {
  switch (entity) { case "card": if (isCardPayload(payload)) return payload as SyncPayloadByEntity[TEntity];
    break;
    case "folder":
      if (isFolderPayload(payload)) return payload as SyncPayloadByEntity[TEntity];
      break;
    case "cardSet":
      if (isCardSetPayload(payload)) return payload as SyncPayloadByEntity[TEntity];
      break;
    case "document":
      if (isDocumentPayload(payload)) return payload as SyncPayloadByEntity[TEntity];
      break;
    case "tag": {
      const tagPayload = normalizeTagPayload(payload);
      if (tagPayload) return tagPayload as SyncPayloadByEntity[TEntity];
      break;
    }
    case "userSetting":
      if (isUserSettingPayload(payload)) return payload as SyncPayloadByEntity[TEntity];
      break;
    case "asset":
      if (isAssetPayload(payload)) return payload as SyncPayloadByEntity[TEntity];
      break;
    case "projectMap":
      if (isProjectMapPayload(payload)) return payload as SyncPayloadByEntity[TEntity];
      break;
  }
  throw new Error(`Invalid payload for sync entity: ${entity}`);
};
const assertDeletePayload = (payload: unknown): SyncDeletePayload => {
  if (isRecord(payload) && hasString(payload, "id")) return { id: String(payload.id) };
  throw new Error("Delete payload must include a string id");
};



export { assertUpsertPayload, assertDeletePayload };


export type { UpsertEntity, DeleteEntity, UpsertQueueItem };
