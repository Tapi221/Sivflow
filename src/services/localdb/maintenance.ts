type MaintenanceDb = {
  tables: Array<{
    clear(): PromiseLike<void> | void;
  }>;
  syncHistory: {
    where(index: string): {
      below(value: number): {
        delete(): PromiseLike<number> | number;
      };
    };
    orderBy(index: string): {
      toArray(): Promise<Array<{ id: string; }>>;
    };
    bulkDelete(ids: string[]): PromiseLike<void> | void;
  };
  syncErrors: {
    where(index: string): {
      below(value: number): {
        and(predicate: (item: { retryable?: boolean; }) => boolean): {
          toArray(): Promise<Array<{ id: string; retryable?: boolean; }>>;
        };
      };
    };
    bulkDelete(ids: string[]): PromiseLike<void> | void;
  };
  deviceMeta: {
    where(index: string): {
      equals(value: string): {
        first(): Promise<Record<string, unknown> | undefined>;
      };
    };
    put(meta: Record<string, unknown>): PromiseLike<unknown> | unknown;
  };
  folders: {
    where(index: string): {
      equals(value: string): {
        and(predicate: (folder: Record<string, unknown>) => boolean): {
          toArray(): Promise<Record<string, unknown>[]>;
        };
      };
    };
  };
};



const clearAllData = async (db: MaintenanceDb): Promise<void> => {
  await Promise.all(db.tables.map((table) => table.clear()));
};
const cleanupSyncHistory = async (db: MaintenanceDb): Promise<void> => {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  await db.syncHistory
    .where("finishedAt")
    .below(now - THIRTY_DAYS)
    .delete();

  const all = await db.syncHistory.orderBy("finishedAt").toArray();
  if (all.length > 100) {
    const toDelete = all.slice(0, all.length - 100).map((item) => item.id);
    await db.syncHistory.bulkDelete(toDelete);
  }
};
const cleanupSyncErrors = async (db: MaintenanceDb): Promise<void> => {
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  const oldErrors = await db.syncErrors
    .where("occurredAt")
    .below(now - SEVEN_DAYS)
    .and((item) => item.retryable !== true)
    .toArray();

  await db.syncErrors.bulkDelete(oldErrors.map((item) => item.id));
};
const getDeviceMeta = async (db: MaintenanceDb, userId: string): Promise<Record<string, unknown> | undefined> => {
  return db.deviceMeta.where("userId").equals(userId).first();
};
const upsertDeviceMeta = async (db: MaintenanceDb, meta: Record<string, unknown>): Promise<void> => {
  await db.deviceMeta.put(meta);
};
const getSyncEnabledFolders = async (db: MaintenanceDb, userId: string): Promise<Record<string, unknown>[]> => {
  return db.folders.where("userId").equals(userId).and((folder: Record<string, unknown>) => folder.cloudSyncEnabled === true).toArray();
};



export { createDeleteQueueItem, createUpsertQueueItem, queueItemToSyncTask } from "@/application/usecases/syncQueueItemFactory";
export { clearAllData, cleanupSyncHistory, cleanupSyncErrors, getDeviceMeta, upsertDeviceMeta, getSyncEnabledFolders };
