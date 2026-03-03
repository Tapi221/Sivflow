import { normalizeCard } from '../../utils';
import { normalizeFolderWithSilent } from './transforms';
import { Dexie } from 'dexie';
import { Timestamp } from 'firebase/firestore';
import { getOrCreateDeviceId, getDeviceName } from '../../utils/device';
import { warnOncePerSession } from '../localDBRuntimeState';

export async function getItem(db: unknown, table: string, id: string): Promise<unknown> {
  const item = await db.table(table).get(id);
  if (table === 'cards') return item ? normalizeCard(item) : item;
  if (table === 'folders') return item ? normalizeFolderWithSilent(item) : item;
  return item;
}

export async function getAllItems(db: unknown, table: string): Promise<unknown[]> {
  const items = await db.table(table).toArray();
  if (table === 'cards') return items.map(normalizeCard);
  if (table === 'folders') return items.map(normalizeFolderWithSilent);
  return items;
}

export async function getAllCards(db: unknown): Promise<unknown[]> {
  // Return raw objects to preserve _rescueRaw and other fields for integrity repair
  return await db.cards.toArray();
}

export async function getAllFolders(db: unknown): Promise<unknown[]> {
  const folders = await db.folders.toArray();
  return folders.map(normalizeFolderWithSilent);
}

export async function getDirtyItems(
  db: unknown,
  table: string,
  userId: string,
  lastSyncTime: Date
): Promise<unknown[]> {
  return db.table(table)
    .where('[userId+updatedAt]')
    .between([userId, lastSyncTime], [userId, Dexie.maxKey])
    .toArray();
}

export async function getUpdatedCards(
  db: unknown,
  folderId: string,
  lastSyncTime: Date
): Promise<unknown[]> {
  return db.cards.where('folderId').equals(folderId).and((c: unknown) => {
    const updatedAt = (c as Record<string, unknown>).updatedAt;
    const updated = updatedAt instanceof Date
      ? updatedAt
      : (updatedAt as { toDate?(): Date } | null)?.toDate?.() ?? new Date(0);
    return updated > lastSyncTime;
  }).toArray();
}

export async function getLastSyncTime(db: unknown, userId: string): Promise<Date | null> {
  const meta = await db.syncMetadata.get(userId);
  if (!meta || !meta.lastSyncTime) return null;
  return meta.lastSyncTime instanceof Timestamp ? meta.lastSyncTime.toDate() : meta.lastSyncTime;
}

export async function updateLastSyncTime(db: unknown, userId: string, syncTime: Date): Promise<void> {
  await db.syncMetadata.put({
    userId: userId,
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
    lastSyncTime: syncTime,
    lastHighResSync: null,
    isActive: true
  });
}

export async function normalizeDocumentBlobUrlsForSession(db: unknown): Promise<void> {
  try {
    await db.documents.toCollection().modify((d: unknown) => {
      if (typeof d.localUrl === 'string' && d.localUrl.startsWith('blob:')) {
        d.localUrl = null;
      }
      if (typeof d.blobUrl === 'string' && d.blobUrl.startsWith('blob:')) {
        d.blobUrl = null;
      }
    });
  } catch (error) {
    warnOncePerSession(
      'localdb:normalize-document-blob-urls-failed',
      '[LocalDB] Failed to normalize stale document blob URLs.',
      error
    );
  }
}
