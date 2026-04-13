import { normalizeFolder, normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
import { cloneStorageRecord } from "@/domain/shared/storage/storageRecordUtils";
import type { Folder } from "@/types";

type StorageLike = Record<string, unknown>;

export const denormalizeFolderForStorage = (
  value: Partial<Folder> | StorageLike,
): StorageLike => cloneStorageRecord(value);

export const normalizeFolderFromStorage = (value: unknown): Folder =>
  normalizeFolder(value);

export { normalizeFolderWithSilent };
