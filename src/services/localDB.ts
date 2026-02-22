import { normalizeCard, normalizeFolder, extractTextFromBlocks } from '../utils';
import { denormalizeUploadedImages, normalizeUploadedImages, sanitizeUploadedImages } from '../utils/imageUtils';
import { getOrCreateDeviceId, getDeviceName } from '../utils/device';
import { assertImageArrayInvariant } from '../utils/imageAssertions';
import { deleteDocumentBlob, deleteDocumentBlobsByUser } from './documentFileStore';
import { removeDocumentBlobUrl } from './documentBlobUrlSessionCache';
import { InMemoryLocalDB } from './InMemoryLocalDB';
import { Dexie, type PromiseExtended } from 'dexie';
import { nanoid } from 'nanoid';
import { Timestamp } from 'firebase/firestore';
import {
  clearLocalDBResetFailureReason,
  getLocalDBTelemetrySnapshot,
  getLocalDBRuntimeStatus,
  getStoredLocalDBResetFailureReason,
  markLocalDBGenerationBumped,
  saveLocalDBResetFailureReason,
  subscribeLocalDBRuntimeStatus,
  telemetryOncePerSession,
  updateLocalDBRuntimeStatus,
  warnOncePerSession
} from './localDBRuntimeState';
import type { LocalDBFallbackReasonCode } from './localDBRuntimeState';

import type {
  Folder,
  Card,
  Document, // ✅追加（types側で export したエイリアス）
  User,
  UserSettings,
  UserStats,
  SyncMetadata,
  SyncError,
  SyncHistory,
  SyncSettings,
  SyncQueueItem,
  SyncConflict,
  UploadedImage,
  CardRelation,
  ProjectMap
} from '../types';

export type LocalDBLike = LocalDB | InMemoryLocalDB;
export type LocalDBInstance = LocalDBLike;

const LOCALDB_SCHEMA_VERSION_FOR_NAME = 19;
const LOCALDB_GENERATION_MAX = 3;
const LOCALDB_RECOVERY_GUIDE_URL = 'https://support.google.com/chrome/answer/2392709';
const LOCALDB_GENERATION_KEY_PREFIX = 'flashcard.localdb.generation.';
const LOCALDB_ERROR_MESSAGE_LIMIT = 400;
const LOCALDB_NAME_PREFIX = 'FlashcardMasterDB_';

const safeStringifyError = (error: unknown): string => {
  try {
    if (!error) return 'unknown error';
    if (typeof error === 'string') return error;
    const maybeName = (error as any)?.name ? `${(error as any).name}: ` : '';
    const maybeMessage = (error as any)?.message ?? JSON.stringify(error);
    return `${maybeName}${String(maybeMessage)}`.slice(0, LOCALDB_ERROR_MESSAGE_LIMIT);
  } catch {
    return 'unknown error';
  }
};

const safeRevokeBlobUrl = (url: unknown, context: string): void => {
  if (typeof url !== 'string' || !url.startsWith('blob:')) return;
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn(`[LocalDB] Failed to revoke blob URL (${context})`, error);
  }
};

const readGenerationFromStorage = (userId: string): number => {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(`${LOCALDB_GENERATION_KEY_PREFIX}${userId}`);
    const parsed = Number(raw ?? '0');
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(Math.floor(parsed), LOCALDB_GENERATION_MAX);
  } catch {
    return 0;
  }
};

const writeGenerationToStorage = (userId: string, generation: number): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${LOCALDB_GENERATION_KEY_PREFIX}${userId}`,
      String(Math.min(Math.max(0, Math.floor(generation)), LOCALDB_GENERATION_MAX))
    );
  } catch {
    // ignore localStorage write failures
  }
};

const makeGenerationDbPrefix = (userId: string): string =>
  `${LOCALDB_NAME_PREFIX}${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g`;

const extractErrorTexts = (error: any, collector: string[], depth = 0): void => {
  if (!error || depth > 4) return;
  const name = typeof error?.name === 'string' ? error.name : '';
  const message = typeof error?.message === 'string' ? error.message : '';
  const text = `${name} ${message}`.toLowerCase();
  if (text.trim()) collector.push(text);
  extractErrorTexts(error?.inner, collector, depth + 1);
  extractErrorTexts(error?.cause, collector, depth + 1);
};

export function isBackingStoreOpenError(error: unknown): boolean {
  const texts: string[] = [];
  extractErrorTexts(error, texts);
  if (texts.length === 0) return false;
  const merged = texts.join(' | ');
  const hasUnknownError = merged.includes('unknownerror') || merged.includes('unknown error');
  const hasBackingStoreToken =
    merged.includes('opening backing store') ||
    merged.includes('backing store') ||
    merged.includes('indexeddb.open');
  return hasUnknownError && hasBackingStoreToken;
}

const classifyFallbackReasonCode = (error: unknown): LocalDBFallbackReasonCode => {
  if (isBackingStoreOpenError(error)) return 'backing_store_open_error';

  const texts: string[] = [];
  extractErrorTexts(error, texts);
  const merged = texts.join(' | ');

  if (merged.includes('quotaexceeded') || merged.includes('quota exceeded')) {
    return 'quota_exceeded';
  }
  if (
    merged.includes('securityerror') ||
    merged.includes('access denied') ||
    merged.includes('not allowed') ||
    merged.includes('disabled')
  ) {
    return 'indexeddb_blocked';
  }
  if (
    merged.includes('blocked') ||
    merged.includes('versionchange') ||
    merged.includes('upgradeneeded')
  ) {
    return 'upgrade_needed_or_blocked';
  }
  return 'unknown';
};


const denormalizeCardForStorage = (card: any) => {
  if (!card) return card;
  const result = { ...card };

  // ブロックが存在する場合、レガシーテキストフィールドを同期更新する
  if (card.questionBlocks !== undefined) {
    const extractedQ = extractTextFromBlocks(card.questionBlocks);
    // 元々 null/undefined/空 の場合のみ上書きする（または常に同期するか検討）
    // 設計方針に従い、常にブロックから同期してデータの整合性を保つ
    result.questionText = extractedQ;
  }

  if (card.answerBlocks !== undefined) {
    result.answerText = extractTextFromBlocks(card.answerBlocks);
  }

  // 画像フィールドの変換（既存ロジック）
  if (card.questionImages !== undefined || card.question_images !== undefined) {
    const questionImages = normalizeUploadedImages(card.questionImages ?? card.question_images ?? []);
    try {
      assertImageArrayInvariant(questionImages as any);
    } catch (e) {
      console.warn('[LocalDB] questionImages validation failed, but proceeding with sanitization:', e);
    }
    const cleanQuestionImages = sanitizeUploadedImages(questionImages);
    result.questionImages = denormalizeUploadedImages(cleanQuestionImages, { case: 'camel', stripUndefined: true }) as any;
  }

  if (card.answerImages !== undefined || card.answer_images !== undefined) {
    const answerImages = normalizeUploadedImages(card.answerImages ?? card.answer_images ?? []);
    try {
      assertImageArrayInvariant(answerImages as any);
    } catch (e) {
      console.warn('[LocalDB] answerImages validation failed, but proceeding with sanitization:', e);
    }
    const cleanAnswerImages = sanitizeUploadedImages(answerImages);
    result.answerImages = denormalizeUploadedImages(cleanAnswerImages, { case: 'camel', stripUndefined: true }) as any;
  }

  return result;
};

const denormalizeFolderForStorage = (folder: any) => {
  if (!folder) return folder;
  const result = { ...folder };

  if (folder.memoImages !== undefined || folder.memo_images !== undefined) {
    const memoImages = normalizeUploadedImages(folder.memoImages ?? folder.memo_images ?? []);
    try {
      assertImageArrayInvariant(memoImages as any);
    } catch (e) {
      console.warn('[LocalDB] memoImages validation failed, but proceeding with sanitization:', e);
    }
    result.memoImages = denormalizeUploadedImages(memoImages, { case: 'camel', stripUndefined: true }) as any;
  }

  return result;
};

const normalizeFolderWithSilent = (raw: any) => {
  if (!raw) return raw;
  const hasSilent = raw?.silent !== undefined;
  const hasIsSilent = raw?.isSilent !== undefined || raw?.is_silent !== undefined;
  const normalizedInput = !hasIsSilent && hasSilent
    ? { ...raw, isSilent: raw.silent }
    : raw;
  return normalizeFolder(normalizedInput);
};

const denormalizeUserSettingsForStorage = (settings: any) => {
  if (!settings) return settings;
  const profileImage = settings.profileImage
    ? sanitizeUploadedImages([settings.profileImage])[0]
    : null;
    
  // If sanitized image corresponds to a logic where localUrl is removed, 
  // and no remoteUrl exists, it effectively becomes an empty/invalid image record 
  // but better than persisting blob.
  
  return {
    ...settings,
    profileImage
  };
};

/**
 * Dexie.js を使用したローカルデータベースの実装。
 * 設計思想に基づき、すべてのユーザーデータをクライアントサイドで管理します。
 */
export class LocalDB extends Dexie {
  // テーブルの型定義
  folders!: Dexie.Table<Folder, string>;
  cards!: Dexie.Table<Card, string>;

  // ✅ PDF/Document テーブル（テーブル名は documents で統一）
  documents!: Dexie.Table<Document, string>;

  users!: Dexie.Table<User, string>;
  userSettings!: Dexie.Table<UserSettings, string>;
  userStats!: Dexie.Table<UserStats, string>;
  // ✅ typo修正: Tabel -> Table
  syncMetadata!: Dexie.Table<SyncMetadata, string>; // ✅ Table のtypo修正
  levelHistories!: Dexie.Table<any, string>;
  deviceMeta!: Dexie.Table<any, string>;

  // 同期システム高度化テーブル
  syncErrors!: Dexie.Table<SyncError, string>;
  syncHistory!: Dexie.Table<SyncHistory, string>;
  syncSettings!: Dexie.Table<SyncSettings, string>;
  syncQueue!: Dexie.Table<SyncQueueItem, string>;
  conflicts!: Dexie.Table<SyncConflict, string>;

  // ブラウザストレージ設計準拠テーブル
  metadata!: Dexie.Table<any, string>; // IndexedDB 健全性管理用
  images!: Dexie.Table<UploadedImage, string>; // 画像・音声のメタデータ管理用

  // Phase 3: Map Feature
  cardRelations!: Dexie.Table<CardRelation, string>;
  projectMaps!: Dexie.Table<ProjectMap, string>;

  // Tags (Legacy + V2)
  tags!: Dexie.Table<{ name: string; color: string; userId: string; rootFolderId: string; updatedAt: Date }, [string, string]>;
  tags_v2!: Dexie.Table<{ name: string; color: string; userId: string; rootFolderId: string; updatedAt: Date }, [string, string]>;

  // Public userId for global access
  public userId?: string;

  /**
   * Explicitly implement transaction to satisfy LocalDBLike interface and inconsistent Dexie types.
   */
  transaction<U>(mode: string, ...args: any[]): PromiseExtended<U> {
    // Cast to any to avoid Dexie type mismatch issues in strict environments
    return (super.transaction as any)(mode, ...args);
  }

  /**
   * ブラウザ内の全データベースを列挙します
   */
  static async listDatabases(): Promise<IDBDatabaseInfo[]> {
    if (!indexedDB.databases) return [];
    try {
      const dbs = await indexedDB.databases();
      return dbs;
    } catch (error) {
      if (isBackingStoreOpenError(error)) {
        warnOncePerSession(
          'localdb:list-databases-backing-store',
          `[LocalDB] Failed to list IndexedDB databases due to backing store error. Recovery guide: ${LOCALDB_RECOVERY_GUIDE_URL}`,
          error
        );
      }
      return [];
    }
  }

  /**
   * ブラウザ内の全データベースを徹底的にスキャンし、すべてのレコードをログ出力します。
   * これは最終的なデータ考古学調査のための低レベルツールです。
   */
  static async fullOriginForensicAudit(onProgress?: (msg: string) => void): Promise<any> {
    console.log('[Forensic-Audit] Starting origin-wide scan...');
    onProgress?.('全オリジン調査を開始...');

    const dbInfos = await this.listDatabases();
    const summary: any = {
      databasesScanned: 0,
      totalRecordsFound: 0,
      dbDetails: []
    };

    for (const info of dbInfos) {
      if (!info.name) continue;
      summary.databasesScanned++;
      console.log(`[Forensic-DB:${info.name}] Investigating...`);
      onProgress?.(`調査中: ${info.name}`);

      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(info.name!);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        const storeNames = Array.from(db.objectStoreNames);
        const dbSummary = { name: info.name, tables: storeNames.length, records: 0 };

        for (const storeName of storeNames) {
          try {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            
            await new Promise((resolve, reject) => {
              const cursorReq = store.openCursor();
              cursorReq.onsuccess = (e: any) => {
                const cursor = e.target.result;
                if (cursor) {
                  const record = cursor.value;
                  // 重量を考慮し、文字列化してログ出力（コンソールフリーズ防止）
                  try {
                    console.log(`[Forensic-REC] DB:${info.name} TABLE:${storeName} KEY:${JSON.stringify(cursor.key).substring(0, 100)}`, record);
                  } catch (logErr) {
                    console.log(`[Forensic-REC] DB:${info.name} TABLE:${storeName} (Un-stringifiable key)`, record);
                  }
                  dbSummary.records++;
                  summary.totalRecordsFound++;
                  cursor.continue();
                } else {
                  resolve(null);
                }
              };
              cursorReq.onerror = () => reject(cursorReq.error);
            });
          } catch (e) {
            console.error(`[Forensic-ERROR] Failed to read table ${storeName} in ${info.name}`, e);
          }
        }
        db.close();
        summary.dbDetails.push(dbSummary);
      } catch (e) {
        console.error(`[Forensic-ERROR] Failed to open DB ${info.name}`, e);
      }
    }

    console.log('[Forensic-Audit] Completed.', summary);
    onProgress?.(`調査完了: ${summary.totalRecordsFound} 件のレコード断片をコンソールに出力しました`);
    return summary;
  }

  /**
   * 指定したデータベースからデータを現在のデータベースにインポートします
   * @param sourceDbName インポート元のデータベース名
   * @param currentUserId データを紐付ける現在のユーザーID
   */
  async importFromDatabase(
    sourceDbName: string, 
    currentUserId: string,
    onProgress?: (progress: string) => void
  ): Promise<{ cards: number, folders: number, stats: number, studyLogs: number, firstCardKeys: string[] }> {
    console.log(`[Rescue] Starting import from ${sourceDbName} to current DB...`);
    onProgress?.('復旧を開始しています...');
    
    // Firestore SDK DBの場合は特殊な抽出ロジックへ
    if (sourceDbName.includes('/main') || sourceDbName.includes('firestore')) {
        const result = await this.extractFromFirestoreSDK(sourceDbName, currentUserId, onProgress);
        return { ...result, stats: 0, studyLogs: 0, firstCardKeys: [] };
    }

    // 1. Temporary connection to source DB
    const sourceDb = new Dexie(sourceDbName);
    // Use Version 1 with just primary keys to be as permissive as possible for reading
    sourceDb.version(1).stores({
      folders: 'id',
      cards: 'id',
      documents: 'id',
      users: 'id',
      userSettings: 'id',
      userStats: 'id',
      syncMetadata: 'userId',
      syncSettings: 'id',
      levelHistories: 'id',
      tags: '[rootFolderId+name]',
      studyLogs: 'id',
      cardRelations: 'id',
      projectMaps: 'id'
    });
    
    await sourceDb.open();
    
    try {
      const rescueTime = new Date();
      const lastSyncPlaceholder = new Date(rescueTime.getTime() - 1000); // 1秒前

      // Safely check and read tables
      const safeRead = async (tableName: string) => {
          try {
              return await sourceDb.table(tableName).toArray();
          } catch (e) {
              console.warn(`[Rescue] Table ${tableName} not found in source DB.`);
              return [];
          }
      };

      // 2. Read all data
      const [folders, cards, documents, userSettings, userStats, levelHistories, syncSettings, tags, studyLogs, cardRelations, projectMaps] = await Promise.all([
        safeRead('folders'),
        safeRead('cards'),
        safeRead('documents'),
        safeRead('userSettings'),
        safeRead('userStats'),
        safeRead('levelHistories'),
        safeRead('syncSettings'),
        safeRead('tags'),
        safeRead('studyLogs'),
        safeRead('cardRelations'),
        safeRead('projectMaps'),
      ]);
      
      console.log(`[Rescue] Found: ${folders.length} folders, ${cards.length} cards, ${documents.length} documents, ${cardRelations.length} relations`);

      // 3. Transform and Insert into current DB
      
      // Folders
      if (folders.length > 0) {
        const newFolders = folders.map(f => {
          const id = f.id || f.folderId || f.folder_id || crypto.randomUUID();
          return {
            ...f,
            id,
            folderId: id,
            userId: currentUserId,
            updatedAt: rescueTime,
            _rescueOrigin: sourceDbName
          };
        });
        await this.folders.bulkPut(newFolders);
      }

      // Cards
      if (cards.length > 0) {
        const newCards = cards.map(c => {
          const id = c.id || c.cardId || c.card_id || crypto.randomUUID();
          return {
            ...c,
            id,
            userId: currentUserId,
            updatedAt: rescueTime,
            _rescueOrigin: sourceDbName
          };
        });
        await this.cards.bulkPut(newCards);
      }


      // Documents (PDF)
      if (documents.length > 0) {
        const newDocs = documents.map((d: any) => {
          const id = d.id || d.documentId || d.docId || crypto.randomUUID();
          return {
            ...d,
            id,
            userId: currentUserId,
            folderId: d.folderId || d.folder_id || 'RESCUE_ORPHANS_FOLDER',
            updatedAt: rescueTime,
            isDeleted: d.isDeleted ?? d.is_deleted ?? false,
            _rescueOrigin: sourceDbName,
          };
        });
        await this.documents.bulkPut(newDocs);
      }

      
      // User Stats (Streaks etc)
      if (userStats.length > 0) {
         const stats = userStats[userStats.length - 1]; // Take latest
         await this.userStats.put({
             ...stats,
             id: currentUserId,
             userId: currentUserId,
             updatedAt: rescueTime
         });
      }

      // Level Histories
      if (levelHistories.length > 0) {
          const newHistories = levelHistories.map(h => ({
              ...h,
              id: h.id || h.historyId || crypto.randomUUID(),
              userId: currentUserId,
              _rescueOrigin: sourceDbName
          }));
          await this.levelHistories.bulkPut(newHistories);
      }

      // Study Logs (Streaks Logic Support)
      if (studyLogs.length > 0) {
          const newLogs = studyLogs.map(l => ({
              ...l,
              id: l.id || l.logId || crypto.randomUUID(),
              userId: currentUserId,
              _rescueOrigin: sourceDbName
          }));
          await (this as any).table('studyLogs').bulkPut(newLogs);
      }

      // Tags
      if (tags.length > 0) {
          const newTags = tags.map(t => ({
              ...t,
              userId: currentUserId,
              updatedAt: rescueTime
          }));
          await (this as any).tags.bulkPut(newTags);
      }
      
      // User Settings
      if (userSettings.length > 0) {
        const settings = userSettings[userSettings.length - 1];
        await this.userSettings.put({
            ...settings,
            id: currentUserId,
            userId: currentUserId,
            updatedAt: rescueTime
        });
      }

      // Sync Settings
      if (syncSettings.length > 0) {
          const sSet = syncSettings[syncSettings.length - 1];
          await this.syncSettings.put({
              ...sSet,
              id: 'current',
              updatedAt: rescueTime
          });
      }

      // Card Relations
      if (cardRelations.length > 0) {
          const newRelations = cardRelations.map(r => ({
              ...r,
              id: r.id || crypto.randomUUID(),
              userId: currentUserId,
              updatedAt: rescueTime
          }));
          await this.cardRelations.bulkPut(newRelations);
      }

      // Project Maps
      if (projectMaps.length > 0) {
          const newMaps = projectMaps.map(m => ({
              ...m,
              id: m.id || crypto.randomUUID(),
              userId: currentUserId,
              updatedAt: rescueTime
          }));
          await this.projectMaps.bulkPut(newMaps);
      }

      // CRITICAL: Set Sync Metadata to prevent destructive Full Sync
      await this.syncMetadata.put({
          userId: currentUserId,
          deviceId: getOrCreateDeviceId(),
          deviceName: getDeviceName(),
          lastSyncTime: lastSyncPlaceholder,
          lastHighResSync: null,
          isActive: true // Default for recovered session
      });

      console.log('[Rescue] Import completed. Metadata set to prevent wipe.');
      return { 
          cards: cards.length, 
          folders: folders.length, 
          stats: userStats.length,
          studyLogs: studyLogs.length,
          firstCardKeys: [] // Added this line
      };
      
    } finally {
      sourceDb.close();
    }
  }

  // Tags
  // tags property definition removed (duplicate)

  /**
   * Firestore SDKの内部データベースからキャッシュされているドキュメントを抽出します
   * @param sourceDbName Firestore SDKのDB名
   * @param currentUserId データを紐付ける現在のユーザーID
   */
  async extractFromFirestoreSDK(
    sourceDbName: string, 
    currentUserId: string, 
    onProgress?: (progress: string) => void
  ): Promise<{ cards: number, folders: number, firstCardKeys: string[] }> {
    console.log(`[Rescue] Attempting Raw Native Extraction: ${sourceDbName}`);
    onProgress?.('ネイティブ接続を試行中...');
    
    let nativeDb: IDBDatabase | null = null;

    return new Promise((resolve, reject) => {
      const rescueTime = new Date();
      const recoveredFolders: any[] = [];
      const recoveredCards: any[] = [];
      
      // Native Open without version (doesn't trigger upgrade/block)
      const request = indexedDB.open(sourceDbName);
      
      const timeout = setTimeout(() => {
          reject(new Error('Native DB Open Timeout (10s)'));
      }, 10000);

      request.onerror = () => {
          clearTimeout(timeout);
          reject(request.error);
      };

       request.onsuccess = async () => {
         clearTimeout(timeout);
         nativeDb = request.result;
         const db = nativeDb;
         try {
           const tableNames = Array.from(db.objectStoreNames);
           console.log(`[Rescue] Native Tables: ${tableNames.join(', ')}`);
           onProgress?.(`Tables: ${tableNames.join(', ')}`);
           
           // V20 Strategy: Simple Tombstone Recovery
           const targetTable = tableNames.find(n => n.startsWith('remoteDocuments'));
           if (!targetTable) {
             onProgress?.('対象テーブルが見つかりません (Native)');
             try { nativeDb?.close(); } catch {}
             return resolve({ cards: 0, folders: 0, firstCardKeys: [] });
           }

           const activeTable = targetTable;
           onProgress?.(`データを読み込み中 (${activeTable})...`);
           
           const transaction = db.transaction(activeTable, 'readonly');
           const store = transaction.objectStore(activeTable);
           const cursorRequest = store.openCursor();
           
           let totalProcessed = 0;

           cursorRequest.onsuccess = (e: any) => {
             const cursor = e.target.result;
             if (cursor) {
               totalProcessed++;
               const record = cursor.value;

               // Safety Block (V25 - Orphan Recovery)
               try {
                 let parts: string[] = [];
                 let parentCollection = '';
                 let foundFolderId = '';
                 let id = '';
                 let isFolder = false;
                 let isCard = false;

                 if (Array.isArray(cursor.key) && cursor.key.length > 0) {
                   parts = cursor.key.map(String);
                 } else {
                   const p = record.path || (typeof cursor.key === 'string' ? cursor.key : '');
                   if (p) parts = p.split('/');
                 }

                 if (parts.length >= 2) {
                   id = parts[parts.length - 1]; 
                   parentCollection = parts[parts.length - 2];
                   
                   if (parentCollection === 'folders' || parentCollection === 'folder') {
                     isFolder = true;
                   } else if (parentCollection === 'cards' || parentCollection === 'card' || parentCollection === 'flashcards') {
                     isCard = true;
                     const folderIndex = parts.indexOf('folders');
                     if (folderIndex !== -1 && folderIndex + 1 < parts.length) {
                       foundFolderId = parts[folderIndex + 1];
                     }
                   }
                 }

                 if ((isFolder || isCard) && id && id !== '0,0') {
                   let data = this.flattenFirestoreDocument(record.document?.data || record.data || record.value || record);
                   if (!data || Object.keys(data).length === 0) {
                     data = { createdAt: new Date() };
                   }
                   
                   const item: any = { ...data };
                   item.id = id;
                   item.userId = currentUserId;
                   item.isDeleted = false;
                   item.is_deleted = false;
                   item.updatedAt = new Date();
                   item._rescueOrigin = 'TombstoneV25';
                   item._rescueRaw = record;

                   if (isFolder) {
                     item.folderId = id;
                     item.parentFolderId = null;
                     item.folderName = data.folderName || data.name || data.title || `(復元フォルダ) ${id.substring(0, 4)}`;
                     
                     const idx = recoveredFolders.findIndex(f => f.id === id);
                     if (idx === -1) recoveredFolders.push(item);
                     else recoveredFolders[idx] = item;
                   } else {
                     item.folderId = foundFolderId || 'RESCUE_ORPHANS_FOLDER';
                     item.questionText = data.questionText || data.front || `(復元カード) ${id.substring(0, 4)}`;
                     item.answerText = data.answerText || data.back || 'データ破損によりコンテンツ不明';
                     
                     const idx = recoveredCards.findIndex(c => c.id === id);
                     if (idx === -1) recoveredCards.push(item);
                     else recoveredCards[idx] = item;
                   }
                 }
               } catch (err) {
                 console.error('[Rescue-V25] Process Error', err);
               }
               
               cursor.continue();
             } else {
               // Finished Logic: Create Orphan Folder if needed
               if (recoveredCards.some(c => c.folderId === 'RESCUE_ORPHANS_FOLDER')) {
                 const rescueFolderId = 'RESCUE_ORPHANS_FOLDER';
                 if (!recoveredFolders.find(f => f.id === rescueFolderId)) {
                   recoveredFolders.push({
                     id: rescueFolderId,
                     folderId: rescueFolderId,
                     userId: currentUserId,
                     folderName: '【復旧済み】未分類のカード',
                     parentFolderId: null,
                     isDeleted: false,
                     is_deleted: false,
                     updatedAt: new Date(),
                     _rescueOrigin: 'TombstoneV25'
                   });
                 }
               }

               this.finalizeRawImport(recoveredFolders, recoveredCards, currentUserId, onProgress)
                 .then(resolve)
                 .catch(reject)
                 .finally(() => { try { nativeDb?.close(); } catch {} });
             }
           };

           cursorRequest.onerror = () => {
               try { nativeDb?.close(); } catch {}
               reject(new Error('Cursor error'));
           };

         } catch (err) {
           try { nativeDb?.close(); } catch {}
           reject(err);
         }
       };
    });
  }

  private async finalizeRawImport(folders: any[], cards: any[], userId: string, onProgress?: (m: string) => void) {
    console.log(`[Rescue] Raw Scan Results: ${folders.length} folders, ${cards.length} cards.`);
    onProgress?.(`保存中 (${folders.length + cards.length}件)...`);

    if (folders.length > 0) await this.folders.bulkPut(folders);
    if (cards.length > 0) await this.cards.bulkPut(cards);

    // Verification Log
    const dbFolders = await this.folders.toArray();
    const dbCards = await this.cards.toArray();
    console.log(`[Rescue] Post-Save Dexie Count: Folders=${dbFolders.length}, Cards=${dbCards.length}`);

    await this.syncMetadata.put({
      userId,
      deviceId: getOrCreateDeviceId(),
      deviceName: getDeviceName(),
      lastSyncTime: new Date(),
      lastHighResSync: null,
      isActive: true
    });

    onProgress?.('復旧完了！');
    return { folders: folders.length, cards: cards.length, firstCardKeys: [] };
  }

  private flattenFirestoreDocument(data: any): any {
    if (!data) return null;
    if (data.value?.mapValue?.fields) return this.parseFields(data.value.mapValue.fields);
    if (data.fields) return this.parseFields(data.fields);
    if (typeof data === 'object' && !data.value && !data.fields) return data;
    return null;
  }

  private parseFields(fields: any): any {
    const result: any = {};
    for (const [key, field] of Object.entries(fields)) {
      const f = field as any;
      if (f.stringValue !== undefined) result[key] = f.stringValue;
      else if (f.booleanValue !== undefined) result[key] = f.booleanValue;
      else if (f.integerValue !== undefined) result[key] = Number(f.integerValue);
      else if (f.doubleValue !== undefined) result[key] = Number(f.doubleValue);
      else if (f.timestampValue !== undefined) {
          result[key] = f.timestampValue instanceof Date ? f.timestampValue : new Date(f.timestampValue);
      }
      else if (f.mapValue !== undefined) result[key] = this.flattenFirestoreDocument({ value: f });
    }
    return result;
  }

  /**
   * 既存のレコードを走査し、不足している必須プロパティ（userId, name, isDeleted等）を補完します。
   * これはデータの論理的不整合を解消し、UIの表示条件を満たすようにするための修復処理です。
   */
  async repairDataIntegrity(currentUserId: string, onProgress?: (msg: string) => void): Promise<{ folders: number, cards: number, canonicalId: string | null }> {
    console.log(`[Repair] Starting data integrity repair for user: ${currentUserId}`);
    onProgress?.('整合性修復を開始...');

    // 1. Folders
    const allFolders = await this.folders.toArray();
    const allCards = await this.cards.toArray();

    // 1. 基本的な整合性補修 (以前のロジックを維持しつつ整理)
    const fixedFolders = allFolders.map(f => {
      const update = { ...f } as any;
      let changed = false;

      // ID保証
      if (!update.id) {
          update.id = update.folderId || crypto.randomUUID();
          changed = true;
      }
      if (!update.folderId) {
          update.folderId = update.id;
          changed = true;
      }

      // ユーザーID補完
      if (!update.userId) {
        update.userId = currentUserId;
        changed = true;
      }

      // 名前補完
      const currentName = update.folderName || update.name || update.folder_name;
      if (!currentName || currentName === '') {
        update.folderName = 'Recovered Folder';
        changed = true;
      } else if (!update.folderName) {
        update.folderName = currentName;
        changed = true;
      }

      // 削除フラグ補正
      const isActuallyDeleted = update.isDeleted ?? update.is_deleted ?? update.deleted;
      if (isActuallyDeleted === undefined) {
        update.isDeleted = false;
        changed = true;
      } else if (update.isDeleted === undefined) {
        update.isDeleted = isActuallyDeleted;
        changed = true;
      }

      // 階層整合性
      if (update.parentFolderId === undefined) {
          update.parentFolderId = null;
          changed = true;
      }

      return update;
    });

    // 2. 正規フォルダの選定 (Normalization フェーズ)
    onProgress?.('復旧データの集約中...');
    const recoveredFolders = fixedFolders.filter(f => 
        f.folderName === 'Recovered Folder' && !f.isDeleted && f.userId === currentUserId
    );

    let canonicalFolder = null;
    if (recoveredFolders.length > 0) {
        // カードを既に持っているフォルダを優先
        const folderCardCounts = recoveredFolders.map(f => ({
            folder: f,
            count: allCards.filter(c => {
              const cardFolderId = (c as any).folderId || (c as any).folder_id;
              const cardIsDeleted = Boolean((c as any).isDeleted ?? (c as any).is_deleted ?? (c as any).deleted);
              return cardFolderId === f.id && !cardIsDeleted;
            }).length
        }));
        
        const folderWithCards = folderCardCounts.sort((a, b) => b.count - a.count)[0];
        if (folderWithCards.count > 0) {
            canonicalFolder = folderWithCards.folder;
        } else {
            // なければ最古のフォルダ
            canonicalFolder = recoveredFolders.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
                const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
                return dateA - dateB;
            })[0];
        }
    }

    const canonicalId = canonicalFolder?.id || null;

    // 3. 全フォルダ更新 (重複の論理削除)
    const folderUpdates = fixedFolders.map(f => {
        const isRecovered = f.folderName === 'Recovered Folder' && !f.isDeleted;
        if (isRecovered && canonicalId && f.id !== canonicalId) {
            return {
                ...f,
                isDeleted: true,
                deletedReason: "recovery-deduplicated",
                updatedAt: new Date()
            };
        }
        // fixedFolders作成時にchangedフラグを管理しなくなったので、とりあえず全部戻してDexieの差分検知に任せるか、
        // 厳密にやるなら以前のchangedフラグ方式で行く。ここではシンプルに。
        return f;
    });

    if (folderUpdates.length > 0) {
        await this.folders.bulkPut(folderUpdates);
        console.log(`[Normalization] Processed ${folderUpdates.length} folders. Canonical: ${canonicalId}`);
    }

    // 4. カードの集約
    onProgress?.('全カードを正規フォルダへ移動中...');
    let firstCardKeys: string[] = [];

    const cardUpdates = allCards.map((c, index) => {
      const update = { ...c } as any;
      if (index === 0) {
        firstCardKeys = Object.keys(update);
        console.log('[Recovery-Raw]', update.id, firstCardKeys);
      }
      let changed = false;

      // ID/ユーザー/削除フラグの整合性補正
      if (!update.id) {
          update.id = update.cardId || update.card_id || crypto.randomUUID();
          changed = true;
      }
      if (update.userId !== currentUserId) {
        update.userId = currentUserId;
        changed = true;
      }
      const isActuallyDeleted = Boolean(update.isDeleted ?? update.is_deleted ?? update.deleted);
      if (update.isDeleted !== isActuallyDeleted) {
        update.isDeleted = isActuallyDeleted;
        changed = true;
      }
      if (update.is_deleted !== undefined) { delete update.is_deleted; changed = true; }
      if (update.deleted !== undefined) { delete update.deleted; changed = true; }

      // [DEBUG] Raw Data Inspection for the first card
      // This allows verification of where the text data is actually living.
      if (index === 0) { // Only log for the first one to avoid spam
          console.log("[Hydration-Raw-Sample] Keys:", Object.keys(update));
          console.log("[Hydration-Raw-Sample] Full:", JSON.stringify({
              id: update.id,
              currentQ: update.questionText,
              currentA: update.answerText,
              raw: update, 
              _rescueRaw: update._rescueRaw
          }, null, 2));
      }

      // [SAFETY CHECK] Migration Integirty Canary
      // Check for cards with lastReviewAt but no reviewCount
      const hasLastReview = !!(update.lastReviewAt || update.last_review_at);
      const reviewCount = update.reviewCount ?? update.review_count ?? 0;
      
      if (hasLastReview && reviewCount === 0) {
        console.warn(`[Data Integrity Warning] Card ${update.id} has lastReviewAt but reviewCount is 0. This may cause statistics to be inaccurate.`, { hasLastReview, reviewCount });
        // NOTE: We do not auto-fix here to avoid destructive changes without user consent, 
        // but this log helps diagnose "unmeasured" stats issues.
      }

      if (!isActuallyDeleted) {
        // Content Hydration (コンテンツの中身を復元)
        // UIが参照する questionText / answerText が空の場合、rawデータから復元を試みる
        // Note: normalizeCard と同じロジックを適用
        // Dexie上のデータが「正規化後(中身空)」の状態でも、もし raw fields が残っていればここで抽出して復活させる
        if (!update.questionText || update.questionText === '') {
            const extractedQ = 
                update.questionText ?? update.question_text ?? 
                update.front ?? update.question ?? update.q ?? 
                update.fields?.Front ?? update.fields?.Question ??
                update._rescueRaw?.fields?.Front ??
                update._rescueRaw?.question ??
                '';
            
            if (extractedQ) {
                console.log(`[Hydration] Recovered question for card ${update.id}: ${extractedQ.substring(0, 20)}...`);
                update.questionText = extractedQ;
                changed = true;
            }
        }
        if (!update.answerText || update.answerText === '') {
            const extractedA = 
                update.answerText ?? update.answer_text ?? 
                update.back ?? update.answer ?? update.a ?? 
                update.fields?.Back ?? update.fields?.Answer ??
                update._rescueRaw?.fields?.Back ??
                update._rescueRaw?.answer ??
                '';
                
            if (extractedA) {
                update.answerText = extractedA;
                changed = true;
            }
        }
      }

      // 正規フォルダ ID に結びつける
      if (canonicalId && !isActuallyDeleted && update.folderId !== canonicalId) {
          update.folderId = canonicalId;
          changed = true;
      }

      // タイムスタンプ補完
      if (!update.createdAt) {
          update.createdAt = update.created_at || new Date();
          changed = true;
      }
      if (!update.updatedAt) {
          update.updatedAt = update.updated_at || update.createdAt || new Date();
          changed = true;
      }

      return changed ? update : null;
    }).filter(x => x !== null);

    if (cardUpdates.length > 0) {
      await this.cards.bulkPut(cardUpdates);
      console.log(`[Normalization] Consolidated ${cardUpdates.length} cards into: ${canonicalId}`);
    }

    onProgress?.('復旧データの正規化完了');
    return { folders: folderUpdates.length, cards: cardUpdates.length, canonicalId };
  }

  private static instance: LocalDBInstance | null = null;
  private static currentUserId: string | null = null;
  private static openingPromise: Promise<LocalDBInstance> | null = null;
  private static openingUserId: string | null = null;
  private static resettingPromise: Promise<void> | null = null;
  private static persistentOpenDisabled = false;
  private static fallbackInstances = new Map<string, InMemoryLocalDB>();
  private static generationBumpedUsers = new Set<string>();

  private constructor(userId?: string) {
    // Prevent direct construction from browser code; enforce using LocalDB.getInstance()
    if (typeof window !== 'undefined') {
      try {
        const allow = (globalThis as any).__ALLOW_LOCAL_DB_CONSTRUCTION;
        if (!allow) {
          console.error('[LocalDB] Direct construction forbidden in browser. Use LocalDB.getInstance() instead.');
          throw new Error('Direct LocalDB construction forbidden in browser. Use LocalDB.getInstance() instead.');
        }
      } finally {
        // clear the flag to avoid accidental reuse
        try { delete (globalThis as any).__ALLOW_LOCAL_DB_CONSTRUCTION; } catch (e) {}
      }
    }

    super(LocalDB.getDatabaseNameForUser(userId ?? 'anonymous'));
    this.userId = userId;
    this.syncTrigger = null;

    // Diagnostic: log instance creation for detecting multiple DB instances
    try {
      console.log('[LocalDB] constructor created', { name: this.name, userId: this.userId });
      // include stack to help locate call sites that create instances
      console.debug('[LocalDB] constructor stack (info only):', new Error().stack);
    } catch (e) {
      // swallow logging errors to avoid interfering with initialization
    }

    this.version(1).stores({
      folders: 'id, userId, parentFolderId, updatedAt',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt',
      userStats: 'id, userId, updatedAt',
      syncMetadata: 'userId',
    });

    this.version(2).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt',
      userStats: 'id, userId, updatedAt',
      syncMetadata: 'userId',
    });

    this.version(3).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt',
      userStats: 'id, userId, updatedAt',
      syncMetadata: 'userId',
      levelHistories: 'id, userId, cardId, changedAt',
    });

    this.version(4).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt',
      userStats: 'id, userId, updatedAt',
      syncMetadata: 'userId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
    });

    this.version(5).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt',
      userStats: 'id, userId, updatedAt',
      syncMetadata: 'userId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, createdAt, action',
      conflicts: 'id, entityId',
    });

    this.version(6).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt',
      userStats: 'id, userId, updatedAt',
      syncMetadata: 'userId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, createdAt, action',
      conflicts: 'id, entityId',
      tags: 'name, userId, updatedAt',
    });

    this.version(7).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt',
      userStats: 'id, userId, updatedAt',
      syncMetadata: 'userId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, createdAt, action',
      conflicts: 'id, entityId',
      tags: null,
    });

    this.version(10).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, createdAt, action',
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
      studyLogs: 'id, userId, cardId, studiedAt', 
    });

    // Version 11: メタデータテーブル追加（ブラウザストレージ設計準拠）
    this.version(11).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, createdAt, action',
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
      studyLogs: 'id, userId, cardId, studiedAt',
      metadata: 'key', // 🔥 新規追加: IndexedDB 健全性管理用
    });

    // Version 12: 画像テーブル追加 (Phase 2 Upload Support)
    this.version(12).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, createdAt, action',
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
      studyLogs: 'id, userId, cardId, studiedAt',
      metadata: 'key',
      images: 'id, userId, status, [userId+status]', // 🔥 新規追加
    });

    // Version 13: Map Feature Tables
    this.version(13).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, createdAt, action',
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
      studyLogs: 'id, userId, cardId, studiedAt',
      metadata: 'key',
      images: 'id, userId, status, [userId+status]',
      cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
      projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
    });

    // Version 14: Fix SyncQueue Schema (Add status index)
    this.version(14).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, createdAt, action, status', // 🔥 Added status
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
      studyLogs: 'id, userId, cardId, studiedAt',
      metadata: 'key',
      images: 'id, userId, status, [userId+status]',
      cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
      projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
    });

    // Version 15: Enhance SyncQueue for OperationQueueService (Rev.5)
    this.version(15).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      // Schema Update: Add indices for efficient querying (targetId, priority, composite indices)
      syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey', 
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
      studyLogs: 'id, userId, cardId, studiedAt',
      metadata: 'key',
      images: 'id, userId, status, [userId+status]',
      cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
      projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
    });

    // Version 16: Globalize tags (Unified across all folders)
    this.version(16).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey', 
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt', // 🛠️ Reverted PK to fix Dexie UpgradeError
      tags_v2: '[userId+name], userId, updatedAt', // 🚀 NEW Global Tags table
      studyLogs: 'id, userId, cardId, studiedAt',
      metadata: 'key',
      images: 'id, userId, status, [userId+status]',
      cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
      projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
    }).upgrade(async tx => {
      // Tag consolidation migration: old tags -> tags_v2
      const oldTags = await tx.table('tags').toArray();
      if (oldTags.length === 0) return;

      const consolidatedMap = new Map<string, any>();
      oldTags.forEach(tag => {
          const key = `${tag.userId}_${tag.name}`;
          const existing = consolidatedMap.get(key);
          if (!existing || new Date(tag.updatedAt) > new Date(existing.updatedAt)) {
              consolidatedMap.set(key, { ...tag, rootFolderId: 'GLOBAL' });
          }
      });

      // Clear new table first if it's already used or for safety
      await tx.table('tags_v2').clear();
      await tx.table('tags_v2').bulkAdd(Array.from(consolidatedMap.values()));
      console.log(`[Migration] Consolidated ${oldTags.length} tags into ${consolidatedMap.size} global tags in tags_v2.`);
    });

    // Version 17: Documents (PDF) support
    this.version(17).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]',
      documents: 'id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]', // ✅追加
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey',
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
      tags_v2: '[userId+name], userId, updatedAt',
      studyLogs: 'id, userId, cardId, studiedAt',
      metadata: 'key',
      images: 'id, userId, status, [userId+status]',
      cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
      projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
    }).upgrade(async tx => {
      // 既存カードに difficulty / reviewCount が無い場合は補完する（破壊的変更なし）
      const cards = tx.table('cards');

      await cards.toCollection().modify((c: any) => {
        if (typeof c.difficulty !== 'number' || !Number.isFinite(c.difficulty)) {
          c.difficulty = 0.35; // 初期値（安全寄り）
        } else {
          // clamp 0..1
          c.difficulty = Math.max(0, Math.min(1, c.difficulty));
        }

        if (typeof c.reviewCount !== 'number' || !Number.isFinite(c.reviewCount)) {
          c.reviewCount = c.review_count ?? 0;
        }
      });
    });

    // Version 18: cards difficulty / reviewCount index追加（正しいマイグレーション）
    this.version(18).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]',
      documents: 'id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey',
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
      tags_v2: '[userId+name], userId, updatedAt',
      studyLogs: 'id, userId, cardId, studiedAt',
      metadata: 'key',
      images: 'id, userId, status, [userId+status]',
      cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
      projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
    }).upgrade(async tx => {
      const cards = tx.table('cards');
      await cards.toCollection().modify((c: any) => {
        if (typeof c.difficulty !== 'number' || !Number.isFinite(c.difficulty)) c.difficulty = 0.35;
        c.difficulty = Math.max(0, Math.min(1, c.difficulty));
        if (typeof c.reviewCount !== 'number' || !Number.isFinite(c.reviewCount)) {
          c.reviewCount = c.review_count ?? 0;
        }
      });
    });

    // Version 19: documents.localUrl/blobUrl の stale blob URL を正規化
    this.version(19).stores({
      folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
      cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]',
      documents: 'id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]',
      users: 'id, userId, updatedAt',
      userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
      syncMetadata: 'userId, deviceId',
      levelHistories: 'id, userId, cardId, changedAt',
      deviceMeta: 'deviceId, userId',
      syncErrors: 'id, occurredAt, phase, retryable',
      syncHistory: 'id, finishedAt',
      syncSettings: 'id',
      syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey',
      conflicts: 'id, entityId',
      tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
      tags_v2: '[userId+name], userId, updatedAt',
      studyLogs: 'id, userId, cardId, studiedAt',
      metadata: 'key',
      images: 'id, userId, status, [userId+status]',
      cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
      projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
    }).upgrade(async tx => {
      const documents = tx.table('documents');
      await documents.toCollection().modify((d: any) => {
        if (typeof d.localUrl === 'string' && d.localUrl.startsWith('blob:')) {
          d.localUrl = null;
        }
        if (typeof d.blobUrl === 'string' && d.blobUrl.startsWith('blob:')) {
          d.blobUrl = null;
        }
      });
    });

  }

  async normalizeDocumentBlobUrlsForSession(): Promise<void> {
    try {
      await this.documents.toCollection().modify((d: any) => {
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

  async getItem(table: string, id: string): Promise<any> {
    const item = await (this as any).table(table).get(id);
    if (table === 'cards') return item ? normalizeCard(item) : item;
    if (table === 'folders') return item ? normalizeFolderWithSilent(item) : item;
    return item;
  }

  async getAllItems(table: string): Promise<any[]> {
    const items = await (this as any).table(table).toArray();
    if (table === 'cards') return items.map(normalizeCard);
    if (table === 'folders') return items.map(normalizeFolderWithSilent);
    return items;
  }

  async addItem(table: string, item: any, skipSync = false): Promise<string> {
    const payload = table === 'cards' ? denormalizeCardForStorage(item) : table === 'folders' ? denormalizeFolderForStorage(item) : item;
    const safePreview = (() => {
      try {
        const s = JSON.stringify(payload);
        return s.length > 200 ? s.substring(0, 200) + '...(truncated)' : s;
      } catch (e) {
        return '<unserializable-payload>';
      }
    })();

    console.log(`[Diagnostic] localDb.addItem START. Table=${table}, ItemID=${payload.id ?? '<generated>'}, localDb instance type=${this.constructor.name}`);
    if (!(this instanceof LocalDB)) {
      console.error('[Diagnostic] CRITICAL: addItem called on non-LocalDB instance!', this);
    }
    console.log(`[LocalDB] addItem START -> table=${table} id=${payload.id ?? '<generated>'} skipSync=${skipSync}`);
    if (table === 'cards') {
      console.log(`[LocalDB] addItem CARD_CONTENT -> Q_Blocks=${payload.questionBlocks?.length ?? 0}, A_Blocks=${payload.answerBlocks?.length ?? 0}, Q_Text="${payload.questionText?.substring(0, 30)}..."`);
    }
    try {
      const id = await (this as any).table(table).add(payload);
      // Immediately verify the saved record is readable from THIS instance.
      // Sometimes IndexedDB visibility can lag in edge cases; retry a few times before failing.
      try {
        const maxVerifyAttempts = 4;
        let saved: any = null;
        for (let attempt = 1; attempt <= maxVerifyAttempts; attempt++) {
          try {
            saved = await (this as any).table(table).get(payload.id || id);
          } catch (e) {
            saved = null;
          }

          if (saved) break;

          // small backoff between attempts
          await new Promise((res) => setTimeout(res, 35 * attempt));
        }

        if (!saved) {
          console.error('[LocalDB] addItem verification failed after retries: write succeeded but read returned null', { table, id: payload.id || id, instanceName: this.name });
          throw new Error('DB instance mismatch: write succeeded but read failed');
        }
      } catch (verifyErr) {
        console.error('[LocalDB] addItem verification ERROR', verifyErr);
        throw verifyErr;
      }
      // addItem 直後は payload.id または返り値の id を使用
      const savedItem = { ...payload, id: payload.id || id };
      console.log(`[LocalDB] addItem AFTER_DEXIE_ADD -> table=${table} returnedId=${id} resolvedId=${savedItem.id}`);
      if (!skipSync) {
        try {
          await this.enqueueSync(table, 'upload', savedItem);
          console.log(`[LocalDB] addItem ENQUEUED_SYNC -> table=${table} id=${savedItem.id}`);
        } catch (enqueueErr) {
          console.error('[LocalDB] addItem enqueueSync ERROR', { table, id: savedItem.id, error: enqueueErr });
        }
      }
      console.log(`[LocalDB] addItem SUCCESS -> table=${table} id=${savedItem.id}`);
      return id;
    } catch (error: any) {
      const code = error?.name || error?.code || error?.message || 'UNKNOWN_ERROR';
      console.error(`[LocalDB] addItem ERROR -> table=${table} id=${payload.id ?? '<generated>'} code=${code} payloadPreview=${safePreview}`, error);
      // Re-throw so callers can handle it; keep original error
      throw error;
    }
  }

  private async canDeleteDocumentBlob(blobId: string, excludeDocumentId: string): Promise<boolean> {
    if (!blobId) return false;
    const sharedRef = await this.documents
      .filter((doc: any) => {
        if (!doc || doc.id === excludeDocumentId) return false;
        const refId = doc.localFileId ?? doc.id ?? null;
        if (!refId || refId !== blobId) return false;
        const isDeleted = doc.isDeleted ?? doc.is_deleted ?? false;
        return !isDeleted;
      })
      .first();
    return !sharedRef;
  }

  async updateItem(table: string, id: string, changes: object, skipSync = false): Promise<number> {
    if (table === 'documents') {
      const docChanges = changes as any;
      const hasLocalFileIdChange = Object.prototype.hasOwnProperty.call(docChanges, 'localFileId');
      const hasBlobUrlChange =
        Object.prototype.hasOwnProperty.call(docChanges, 'blobUrl') ||
        Object.prototype.hasOwnProperty.call(docChanges, 'localUrl');
      try {
        const existingDoc = await this.documents.get(id);
        const previousLocalBlobId = existingDoc?.localFileId ?? existingDoc?.id ?? null;
        const nextLocalBlobId = hasLocalFileIdChange
          ? docChanges.localFileId ?? null
          : previousLocalBlobId;
        const previousBlobUrl = existingDoc?.blobUrl ?? existingDoc?.localUrl ?? null;
        const nextBlobUrl = hasBlobUrlChange
          ? docChanges.blobUrl ?? docChanges.localUrl ?? null
          : previousBlobUrl;

        if (previousBlobUrl && previousBlobUrl !== nextBlobUrl) {
          safeRevokeBlobUrl(previousBlobUrl, `documents.updateItem:${id}`);
        } else if (
          previousBlobUrl &&
          hasLocalFileIdChange &&
          previousLocalBlobId &&
          previousLocalBlobId !== nextLocalBlobId &&
          !hasBlobUrlChange
        ) {
          safeRevokeBlobUrl(previousBlobUrl, `documents.updateItem-replace:${id}`);
        }

        if (hasBlobUrlChange && !nextBlobUrl && previousLocalBlobId) {
          removeDocumentBlobUrl(previousLocalBlobId, { userId: this.userId });
        }

        if (
          hasLocalFileIdChange &&
          previousLocalBlobId &&
          previousLocalBlobId !== nextLocalBlobId &&
          this.userId
        ) {
          const canDelete = await this.canDeleteDocumentBlob(previousLocalBlobId, id);
          if (canDelete) {
            await deleteDocumentBlob(previousLocalBlobId, { userId: this.userId });
            removeDocumentBlobUrl(previousLocalBlobId, { userId: this.userId });
          } else {
            console.info('[LocalDB] Skip deleting shared document blob', {
              documentId: id,
              localBlobId: previousLocalBlobId,
            });
          }
        }
      } catch (err) {
        console.warn('[LocalDB] updateItem documents blob replace cleanup failed', err);
      }
    }

    const payload = table === 'cards' ? denormalizeCardForStorage(changes) : table === 'folders' ? denormalizeFolderForStorage(changes) : changes;
    console.log(`[LocalDB] updateItem -> table=${table} id=${id} skipSync=${skipSync} changesKeys=${Object.keys(changes).join(',')}`);
    if (table === 'cards') {
      const c = payload as any;
      console.log(`[LocalDB] updateItem CARD_CHANGES -> Q_Blocks=${c.questionBlocks?.length}, A_Blocks=${c.answerBlocks?.length}, hasQText=${!!c.questionText}`);
    }
    const result = await (this as any).table(table).update(id, payload);
    
    // 変更後の全データを取得してエンキュー
    if (!skipSync) {
      const fullItem = await (this as any).table(table).get(id);
      if (fullItem) {
        await this.enqueueSync(table, 'upload', fullItem);
      }
    }
    
    return result;
  }

  async deleteItem(table: string, id: string): Promise<void> {
    if (table === 'documents') {
      try {
        const existingDoc = await this.documents.get(id);
        safeRevokeBlobUrl(existingDoc?.blobUrl ?? existingDoc?.localUrl ?? null, `documents.deleteItem:${id}`);
        const localBlobId = existingDoc?.localFileId ?? existingDoc?.id ?? id;
        if (localBlobId && this.userId) {
          const canDelete = await this.canDeleteDocumentBlob(localBlobId, id);
          if (canDelete) {
            await deleteDocumentBlob(localBlobId, { userId: this.userId });
            removeDocumentBlobUrl(localBlobId, { userId: this.userId });
          } else {
            console.info('[LocalDB] Skip deleting shared document blob', {
              documentId: id,
              localBlobId,
            });
          }
        }
      } catch (err) {
        console.warn('[LocalDB] deleteItem documents blob cleanup failed', err);
      }
    }
    return (this as any).table(table).delete(id);
  }

  async softDelete(table: string, id: string): Promise<number> {
    const now = new Date();
    console.log(`[LocalDB] softDelete -> table=${table} id=${id}`);
    if (table === 'documents') {
      try {
        const existingDoc = await this.documents.get(id);
        safeRevokeBlobUrl(existingDoc?.blobUrl ?? existingDoc?.localUrl ?? null, `documents.softDelete:${id}`);
        const localBlobId = existingDoc?.localFileId ?? existingDoc?.id ?? id;
        if (localBlobId && this.userId) {
          const canDelete = await this.canDeleteDocumentBlob(localBlobId, id);
          if (canDelete) {
            await deleteDocumentBlob(localBlobId, { userId: this.userId });
            removeDocumentBlobUrl(localBlobId, { userId: this.userId });
          } else {
            console.info('[LocalDB] Skip deleting shared document blob', {
              documentId: id,
              localBlobId,
            });
          }
        }
      } catch (err) {
        console.warn('[LocalDB] softDelete documents blob cleanup failed', err);
      }
    }

    const extraChanges =
      table === 'documents'
        ? { localFileId: null, localUrl: null, blobUrl: null }
        : {};

    const result = await this.updateItem(table, id, { isDeleted: true, deletedAt: now, updatedAt: now, ...extraChanges });
    // updateItem 内で enqueueSync が呼ばれるため、ここでは個別には呼ばない
    return result;
  }

  async restore(table: string, id: string): Promise<number> {
    return this.updateItem(table, id, { isDeleted: false, deletedAt: null, updatedAt: new Date() });
  }

  async purge(table: string, id: string): Promise<void> {
    return this.deleteItem(table, id);
  }

  async bulkUpsert(table: string, items: any[], skipSync = false): Promise<void> {
    if (items.length === 0) return;
    const payload = table === 'cards' ? items.map(denormalizeCardForStorage) : table === 'folders' ? items.map(denormalizeFolderForStorage) : items;
    await (this as any).table(table).bulkPut(payload);
    if (!skipSync) {
        for (const item of payload) {
            await this.enqueueSync(table, 'upload', item);
        }
    }
  }

  async clearTable(table: string): Promise<void> {
    await (this as any).table(table).clear();
  }

  async getAllCards(): Promise<Card[]> {
    // Return raw objects to preserve _rescueRaw and other fields for integrity repair
    return await this.cards.toArray() as Card[];
  }

  async getAllFolders(): Promise<Folder[]> {
    const folders = await this.folders.toArray();
    return folders.map(normalizeFolderWithSilent);
  }

  async getLastSyncTime(userId: string): Promise<Date | null> {
    const meta = await this.syncMetadata.get(userId);
    if (!meta || !meta.lastSyncTime) return null;
    return meta.lastSyncTime instanceof Timestamp ? meta.lastSyncTime.toDate() : meta.lastSyncTime;
  }

  async updateLastSyncTime(userId: string, syncTime: Date): Promise<void> {
    await this.syncMetadata.put({ 
      userId: userId, 
      deviceId: getOrCreateDeviceId(), 
      deviceName: getDeviceName(),
      lastSyncTime: syncTime,
      lastHighResSync: null, // Will be updated by HighRes sync logic later
      isActive: true
    });
  }

  async getDirtyItems(table: string, userId: string, lastSyncTime: Date): Promise<any[]> {
    return (this as any).table(table)
      .where('[userId+updatedAt]')
      .between([userId, lastSyncTime], [userId, Dexie.maxKey])
      .toArray();
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      this.folders.clear(),
      this.cards.clear(),
      this.documents.clear(), 
      this.users.clear(),
      this.userSettings.clear(),
      this.userStats.clear(),
      this.syncMetadata.clear(),
      this.levelHistories.clear(),
      this.deviceMeta.clear(),
      this.syncErrors.clear(),
      this.syncHistory.clear(),
      this.syncSettings.clear(),
      this.syncQueue.clear(),
      this.conflicts.clear(),
      (this as any).tags.clear(),
      (this as any).table('studyLogs').clear(),
      this.userId ? deleteDocumentBlobsByUser(this.userId) : Promise.resolve(),
    ]);
  }


  async cleanupSyncHistory(): Promise<void> {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    await this.syncHistory.where('finishedAt').below(now - THIRTY_DAYS).delete();
    const all = await this.syncHistory.orderBy('finishedAt').toArray();
    if (all.length > 100) {
      const toDelete = all.slice(0, all.length - 100);
      await this.syncHistory.bulkDelete(toDelete.map(h => h.id));
    }
  }

  async cleanupSyncErrors(): Promise<void> {
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const oldErrors = await this.syncErrors.where('occurredAt').below(now - SEVEN_DAYS).and(e => !e.retryable).toArray();
    await this.syncErrors.bulkDelete(oldErrors.map(e => e.id));
  }

  async getDeviceMeta(userId: string): Promise<any | undefined> {
    return this.deviceMeta.where('userId').equals(userId).first();
  }

  async upsertDeviceMeta(meta: any): Promise<void> {
    await this.deviceMeta.put(meta);
  }

  async getSyncEnabledFolders(userId: string): Promise<any[]> {
    return this.folders.where('userId').equals(userId).and(f => f.cloudSyncEnabled === true).toArray();
  }

  async getUpdatedCards(folderId: string, lastSyncTime: Date): Promise<any[]> {
    return this.cards.where('folderId').equals(folderId).and(c => {
        const updated = c.updatedAt instanceof Date ? c.updatedAt : c.updatedAt?.toDate?.() || new Date(0);
        return updated > lastSyncTime;
      }).toArray();
  }

  async upsert(tableName: string, data: any, skipSync = false): Promise<void> {
    const table = (this as any).table(tableName);
    const payload = tableName === 'cards' ? denormalizeCardForStorage(data) : tableName === 'folders' ? denormalizeFolderForStorage(data) : data;
    await table.put(payload);
    if (!skipSync) await this.enqueueSync(tableName, 'upload', payload);
  }

  // --- 同期支援機能 ---

  private syncTrigger: (() => void) | null = null;

  /**
   * 同期トリガー（SyncServiceV2 等から登録）
   */
  setSyncTrigger(callback: () => void) {
    this.syncTrigger = callback;
  }

  /**
   * 同期タスクをキューに追加
   */
  private async enqueueSync(tableName: string, type: 'upload' | 'download', payload: any) {
    // documents.localFileId は端末ローカル専用のため同期対象にしない。
    if (tableName === 'documents') return;

    const syncableTables = ['cards', 'folders', 'cardRelations', 'projectMaps', 'userSettings'];
    if (!syncableTables.includes(tableName)) return;

    const entityNameMap: Record<string, string> = {
      cards: 'card',
      folders: 'folder',
      cardRelations: 'cardRelation',
      projectMaps: 'projectMap',
      userSettings: 'userSetting'
    };

    // 既に同じIDのタスクが pending で存在する場合は上書きを検討すべきだが、
    // シンプルにするため毎回追加（QueueManager が適切に処理することを期待）
    const now = Date.now();
    const task: SyncQueueItem = {
      id: nanoid(),
      idempotencyKey: nanoid(),
      targetId: payload.id, 
      type, // 'upload' | 'download'
      entity: entityNameMap[tableName] as any,
      operationType: type === 'upload' ? 'update' : 'create', // CloudAdapter側で吸収可能
      payload,
      priority: 'high', // 既存の 'normal' を 'high' にマッピング
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      retryCount: 0
    };

    console.log(`[Diagnostic] enqueueSync -> pushing to syncQueue table. targetId=${task.targetId}, action=${task.type}, entity=${task.entity}`);
    console.log(`[LocalDB] enqueueSync -> table=${tableName} type=${type} targetId=${task.targetId} id=${task.id}`);
    await this.syncQueue.add(task);
    
    // 非同期で同期サービスに通知
    if (this.syncTrigger) {
      console.log('[Diagnostic] enqueueSync -> triggering sync callback');
      // UIスレッドをブロックしないよう setTimeout(0) を使用
      setTimeout(() => {
        if (this.syncTrigger) {
          console.log('[Diagnostic] Calling syncTrigger callback now');
          this.syncTrigger();
        }
      }, 0);
    } else {
      console.warn('[Diagnostic] enqueueSync -> No syncTrigger registered!');
    }
  }

  private static getGenerationForUser(userId: string): number {
    return readGenerationFromStorage(userId);
  }

  private static bumpGenerationForUser(userId: string): number {
    if (LocalDB.generationBumpedUsers.has(userId)) {
      return this.getGenerationForUser(userId);
    }
    LocalDB.generationBumpedUsers.add(userId);
    const current = this.getGenerationForUser(userId);
    const next = Math.min(current + 1, LOCALDB_GENERATION_MAX);
    if (next !== current) {
      writeGenerationToStorage(userId, next);
    }
    return next;
  }

  private static async listUserPersistentDbNames(userId: string): Promise<string[]> {
    const names = new Set<string>();
    const generationPrefix = makeGenerationDbPrefix(userId);

    for (let generation = 0; generation <= LOCALDB_GENERATION_MAX; generation += 1) {
      names.add(`${generationPrefix}${generation}`);
    }

    names.add(`${LOCALDB_NAME_PREFIX}${userId}`);

    if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
      try {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          const name = db?.name;
          if (!name) continue;
          if (name.startsWith(generationPrefix)) {
            names.add(name);
          }
        }
      } catch (error) {
        warnOncePerSession(
          'localdb:list-user-db-names-failed',
          `[LocalDB] Failed to enumerate user DB names during reset. Continuing with known generations for user=${userId}.`,
          error
        );
      }
    }

    return Array.from(names.values());
  }

  private static async deleteUserPersistentDatabases(userId: string): Promise<string | null> {
    const names = await LocalDB.listUserPersistentDbNames(userId);
    let failureReason: string | null = null;

    for (const name of names) {
      try {
        await Dexie.delete(name);
      } catch (error) {
        if (!failureReason) {
          failureReason = `delete failed (${name}): ${safeStringifyError(error)}`;
        }
      }
    }

    return failureReason;
  }

  static getDatabaseNameForUser(userId: string = 'anonymous'): string {
    const generation = this.getGenerationForUser(userId);
    return `FlashcardMasterDB_${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g${generation}`;
  }

  private static getFallbackDatabaseNameForUser(userId: string): string {
    return `FlashcardMasterDB_mem_${userId}`;
  }

  private static activateFallback(userId: string, error: unknown): LocalDBInstance {
    let fallback = LocalDB.fallbackInstances.get(userId);
    if (!fallback) {
      fallback = new InMemoryLocalDB(userId, LocalDB.getFallbackDatabaseNameForUser(userId));
      LocalDB.fallbackInstances.set(userId, fallback);
    }

    LocalDB.instance = fallback;
    LocalDB.currentUserId = userId;

    updateLocalDBRuntimeStatus({
      mode: 'fallback',
      userId,
      dbName: fallback.name,
      fallbackReason: safeStringifyError(error),
      fallbackReasonCode: classifyFallbackReasonCode(error),
      resetFailedReason: getStoredLocalDBResetFailureReason(),
    });

    warnOncePerSession(
      'localdb:fallback-mode',
      `[LocalDB] Running in fallback mode (non-persistent). Recovery guide: ${LOCALDB_RECOVERY_GUIDE_URL}`
    );

    return fallback;
  }

  private static async openPersistentDbWithRetry(db: LocalDB): Promise<void> {
    let attempt = 0;
    const maxAttempts = 2;
    let lastError: unknown = null;

    while (attempt < maxAttempts) {
      try {
        await db.open();
        return;
      } catch (error) {
        lastError = error;
        const fatalBackingStore = isBackingStoreOpenError(error);
        if (fatalBackingStore || attempt >= maxAttempts - 1) break;
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
      }
      attempt += 1;
    }

    throw lastError;
  }

  static async getInstance(userId?: string): Promise<LocalDBInstance> {
    const nextUserId = userId || 'anonymous';

    if (LocalDB.resettingPromise) {
      await LocalDB.resettingPromise.catch(() => {
        // reset failure is handled in resetForLogout()
      });
    }

    if (LocalDB.instance && LocalDB.currentUserId === nextUserId) {
      return LocalDB.instance;
    }

    if (LocalDB.openingPromise && LocalDB.openingUserId === nextUserId) {
      return await LocalDB.openingPromise;
    }

    if (LocalDB.openingPromise && LocalDB.openingUserId !== nextUserId) {
      await LocalDB.openingPromise.catch(() => {
        // previous open failure is handled below
      });
      if (LocalDB.instance && LocalDB.currentUserId === nextUserId) {
        return LocalDB.instance;
      }
    }

    const openPromise = (async (): Promise<LocalDBInstance> => {
      if (LocalDB.instance && LocalDB.currentUserId !== nextUserId) {
        try {
          if (LocalDB.instance.isOpen()) {
            LocalDB.instance.close();
          }
        } catch (closeError) {
          warnOncePerSession('localdb:switch-close-failed', '[LocalDB] Failed to close previous instance while switching user.', closeError);
        } finally {
          LocalDB.instance = null;
          LocalDB.currentUserId = null;
        }
      }

      if (LocalDB.persistentOpenDisabled) {
        return LocalDB.activateFallback(nextUserId, new Error('Persistent IndexedDB is disabled in this session.'));
      }

      const persistentDb = LocalDB.internalCreate(nextUserId);

      try {
        await LocalDB.openPersistentDbWithRetry(persistentDb);
        if (persistentDb.isOpen()) {
          await persistentDb.normalizeDocumentBlobUrlsForSession();
        }
        LocalDB.instance = persistentDb;
        LocalDB.currentUserId = nextUserId;
        LocalDB.persistentOpenDisabled = false;

        updateLocalDBRuntimeStatus({
          mode: 'persistent',
          userId: nextUserId,
          dbName: persistentDb.name,
          fallbackReason: null,
          fallbackReasonCode: 'none',
          resetFailedReason: getStoredLocalDBResetFailureReason(),
        });

        return persistentDb;
      } catch (error) {
        try {
          if (persistentDb.isOpen()) {
            persistentDb.close();
          }
        } catch {
          // ignore close failures
        }

        const isFatal = isBackingStoreOpenError(error);
        if (isFatal) {
          LocalDB.bumpGenerationForUser(nextUserId);
          markLocalDBGenerationBumped();
          saveLocalDBResetFailureReason(
            `IndexedDB backing store open failed: ${safeStringifyError(error)}`
          );
          warnOncePerSession(
            'localdb:backing-store-open-error',
            `[LocalDB] Fatal IndexedDB backing store error detected. Persistent mode disabled for this session. Recovery guide: ${LOCALDB_RECOVERY_GUIDE_URL}`,
            error
          );
        } else {
          warnOncePerSession(
            'localdb:open-failed',
            '[LocalDB] IndexedDB open failed. Falling back to in-memory mode for this session.',
            error
          );
        }

        LocalDB.persistentOpenDisabled = true;
        return LocalDB.activateFallback(nextUserId, error);
      }
    })();

    LocalDB.openingPromise = openPromise;
    LocalDB.openingUserId = nextUserId;

    try {
      return await openPromise;
    } finally {
      if (LocalDB.openingPromise === openPromise) {
        LocalDB.openingPromise = null;
        LocalDB.openingUserId = null;
      }
    }
  }

  static async resetForLogout(userId?: string): Promise<void> {
    if (LocalDB.resettingPromise) {
      return LocalDB.resettingPromise;
    }

    const targetUserId = userId || LocalDB.currentUserId || 'anonymous';

    LocalDB.resettingPromise = (async () => {
      let resetFailureReason: string | null = null;

      if (LocalDB.openingPromise) {
        await LocalDB.openingPromise.catch(() => {
          // best-effort reset continues
        });
      }

      const activeInstance = LocalDB.instance;

      if (activeInstance) {
        try {
          await activeInstance.clearAllData();
        } catch (error) {
          resetFailureReason = `clearAllData failed: ${safeStringifyError(error)}`;
        }

        try {
          if (activeInstance.isOpen()) {
            activeInstance.close();
          }
        } catch (error) {
          if (!resetFailureReason) {
            resetFailureReason = `close failed: ${safeStringifyError(error)}`;
          }
        }

        try {
          if (activeInstance instanceof LocalDB) {
            await Dexie.delete(activeInstance.name);
          } else {
            await activeInstance.delete();
          }
        } catch (error) {
          if (!resetFailureReason) {
            resetFailureReason = `delete failed: ${safeStringifyError(error)}`;
          }
        }
      }

      const generationCleanupFailure = await LocalDB.deleteUserPersistentDatabases(targetUserId);
      if (!resetFailureReason && generationCleanupFailure) {
        resetFailureReason = generationCleanupFailure;
      }

      LocalDB.instance = null;
      LocalDB.currentUserId = null;
      cachedInstance = null;
      LocalDB.fallbackInstances.delete(targetUserId);
      LocalDB.persistentOpenDisabled = false;

      if (resetFailureReason) {
        saveLocalDBResetFailureReason(resetFailureReason);
        warnOncePerSession(
          'localdb:logout-reset-failed',
          `[LocalDB] Logout reset failed (best-effort): ${resetFailureReason}`
        );
      } else {
        saveLocalDBResetFailureReason(null);
      }

      updateLocalDBRuntimeStatus({
        mode: 'persistent',
        userId: null,
        dbName: null,
        fallbackReason: null,
        fallbackReasonCode: 'none',
      });
    })();

    try {
      await LocalDB.resettingPromise;
    } finally {
      LocalDB.resettingPromise = null;
    }
  }

  static getInstanceUserId(): string | null {
    return LocalDB.currentUserId;
  }

  /**
   * シングルトンインスタンスを明示的に破棄します。
   * DBのリビルド時やユーザー切り替え時に、古い接続を完全に閉じるために使用します。
   */
  static clearInstance() {
    if (LocalDB.instance) {
      try {
        if (LocalDB.instance.isOpen()) {
          LocalDB.instance.close();
        }
        console.log(`[LocalDB] Instance for ${LocalDB.currentUserId} cleared via clearInstance()`);
      } catch (e) {
        console.error('[LocalDB] Error closing instance during clear:', e);
      } finally {
        if (LocalDB.instance instanceof InMemoryLocalDB && LocalDB.currentUserId) {
          LocalDB.fallbackInstances.delete(LocalDB.currentUserId);
        }
        LocalDB.instance = null;
        LocalDB.currentUserId = null;
        cachedInstance = null;
      }
    }
  }

  private static internalCreate(userId?: string): LocalDB {
    try {
      (globalThis as any).__ALLOW_LOCAL_DB_CONSTRUCTION = true;
      return new LocalDB(userId);
    } finally {
      try { delete (globalThis as any).__ALLOW_LOCAL_DB_CONSTRUCTION; } catch (e) {}
    }
  }
}

let cachedInstance: LocalDBInstance | null = null;

/**
 * データベースインスタンスを非同期で取得します。
 * (循環参照を避けるため、トップレベルでの呼び出しを禁止しています)
 */
export async function getLocalDb(userId?: string): Promise<LocalDBLike> {
  if (!cachedInstance || (userId && LocalDB.getInstanceUserId() !== userId)) {
    cachedInstance = await LocalDB.getInstance(userId);
  }
  return cachedInstance;
}

/**
 * 下位互換性のための同期取得（非推奨：初期化後にのみ使用可能）
 */
export function getLocalDbSync(): LocalDBLike {
  if (!cachedInstance) {
    throw new Error('[LocalDB] Database accessed before async initialization. Use await getLocalDb() first.');
  }
  return cachedInstance;
}

export async function resetLocalDBForLogout(userId?: string): Promise<void> {
  await LocalDB.resetForLogout(userId);
}

export {
  clearLocalDBResetFailureReason,
  getLocalDBTelemetrySnapshot,
  getLocalDBRuntimeStatus,
  subscribeLocalDBRuntimeStatus,
  telemetryOncePerSession,
  LOCALDB_RECOVERY_GUIDE_URL
};

if (typeof window !== 'undefined') {
  // Allow overwriting to prevent "Cannot set property... which has only a getter" errors
  // This supports legacy code or debugging tools that might try to assign to it
  try {
    Object.defineProperty(window, 'dbInstance', {
      get: () => {
        try { return getLocalDbSync(); } catch(e) { return null; }
      },
      set: (_) => {
        // No-op setter to handle unexpected assignments without crashing
        // console.debug('[LocalDB] window.dbInstance setter ignored');
      },
      configurable: true
    });
  } catch (e) {
     console.warn('[LocalDB] Failed to define window.dbInstance', e);
  }
}

export async function initializeDB(userId: string): Promise<void> {
  await getLocalDb(userId);
}

// DevTools helper: call `dbDebug()` in Console to dump LocalDB and syncQueue
if (typeof window !== 'undefined') {
  (window as any).dbDebug = async () => {
    console.group('--- LocalDB / syncQueue Debug ---');
    try {
      const db = await getLocalDb();
      console.log('DB name:', db?.name);
      console.log('Folders:');
      try { console.table(await db.getAllFolders()); } catch (e) { console.warn('Failed to read folders', e); }
      console.log('Cards:');
      try { console.table(await db.getAllCards()); } catch (e) { console.warn('Failed to read cards', e); }
      console.log('SyncQueue:');
      try {
        const rows = await db.syncQueue.toArray();
        console.log('syncQueue rows length:', rows?.length);
        console.table(rows);
      } catch (e) {
        console.warn('Failed to read syncQueue', e);
      }
    } catch (err) {
      console.error('dbDebug error', err);
    } finally {
      console.groupEnd();
    }
  };
}

// DevTools helper methods
if (typeof window !== 'undefined') {
  (window as any).__dbHelpers = {
    addDebugFolder: async (data: any) => {
      try {
        const db = await getLocalDb();
        const payload = {
          id: data.id || 'debug-folder-' + Date.now(),
          userId: data.userId || ((window as any).auth?.currentUser?.uid === 'string' ? (window as any).auth.currentUser.uid : 'debug-user'),
          folderName: data.folderName || data.name || 'DEBUG',
          parentFolderId: data.parentFolderId ?? null,
          folderColor: data.folderColor ?? null,
          cloudSyncEnabled: data.cloudSyncEnabled ?? true,
          orderIndex: data.orderIndex ?? 0,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date(),
          isDeleted: data.isDeleted ?? false
        };
        console.log('[__dbHelpers] addDebugFolder -> payload', payload);
        const id = await db.addItem('folders', payload as any);
        console.log('[__dbHelpers] addDebugFolder SUCCESS id=', id);
        return id;
      } catch (e) {
        console.error('[__dbHelpers] addDebugFolder ERROR', e);
        throw e;
      }
    },
    dump: async () => {
      return await (window as any).dbDebug();
    },
    rawDB: async () => await getLocalDb()
  };
}

