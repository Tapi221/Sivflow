import { Dexie } from "dexie";
import { nanoid } from "nanoid";
import { createDeleteQueueItem, createUpsertQueueItem } from "@/application/usecases/syncQueueItemFactory";
import type { DeleteEntity, UpsertEntity } from "@/application/usecases/syncQueuePayloadGuards";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
import * as crud from "./crud";
import { getDatabaseNameForUser as _getDatabaseNameForUser } from "./generation";
import { attachHooks } from "./hooks";
import { clearInstance as clearInstanceImpl, getInstance as getInstanceImpl, getInstanceUserId as getInstanceUserIdImpl, getLocalDb, getLocalDbSync, initializeDB, resetLocalDBForLogout } from "./instanceManager";
import * as maintenance from "./maintenance";
import { defineNoteSchema } from "./noteSchema";
import { defineSchema } from "./schema";
import { CURRENT_TAG_STORE } from "./tagStoreNames";
import type { LocalDBTableMap, SyncableEntityTable, TagRecord } from "./types";
import type { AssetRecord, Card, CardSet, Document, Folder, Note, SyncConflict, SyncError, SyncHistory, SyncMetadata, SyncQueueItem, SyncSettings, UploadedImage, User, UserSettings, UserStats } from "@/types";
import type { SyncPayloadByEntity, SyncPriority } from "@/types/domain/sync";
import { getDeviceName, getOrCreateDeviceId } from "@/utils/device";



declare global {
  interface GlobalThis {
    __ALLOW_LOCAL_DB_CONSTRUCTION?: boolean;
  }
}
type LocalDbGlobal = typeof globalThis & {
  __ALLOW_LOCAL_DB_CONSTRUCTION?: boolean;
};
type SyncDirection = "upload" | "download";
type CrudPayload = Record<string, unknown>;
type SyncableTableName = "cards" | "folders" | "cardSets" | "documents" | typeof CURRENT_TAG_STORE | "userSettings" | "images" | "projectMaps";



const syncableTables: readonly SyncableTableName[] = ["cards", "folders", "cardSets", "documents", CURRENT_TAG_STORE, "userSettings", "images", "projectMaps"];
const entityNameMap: Record<SyncableTableName, SyncQueueItem["entity"]> = {
  cards: "card",
  folders: "folder",
  cardSets: "cardSet",
  documents: "document",
  [CURRENT_TAG_STORE]: "tag",
  userSettings: "userSetting",
  images: "asset",
  projectMaps: "projectMap",
};



const isSyncableTableName = (tableName: string): tableName is SyncableTableName => (syncableTables as readonly string[]).includes(tableName);
const getLocalDbGlobal = (): LocalDbGlobal => globalThis as LocalDbGlobal;
const getPayloadId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as Record<string, unknown>).id;
  return typeof id === "string" && id.length > 0 ? id : null;
};
const toCrudPayload = (value: unknown): CrudPayload => value && typeof value === "object" ? { ...(value as Record<string, unknown>) } : {};
const toTimestamp = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const timestamp = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number; _seconds?: number; };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
    if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
    if (typeof timestamp._seconds === "number") return timestamp._seconds * 1000;
  }
  return 0;
};
const compareSyncHistoryNewestFirst = (left: SyncHistory, right: SyncHistory): number => right.startedAt - left.startedAt;
const compareSyncQueueOldestFirst = (left: SyncQueueItem, right: SyncQueueItem): number => left.createdAt - right.createdAt;
if (import.meta.env.DEV && typeof window !== "undefined") {
  import("./devtools")
    .then((m) => m.installLocalDbDevtools?.())
    .catch(() => {});
}
class LocalDB extends Dexie {
  users!: Dexie.Table<User, string>;
  folders!: Dexie.Table<Folder, string>;
  cardSets!: Dexie.Table<CardSet, string>;
  cards!: Dexie.Table<Card, string>;
  documents!: Dexie.Table<Document, string>;
  notes!: Dexie.Table<Note, string>;
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
    defineNoteSchema(this);
    attachHooks(this);
  }

  get tagRecords(): Dexie.Table<TagRecord, string> {
    return this.table(CURRENT_TAG_STORE) as Dexie.Table<TagRecord, string>;
  }

  setSyncTrigger(trigger: () => void): void {
    this.syncTrigger = trigger;
  }

  async runSyncTransaction<T>(scope: () => Promise<T>): Promise<T> {
    return this.transaction("rw", this.tables, scope);
  }

  async getItem<TTable extends SyncableEntityTable>(table: TTable, id: string): Promise<LocalDBTableMap[TTable] | undefined>;
  async getItem(table: string, id: string): Promise<unknown | undefined> {
    const item = await this.table(table).get(id);
    if (table === "cards") return item ? normalizeCard(item) : item;
    if (table === "folders") return item ? normalizeFolderWithSilent(item) : item;
    return item;
  }

  async getAllItems<TTable extends SyncableEntityTable>(table: TTable): Promise<Array<LocalDBTableMap[TTable]>>;
  async getAllItems(table: string): Promise<unknown[]> {
    const items = await this.table(table).toArray();
    if (table === "cards") return items.map(normalizeCard);
    if (table === "folders") return items.map(normalizeFolderWithSilent);
    return items;
  }

  async getDirtyItems<TTable extends SyncableEntityTable>(table: TTable, userId: string, lastSyncTime: Date): Promise<Array<LocalDBTableMap[TTable]>>;
  async getDirtyItems(table: string, userId: string, lastSyncTime: Date): Promise<unknown[]> {
    const rows = await this.table(table).toArray();
    const threshold = lastSyncTime.getTime();
    return rows.filter((row: unknown) => {
      const record = row as Record<string, unknown>;
      return record.userId === userId && toTimestamp(record.updatedAt) >= threshold;
    });
  }

  async getUpdatedCards(folderId: string, lastSyncTime: Date): Promise<Card[]> {
    const rows = await this.cards.where("folderId").equals(folderId).toArray();
    const threshold = lastSyncTime.getTime();
    return rows.filter((card) => toTimestamp((card as Record<string, unknown>).updatedAt) >= threshold);
  }

  async getLastSyncTime(userId: string): Promise<Date | null> {
    const meta = await this.syncMetadata.get(userId);
    if (!meta?.lastSyncTime) return null;
    return new Date(toTimestamp(meta.lastSyncTime));
  }

  async updateLastSyncTime(userId: string, syncTime: Date): Promise<void> {
    await this.syncMetadata.put({ userId, deviceId: getOrCreateDeviceId(), deviceName: getDeviceName(), lastSyncTime: syncTime, lastHighResSync: null, isActive: true });
  }

  async addItem(table: string, item: unknown, skipSync = false): Promise<string> {
    return crud.addItem(this, table, toCrudPayload(item), skipSync, (t, type, payload) => this.enqueueSync(t, type, payload));
  }

  async updateItem(table: string, id: string, changes: Record<string, unknown>, skipSync = false): Promise<number> {
    return crud.updateItem(this, table, id, changes, skipSync, (t, type, payload) => this.enqueueSync(t, type, payload));
  }

  async deleteItem(table: string, id: string): Promise<void> {
    return crud.deleteItem(this, table, id);
  }

  async softDelete(table: string, id: string): Promise<number> {
    return crud.softDelete(this, table, id, (t, i, changes) => this.updateItem(t, i, changes));
  }

  async restore(table: string, id: string): Promise<number> {
    return this.updateItem(table, id, { isDeleted: false, deletedAt: null, updatedAt: new Date() });
  }

  async purge(table: string, id: string): Promise<void> {
    return this.deleteItem(table, id);
  }

  async bulkUpsert(table: string, items: unknown[], skipSync = false): Promise<void> {
    const rows = items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
    return crud.bulkUpsert(this, table, rows, skipSync, (t, type, payload) => this.enqueueSync(t, type, payload));
  }

  async upsert<TTable extends SyncableEntityTable>(tableName: TTable, data: LocalDBTableMap[TTable], skipSync?: boolean): Promise<void>;
  async upsert(tableName: string, data: unknown, skipSync = false): Promise<void> {
    return crud.upsert(this, tableName, toCrudPayload(data), skipSync, (t, type, payload) => this.enqueueSync(t, type, payload));
  }

  async clearTable(table: string): Promise<void> {
    await this.table(table).clear();
  }

  async clearAllData(): Promise<void> {
    return maintenance.clearAllData(this);
  }

  async clearSyncTables(tables: readonly SyncableEntityTable[]): Promise<void> {
    for (const table of tables) {
      await this.table(table).clear();
    }
  }

  async putSyncRecord<TTable extends SyncableEntityTable>(table: TTable, data: LocalDBTableMap[TTable]): Promise<void> {
    await this.upsert(table, data, true);
  }

  async cleanupSyncHistory(): Promise<void> {
    return maintenance.cleanupSyncHistory(this);
  }

  async cleanupSyncErrors(): Promise<void> {
    await this.syncErrors.clear();
  }

  async getAllCards(): Promise<Card[]> {
    const rows = await this.cards.toArray();
    return rows.map((card) => normalizeCard(card)) as Card[];
  }

  async getAllFolders(): Promise<Folder[]> {
    const rows = await this.folders.toArray();
    return rows.map((folder) => normalizeFolderWithSilent(folder)) as Folder[];
  }

  async listCardsByUser(userId: string): Promise<Card[]> {
    const rows = await this.cards.where("userId").equals(userId).toArray();
    return rows.map((card) => normalizeCard(card)) as Card[];
  }

  async listFoldersByUser(userId: string): Promise<Folder[]> {
    const rows = await this.folders.where("userId").equals(userId).toArray();
    return rows.map((folder) => normalizeFolderWithSilent(folder)) as Folder[];
  }

  async listCardSetsByUser(userId: string): Promise<CardSet[]> {
    return this.cardSets.where("userId").equals(userId).toArray();
  }

  async addCardSet(cardSet: CardSet): Promise<void> {
    await this.cardSets.put(cardSet);
  }

  async updateCardById(id: string, changes: Partial<Card>): Promise<number> {
    return this.cards.update(id, changes);
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
    return this.syncErrors.toArray();
  }

  async findQueueProcessingErrorsByTargetId(targetId: string): Promise<SyncError[]> {
    return this.syncErrors.where("targetId").equals(targetId).toArray();
  }

  async putSyncHistory(history: SyncHistory): Promise<void> {
    await this.syncHistory.put(history);
  }

  async getRecentSyncHistory(limit = 50): Promise<SyncHistory[]> {
    const histories = await this.syncHistory.toArray();
    return histories.sort(compareSyncHistoryNewestFirst).slice(0, limit);
  }

  async getSyncStatsSince(timestamp: number): Promise<{ histories: SyncHistory[]; errors: SyncError[]; }> {
    const histories = (await this.syncHistory.toArray()).filter((history) => history.startedAt >= timestamp);
    const errors = await this.syncErrors.toArray();
    return { histories, errors };
  }

  async getSyncQueueCount(): Promise<number> {
    return this.syncQueue.count();
  }

  async getQueuedItemsOldestFirst(): Promise<SyncQueueItem[]> {
    const items = await this.syncQueue.toArray();
    return items.sort(compareSyncQueueOldestFirst);
  }

  async trimSyncQueueToLimit(limit: number): Promise<void> {
    const all = await this.getQueuedItemsOldestFirst();
    if (all.length > limit) {
      await this.syncQueue.bulkDelete(all.slice(0, all.length - limit).map((item) => item.id));
    }
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

  async getImageRecord(id: string): Promise<AssetRecord | UploadedImage | undefined> {
    return this.images.get(id);
  }

  async putImageRecord(record: AssetRecord | UploadedImage): Promise<void> {
    await this.images.put(record);
  }

  async updateImageRecord(id: string, changes: Partial<AssetRecord & UploadedImage>): Promise<number> {
    return this.images.update(id, changes);
  }

  async queueUpsertSync<TEntity extends UpsertEntity>({ entity, operationType, payload, priority = "high" }: { entity: TEntity; operationType: "create" | "update"; payload: SyncPayloadByEntity[TEntity]; priority?: SyncPriority; }): Promise<void> {
    await this.syncQueue.put(createUpsertQueueItem({ entity, operationType, payload, priority }));
    this.emitSyncTrigger();
  }

  async queueDeleteSync({ entity, targetId, priority = "high" }: { entity: DeleteEntity; targetId: string; priority?: SyncPriority; }): Promise<void> {
    await this.syncQueue.put(createDeleteQueueItem({ entity, targetId, priority }));
    this.emitSyncTrigger();
  }

  async enqueueSync(tableName: string, type: SyncDirection, payload: unknown): Promise<void> {
    if (!isSyncableTableName(tableName)) return;

    const entity = entityNameMap[tableName];
    const payloadId = getPayloadId(payload) ?? nanoid();
    const task = type === "upload"
      ? createUpsertQueueItem({ entity: entity as UpsertEntity, operationType: "update", payload: payload as never, priority: "high" })
      : createDeleteQueueItem({ entity: entity as DeleteEntity, targetId: payloadId, priority: "high" });

    await this.syncQueue.add(task);

    if (tableName === "cards" && type === "upload") {
      await this.cards.update(payloadId, { syncState: "pending" } satisfies Partial<Card>);
    }

    this.emitSyncTrigger();
  }

  private emitSyncTrigger(): void {
    if (!this.syncTrigger) return;
    setTimeout(() => this.syncTrigger?.(), 0);
  }

  static getDatabaseNameForUser(userId: string = "anonymous"): string {
    return _getDatabaseNameForUser(userId);
  }

  static async getInstance(userId?: string): Promise<LocalDB> {
    return getInstanceImpl(userId) as unknown as Promise<LocalDB>;
  }

  static async resetForLogout(userId?: string): Promise<void> {
    return resetLocalDBForLogout(userId);
  }

  static getInstanceUserId(): string | null {
    return getInstanceUserIdImpl();
  }

  static clearInstance(): void {
    clearInstanceImpl();
  }
}



export { getLocalDb, getLocalDbSync, initializeDB, resetLocalDBForLogout, LocalDB };


export type { CardRelation, LocalDBInstance, LocalDBLike, LocalDBTableMap, ProjectMap, SyncableEntityTable, TagRecord } from "./types";
