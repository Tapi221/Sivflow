import type { Folder } from "@/types/domain/folder";
import { normalizeDate } from "@/utils/codec/date";
import { toArrayOr, toBoolOr, toFiniteNumber, toOptionalString, toStringOr } from "@/utils/codec/primitives";
import { makeFallbackId } from "@/utils/fallbackId";
import { asRecord, pick } from "@/utils/records";



type NotePdf = NonNullable<Folder["notePdfs"]>[number];



const isNotePdf = (value: unknown): value is NotePdf => {
  const record = asRecord(value);
  if (!record) return false;

  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.remoteUrl === "string" &&
    typeof record.storagePath === "string"
  );
};
const normalizeNotePdfs = (raw: unknown): NotePdf[] => {
  return toArrayOr(raw, []).filter(isNotePdf);
};
const normalizeFolder = (raw: unknown): Folder => {
  const record = asRecord(raw) ?? {};
  const id =
    toStringOr(pick(record.id, record.folderId, record.folder_id), "") ||
    makeFallbackId();
  const isDeleted = toBoolOr(pick(record.isDeleted, record.is_deleted), false);
  const rawDeletedAt = pick(record.deletedAt, record.deleted_at);

  const deletedAt = rawDeletedAt
    ? normalizeDate(rawDeletedAt)
    : isDeleted
      ? (normalizeDate(
        pick(
          record.updatedAt,
          record.updated_at,
          record.createdAt,
          record.created_at,
        ),
      ) ?? new Date(0))
      : null;

  const rawParentFolderId = pick(
    record.parentFolderId,
    record.parent_folder_id,
    null,
  );
  const parentFolderId =
    rawParentFolderId === null || typeof rawParentFolderId === "string"
      ? rawParentFolderId
      : null;

  return {
    id,
    folderId: id,
    userId: toStringOr(pick(record.userId, record.user_id), ""),
    deviceId: toStringOr(pick(record.deviceId, record.device_id), ""),
    parentFolderId,
    folderName: toStringOr(pick(record.folderName, record.folder_name), ""),
    folderColor: toOptionalString(
      pick(record.folderColor, record.folder_color),
    ),
    orderIndex: toFiniteNumber(pick(record.orderIndex, record.order_index), 0),
    cloudSyncEnabled: toBoolOr(
      pick(record.cloudSyncEnabled, record.cloud_sync_enabled),
      true,
    ),
    isDeleted,
    deletedAt,
    isFavorite: toBoolOr(pick(record.isFavorite, record.is_favorite), false),
    isHidden: toBoolOr(pick(record.isHidden, record.is_hidden), false),
    isSilent: toBoolOr(pick(record.isSilent, record.is_silent), false),
    notePdfs: normalizeNotePdfs(pick(record.notePdfs, record.note_pdfs)),
    lastAccessAt: normalizeDate(
      pick(record.lastAccessAt, record.last_access_at),
    ),
    createdAt:
      normalizeDate(pick(record.createdAt, record.created_at)) ?? new Date(),
    updatedAt:
      normalizeDate(pick(record.updatedAt, record.updated_at)) ?? new Date(),
  };
};
const normalizeFolderWithSilent = (raw: unknown) => {
  if (!raw) return raw;
  const record = asRecord(raw);
  if (!record) return normalizeFolder(raw);

  const hasSilent = record.silent !== undefined;
  const hasIsSilent =
    record.isSilent !== undefined || record.is_silent !== undefined;
  const normalizedInput =
    !hasIsSilent && hasSilent ? { ...record, isSilent: record.silent } : raw;

  return normalizeFolder(normalizedInput);
};



export { normalizeFolder, normalizeFolderWithSilent };
