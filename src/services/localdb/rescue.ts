import { telemetryOncePerSession } from "@/services/localDBRuntimeState";
import type { Card } from "@/types";
import { getDeviceName, getOrCreateDeviceId } from "@/utils/device";
import { Dexie } from "dexie";
import { hasBlobUrlDeep, scrubBlobUrlsDeep } from "./blobUrl";
import type { LocalDB } from "./LocalDB";
import { denormalizeCardForStorage } from "./transforms";

type LocalDBWithTags = LocalDB & {
  tags: { bulkPut(items: unknown[]): Promise<unknown> };
};

// ─── Firestore document flattening (private helpers) ───────────────────────

function parseFields(fields: unknown): unknown {
  const result: unknown = {};
  for (const [key, field] of Object.entries(fields)) {
    const f = field as Record<string, unknown>;
    if (f.stringValue !== undefined) result[key] = f.stringValue;
    else if (f.booleanValue !== undefined) result[key] = f.booleanValue;
    else if (f.integerValue !== undefined) result[key] = Number(f.integerValue);
    else if (f.doubleValue !== undefined) result[key] = Number(f.doubleValue);
    else if (f.timestampValue !== undefined) {
      result[key] =
        f.timestampValue instanceof Date
          ? f.timestampValue
          : new Date(f.timestampValue as string | number);
    } else if (f.mapValue !== undefined)
      result[key] = flattenFirestoreDocument({ value: f });
  }
  return result;
}

function flattenFirestoreDocument(data: unknown): unknown {
  if (!data) return null;
  if (data.value?.mapValue?.fields)
    return parseFields(data.value.mapValue.fields);
  if (data.fields) return parseFields(data.fields);
  if (typeof data === "object" && !data.value && !data.fields) return data;
  return null;
}

// ─── finalizeRawImport ──────────────────────────────────────────────────────

async function finalizeRawImport(
  db: LocalDB,
  folders: unknown[],
  cards: unknown[],
  userId: string,
  onProgress?: (m: string) => void,
): Promise<{ folders: number; cards: number; firstCardKeys: string[] }> {
  console.log(
    `[Rescue] Raw Scan Results: ${folders.length} folders, ${cards.length} cards.`,
  );
  onProgress?.(`保存中 (${folders.length + cards.length}件)...`);

  if (folders.length > 0) await db.folders.bulkPut(folders);
  if (cards.length > 0) {
    const sanitizedCards = cards.map((card) => {
      const payload = denormalizeCardForStorage(card);
      return hasBlobUrlDeep(payload) ? scrubBlobUrlsDeep(payload) : payload;
    }) as Card[];
    await db.cards.bulkPut(sanitizedCards);
  }

  // Verification Log
  const dbFolders = await db.folders.toArray();
  const dbCards = await db.cards.toArray();
  console.log(
    `[Rescue] Post-Save Dexie Count: Folders=${dbFolders.length}, Cards=${dbCards.length}`,
  );

  await db.syncMetadata.put({
    userId,
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
    lastSyncTime: new Date(),
    lastHighResSync: null,
    isActive: true,
  });

  onProgress?.("復旧完了！");
  return { folders: folders.length, cards: cards.length, firstCardKeys: [] };
}

// ─── extractFromFirestoreSDK ────────────────────────────────────────────────

export async function extractFromFirestoreSDK(
  db: LocalDB,
  sourceDbName: string,
  currentUserId: string,
  onProgress?: (progress: string) => void,
): Promise<{ cards: number; folders: number; firstCardKeys: string[] }> {
  console.log(`[Rescue] Attempting Raw Native Extraction: ${sourceDbName}`);
  onProgress?.("ネイティブ接続を試行中...");

  let nativeDb: IDBDatabase | null = null;

  return new Promise((resolve, reject) => {
    const recoveredFolders: unknown[] = [];
    const recoveredCards: unknown[] = [];

    // Native Open without version (doesn't trigger upgrade/block)
    const request = indexedDB.open(sourceDbName);

    const timeout = setTimeout(() => {
      reject(new Error("Native DB Open Timeout (10s)"));
    }, 10000);

    request.onerror = () => {
      clearTimeout(timeout);
      reject(request.error);
    };

    request.onsuccess = async () => {
      clearTimeout(timeout);
      nativeDb = request.result;
      const nativeDbRef = nativeDb;
      try {
        const tableNames = Array.from(nativeDbRef.objectStoreNames);
        console.log(`[Rescue] Native Tables: ${tableNames.join(", ")}`);
        onProgress?.(`Tables: ${tableNames.join(", ")}`);

        // V20 Strategy: Simple Tombstone Recovery
        const targetTable = tableNames.find((n) =>
          n.startsWith("remoteDocuments"),
        );
        if (!targetTable) {
          onProgress?.("対象テーブルが見つかりません (Native)");
          try {
            nativeDb?.close();
          } catch {
            /* ignore close errors */
          }
          return resolve({ cards: 0, folders: 0, firstCardKeys: [] });
        }

        const activeTable = targetTable;
        onProgress?.(`データを読み込み中 (${activeTable})...`);

        const transaction = nativeDbRef.transaction(activeTable, "readonly");
        const store = transaction.objectStore(activeTable);
        const cursorRequest = store.openCursor();

        cursorRequest.onsuccess = (e: Event) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>)
            .result;
          if (cursor) {
            const record = cursor.value;

            // Safety Block (V25 - Orphan Recovery)
            try {
              let parts: string[] = [];
              let parentCollection = "";
              let foundFolderId = "";
              let id = "";
              let isFolder = false;
              let isCard = false;

              if (Array.isArray(cursor.key) && cursor.key.length > 0) {
                parts = cursor.key.map(String);
              } else {
                const p =
                  record.path ||
                  (typeof cursor.key === "string" ? cursor.key : "");
                if (p) parts = p.split("/");
              }

              if (parts.length >= 2) {
                id = parts[parts.length - 1];
                parentCollection = parts[parts.length - 2];

                if (
                  parentCollection === "folders" ||
                  parentCollection === "folder"
                ) {
                  isFolder = true;
                } else if (
                  parentCollection === "cards" ||
                  parentCollection === "card" ||
                  parentCollection === "flashcards"
                ) {
                  isCard = true;
                  const folderIndex = parts.indexOf("folders");
                  if (folderIndex !== -1 && folderIndex + 1 < parts.length) {
                    foundFolderId = parts[folderIndex + 1];
                  }
                }
              }

              if ((isFolder || isCard) && id && id !== "0,0") {
                let data = flattenFirestoreDocument(
                  record.document?.data ||
                    record.data ||
                    record.value ||
                    record,
                );
                if (!data || Object.keys(data).length === 0) {
                  data = { createdAt: new Date() };
                }

                const item: unknown = { ...data };
                item.id = id;
                item.userId = currentUserId;
                item.isDeleted = false;
                item.is_deleted = false;
                item.updatedAt = new Date();
                item._rescueOrigin = "TombstoneV25";
                item._rescueRaw = record;

                if (isFolder) {
                  item.folderId = id;
                  item.parentFolderId = null;
                  item.folderName =
                    data.folderName ||
                    data.name ||
                    data.title ||
                    `(復元フォルダ) ${id.substring(0, 4)}`;

                  const idx = recoveredFolders.findIndex((f) => f.id === id);
                  if (idx === -1) recoveredFolders.push(item);
                  else recoveredFolders[idx] = item;
                } else {
                  item.folderId = foundFolderId || "RESCUE_ORPHANS_FOLDER";
                  item.questionText =
                    data.questionText ||
                    data.front ||
                    `(復元カード) ${id.substring(0, 4)}`;
                  item.answerText =
                    data.answerText ||
                    data.back ||
                    "データ破損によりコンテンツ不明";

                  const idx = recoveredCards.findIndex((c) => c.id === id);
                  if (idx === -1) recoveredCards.push(item);
                  else recoveredCards[idx] = item;
                }
              }
            } catch (err) {
              console.error("[Rescue-V25] Process Error", err);
            }

            cursor.continue();
          } else {
            // Finished Logic: Create Orphan Folder if needed
            if (
              recoveredCards.some((c) => c.folderId === "RESCUE_ORPHANS_FOLDER")
            ) {
              const rescueFolderId = "RESCUE_ORPHANS_FOLDER";
              if (!recoveredFolders.find((f) => f.id === rescueFolderId)) {
                recoveredFolders.push({
                  id: rescueFolderId,
                  folderId: rescueFolderId,
                  userId: currentUserId,
                  folderName: "【復旧済み】未分類のカード",
                  parentFolderId: null,
                  isDeleted: false,
                  is_deleted: false,
                  updatedAt: new Date(),
                  _rescueOrigin: "TombstoneV25",
                });
              }
            }

            finalizeRawImport(
              db,
              recoveredFolders,
              recoveredCards,
              currentUserId,
              onProgress,
            )
              .then(resolve)
              .catch(reject)
              .finally(() => {
                try {
                  nativeDb?.close();
                } catch {
                  /* ignore close errors */
                }
              });
          }
        };

        cursorRequest.onerror = () => {
          try {
            nativeDb?.close();
          } catch {
            /* ignore close errors */
          }
          reject(new Error("Cursor error"));
        };
      } catch (err) {
        try {
          nativeDb?.close();
        } catch {
          /* ignore close errors */
        }
        reject(err);
      }
    };
  });
}

// ─── importFromDatabase ─────────────────────────────────────────────────────

export async function importFromDatabase(
  db: LocalDB,
  sourceDbName: string,
  currentUserId: string,
  onProgress?: (progress: string) => void,
): Promise<{
  cards: number;
  folders: number;
  stats: number;
  studyLogs: number;
  firstCardKeys: string[];
}> {
  console.log(`[Rescue] Starting import from ${sourceDbName} to current DB...`);
  onProgress?.("復旧を開始しています...");

  // Firestore SDK DBの場合は特殊な抽出ロジックへ
  if (sourceDbName.includes("/main") || sourceDbName.includes("firestore")) {
    const result = await extractFromFirestoreSDK(
      db,
      sourceDbName,
      currentUserId,
      onProgress,
    );
    return { ...result, stats: 0, studyLogs: 0, firstCardKeys: [] };
  }

  // 1. Temporary connection to source DB
  const sourceDb = new Dexie(sourceDbName);
  // Use Version 1 with just primary keys to be as permissive as possible for reading
  sourceDb.version(1).stores({
    folders: "id",
    cards: "id",
    documents: "id",
    users: "id",
    userSettings: "id",
    userStats: "id",
    syncMetadata: "userId",
    syncSettings: "id",
    levelHistories: "id",
    tags: "[rootFolderId+name]",
    studyLogs: "id",
    cardRelations: "id",
    projectMaps: "id",
  });

  await sourceDb.open();

  try {
    const rescueTime = new Date();
    const lastSyncPlaceholder = new Date(rescueTime.getTime() - 1000); // 1秒前

    // Safely check and read tables
    const safeRead = async (tableName: string) => {
      try {
        return await sourceDb.table(tableName).toArray();
      } catch {
        console.warn(`[Rescue] Table ${tableName} not found in source DB.`);
        return [];
      }
    };

    // 2. Read all data
    const [
      folders,
      cards,
      documents,
      userSettings,
      userStats,
      levelHistories,
      syncSettings,
      tags,
      studyLogs,
      cardRelations,
      projectMaps,
    ] = await Promise.all([
      safeRead("folders"),
      safeRead("cards"),
      safeRead("documents"),
      safeRead("userSettings"),
      safeRead("userStats"),
      safeRead("levelHistories"),
      safeRead("syncSettings"),
      safeRead("tags"),
      safeRead("studyLogs"),
      safeRead("cardRelations"),
      safeRead("projectMaps"),
    ]);

    console.log(
      `[Rescue] Found: ${folders.length} folders, ${cards.length} cards, ${documents.length} documents, ${cardRelations.length} relations`,
    );

    // 3. Transform and Insert into current DB

    // Folders
    if (folders.length > 0) {
      const newFolders = folders.map((f) => {
        const id = f.id || f.folderId || f.folder_id || crypto.randomUUID();
        return {
          ...f,
          id,
          folderId: id,
          userId: currentUserId,
          updatedAt: rescueTime,
          _rescueOrigin: sourceDbName,
        };
      });
      await db.folders.bulkPut(newFolders);
    }

    // Cards
    if (cards.length > 0) {
      const newCards = cards.map((c) => {
        const id = c.id || c.cardId || c.card_id || crypto.randomUUID();
        const payload = denormalizeCardForStorage({
          ...c,
          id,
          userId: currentUserId,
          updatedAt: rescueTime,
          _rescueOrigin: sourceDbName,
        });
        if (!hasBlobUrlDeep(payload)) return payload;
        telemetryOncePerSession("cards:blob-url-scrubbed-on-import");
        return scrubBlobUrlsDeep(payload);
      }) as Card[];
      await db.cards.bulkPut(newCards);
    }

    // Documents (PDF)
    if (documents.length > 0) {
      const newDocs = documents.map((d: unknown) => {
        const id = d.id || d.documentId || d.docId || crypto.randomUUID();
        return {
          ...d,
          id,
          userId: currentUserId,
          folderId: d.folderId || d.folder_id || "RESCUE_ORPHANS_FOLDER",
          updatedAt: rescueTime,
          isDeleted: d.isDeleted ?? d.is_deleted ?? false,
          _rescueOrigin: sourceDbName,
        };
      });
      await db.documents.bulkPut(newDocs);
    }

    // User Stats (Streaks etc)
    if (userStats.length > 0) {
      const stats = userStats[userStats.length - 1]; // Take latest
      await db.userStats.put({
        ...stats,
        id: currentUserId,
        userId: currentUserId,
        updatedAt: rescueTime,
      });
    }

    // Level Histories
    if (levelHistories.length > 0) {
      const newHistories = levelHistories.map((h) => ({
        ...h,
        id: h.id || h.historyId || crypto.randomUUID(),
        userId: currentUserId,
        _rescueOrigin: sourceDbName,
      }));
      await db.levelHistories.bulkPut(newHistories);
    }

    // Study Logs (Streaks Logic Support)
    if (studyLogs.length > 0) {
      const newLogs = studyLogs.map((l) => ({
        ...l,
        id: l.id || l.logId || crypto.randomUUID(),
        userId: currentUserId,
        _rescueOrigin: sourceDbName,
      }));
      await db.table("studyLogs").bulkPut(newLogs);
    }

    // Tags
    if (tags.length > 0) {
      const newTags = tags.map((t) => ({
        ...t,
        userId: currentUserId,
        updatedAt: rescueTime,
      }));
      await (db as LocalDBWithTags).tags.bulkPut(newTags);
    }

    // User Settings
    if (userSettings.length > 0) {
      const settings = userSettings[userSettings.length - 1];
      await db.userSettings.put({
        ...settings,
        id: currentUserId,
        userId: currentUserId,
        updatedAt: rescueTime,
      });
    }

    // Sync Settings
    if (syncSettings.length > 0) {
      const sSet = syncSettings[syncSettings.length - 1];
      await db.syncSettings.put({
        ...sSet,
        id: "current",
        updatedAt: rescueTime,
      });
    }

    // Card Relations
    if (cardRelations.length > 0) {
      const newRelations = cardRelations.map((r) => ({
        ...r,
        id: r.id || crypto.randomUUID(),
        userId: currentUserId,
        updatedAt: rescueTime,
      }));
      await db.cardRelations.bulkPut(newRelations);
    }

    // Project Maps
    if (projectMaps.length > 0) {
      const newMaps = projectMaps.map((m) => ({
        ...m,
        id: m.id || crypto.randomUUID(),
        userId: currentUserId,
        updatedAt: rescueTime,
      }));
      await db.projectMaps.bulkPut(newMaps);
    }

    // CRITICAL: Set Sync Metadata to prevent destructive Full Sync
    await db.syncMetadata.put({
      userId: currentUserId,
      deviceId: getOrCreateDeviceId(),
      deviceName: getDeviceName(),
      lastSyncTime: lastSyncPlaceholder,
      lastHighResSync: null,
      isActive: true, // Default for recovered session
    });

    console.log("[Rescue] Import completed. Metadata set to prevent wipe.");
    return {
      cards: cards.length,
      folders: folders.length,
      stats: userStats.length,
      studyLogs: studyLogs.length,
      firstCardKeys: [],
    };
  } finally {
    sourceDb.close();
  }
}





