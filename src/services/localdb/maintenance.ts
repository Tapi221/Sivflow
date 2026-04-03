import { deleteDocumentBlobsByUser } from "@/services/documentFileStore";
import { deleteImageBlobsByUser } from "@/services/imageFileStore";

type Clearable = { clear(): Promise<void> };
type DBWithLegacyTables = {
  tags: Clearable;
  table(name: string): Clearable;
  userId?: string;
};

export async function clearAllData(db: unknown): Promise<void> {
  const dbExt = db as DBWithLegacyTables;
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
    dbExt.tags.clear(),
    dbExt.table("studyLogs").clear(),
    db.userId ? deleteDocumentBlobsByUser(db.userId) : Promise.resolve(),
    db.userId ? deleteImageBlobsByUser(db.userId) : Promise.resolve(),
  ]);
}

export async function cleanupSyncHistory(db: unknown): Promise<void> {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  await db.syncHistory
    .where("finishedAt")
    .below(now - THIRTY_DAYS)
    .delete();
  const all = await db.syncHistory.orderBy("finishedAt").toArray();
  if (all.length > 100) {
    const toDelete = all.slice(0, all.length - 100);
    await db.syncHistory.bulkDelete(toDelete.map((h: unknown) => h.id));
  }
}

export async function cleanupSyncErrors(db: unknown): Promise<void> {
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const oldErrors = await db.syncErrors
    .where("occurredAt")
    .below(now - SEVEN_DAYS)
    .and((e: unknown) => !e.retryable)
    .toArray();
  await db.syncErrors.bulkDelete(oldErrors.map((e: unknown) => e.id));
}

export async function getDeviceMeta(
  db: unknown,
  userId: string,
): Promise<Record<string, unknown> | undefined> {
  return db.deviceMeta.where("userId").equals(userId).first();
}

export async function upsertDeviceMeta(
  db: unknown,
  meta: unknown,
): Promise<void> {
  await db.deviceMeta.put(meta);
}

export async function getSyncEnabledFolders(
  db: unknown,
  userId: string,
): Promise<Record<string, unknown>[]> {
  return db.folders
    .where("userId")
    .equals(userId)
    .and((f: unknown) => f.cloudSyncEnabled === true)
    .toArray();
}





