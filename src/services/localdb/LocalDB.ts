// DEV時だけ devtools を有効化（index.ts を経由しない構成でも確実に動く）
if (import.meta.env.DEV && typeof window !== "undefined") {
  import("./devtools")
    .then((m) => m.installLocalDbDevtools?.())
    .catch(() => {});
}

import { Dexie } from "dexie";
import { nanoid } from "nanoid";
import * as crud from "./crud";
import { getDatabaseNameForUser as _getDatabaseNameForUser } from "./generation";
import { attachHooks } from "./hooks";
// NOTE: creates a circular dependency with instanceManager.ts; safe in ESM (all usages inside function bodies)
import { clearInstance as clearInstanceImpl, getInstance as getInstanceImpl, getInstanceUserId as getInstanceUserIdImpl, getLocalDb, getLocalDbSync, initializeDB, resetForLogout as resetForLogoutImpl, resetLocalDBForLogout } from "./instanceManager";
import * as maintenance from "./maintenance";
import * as queries from "./queries";
import { defineSchema } from "./schema";
import { CURRENT_TAG_STORE } from "./tagStoreNames";
import type { LocalDBTableMap, SyncableEntityTable, TagRecord } from "./types";
import { createDeleteQueueItem, createUpsertQueueItem } from "@/application/usecases/syncQueueItemFactory";
import type { DeleteEntity, UpsertEntity } from "@/application/usecases/syncQueuePayloadGuards";
import type { AssetRecord, Card, CardSet, Document, Folder, SyncConflict, SyncError, SyncHistory, SyncMetadata, SyncQueueItem, SyncSettings, UploadedImage, User, UserSettings, UserStats } from "@/types";
import type { SyncPayloadByEntity, SyncPriority } from "@/types/domain/sync";

export type { CardRelation, LocalDBInstance, LocalDBLike, LocalDBTableMap, ProjectMap, SyncableEntityTable, TagRecord } from "./types";

declare global {
  interface GlobalThis {
    __ALLOW_LOCAL_DB_CONSTRUCTION?: boolean;
  }
}

type LocalDbGlobal = typeof globalThis & {
  __ALLOW_LOCAL_DB_CONSTRUCTION?: boolean;
};

const getLocalDbGlobal = (): LocalDbGlobal => {
  return globalThis as LocalDbGlobal;
};

type SyncDirection = "upload" | "download";
type SyncQueuePayload = SyncQueueItem["payload"];
type CrudPayload = Record<string, unknown>;

const syncableTables = [
  "cards",
  "folders",
  "cardSets",
  "documents",
  CURRENT_TAG_STORE,
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
  [CURRENT_TAG_STORE]: "tag",
  userSettings: "userSetting",
  images: "asset",
};

const getPayloadId = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const id = p.id;
  return typeof id === "string" && id.length > 0 ? id : null;
};

const toCrudPayload = (value: unknown): CrudPayload => {
  return value && typeof value === "object" ? { ...(value as Record<string, unknown>) } : {};
};

export class LocalDB extends Dexie {
  users!: Dexie.Table<User, string>;
  folders!: Dexie.Table<Folder, string>;
  cardSets!: Dexie.Table<CardSet, string>;
  cards!: Dexie.Table<Card, string>;
  documents!: Dexie.Table<Document, string>;
  userSettings!: Dexie.Table<UserSettings, string>;
  userStats!: Dexie.Table<UserStats, string>;
  syncMetadata!: Dexie.Table<SyncMetadata, string>;
  syncErrors!: Dexie.Table<SyncError, string>;
  syncHistory!: Dexie.Table<SyncHistory, string>;
  syncSettings!: Dexie.Table<SyncSettings, string>;
  syncQueue!: Dexie.Table<SyncQueueItem, string>;
  conflicts!: Dexie.Table<SyncConflict, string>;
  metadata!: Dexie.Table<Record<string, unknown>, string>;
  images!: Dexie.Table<AssetRecord | UploadedImage, string>;
  levelHistories!: Dexie.Table<Record<string, unknown>, string>;
  deviceMeta!: Dexie.Table<Record<string, unknown>, string>;
  cardRelations!: Dexie.Table<Record<string, unknown>, string>;
  projectMaps!: Dexie.Table<Record<string, unknown>, string>;
  studyLogs!: Dexie.Table<Record<string, unknown>, string>;

  private syncTrigger: (() => void) | null = null;

  constructor(userId?: string) {
    const global = getLocalDbGlobal();
    if (!global.__ALLOW_LOCAL_DB_CONSTRUCTION) {
      throw new Error("LocalDB must be constructed through LocalDB.getInstance() or initializeDB().");
    }

    super(_getDatabaseNameForUser(userId));
    defineSchema(this);
    attachHooks(this);
  }

  get tagRecords(): Dexie.Table<TagRecord, string> {
    return this.table(CURRENT_TAG_STORE) as Dexie.Table<TagRecord, string>;
  }

  setSyncTrigger(trigger: () => void): void {
    this.syncTrigger = trigger;
  }

  async getItem<TTable extends SyncableEntityTable>(
    table: TTable,
    id: string,
  ): Promise<LocalDBTableMap[TTable] | undefined>;
  async getItem(table: string, id: string): Promise<unknown | undefined> {
    return queries.getItem(this, table as SyncableEntityTable, id);
  }

  async getAllItems<TTable extends SyncableEntityTable>(
    table: TTable,
  ): Promise<Array<LocalDBTableMap[TTable]>>;
  async getAllItems(table: string): Promise<unknown[]> {
    return queries.getAllItems(this, table as SyncableEntityTable);
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
    return queries.getDirtyItems(this, table as SyncableEntityTable, userId, lastSyncTime);
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
      toCrudPayload(item),
      skipSync,
      (t: string, type: SyncDirection, p: unknown) => this.enqueueSync(t, type, p),
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
      (t: string, type: SyncDirection, p: unknown) => this.enqueueSync(t, type, p),
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
      items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object"),
      skipSync,
      (t: string, type: SyncDirection, p: unknown) => this.enqueueSync(t, type, p),
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
      toCrudPayload(data),
      skipSync,
      (t: string, type: SyncDirection, p: unknown) => this.enqueueSync(t, type, p),
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

  async getAllCards(): Promise<Card[]> {
    return queries.getAllCards(this);
  }

  async getAllFolders(): Promise<Folder[]> {
    return queries.getAllFolders(this);
  }

  async listCardsByUser(userId: string): Promise<Card[]> {
    return queries.listCardsByUser(this, userId);
  }

  async listFoldersByUser(userId: string): Promise<Folder[]> {
    return queries.listFoldersByUser(this, userId);
  }

  async listCardSetsByUser(userId: string): Promise<CardSet[]> {
    return queries.listCardSetsByUser(this, userId);
  }

  async getSyncSettings(id: string): Promise<SyncSettings | undefined> {
    return queries.getSyncSettings(this, id);
  }

  async putSyncSettings(settings: SyncSettings): Promise<void> {
    return queries.putSyncSettings(this, settings);
  }

  async getSyncError(id: string): Promise<SyncError | undefined> {
    return queries.getSyncError(this, id);
  }

  async putSyncError(error: SyncError): Promise<void> {
    return queries.putSyncError(this, error);
  }

  async clearSyncErrors(): Promise<void> {
    return queries.clearSyncErrors(this);
  }

  async getRetryableSyncErrors(): Promise<SyncError[]> {
    return queries.getRetryableSyncErrors(this);
  }

  async findQueueProcessingErrorsByTargetId(targetId: string): Promise<SyncError[]> {
    return queries.findQueueProcessingErrorsByTargetId(this, targetId);
  }

  async putSyncHistory(history: SyncHistory): Promise<void> {
    return queries.putSyncHistory(this, history);
  }

  async getRecentSyncHistory(limit?: number): Promise<SyncHistory[]> {
    return queries.getRecentSyncHistory(this, limit);
  }

  async getSyncStatsSince(timestamp: number): Promise<{ histories: SyncHistory[]; errors: SyncError[] }> {
    return queries.getSyncStatsSince(this, timestamp);
  }

  async getSyncQueueCount(): Promise<number> {
    return queries.getSyncQueueCount(this);
  }

  async getQueuedItemsOldestFirst(): Promise<SyncQueueItem[]> {
    return queries.getQueuedItemsOldestFirst(this);
  }

  async trimSyncQueueToLimit(limit: number): Promise<void> {
    return queries.trimSyncQueueToLimit(this, limit);
  }

  async putSyncQueueItem(item: SyncQueueItem): Promise<void> {
    return queries.putSyncQueueItem(this, item);
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    return queries.removeSyncQueueItem(this, id);
  }

  async putConflict(conflict: SyncConflict): Promise<void> {
    return queries.putConflict(this, conflict);
  }

  async getConflict(id: string): Promise<SyncConflict | undefined> {
    return queries.getConflict(this, id);
  }

  async getConflicts(): Promise<SyncConflict[]> {
    return queries.getConflicts(this);
  }

  async removeConflict(id: string): Promise<void> {
    return queries.removeConflict(this, id);
  }

  async getImageRecord(id: string): Promise<AssetRecord | UploadedImage | undefined> {
    return queries.getImageRecord(this, id);
  }

  async putImageRecord(record: AssetRecord | UploadedImage): Promise<void> {
    return queries.putImageRecord(this, record);
  }

  async updateImageRecord(
    id: string,
    changes: Partial<AssetRecord & UploadedImage>,
  ): Promise<number> {
    return queries.updateImageRecord(this, id, changes);
  }

  async enqueueSync(
    tableName: string,
    type: SyncDirection,
    payload: unknown,
  ): Promise<void> {
    if (!isSyncableTableName(tableName)) return;

    const entity = entityNameMap[tableName];
    const payloadId = getPayloadId(payload) ?? nanoid();
    const task =
      type === "upload"
        ? createUpsertQueueItem({
            entity: entity as UpsertEntity,
            operationType: "update",
            payload: payload as never,
            priority: "high",
          })
        : createDeleteQueueItem({
            entity: entity as DeleteEntity,
            targetId: payloadId,
            priority: "high",
          });

    console.log(
      `[LocalDB] enqueueSync -> table=${tableName} type=${type} targetId=${task.targetId} id=${task.id}`,
    );

    await this.syncQueue.add(task);

    if (tableName === "cards" && type === "upload") {
      await this.cards.update(payloadId, {
        syncState: "pending",
      } satisfies Partial<Card>);
    }

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
export { getLocalDb, getLocalDbSync, initializeDB, resetLocalDBForLogout };
