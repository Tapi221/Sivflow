type StorageLike = Record<string, unknown>;

export const isStorageRecord = (value: unknown): value is StorageLike =>
  typeof value === "object" && value !== null;

export const cloneStorageRecord = (value: unknown): StorageLike =>
  isStorageRecord(value) ? { ...value } : {};
