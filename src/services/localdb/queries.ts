import { warnOncePerSession } from "@/services/localDBRuntimeState";
import { normalizeCard } from "@/utils";
import { getDeviceName, getOrCreateDeviceId } from "@/utils/device";
import { Dexie, type Table } from "dexie";
import { Timestamp } from "firebase/firestore";
import { normalizeFolderWithSilent } from "./transforms";

/** queries.ts が必要とする LocalDB プロパティの最小インターフェース */
type QueryDb = Dexie & {
  readonly cards: Table;
  readonly folders: Table;
  readonly documents: Table;
  readonly syncMetadata: Table;
};

export async function getItem(
  db: QueryDb,
  table: string,
  id: string,
): Promise<unknown> {
  const item = await db.table(table).get(id);
  if (table === "cards") return item ? normalizeCard(item) : item;
  if (table === "folders") return item ? normalizeFolderWithSilent(item) : item;
  return item;
}

export async function getAllItems(
  db: QueryDb,
  table: string,
): Promise<unknown[]> {
  const items = await db.table(table).toArray();
  if (table === "cards") return items.map(normalizeCard);
  if (table === "folders") return items.map(normalizeFolderWithSilent);
  return items;
}

export async function getAllCards(db: QueryDb): Promise<unknown[]> {
  // Return raw objects to preserve _rescueRaw and other fields for integrity repair
  return await db.cards.toArray();
}

export async function getAllFolders(db: QueryDb): Promise<unknown[]> {
  const folders = await db.folders.toArray();
  return folders.map(normalizeFolderWithSilent);
}

export async function getDirtyItems(
  db: QueryDb,
  table: string,
  userId: string,
  lastSyncTime: Date,
): Promise<unknown[]> {
  return db
    .table(table)
    .where("[userId+updatedAt]")
    .between([userId, lastSyncTime], [userId, Dexie.maxKey])
    .toArray();
}

export async function getUpdatedCards(
  db: QueryDb,
  folderId: string,
  lastSyncTime: Date,
): Promise<unknown[]> {
  return db.cards
    .where("folderId")
    .equals(folderId)
    .and((c: unknown) => {
      const updatedAt = (c as Record<string, unknown>).updatedAt;
      const updated =
        updatedAt instanceof Date
          ? updatedAt
          : ((updatedAt as { toDate?(): Date } | null)?.toDate?.() ??
            new Date(0));
      return updated > lastSyncTime;
    })
    .toArray();
}

export async function getLastSyncTime(
  db: QueryDb,
  userId: string,
): Promise<Date | null> {
  const meta = await db.syncMetadata.get(userId);
  if (!meta || !meta.lastSyncTime) return null;
  return meta.lastSyncTime instanceof Timestamp
    ? meta.lastSyncTime.toDate()
    : meta.lastSyncTime;
}

export async function updateLastSyncTime(
  db: QueryDb,
  userId: string,
  syncTime: Date,
): Promise<void> {
  await db.syncMetadata.put({
    userId: userId,
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
    lastSyncTime: syncTime,
    lastHighResSync: null,
    isActive: true,
  });
}

export async function normalizeDocumentBlobUrlsForSession(
  db: QueryDb,
): Promise<void> {
  try {
    await db.documents.toCollection().modify((d: unknown) => {
      if (typeof d.localUrl === "string" && d.localUrl.startsWith("blob:")) {
        d.localUrl = null;
      }
      if (typeof d.blobUrl === "string" && d.blobUrl.startsWith("blob:")) {
        d.blobUrl = null;
      }
    });
  } catch (error) {
    warnOncePerSession(
      "localdb:normalize-document-blob-urls-failed",
      "[LocalDB] Failed to normalize stale document blob URLs.",
      error,
    );
  }
}



