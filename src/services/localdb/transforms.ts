import { deleteDocumentBlobsByUser } from "@/services/documentFileStore";
import { deleteImageBlobsByUser } from "@/services/imageFileStore";

type LegacyTagRecord = { id: string };
type SyncHistoryRecord = { id: string; finishedAt: number };
type SyncErrorRecord = { id: string; occurredAt: number; retryable: boolean };
type DeviceMetaRecord = { userId?: string };
type FolderRecord = { cloudSyncEnabled?: boolean };

type QueryChain<T> = {
  delete: () => Promise<number>;
  toArray: () => Promise<T[]>;
  first?: () => Promise<T | undefined>;
};

type WhereClause<T> = {
  below: (value: number) => QueryChain<T>;
  equals?: (value: string) => {
    first: () => Promise<T | undefined>;
    and: (predicate: (value: T) => boolean) => QueryChain<T>;
  };
};

type TableLike<T> = {
  clear: () => Promise<void>;
  put?: (value: T) => Promise<unknown>;
  where: (index: string) => WhereClause<T>;
  orderBy: (index: string) => {
    toArray: () => Promise<T[]>;
  };
  bulkDelete: (ids: string[]) => Promise<void>;
};

type DBWithLegacyTables = {
  folders: TableLike<FolderRecord>;
  cards: TableLike<unknown>;
  documents: TableLike<unknown>;
  users: TableLike<unknown>;
  userSettings: TableLike<unknown>;
  userStats: TableLike<unknown>;
  syncMetadata: TableLike<unknown>;
  levelHistories: TableLike<unknown>;
  deviceMeta: TableLike<DeviceMetaRecord> & {
    put: (value: unknown) => Promise<unknown>;
  };
  syncErrors: TableLike<SyncErrorRecord>;
  syncHistory: TableLike<SyncHistoryRecord>;
  syncSettings: TableLike<unknown>;
  syncQueue: TableLike<unknown>;
  conflicts: TableLike<unknown>;
  tags: TableLike<LegacyTagRecord>;
  table: (name: string) => {
    clear: () => Promise<void>;
  };
  userId?: string;
};

export const clearAllData = async (db: DBWithLegacyTables) => {
  await Promise.all([
    db.folders.clear(),
    db.cards.clear(),
    db.documents.clear(),
    db.users.clear(),
    db.userSettings.clear(),
    db.userStats.clear(),
    db.syncMetadata.clear(),
    db.levelHistories.clear(),
    db.deviceMeta.clear(),
    db.syncErrors.clear(),
    db.syncHistory.clear(),
    db.syncSettings.clear(),
    db.syncQueue.clear(),
    db.conflicts.clear(),
    db.tags.clear(),
    db.table("studyLogs").clear(),
    db.userId ? deleteDocumentBlobsByUser(db.userId) : Promise.resolve(),
    db.userId ? deleteImageBlobsByUser(db.userId) : Promise.resolve(),
  ]);
};

export const cleanupSyncHistory = async (db: DBWithLegacyTables) => {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  await db.syncHistory
    .where("finishedAt")
    .below(now - THIRTY_DAYS)
    .delete();

  const all = await db.syncHistory.orderBy("finishedAt").toArray();

  if (all.length > 100) {
    const toDelete = all.slice(0, all.length - 100).map((entry) => entry.id);
    await db.syncHistory.bulkDelete(toDelete);
  }
};

export const cleanupSyncErrors = async (db: DBWithLegacyTables) => {
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  const oldErrors = await db.syncErrors
    .where("occurredAt")
    .below(now - SEVEN_DAYS)
    .toArray();

  const nonRetryableIds = oldErrors
    .filter((error) => error.retryable === false)
    .map((error) => error.id);

  if (nonRetryableIds.length > 0) {
    await db.syncErrors.bulkDelete(nonRetryableIds);
  }
};

export const getDeviceMeta = (
  db: DBWithLegacyTables,
  userId: string,
): Promise<DeviceMetaRecord | undefined> => {
  const equals = db.deviceMeta.where("userId").equals;

  if (!equals) {
    return Promise.resolve(undefined);
  }

  return equals(userId).first();
};

export const upsertDeviceMeta = async (
  db: DBWithLegacyTables,
  meta: unknown,
) => {
  await db.deviceMeta.put(meta);
};

export const getSyncEnabledFolders = (
  db: DBWithLegacyTables,
  userId: string,
): Promise<FolderRecord[]> => {
  const equals = db.folders.where("userId").equals;

  if (!equals) {
    return Promise.resolve([]);
  }

  return equals(userId)
    .and((folder) => folder.cloudSyncEnabled === true)
    .toArray();
};
