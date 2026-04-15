import type {
  AssetRecord,
  Card,
  CardSet,
  Folder,
  SyncConflict,
  SyncError,
  SyncHistory,
  SyncMetadata,
  SyncQueueItem,
  SyncSettings,
  UploadedImage,
  UserSettings,
  UserStats,
} from "@/types";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
import { getDeviceName, getOrCreateDeviceId } from "@/utils/device";
import { toDateOrNull, toMillis } from "@/utils/toMillis";
import { nanoid } from "nanoid";
import type { LocalDBTableMap, SyncableEntityTable } from "./localdb/types";
import {
  CURRENT_TAG_STORE,
  LEGACY_TAG_STORE_V1,
  LEGACY_TAG_STORE_V2,
  LEGACY_TAG_STORE_V3,
} from "./localdb/tagStoreNames";

type KeyPath = string | string[];
type Predicate<T> = (value: T) => boolean;

type TimestampLikeObject = {
  toDate?: () => unknown;
  toMillis?: () => unknown;
  seconds?: unknown;
  _seconds?: unknown;
  nanoseconds?: unknown;
  _nanoseconds?: unknown;
};

const isTimestampLikeObject = (
  value: unknown,
): value is TimestampLikeObject => {
  if (typeof value !== "object" || value === null) return false;

  const record = value as TimestampLikeObject;
  return (
    typeof record.toDate === "function" ||
    typeof record.toMillis === "function" ||
    typeof record.seconds === "number" ||
    typeof record._seconds === "number"
  );
};

const asRecord = (value: object): Record<string, unknown> =>
  value as Record<string, unknown>;

const getField = (value: object, key: string): unknown => asRecord(value)[key];

const toTimestamp = (value: unknown): number => {
  if (value instanceof Date) return toMillis(value);
  if (isTimestampLikeObject(value)) return toMillis(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = toDateOrNull(value);
    return parsed ? parsed.getTime() : 0;
  }
  return 0;
};

const normalizeComparable = (value: unknown): unknown => {
  if (value instanceof Date || isTimestampLikeObject(value)) {
    return toTimestamp(value);
  }
  if (Array.isArray(value)) return value.map((v) => normalizeComparable(v));
  return value;
};

const compareValues = (left: unknown, right: unknown): number => {
  const a = normalizeComparable(left);
  const b = normalizeComparable(right);

  if (Array.isArray(a) && Array.isArray(b)) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i += 1) {
      if (i >= a.length) return -1;
      if (i >= b.length) return 1;
      const cmp = compareValues(a[i], b[i]);
      if (cmp !== 0) return cmp;
    }
    return 0;
  }

  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
};

const isEqual = (left: unknown, right: unknown): boolean =>
  compareValues(left, right) === 0;

const parseIndexKeys = (index: string): string[] => {
  if (index.startsWith("[") && index.endsWith("]")) {
    return index
      .slice(1, -1)
      .split("+")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [index];
};

const serializeKey = (key: unknown): string => {
  if (Array.isArray(key)) return JSON.stringify(key);
  if (typeof key === "object" && key !== null) return JSON.stringify(key);
  return String(key);
};

const ensureObject = <T extends object>(value: T): T => ({
  ...value,
});

class InMemoryCollection<T extends object> {
  constructor(
    private readonly table: InMemoryTable<T>,
    private readonly predicates: Predicate<T>[] = [],
    private readonly indexKeys: string[] | null = null,
    private readonly orderByKeys: string[] | null = null,
    private readonly reversed = false,
    private readonly maxItems: number | null = null,
  ) {}

  private clone(
    next: Partial<{
      predicates: Predicate<T>[];
      indexKeys: string[] | null;
      orderByKeys: string[] | null;
      reversed: boolean;
      maxItems: number | null;
    }>,
  ): InMemoryCollection<T> {
    return new InMemoryCollection(
      this.table,
      next.predicates ?? this.predicates,
      next.indexKeys ?? this.indexKeys,
      next.orderByKeys ?? this.orderByKeys,
      next.reversed ?? this.reversed,
      next.maxItems ?? this.maxItems,
    );
  }

  private getIndexedValue(item: T): unknown {
    if (!this.indexKeys || this.indexKeys.length === 0) return undefined;
    if (this.indexKeys.length === 1) return getField(item, this.indexKeys[0]);
    return this.indexKeys.map((key) => getField(item, key));
  }

  private withIndexPredicate(
    predicate: (indexValue: unknown) => boolean,
  ): InMemoryCollection<T> {
    return this.clone({
      predicates: [
        ...this.predicates,
        (item) => predicate(this.getIndexedValue(item)),
      ],
    });
  }

  private resolveEntries(): Array<{ key: string; value: T }> {
    let entries = this.table.entries();

    if (this.predicates.length > 0) {
      entries = entries.filter(({ value }) =>
        this.predicates.every((predicate) => predicate(value)),
      );
    }

    if (this.orderByKeys && this.orderByKeys.length > 0) {
      entries.sort((a, b) => {
        const left =
          this.orderByKeys!.length === 1
            ? getField(a.value, this.orderByKeys![0])
            : this.orderByKeys!.map((key) => getField(a.value, key));
        const right =
          this.orderByKeys!.length === 1
            ? getField(b.value, this.orderByKeys![0])
            : this.orderByKeys!.map((key) => getField(b.value, key));
        return compareValues(left, right);
      });
    }

    if (this.reversed) entries.reverse();
    if (typeof this.maxItems === "number")
      entries = entries.slice(0, this.maxItems);

    return entries;
  }

  equals(value: unknown): InMemoryCollection<T> {
    return this.withIndexPredicate((indexedValue) =>
      isEqual(indexedValue, value),
    );
  }

  above(value: unknown): InMemoryCollection<T> {
    return this.withIndexPredicate(
      (indexedValue) => compareValues(indexedValue, value) > 0,
    );
  }

  aboveOrEqual(value: unknown): InMemoryCollection<T> {
    return this.withIndexPredicate(
      (indexedValue) => compareValues(indexedValue, value) >= 0,
    );
  }

  below(value: unknown): InMemoryCollection<T> {
    return this.withIndexPredicate(
      (indexedValue) => compareValues(indexedValue, value) < 0,
    );
  }

  belowOrEqual(value: unknown): InMemoryCollection<T> {
    return this.withIndexPredicate(
      (indexedValue) => compareValues(indexedValue, value) <= 0,
    );
  }

  between(
    lowerValue: unknown,
    upperValue: unknown,
    includeLower = true,
    includeUpper = true,
  ): InMemoryCollection<T> {
    return this.withIndexPredicate((indexedValue) => {
      const lowerOk = includeLower
        ? compareValues(indexedValue, lowerValue) >= 0
        : compareValues(indexedValue, lowerValue) > 0;
      const upperOk = includeUpper
        ? compareValues(indexedValue, upperValue) <= 0
        : compareValues(indexedValue, upperValue) < 0;
      return lowerOk && upperOk;
    });
  }

  startsWith(prefix: string): InMemoryCollection<T> {
    return this.withIndexPredicate((indexedValue) => {
      if (typeof indexedValue !== "string") return false;
      return indexedValue.startsWith(prefix);
    });
  }

  anyOf(values: unknown[]): InMemoryCollection<T> {
    return this.withIndexPredicate((indexedValue) =>
      values.some((value) => isEqual(indexedValue, value)),
    );
  }

  and(predicate: Predicate<T>): InMemoryCollection<T> {
    return this.clone({ predicates: [...this.predicates, predicate] });
  }

  filter(predicate: Predicate<T>): InMemoryCollection<T> {
    return this.and(predicate);
  }

  reverse(): InMemoryCollection<T> {
    return this.clone({ reversed: !this.reversed });
  }

  limit(limit: number): InMemoryCollection<T> {
    return this.clone({ maxItems: Math.max(0, limit) });
  }

  async toArray(): Promise<T[]> {
    return this.resolveEntries().map(({ value }) => ensureObject(value));
  }

  async first(): Promise<T | undefined> {
    const first = this.resolveEntries()[0];
    return first ? ensureObject(first.value) : undefined;
  }

  async count(): Promise<number> {
    return this.resolveEntries().length;
  }

  async delete(): Promise<number> {
    const entries = this.resolveEntries();
    entries.forEach(({ key }) => this.table.deleteBySerializedKey(key));
    return entries.length;
  }

  async modify(changes: Partial<T> | ((item: T) => void)): Promise<number> {
    const entries = this.resolveEntries();
    entries.forEach(({ key, value }) => {
      const next = ensureObject(value);
      if (typeof changes === "function") {
        changes(next);
      } else {
        Object.assign(next, changes);
      }
      this.table.replaceBySerializedKey(key, next);
    });
    return entries.length;
  }

  async sortBy(field: keyof T | string): Promise<T[]> {
    const rows = await this.toArray();
    rows.sort((a, b) =>
      compareValues(
        (a as Record<string, unknown>)[field],
        (b as Record<string, unknown>)[field],
      ),
    );
    return rows;
  }

  offset(): never {
    throw new Error(
      "[InMemoryLocalDB] Unsupported Dexie API: Collection.offset()",
    );
  }

  until(): never {
    throw new Error(
      "[InMemoryLocalDB] Unsupported Dexie API: Collection.until()",
    );
  }

  startsWithIgnoreCase(): never {
    throw new Error(
      "[InMemoryLocalDB] Unsupported Dexie API: Collection.startsWithIgnoreCase()",
    );
  }

  equalsIgnoreCase(): never {
    throw new Error(
      "[InMemoryLocalDB] Unsupported Dexie API: Collection.equalsIgnoreCase()",
    );
  }

  or(): never {
    throw new Error("[InMemoryLocalDB] Unsupported Dexie API: Collection.or()");
  }

  keys(): never {
    throw new Error(
      "[InMemoryLocalDB] Unsupported Dexie API: Collection.keys()",
    );
  }

  primaryKeys(): never {
    throw new Error(
      "[InMemoryLocalDB] Unsupported Dexie API: Collection.primaryKeys()",
    );
  }

  each(): never {
    throw new Error(
      "[InMemoryLocalDB] Unsupported Dexie API: Collection.each()",
    );
  }
}

class InMemoryTable<T extends object> {
  private readonly rows = new Map<string, T>();

  constructor(
    public readonly name: string,
    private readonly keyPath: KeyPath = "id",
  ) {}

  private deriveKeyFromRecord(record: T): unknown {
    if (Array.isArray(this.keyPath)) {
      return this.keyPath.map((path) => getField(record, path));
    }
    return getField(record, this.keyPath);
  }

  private ensureRecordKey(record: T): unknown {
    let key = this.deriveKeyFromRecord(record);
    if (Array.isArray(this.keyPath)) {
      return key;
    }
    if (key === undefined || key === null || key === "") {
      key =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : nanoid();
      asRecord(record)[this.keyPath] = key;
    }
    return key;
  }

  private serializeRecord(record: T): string {
    const key = this.ensureRecordKey(record);
    return serializeKey(key);
  }

  private serializeInputKey(key: unknown): string {
    return serializeKey(key);
  }

  entries(): Array<{ key: string; value: T }> {
    return Array.from(this.rows.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  }

  deleteBySerializedKey(serializedKey: string): void {
    this.rows.delete(serializedKey);
  }

  replaceBySerializedKey(oldSerializedKey: string, value: T): void {
    const nextSerializedKey = this.serializeRecord(value);
    if (nextSerializedKey !== oldSerializedKey) {
      this.rows.delete(oldSerializedKey);
    }
    this.rows.set(nextSerializedKey, value);
  }

  async add(record: T): Promise<unknown> {
    const value = ensureObject(record);
    const serialized = this.serializeRecord(value);
    if (this.rows.has(serialized)) {
      throw new Error(`[InMemoryLocalDB] Duplicate key on add: ${this.name}`);
    }
    this.rows.set(serialized, value);
    return this.deriveKeyFromRecord(value);
  }

  async put(record: T): Promise<unknown> {
    const value = ensureObject(record);
    const serialized = this.serializeRecord(value);
    this.rows.set(serialized, value);
    return this.deriveKeyFromRecord(value);
  }

  async bulkPut(records: T[]): Promise<void> {
    for (const record of records) {
      await this.put(record);
    }
  }

  bulkAdd(): never {
    throw new Error("[InMemoryLocalDB] Unsupported Dexie API: Table.bulkAdd()");
  }

  bulkGet(): never {
    throw new Error("[InMemoryLocalDB] Unsupported Dexie API: Table.bulkGet()");
  }

  async get(key: unknown): Promise<T | undefined> {
    const found = this.rows.get(this.serializeInputKey(key));
    return found ? ensureObject(found) : undefined;
  }

  async update(key: unknown, changes: Partial<T>): Promise<number> {
    const serialized = this.serializeInputKey(key);
    const current = this.rows.get(serialized);
    if (!current) return 0;
    const next = { ...current, ...changes };
    this.replaceBySerializedKey(serialized, next as T);
    return 1;
  }

  async delete(key: unknown): Promise<void> {
    this.rows.delete(this.serializeInputKey(key));
  }

  async bulkDelete(keys: unknown[]): Promise<void> {
    keys.forEach((key) => this.rows.delete(this.serializeInputKey(key)));
  }

  async clear(): Promise<void> {
    this.rows.clear();
  }

  async count(): Promise<number> {
    return this.rows.size;
  }

  async toArray(): Promise<T[]> {
    return Array.from(this.rows.values()).map((value) => ensureObject(value));
  }

  where(index: string | Record<string, unknown>): InMemoryCollection<T> {
    if (typeof index === "string") {
      return new InMemoryCollection<T>(
        this,
        [],
        parseIndexKeys(index),
        null,
        false,
        null,
      );
    }

    const query = Object.entries(index).reduce(
      (collection, [key, value]) =>
        collection.and((item) => isEqual(getField(item, key), value)),
      new InMemoryCollection<T>(this),
    );
    return query;
  }

  filter(predicate: Predicate<T>): InMemoryCollection<T> {
    return new InMemoryCollection<T>(this).filter(predicate);
  }

  orderBy(index: string): InMemoryCollection<T> {
    return new InMemoryCollection<T>(
      this,
      [],
      null,
      parseIndexKeys(index),
      false,
      null,
    );
  }

  toCollection(): InMemoryCollection<T> {
    return new InMemoryCollection<T>(this);
  }
}

const SYNCABLE_TABLES = new Set(["cards", "folders", "cardSets"]);

const ENTITY_MAP: Record<string, SyncQueueItem["entity"]> = {
  cards: "card",
  folders: "folder",
  cardSets: "cardSet",
};

export class InMemoryLocalDB {
  public readonly name: string;
  public version: number = 0;
  public readonly isInMemoryFallback = true;
  public userId?: string;

  folders!: InMemoryTable<Folder>;
  cardSets!: InMemoryTable<CardSet>;
  cards!: InMemoryTable<Card>;
  documents!: InMemoryTable<Record<string, unknown>>;
  users!: InMemoryTable<Record<string, unknown>>;
  userSettings!: InMemoryTable<UserSettings>;
  userStats!: InMemoryTable<UserStats>;
  syncMetadata!: InMemoryTable<SyncMetadata>;
  levelHistories!: InMemoryTable<Record<string, unknown>>;
  deviceMeta!: InMemoryTable<Record<string, unknown>>;
  syncErrors!: InMemoryTable<SyncError>;
  syncHistory!: InMemoryTable<SyncHistory>;
  syncSettings!: InMemoryTable<SyncSettings>;
  syncQueue!: InMemoryTable<SyncQueueItem>;
  conflicts!: InMemoryTable<SyncConflict>;
  metadata!: InMemoryTable<Record<string, unknown>>;
  images!: InMemoryTable<AssetRecord | UploadedImage>;
  cardRelations!: InMemoryTable<Record<string, unknown>>;
  projectMaps!: InMemoryTable<Record<string, unknown>>;

  tables: InMemoryTable<object>[] = [];
  private readonly tableMap = new Map<string, InMemoryTable<object>>();
  private opened = true;
  private syncTrigger: (() => void) | null = null;

  get tagRecords() {
    return this.table(CURRENT_TAG_STORE);
  }

  get legacyTagsV1() {
    return this.table(LEGACY_TAG_STORE_V1);
  }

  get legacyTagsV2() {
    return this.table(LEGACY_TAG_STORE_V2);
  }

  get legacyTagsV3() {
    return this.table(LEGACY_TAG_STORE_V3);
  }

  constructor(userId?: string, name?: string) {
    this.userId = userId;
    this.name = name ?? `FlashcardMasterDB_mem_${userId ?? "anonymous"}`;

    this.folders = this.registerTable("folders", "id");
    this.cardSets = this.registerTable("cardSets", "id");
    this.cards = this.registerTable("cards", "id");
    this.documents = this.registerTable("documents", "id");
    this.users = this.registerTable("users", "id");
    this.userSettings = this.registerTable("userSettings", "id");
    this.userStats = this.registerTable("userStats", "id");
    this.syncMetadata = this.registerTable("syncMetadata", "userId");
    this.levelHistories = this.registerTable("levelHistories", "id");
    this.deviceMeta = this.registerTable("deviceMeta", "deviceId");
    this.syncErrors = this.registerTable("syncErrors", "id");
    this.syncHistory = this.registerTable("syncHistory", "id");
    this.syncSettings = this.registerTable("syncSettings", "id");
    this.syncQueue = this.registerTable("syncQueue", "id");
    this.conflicts = this.registerTable("conflicts", "id");
    this.metadata = this.registerTable("metadata", "key");
    this.images = this.registerTable("images", "id");
    this.cardRelations = this.registerTable("cardRelations", "id");
    this.projectMaps = this.registerTable("projectMaps", "id");
    this.registerTable(LEGACY_TAG_STORE_V1, ["rootFolderId", "name"]);
    this.registerTable(LEGACY_TAG_STORE_V2, ["userId", "name"]);
    this.registerTable(LEGACY_TAG_STORE_V3, "id");
    this.registerTable(CURRENT_TAG_STORE, "id");
    this.registerTable("studyLogs", "id");
  }

  private registerTable(name: string, keyPath: KeyPath): InMemoryTable<object> {
    const table = new InMemoryTable<object>(name, keyPath);
    this.tableMap.set(name, table as InMemoryTable<object>);
    this.tables.push(table as InMemoryTable<object>);
    return table;
  }

  table(name: string): InMemoryTable<object> {
    const table = this.tableMap.get(name);
    if (!table) {
      throw new Error(`[InMemoryLocalDB] Unknown table requested: ${name}`);
    }
    return table;
  }

  async open(): Promise<this> {
    this.opened = true;
    return this;
  }

  isOpen(): boolean {
    return this.opened;
  }

  close(): void {
    this.opened = false;
  }

  async delete(): Promise<void> {
    this.version = 0;
    this.tables.forEach((t) => t.clear());
    this.opened = false;
    return Promise.resolve();
  }

  async transaction<T>(mode: string, ...args: unknown[]): Promise<T> {
    const scope = args[args.length - 1] as () => Promise<T> | T;
    return await scope();
  }

  async getItem<TTable extends SyncableEntityTable>(
    tableName: TTable,
    id: string,
  ): Promise<LocalDBTableMap[TTable] | undefined>;
  async getItem(tableName: string, id: string): Promise<unknown> {
    const item = await this.table(tableName).get(id);
    if (tableName === "cards") return item ? normalizeCard(item) : item;
    if (tableName === "folders")
      return item ? normalizeFolderWithSilent(item) : item;
    return item;
  }

  async getAllItems<TTable extends SyncableEntityTable>(
    tableName: TTable,
  ): Promise<Array<LocalDBTableMap[TTable]>>;
  async getAllItems(tableName: string): Promise<unknown[]> {
    const items = await this.table(tableName).toArray();
    if (tableName === "cards") return items.map(normalizeCard);
    if (tableName === "folders") return items.map(normalizeFolderWithSilent);
    return items;
  }

  private async enqueueSync(
    tableName: string,
    payload: Card | Folder | CardSet,
  ): Promise<void> {
    if (!SYNCABLE_TABLES.has(tableName)) return;
    const operationType: SyncQueueItem["operationType"] = payload.isDeleted
      ? "delete"
      : "update";
    const now = Date.now();
    const entity = ENTITY_MAP[tableName];
    const base = {
      id: nanoid(),
      idempotencyKey: nanoid(),
      targetId: payload.id,
      type: "upload" as const,
      priority: "high" as const,
      createdAt: now,
      updatedAt: now,
      status: "pending" as const,
      retryCount: 0,
    };

    const task: SyncQueueItem =
      entity === "card"
        ? operationType === "delete"
          ? {
              ...base,
              entity: "card",
              operationType: "delete",
              action: "delete",
              payload: { id: payload.id },
            }
          : {
              ...base,
              entity: "card",
              operationType: "update",
              action: "update",
              payload: payload as Card,
            }
        : operationType === "delete"
          ? {
              ...base,
              entity: "folder",
              operationType: "delete",
              action: "delete",
              payload: { id: payload.id },
            }
          : {
              ...base,
              entity: "folder",
              operationType: "update",
              action: "update",
              payload: payload as Folder,
            };

    await this.syncQueue.put(task);
    if (this.syncTrigger) {
      setTimeout(() => this.syncTrigger?.(), 0);
    }
  }

  async addItem(
    tableName: string,
    item: unknown,
    skipSync = false,
  ): Promise<string> {
    const payload = ensureObject(item as Record<string, unknown>);
    const id = await this.table(tableName).add(payload);
    if (!skipSync)
      await this.enqueueSync(tableName, payload as Card | Folder | CardSet);
    return String(id ?? payload.id);
  }

  async updateItem(
    tableName: string,
    id: string,
    changes: object,
    skipSync = false,
  ): Promise<number> {
    const result = await this.table(tableName).update(
      id,
      changes as Record<string, unknown>,
    );
    if (!skipSync && result > 0) {
      const fullItem = await this.table(tableName).get(id);
      if (fullItem)
        await this.enqueueSync(tableName, fullItem as Card | Folder | CardSet);
    }
    return result;
  }

  async deleteItem(tableName: string, id: string): Promise<void> {
    await this.table(tableName).delete(id);
  }

  async softDelete(tableName: string, id: string): Promise<number> {
    return this.updateItem(tableName, id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async restore(tableName: string, id: string): Promise<number> {
    return this.updateItem(tableName, id, {
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date(),
    });
  }

  async purge(tableName: string, id: string): Promise<void> {
    await this.deleteItem(tableName, id);
  }

  async bulkUpsert(
    tableName: string,
    items: unknown[],
    skipSync = false,
  ): Promise<void> {
    if (!Array.isArray(items) || items.length === 0) return;
    await this.table(tableName).bulkPut(
      items as Array<Record<string, unknown>>,
    );
    if (!skipSync) {
      for (const item of items) {
        await this.enqueueSync(tableName, item as Card | Folder | CardSet);
      }
    }
  }

  async clearTable(tableName: string): Promise<void> {
    await this.table(tableName).clear();
  }

  async getAllCards(): Promise<Card[]> {
    const cards = await this.cards.toArray();
    return cards.map(normalizeCard) as Card[];
  }

  async getAllFolders(): Promise<Folder[]> {
    const folders = await this.folders.toArray();
    return folders.map(normalizeFolderWithSilent) as Folder[];
  }

  async getLastSyncTime(userId: string): Promise<Date | null> {
    const meta = await this.syncMetadata.get(userId);
    if (!meta?.lastSyncTime) return null;
    return toDateOrNull(meta.lastSyncTime);
  }

  async updateLastSyncTime(userId: string, syncTime: Date): Promise<void> {
    await this.syncMetadata.put({
      userId,
      deviceId: getOrCreateDeviceId(),
      deviceName: getDeviceName(),
      lastSyncTime: syncTime,
      lastHighResSync: null,
      isActive: true,
    });
  }

  async getDirtyItems<TTable extends SyncableEntityTable>(
    tableName: TTable,
    userId: string,
    lastSyncTime: Date,
  ): Promise<Array<LocalDBTableMap[TTable]>>;
  async getDirtyItems(
    tableName: string,
    userId: string,
    lastSyncTime: Date,
  ): Promise<Array<Record<string, unknown>>> {
    const rows = await this.table(tableName).toArray();
    const threshold = toTimestamp(lastSyncTime);
    return rows.filter(
      (row) => row.userId === userId && toTimestamp(row.updatedAt) >= threshold,
    );
  }

  async clearAllData(): Promise<void> {
    await Promise.all(this.tables.map((table) => table.clear()));
  }

  async cleanupSyncHistory(): Promise<void> {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    await this.syncHistory
      .where("finishedAt")
      .below(now - THIRTY_DAYS)
      .delete();
    const all = await this.syncHistory.orderBy("finishedAt").toArray();
    if (all.length > 100) {
      const toDelete = all
        .slice(0, all.length - 100)
        .map((item: unknown) => (item as Record<string, unknown>).id as string);
      await this.syncHistory.bulkDelete(toDelete);
    }
  }

  async cleanupSyncErrors(): Promise<void> {
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const oldErrors = await this.syncErrors
      .where("occurredAt")
      .below(now - SEVEN_DAYS)
      .and((item: unknown) => !(item as Record<string, unknown>).retryable)
      .toArray();
    await this.syncErrors.bulkDelete(
      oldErrors.map(
        (item: unknown) => (item as Record<string, unknown>).id as string,
      ),
    );
  }

  async getDeviceMeta(
    userId: string,
  ): Promise<Record<string, unknown> | undefined> {
    return this.deviceMeta.where("userId").equals(userId).first();
  }

  async upsertDeviceMeta(meta: unknown): Promise<void> {
    await this.deviceMeta.put(meta as Record<string, unknown>);
  }

  async getSyncEnabledFolders(
    userId: string,
  ): Promise<Array<Record<string, unknown>>> {
    return this.folders
      .where("userId")
      .equals(userId)
      .and(
        (folder: unknown) =>
          (folder as Record<string, unknown>).cloudSyncEnabled === true,
      )
      .toArray();
  }

  async getUpdatedCards(
    folderId: string,
    lastSyncTime: Date,
  ): Promise<Array<Record<string, unknown>>> {
    const threshold = toTimestamp(lastSyncTime);
    return this.cards
      .where("folderId")
      .equals(folderId)
      .and(
        (card: unknown) =>
          toTimestamp((card as Record<string, unknown>).updatedAt) > threshold,
      )
      .toArray();
  }

  async upsert(
    tableName: SyncableEntityTable,
    data: LocalDBTableMap[SyncableEntityTable],
    skipSync = false,
  ): Promise<void> {
    await this.table(tableName).put(data as Record<string, unknown>);
    if (!skipSync)
      await this.enqueueSync(
        tableName,
        data as unknown as Card | Folder | CardSet,
      );
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
    return this.syncErrors.where("retryable").equals(true).toArray();
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
    const histories = await this.syncHistory
      .where("finishedAt")
      .above(timestamp)
      .toArray();
    const errors = await this.syncErrors
      .where("occurredAt")
      .above(timestamp)
      .toArray();
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

  async listCardsByUser(userId: string): Promise<Card[]> {
    return this.cards.where("userId").equals(userId).toArray();
  }

  async listFoldersByUser(userId: string): Promise<Folder[]> {
    return this.folders.where("userId").equals(userId).toArray();
  }

  async listCardSetsByUser(userId: string): Promise<CardSet[]> {
    return this.cardSets.where("userId").equals(userId).toArray();
  }

  async addCardSet(cardSet: CardSet): Promise<void> {
    await this.cardSets.add(cardSet);
  }

  async updateCardById(id: string, changes: Partial<Card>): Promise<number> {
    return this.cards.update(id, changes);
  }

  async runSyncTransaction<T>(scope: () => Promise<T>): Promise<T> {
    return scope();
  }

  async clearSyncTables(tables: readonly SyncableEntityTable[]): Promise<void> {
    await Promise.all(tables.map((table) => this.table(table).clear()));
  }

  async putSyncRecord<TTable extends SyncableEntityTable>(
    table: TTable,
    data: LocalDBTableMap[TTable],
  ): Promise<void> {
    await this.table(table).put(data as Record<string, unknown>);
  }

  setSyncTrigger(callback: () => void): void {
    this.syncTrigger = callback;
  }
}
