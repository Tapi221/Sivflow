// DEV時だけ devtools を有効化（index.ts を経由しない構成でも確実に動く）
if (import.meta.env.DEV && typeof window !== "undefined") {
  import("./devtools")
    .then((m) => m.installLocalDbDevtools?.())
    .catch(() => {});
}

import type { IntegrityRepairResult } from "@/services/dataIntegrityTypes";
import type {
    AssetRecord,
    Card,
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
import * as forensics from "./forensics";
import { getDatabaseNameForUser as _getDatabaseNameForUser } from "./generation";
import { attachHooks } from "./hooks";
import { repairDataIntegrity as repairDataIntegrityImpl } from "./integrityRepair";
import * as maintenance from "./maintenance";
import * as queries from "./queries";
import {
    extractFromFirestoreSDK as rescueExtractFromFirestoreSDK,
    importFromDatabase as rescueImportFromDatabase,
} from "./rescue";
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

export type {
    CardRelation, LocalDBInstance, LocalDBLike, ProjectMap,
    TagLegacyRecord,
    TagV2Record,
    TagV3Record
} from "./types";

declare global {
  interface GlobalThis {
    __ALLOW_LOCAL_DB_CONSTRUCTION?: boolean;
  }
}

type SyncDirection = "upload" | "download";
type SyncQueuePayload = SyncQueueItem["payload"];

// ✅ SyncQueueItem.entity が "card" | "folder" | "asset" しか許してない前提に合わせる
const syncableTables = ["cards", "folders"] as const;
type SyncableTableName = (typeof syncableTables)[number];

const isSyncableTableName = (t: string): t is SyncableTableName =>
  (syncableTables as readonly string[]).includes(t);

const entityNameMap: Record<SyncableTableName, SyncQueueItem["entity"]> = {
  cards: "card",
  folders: "folder",
};

function getPayloadId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const id = p.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Dexie.js を使用したローカルデータベースの実装。
 * 設計思想に基づき、すべてのユーザーデータをクライアントサイドで管理します。
 */
export class LocalDB extends Dexie {
  folders!: Dexie.Table<Folder, string>;
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

  static async listDatabases(): Promise<IDBDatabaseInfo[]> {
    return forensics.listDatabases();
  }

  static async fullOriginForensicAudit(
    onProgress?: (msg: string) => void,
  ): Promise<unknown> {
    return forensics.fullOriginForensicAudit(onProgress);
  }

  async importFromDatabase(
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
    return rescueImportFromDatabase(
      this,
      sourceDbName,
      currentUserId,
      onProgress,
    );
  }

  async extractFromFirestoreSDK(
    sourceDbName: string,
    currentUserId: string,
    onProgress?: (progress: string) => void,
  ): Promise<{ cards: number; folders: number; firstCardKeys: string[] }> {
    return rescueExtractFromFirestoreSDK(
      this,
      sourceDbName,
      currentUserId,
      onProgress,
    );
  }

  async repairDataIntegrity(
    currentUserId: string,
    onProgress?: (msg: string) => void,
  ): Promise<IntegrityRepairResult> {
    return repairDataIntegrityImpl(this, currentUserId, onProgress);
  }

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

  async getItem(table: string, id: string): Promise<unknown> {
    return queries.getItem(this, table, id);
  }

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

  private async enqueueSync(
    tableName: string,
    type: SyncDirection,
    payload: SyncQueuePayload,
  ): Promise<void> {
    // documents.localFileId は端末ローカル専用のため同期対象にしない。
    if (tableName === "documents") return;

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
    };

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
export function createLocalDBInternal(userId?: string): LocalDB {
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
}

// devtools.ts が './LocalDB' から import するため、instanceManager の関数を re-export する
export { getLocalDb, getLocalDbSync, initializeDB, resetLocalDBForLogout };




