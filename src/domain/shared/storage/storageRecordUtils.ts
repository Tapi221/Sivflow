type StorageLike = Record<string, unknown>;



const isStorageRecord = (value: unknown): value is StorageLike => typeof value === "object" && value !== null;
const cloneStorageRecord = (value: unknown): StorageLike => isStorageRecord(value) ? { ...value } : {};



export { isStorageRecord, cloneStorageRecord };
