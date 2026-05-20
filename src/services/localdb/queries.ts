import { Dexie, type Table } from "dexie";

import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";

import { warnOncePerSession } from "@/services/localDBRuntimeState";
import { normalizeDate } from "@/shared/codec/date";
import { getDeviceName, getOrCreateDeviceId } from "@/utils/device";

/** queries.ts が必要とする LocalDB プロパティの最小インターフェース */
type QueryDb = Dexie & {
  readonly cards: Table;
  readonly folders: Table;
  readonly documents: Table;
  readonly syncMetadata: Table;
};

type MutableDocumentBlobFields = {
  localUrl?: string | null;
  blobUrl?: string | null;
};

export const getItem = async (db: QueryDb, table: string, id: string) => {
  const item = await db.table(table).get(id);
  if (table === "cards") return item ? normalizeCard(item) : item;
  if (table === "folders") return item ? normalizeFolderWithSilent(item) : item;
  return item;
};

export const getAllItems = async (db: QueryDb, table: string) => {
  const items = await db.table(table).toArray();
  if (table === "cards") return items.map(normalizeCard);
  if (table === "folders") return items.map(normalizeFolderWithSilent);
  return items;
};

export const getAllCards = async (db: QueryDb) => {
  return await db.cards.toArray();
};

export const getAllFolders = async (db: QueryDb) => {
  const folders = await db.folders.toArray();
  return folders.map(normalizeFolderWithSilent);
};

export const getDirtyItems = (
  db: QueryDb,
  table: string,
  userId: string,
  lastSyncTime: Date,
) => {
  return db
    .table(table)
    .where("[userId+updatedAt]")
    .between([userId, lastSyncTime], [userId, Dexie.maxKey])
    .toArray();
};

export const getUpdatedCards = (
  db: QueryDb,
  folderId: string,
  lastSyncTime: Date,
) => {
  return db.cards
    .where("folderId")
    .equals(folderId)
    .and((card: unknown) => {
      const updatedAt = (card as Record<string, unknown>).updatedAt;
      const updated = normalizeDate(updatedAt) ?? new Date(0);
      return updated > lastSyncTime;
    })
    .toArray();
};

export const getLastSyncTime = async (db: QueryDb, userId: string) => {
  const meta = await db.syncMetadata.get(userId);
  if (!meta || !meta.lastSyncTime) return null;
  return normalizeDate(meta.lastSyncTime);
};

export const updateLastSyncTime = async (
  db: QueryDb,
  userId: string,
  syncTime: Date,
) => {
  await db.syncMetadata.put({
    userId,
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
    lastSyncTime: syncTime,
    lastHighResSync: null,
    isActive: true,
  });
};

export const normalizeDocumentBlobUrlsForSession = async (db: QueryDb) => {
  try {
    await db.documents.toCollection().modify((document: unknown) => {
      const record = document as MutableDocumentBlobFields;

      if (
        typeof record.localUrl === "string" &&
        record.localUrl.startsWith("blob:")
      ) {
        record.localUrl = null;
      }
      if (
        typeof record.blobUrl === "string" &&
        record.blobUrl.startsWith("blob:")
      ) {
        record.blobUrl = null;
      }
    });
  } catch (error) {
    warnOncePerSession(
      "localdb:normalize-document-blob-urls-failed",
      "[LocalDB] Failed to normalize stale document blob URLs.",
      error,
    );
  }
};
