import { normalizeFolder, normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
import { cloneStorageRecord } from "@/domain/shared/storage/storageRecordUtils";
import type { Folder } from "@/types";



type StorageLike = Record<string, unknown>;



const denormalizeFolderForStorage = (value: Partial<Folder> | StorageLike): StorageLike => cloneStorageRecord(value);
const normalizeFolderFromStorage = (value: unknown): Folder => normalizeFolder(value);



export { normalizeFolderWithSilent, denormalizeFolderForStorage, normalizeFolderFromStorage };
