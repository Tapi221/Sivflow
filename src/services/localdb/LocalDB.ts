// DEV時だけ devtools を有効化（index.ts を経由しない構成でも確実に動く）
if (import.meta.env.DEV && typeof window !== "undefined") {
  import("./devtools")
    .then((m) => m.installLocalDbDevtools?.())
    .catch(() => {});
}

import type {
  AssetRecord,
  Card,
  CardSet,
  Document,
  Folder,
  SyncConflict,
  SyncError,
  SyncHistory,
  SyncMetadata,
  SyncQueueItem,
  SyncSettings,
  UploadedImage,
  User,
  UserSettings,
  UserStats,
} from "@/types";
import { Dexie } from "dexie";
import { nanoid } from "nanoid";
import * as crud from "./crud";
import { getDatabaseNameForUser as _getDatabaseNameForUser } from "./generation";
import { attachHooks } from "./hooks";
import * as maintenance from "./maintenance";
import * as queries from "./queries";
import { defineSchema } from "./schema";

// NOTE: creates a circular dependency with instanceManager.ts; safe in ESM (all usages inside function bodies)
import {
  clearInstance as clearInstanceImpl,
  getInstance as getInstanceImpl,
  getInstanceUserId as getInstanceUserIdImpl,
  getLocalDb,
  getLocalDbSync,
  initializeDB,
  resetForLogout as resetForLogoutImpl,
  resetLocalDBForLogout,
} from "./instanceManager";
import type { LocalDBTableMap, SyncableEntityTable } from "./types";

export type {
  CardRelation,
  LocalDBInstance,
  LocalDBLike,
  LocalDBTableMap,
  ProjectMap,
  SyncableEntityTable,
  TagV3Record
} from "./types";

declare global {
  interface GlobalThis {
    __ALLOW_LOCAL_DB_CONSTRUCTION?: boolean;
  }
}

type SyncDirection = "upload" | "download";
type SyncQueuePayload = SyncQueueItem["payload"];

const syncableTables = [
  "cards",
  "folders",
  "cardSets",
  "documents",
  "tags_v3",
  "userSettings",
  "images",
] as const;

type SyncableTableName = (typeof syncableTables)[number];

const isSyncableTableName = (t: string): t is SyncableTableName =>
  (syncableTables as readonly string[]).includes(t);

const entityNameMap: Record<SyncableTableName, SyncQueueItem["entity"]> = {
  cards: "card",
  folders: "folder",
  cardSets: "cardSet",
  documents: "document",
  tags_v3: "tag",
  userSettings: "userSetting",
  images: "asset",
};

const getPayloadId = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const id = p.id;
  return typeof id === "string" && id.length > 0 ? id : null;
};

const asArray = <T>(v: unknown): T[] => {
  return Array.isArray(v) ? (v as T[]) : [];
};

/**
 * Dexie.js を使用したローカルデータベースの実装。
 * 設計思想に基づき、すべてのユーザーデータをクライアントサイドで管理します。
 */
export class LocalDB extends Dexie {
  folders!: Dexie.Table<Folder, string>;
  cardSets!: Dexie.Table<CardSet, string>;
  cards!: Dexie.Table<Card, string>;
  // ✅ PDF/Document テーブル（テーブル名は documents で統一）
  documents!: Dexie.Table<Document, string>;
  users!: Dexie.Table<User, string>;
  userSettings!: Dexie.Table<UserSettings, string>;
  userStats!: Dexie.Table<UserStats, string>;
  syncMetadata!: Dexie.Table<SyncMetadata, string>;

  levelHistories!: Dexie.Table<Record<string, unknown>, string>;
  deviceMeta!: Dexie.Table<Record<string, unknown>, string>;

  syncErrors!: Dexie.Table<SyncError, string>;
  syncHistory!: Dexie.Table<SyncHistory, string>;
  syncSettings!: Dexie.Table<SyncSettings, string>;
  syncQueue!: Dexie.Table<SyncQueueItem, string>;
  conflicts!: Dexie.Table<SyncConflict, string>;

  metadata!: Dexie.Table<Record<string, unknown>, string>;
  images!: Dexie.Table<AssetRecord | UploadedImage, string>;

  // Phase 3: Map Feature（削除済みだが旧DB互換のため残す）
  cardRelations!: Dexie.Table<Record<string, unknown>, string>;
  projectMaps!: Dexie.Table<Record<string, unknown>, string>;
  tags!: Dexie.Table<Record<string, unknown>, [string, string]>;
  tags_v2!: Dexie.Table<Record<string, unknown>, [string, string]>;
  tags_v3!: Dexie.Table<import("./types").TagV3Record, string>;

  public userId?: string;

  private constructor(userId?: string) {
    // Prevent direct construction from browser code; enforce using LocalDB.getInstance()
    if (typeof window !== "undefined") {
      try {
        const allow = globalThis.__ALLOW_LOCAL_DB_CONSTRUCTION === true;
        if (!allow) {
          console.error(
            "[LocalDB] Direct construction forbidden in browser. Use LocalDB.getInstance() instead.",
          );
          throw new Error(
            "Direct LocalDB construction forbidden in browser. Use LocalDB.getInstance() instead.",
          );
        }
      } finally {
        try {
          delete globalThis.__ALLOW_LOCAL_DB_CONSTRUCTION;
        } catch {
          // ignore
        }
      }
    }

    super(LocalDB.getDatabaseNameForUser(userId ?? "anonymous"));
    this.userId = userId;
    this.syncTrigger = null;

    try {
      console.log("[LocalDB] constructor created", {
        name: this.name,
        userId: this.userId,
      });
      console.debug(
        "[LocalDB] constructor stack (info only):",
        new Error().stack,
      );
    } catch {
      // swallow logging errors to avoid interfering with initialization
    }

    defineSchema(this);
    attachHooks(this);
  }

  /** instanceManager.ts 専用: private ctor を通すための内部ファクトリ */
  static __createInternal(userId?: string): LocalDB {
    return new LocalDB(userId);
  }

  async normalizeDocumentBlobUrlsForSession(): Promise<void> {
    return queries.normalizeDocumentBlobUrlsForSession(this);
  }

  async getItem<TTable extends SyncableEntityTable>(
    table: TTable,
    id: string,
  ): Promise<LocalDBTableMap[TTable] | undefined>;
  async getItem(table: string, id: string): Promise<unknown> {
    return queries.getItem(this, table, id);
  }

  async getAllItems<TTable extends SyncableEntityTable>(
    table: TTable,
  ): Promise<Array<LocalDBTableMap[TTable]>>;
  async getAllItems(table: string): Promise<unknown[]> {
    return queries.getAllItems(this, table);
  }

  async getAllCards(): Promise<Card[]> {
    const rows = await queries.getAllCards(this);
    return asArray<Card>(rows);
  }

  async getAllFolders(): Promise<Folder[]> {
    const rows = await queries.getAllFolders(this);
    return asArray<Folder>(rows);
  }

  async getDirtyItems<TTable extends SyncableEntityTable>(
    table: TTable,
    userId: string,
    lastSyncTime: Date,
  ): Promise<Array<LocalDBTableMap[TTable]>>;
  async getDirtyItems(
    table: string,
    userId: string,
    lastSyncTime: Date,
  ): Promise<unknown[]> {
    return queries.getDirtyItems(this, table, userId, lastSyncTime);
  }

  async getUpdatedCards(
    folderId: string,
    lastSyncTime: Date,
  ): Promise<unknown[]> {
    return queries.getUpdatedCards(this, folderId, lastSyncTime);
  }

  async getLastSyncTime(userId: string): Promise<Date | null> {
    return queries.getLastSyncTime(this, userId);
  }

  async updateLastSyncTime(userId: string, syncTime: Date): Promise<void> {
    return queries.updateLastSyncTime(this, userId, syncTime);
  }

  async addItem(
    table: string,
    item: unknown,
    skipSync = false,
  ): Promise<string> {
    if (!(this instanceof LocalDB)) {
      console.error(
        "[Diagnostic] CRITICAL: addItem called on non-LocalDB instance!",
        this,
      );
    }

    return crud.addItem(
      this,
      table,
      item,
      skipSync,
      (t: string, type: SyncDirection, p: SyncQueuePayload) =>
        this.enqueueSync(t, type, p),
    );
  }

  async updateItem(
    table: string,
    id: string,
    changes: Record<string, unknown>,
    skipSync = false,
  ): Promise<number> {
    return crud.updateItem(
      this,
      table,
      id,
      changes,
      skipSync,
      (t: string, type: SyncDirection, p: SyncQueuePayload) =>
        this.enqueueSync(t, type, p),
    );
  }

  async deleteItem(table: string, id: string): Promise<void> {
    return crud.deleteItem(this, table, id);
  }

  async softDelete(table: string, id: string): Promise<number> {
    return crud.softDelete(
      this,
      table,
      id,
      (t: string, i: string, c: Record<string, unknown>) =>
        this.updateItem(t, i, c),
    );
  }

  async restore(table: string, id: string): Promise<number> {
    return this.updateItem(table, id, {
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date(),
    });
  }

  async purge(table: string, id: string): Promise<void> {
    return this.deleteItem(table, id);
  }

  async bulkUpsert(
    table: string,
    items: unknown[],
    skipSync = false,
  ): Promise<void> {
    return crud.bulkUpsert(
      this,
      table,
      items,
      skipSync,
      (t: string, type: SyncDirection, p: SyncQueuePayload) =>
        this.enqueueSync(t, type, p),
    );
  }

  async upsert<TTable extends SyncableEntityTable>(
    tableName: TTable,
    data: LocalDBTableMap[TTable],
    skipSync?: boolean,
  ): Promise<void>;
  async upsert(
    tableName: string,
    data: unknown,
    skipSync = false,
  ): Promise<void> {
    return crud.upsert(
      this,
      tableName,
      data,
      skipSync,
      (t: string, type: SyncDirection, p: SyncQueuePayload) =>
        this.enqueueSync(t, type, p),
    );
  }

  async clearTable(table: string): Promise<void> {
    await this.table(table).clear();
  }

  async clearAllData(): Promise<void> {
    return maintenance.clearAllData(this);
  }

  async cleanupSyncHistory(): Promise<void> {
    return maintenance.cleanupSyncHistory(this);
  }

  async cleanupSyncErrors(): Promise<void> {
    return maintenance.cleanupSyncErrors(this);
  }

  async getDeviceMeta(
    userId: string,
  ): Promise<Record<string, unknown> | undefined> {
    const v = await maintenance.getDeviceMeta(this, userId);
    if (v && typeof v === "object") return v as Record<string, unknown>;
    return undefined;
  }

  async upsertDeviceMeta(meta: Record<string, unknown>): Promise<void> {
    return maintenance.upsertDeviceMeta(this, meta);
  }

  async getSyncEnabledFolders(userId: string): Promise<unknown[]> {
    return maintenance.getSyncEnabledFolders(this, userId);
  }

  // --- 同期支援機能 ---
  private syncTrigger: (() => void) | null = null;

  setSyncTrigger(callback: () => void): void {
    this.syncTrigger = callback;
  }

  async getSyncSettings(id: string): Promise<SyncSettings | undefined> {
    return this.syncSettings.get(id);
  }

  async putSyncSettings(settings: SyncSettings): Promise<void> {
    await this.syncSettings.put(settings);
  }

  async getSyncError(id: string): Promise<SyncError | undefined> {
    return this.syncErrors.get(id);
  }

  async putSyncError(error: SyncError): Promise<void> {
    await this.syncErrors.put(error);
  }

  async clearSyncErrors(): Promise<void> {
    await this.syncErrors.clear();
  }

  async getRetryableSyncErrors(): Promise<SyncError[]> {
    return this.syncErrors.where("retryable").equals(1).toArray();
  }

  async findQueueProcessingErrorsByTargetId(
    targetId: string,
  ): Promise<SyncError[]> {
    const errors = await this.syncErrors
      .where("message")
      .startsWith("Queue processing failed")
      .toArray();
    return errors.filter((error) => error.message.includes(targetId));
  }

  async putSyncHistory(history: SyncHistory): Promise<void> {
    await this.syncHistory.put(history);
  }

  async getRecentSyncHistory(limit: number = 30): Promise<SyncHistory[]> {
    return this.syncHistory
      .orderBy("finishedAt")
      .reverse()
      .limit(limit)
      .toArray();
  }

  async getSyncStatsSince(timestamp: number): Promise<{
    histories: SyncHistory[];
    errors: SyncError[];
  }> {
    const [histories, errors] = await Promise.all([
      this.syncHistory.where("finishedAt").above(timestamp).toArray(),
      this.syncErrors.where("occurredAt").above(timestamp).toArray(),
    ]);
    return { histories, errors };
  }

  async getSyncQueueCount(): Promise<number> {
    return this.syncQueue.count();
  }

  async getQueuedItemsOldestFirst(): Promise<SyncQueueItem[]> {
    return this.syncQueue.orderBy("createdAt").toArray();
  }

  async trimSyncQueueToLimit(limit: number): Promise<void> {
    const count = await this.syncQueue.count();
    if (count <= limit) return;

    const oldest = await this.syncQueue
      .orderBy("createdAt")
      .limit(count - limit)
      .toArray();

    await this.syncQueue.bulkDelete(oldest.map((item) => item.id));
  }

  async putSyncQueueItem(item: SyncQueueItem): Promise<void> {
    await this.syncQueue.put(item);
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    await this.syncQueue.delete(id);
  }

  async putConflict(conflict: SyncConflict): Promise<void> {
    await this.conflicts.put(conflict);
  }

  async getConflict(id: string): Promise<SyncConflict | undefined> {
    return this.conflicts.get(id);
  }

  async getConflicts(): Promise<SyncConflict[]> {
    return this.conflicts.toArray();
  }

  async removeConflict(id: string): Promise<void> {
    await this.conflicts.delete(id);
  }

  async getImageRecord(
    id: string,
  ): Promise<AssetRecord | UploadedImage | undefined> {
    return this.images.get(id);
  }

  async putImageRecord(record: AssetRecord | UploadedImage): Promise<void> {
    await this.images.put(record);
  }

  async updateImageRecord(
    id: string,
    changes: Partial<AssetRecord & UploadedImage>,
  ): Promise<number> {
    return this.images.update(id, changes);
  }

  private async enqueueSync(
    tableName: string,
    type: SyncDirection,
    payload: SyncQueuePayload,
  ): Promise<void> {
    if (!isSyncableTableName(tableName)) return;

    const payloadId = getPayloadId(payload);
    if (!payloadId) {
      console.warn(
        "[LocalDB] enqueueSync skipped: payload.id is missing or invalid",
        { tableName, type, payload },
      );
      return;
    }

    const now = Date.now();

    const task: SyncQueueItem = {
      id: nanoid(),
      idempotencyKey: nanoid(),
      targetId: payloadId,
      type,
      entity: entityNameMap[tableName],
      operationType: type === "upload" ? "update" : "create",
      payload,
      priority: "high",
      createdAt: now,
      updatedAt: now,
      status: "pending",
      retryCount: 0,
    } as SyncQueueItem;

    console.log(
      `[Diagnostic] enqueueSync -> pushing to syncQueue table. targetId=${task.targetId}, action=${task.type}, entity=${task.entity}`,
    );
    console.log(
      `[LocalDB] enqueueSync -> table=${tableName} type=${type} targetId=${task.targetId} id=${task.id}`,
    );

    await this.syncQueue.add(task);

    if (this.syncTrigger) {
      console.log("[Diagnostic] enqueueSync -> triggering sync callback");
      setTimeout(() => {
        if (this.syncTrigger) {
          console.log("[Diagnostic] Calling syncTrigger callback now");
          this.syncTrigger();
        }
      }, 0);
    } else {
      console.warn("[Diagnostic] enqueueSync -> No syncTrigger registered!");
    }
  }

  static getDatabaseNameForUser(userId: string = "anonymous"): string {
    return _getDatabaseNameForUser(userId);
  }

  static async getInstance(userId?: string): Promise<LocalDB> {
    return getInstanceImpl(userId) as Promise<LocalDB>;
  }

  static async resetForLogout(userId?: string): Promise<void> {
    return resetForLogoutImpl(userId);
  }

  static getInstanceUserId(): string | null {
    return getInstanceUserIdImpl();
  }

  /** シングルトンインスタンスを明示的に破棄します。 */
  static clearInstance(): void {
    clearInstanceImpl();
  }
}

/**
 * LocalDB インスタンスを生成する内部ファクトリ関数。
 * instanceManager.ts から使用される。constructor ガード (__ALLOW_LOCAL_DB_CONSTRUCTION) を経由。
 */
export const createLocalDBInternal = (userId?: string) => {
  try {
    globalThis.__ALLOW_LOCAL_DB_CONSTRUCTION = true;
    return LocalDB.__createInternal(userId);
  } finally {
    try {
      delete globalThis.__ALLOW_LOCAL_DB_CONSTRUCTION;
    } catch {
      // ignore
    }
  }
};

// devtools.ts が './LocalDB' から import するため、instanceManager の関数を re-export する
export { getLocalDb, getLocalDbSync, initializeDB, resetLocalDBForLogout };
