import { normalizeCard } from '../../utils';
import { deleteDocumentBlob, deleteDocumentBlobsByUser } from '../documentFileStore';
import { deleteImageBlobsByUser } from '../imageFileStore';
import { removeDocumentBlobUrl } from '../documentBlobUrlSessionCache';
import { InMemoryLocalDB } from '../InMemoryLocalDB';
import { Dexie, type PromiseExtended } from 'dexie';
import { nanoid } from 'nanoid';
import { Timestamp } from 'firebase/firestore';
import {
  getStoredLocalDBResetFailureReason,
  markLocalDBGenerationBumped,
  saveLocalDBResetFailureReason,
  updateLocalDBRuntimeStatus,
  warnOncePerSession,
} from '../localDBRuntimeState';

import type {
  Folder,
  Card,
  Document,
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
  AssetRecord,
} from '../../types';
import type { IntegrityRepairResult } from '../dataIntegrityTypes';

import { isBackingStoreOpenError, safeStringifyError, classifyFallbackReasonCode } from './errors';
import { safeRevokeBlobUrl, assertNoBlobUrlInCardPayload, buildCardCandidateFromMods } from './blobUrl';
import {
  getDatabaseNameForUser as _getDatabaseNameForUser,
  getFallbackDatabaseNameForUser,
  getGenerationForUser,
  bumpGenerationForUser as _bumpGenerationForUser,
  deleteUserPersistentDatabases,
} from './generation';
import {
  denormalizeCardForStorage,
  denormalizeFolderForStorage,
  normalizeFolderWithSilent,
} from './transforms';
import { defineSchema } from './schema';
import { attachHooks } from './hooks';
import { importFromDatabase as rescueImportFromDatabase, extractFromFirestoreSDK as rescueExtractFromFirestoreSDK } from './rescue';
import { repairDataIntegrity as repairDataIntegrityImpl } from './integrityRepair';
import { getOrCreateDeviceId, getDeviceName } from '../../utils/device';

// Map機能は削除済みだが、旧DB互換（読み取り/救出）とDexie型のために最小定義だけ残す
export type CardRelation = {
  id: string;
  userId: string;
  fromCardId?: string;
  toCardId?: string;
  folderId?: string | null;
  updatedAt?: Date;
  createdAt?: Date;
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type ProjectMap = {
  id: string;
  userId: string;
  folderId?: string;
  name?: string;
  updatedAt?: Date;
  createdAt?: Date;
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type TagLegacyRecord = {
  name: string;
  color: string;
  userId: string;
  rootFolderId: string;
  updatedAt: Date;
};

export type TagV2Record = TagLegacyRecord & {
  id?: string;
  categoryId?: string;
  parentId?: string;
};

export type LocalDBLike = LocalDB | InMemoryLocalDB;
export type LocalDBInstance = LocalDBLike;

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
  images!: Dexie.Table<AssetRecord | UploadedImage, string>; // 画像資産メタデータ

  // Phase 3: Map Feature
  cardRelations!: Dexie.Table<CardRelation, string>;
  projectMaps!: Dexie.Table<ProjectMap, string>;

  // Tags (Legacy + V2)
  tags!: Dexie.Table<TagLegacyRecord, [string, string]>;
  tags_v2!: Dexie.Table<TagV2Record, [string, string]>;

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
          `[LocalDB] Failed to list IndexedDB databases due to backing store error. Recovery guide: https://support.google.com/chrome/answer/2392709`,
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
   */
  async importFromDatabase(
    sourceDbName: string,
    currentUserId: string,
    onProgress?: (progress: string) => void
  ): Promise<{ cards: number; folders: number; stats: number; studyLogs: number; firstCardKeys: string[] }> {
    return rescueImportFromDatabase(this, sourceDbName, currentUserId, onProgress);
  }

  /**
   * Firestore SDKの内部データベースからキャッシュされているドキュメントを抽出します
   */
  async extractFromFirestoreSDK(
    sourceDbName: string,
    currentUserId: string,
    onProgress?: (progress: string) => void
  ): Promise<{ cards: number; folders: number; firstCardKeys: string[] }> {
    return rescueExtractFromFirestoreSDK(this, sourceDbName, currentUserId, onProgress);
  }

  /**
   * 既存のレコードを走査し、不足している必須プロパティを補完します。
   */
  async repairDataIntegrity(currentUserId: string, onProgress?: (msg: string) => void): Promise<IntegrityRepairResult> {
    return repairDataIntegrityImpl(this, currentUserId, onProgress);
  }

  private static instance: LocalDBInstance | null = null;
  private static currentUserId: string | null = null;
  private static openingPromise: Promise<LocalDBInstance> | null = null;
  private static openingUserId: string | null = null;
  private static resettingPromise: Promise<void> | null = null;
  private static persistentOpenDisabled = false;
  private static fallbackInstances = new Map<string, InMemoryLocalDB>();

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

    defineSchema(this);
    attachHooks(this);
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
    if (table === 'cards') {
      assertNoBlobUrlInCardPayload(item, { entityType: table, entityId: item?.id });
    }
    const payload = table === 'cards' ? denormalizeCardForStorage(item) : table === 'folders' ? denormalizeFolderForStorage(item) : item;
    if (table === 'cards') {
      assertNoBlobUrlInCardPayload(payload, { entityType: table, entityId: payload?.id ?? item?.id });
    }
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

    if (table === 'cards') {
      assertNoBlobUrlInCardPayload(changes, { entityType: table, entityId: id });
    }
    const payload = table === 'cards' ? denormalizeCardForStorage(changes) : table === 'folders' ? denormalizeFolderForStorage(changes) : changes;
    if (table === 'cards') {
      assertNoBlobUrlInCardPayload(payload, { entityType: table, entityId: id });
    }
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
    if (table === 'cards') {
      for (const entry of payload) {
        assertNoBlobUrlInCardPayload(entry, { entityType: table, entityId: (entry as any)?.id });
      }
    }
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
      lastHighResSync: null,
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
      this.userId ? deleteImageBlobsByUser(this.userId) : Promise.resolve(),
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
        const updated = c.updatedAt instanceof Date ? c.updatedAt : (c.updatedAt as any)?.toDate?.() || new Date(0);
        return updated > lastSyncTime;
      }).toArray();
  }

  async upsert(tableName: string, data: any, skipSync = false): Promise<void> {
    const table = (this as any).table(tableName);
    if (tableName === 'cards') {
      assertNoBlobUrlInCardPayload(data, { entityType: tableName, entityId: data?.id });
    }
    const payload = tableName === 'cards' ? denormalizeCardForStorage(data) : tableName === 'folders' ? denormalizeFolderForStorage(data) : data;
    if (tableName === 'cards') {
      assertNoBlobUrlInCardPayload(payload, { entityType: tableName, entityId: payload?.id ?? data?.id });
    }
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

    const syncableTables = ['cards', 'folders', 'userSettings'];
    if (!syncableTables.includes(tableName)) return;

    const entityNameMap: Record<string, string> = {
      cards: 'card',
      folders: 'folder',
      cardRelations: 'cardRelation',
      projectMaps: 'projectMap',
      userSettings: 'userSetting'
    };

    const now = Date.now();
    const task: SyncQueueItem = {
      id: nanoid(),
      idempotencyKey: nanoid(),
      targetId: payload.id,
      type,
      entity: entityNameMap[tableName] as any,
      operationType: type === 'upload' ? 'update' : 'create',
      payload,
      priority: 'high',
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

  static getDatabaseNameForUser(userId: string = 'anonymous'): string {
    return _getDatabaseNameForUser(userId);
  }

  private static activateFallback(userId: string, error: unknown): LocalDBInstance {
    let fallback = LocalDB.fallbackInstances.get(userId);
    if (!fallback) {
      fallback = new InMemoryLocalDB(userId, getFallbackDatabaseNameForUser(userId));
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
      `[LocalDB] Running in fallback mode (non-persistent). Recovery guide: https://support.google.com/chrome/answer/2392709`
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
          _bumpGenerationForUser(nextUserId);
          markLocalDBGenerationBumped();
          saveLocalDBResetFailureReason(
            `IndexedDB backing store open failed: ${safeStringifyError(error)}`
          );
          warnOncePerSession(
            'localdb:backing-store-open-error',
            `[LocalDB] Fatal IndexedDB backing store error detected. Persistent mode disabled for this session. Recovery guide: https://support.google.com/chrome/answer/2392709`,
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

      const generationCleanupFailure = await deleteUserPersistentDatabases(targetUserId);
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

// ─── Module-level cache and public functions ────────────────────────────────

let cachedInstance: LocalDBInstance | null = null;

/**
 * データベースインスタンスを非同期で取得します。
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

export async function initializeDB(userId: string): Promise<void> {
  await getLocalDb(userId);
}

// Install devtools only in development
if (import.meta.env.DEV) {
  import('./devtools').then(m => m.installLocalDbDevtools());
}
