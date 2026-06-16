import { nanoid } from "nanoid";
import { createDeleteQueueItem, createUpsertQueueItem } from "@/application/usecases/syncQueueItemFactory";
import type { DeleteEntity, UpsertEntity } from "@/application/usecases/syncQueuePayloadGuards";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
import { CURRENT_TAG_STORE } from "@/services/localdb/tagStoreNames";
import type { LocalDBTableMap, SyncableEntityTable, TagRecord } from "@/services/localdb/types";
import type { AssetRecord, Card, CardSet, DocumentItem, Folder, SyncConflict, SyncError, SyncHistory, SyncMetadata, SyncQueueItem, SyncSettings, UploadedImage, UserSettings, UserStats } from "@/types";
import type { SyncPayloadByEntity, SyncPriority } from "@/types/domain/sync";
import { getDeviceName, getOrCreateDeviceId } from "@/utils/device";
import { toDateOrNull, toMillis } from "@/utils/toMillis";



type KeyPath = string | readonly string[];
type Predicate<T> = (value: T) => boolean;
type ObjectRecord = Record<string, unknown>;
type QueueEntity = SyncQueueItem["entity"];
type TimestampLikeObject = {
  toDate?: () => unknown;
  toMillis?: () => unknown;
  seconds?: unknown;
  _seconds?: unknown;
  nanoseconds?: unknown;
  _nanoseconds?: unknown;
};
type ModifyCallback<T extends object, TKey> = (
  item: T,
  ctx?: { value: T; primKey: TKey; },
) => boolean | void;
type RegisteredInMemoryTable = {
  readonly name: string;
  readonly clear: () => Promise<void>;
};



const SYNCABLE_TABLES = new Set(["cards", "folders", "cardSets", "documents", CURRENT_TAG_STORE, "images", "userSettings", "projectMaps"] as const);
const ENTITY_BY_TABLE: Record<string, QueueEntity> = {
  cards: "card",
  folders: "folder",
  cardSets: "cardSet",
  documents: "document",
  [CURRENT_TAG_STORE]: "tag",
  images: "asset",
  userSettings: "userSetting",
  projectMaps: "projectMap",
};
const DELETE_CAPABLE_ENTITIES = new Set<DeleteEntity>(["card", "folder", "cardSet", "document", "tag", "asset", "projectMap"]);



const isRecord = (value: unknown): value is ObjectRecord => {
  return typeof value === "object" && value !== null;
};
const isTimestampLikeObject = (
  value: unknown,
): value is TimestampLikeObject => {
  if (!isRecord(value)) return false;

  return (
    typeof value.toDate === "function" ||
    typeof value.toMillis === "function" ||
    typeof value.seconds === "number" ||
    typeof value._seconds === "number"
  );
};
const asRecord = (value: object): ObjectRecord => value as ObjectRecord;
const readField = (value: object, key: string): unknown => {
  return asRecord(value)[key];
};
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

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeComparable(entry));
  }

  return value;
};
const compareValues = (left: unknown, right: unknown): number => {
  const normalizedLeft = normalizeComparable(left);
  const normalizedRight = normalizeComparable(right);

  if (Array.isArray(normalizedLeft) && Array.isArray(normalizedRight)) {
    const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
    for (let index = 0; index < maxLength; index += 1) {
      if (index >= normalizedLeft.length) return -1;
      if (index >= normalizedRight.length) return 1;
      const diff = compareValues(normalizedLeft[index], normalizedRight[index]);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  if (normalizedLeft === normalizedRight) return 0;
  if (normalizedLeft === undefined || normalizedLeft === null) return -1;
  if (normalizedRight === undefined || normalizedRight === null) return 1;
  if (normalizedLeft > normalizedRight) return 1;
  if (normalizedLeft < normalizedRight) return -1;
  return 0;
};
const isEqual = (left: unknown, right: unknown): boolean => {
  if (Array.isArray(left) && !Array.isArray(right)) {
    return left.some((entry) => isEqual(entry, right));
  }

  if (!Array.isArray(left) && Array.isArray(right)) {
    return right.some((entry) => isEqual(left, entry));
  }

  return compareValues(left, right) === 0;
};
const parseIndexKeys = (index: KeyPath): string[] => {
  if (typeof index === "string") {
    if (index.startsWith("[") && index.endsWith("]")) {
      return index
        .slice(1, -1)
        .split("+")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }

    return [index];
  }

  return index.map((entry) => entry.trim()).filter(Boolean);
};
const serializeKey = (key: unknown): string => {
  if (Array.isArray(key)) return JSON.stringify(key);
  if (isRecord(key)) return JSON.stringify(key);
  return String(key);
};
const ensureObject = <T extends object>(value: T): T => ({ ...value });
const getQueueEntityForTable = (tableName: string): QueueEntity | null => ENTITY_BY_TABLE[tableName] ?? null;
class InMemoryCollection<T extends object, TKey = string> {
  constructor(
    private readonly tableRef: InMemoryTable<T, TKey>,
    private readonly predicates: Predicate<T>[] = [],
    private readonly indexKeys: string[] | null = null,
    private readonly orderByKeys: string[] | null = null,
    private readonly reversed = false,
    private readonly maxItems: number | null = null,
  ) {}

  private readonly clone = (
    next: Partial<{
      predicates: Predicate<T>[];
      indexKeys: string[] | null;
      orderByKeys: string[] | null;
      reversed: boolean;
      maxItems: number | null;
    }>,
  ): InMemoryCollection<T, TKey> => {
    return new InMemoryCollection<T, TKey>(
      this.tableRef,
      next.predicates ?? this.predicates,
      next.indexKeys ?? this.indexKeys,
      next.orderByKeys ?? this.orderByKeys,
      next.reversed ?? this.reversed,
      next.maxItems ?? this.maxItems,
    );
  };

  private readonly getIndexedValue = (item: T): unknown => {
    if (!this.indexKeys || this.indexKeys.length === 0) return undefined;

    if (this.indexKeys.length === 1) {
      return readField(item, this.indexKeys[0]);
    }

    return this.indexKeys.map((key) => readField(item, key));
  };

  private readonly withIndexPredicate = (
    predicate: (indexValue: unknown) => boolean,
  ): InMemoryCollection<T, TKey> => {
    return this.clone({
      predicates: [
        ...this.predicates,
        (item) => predicate(this.getIndexedValue(item)),
      ],
    });
  };

  private readonly resolveEntries = (): Array<{ key: string; value: T; }> => {
    let entries = this.tableRef.entries();

    if (this.predicates.length > 0) {
      entries = entries.filter(({ value }) =>
        this.predicates.every((predicate) => predicate(value)),
      );
    }

    if (this.orderByKeys && this.orderByKeys.length > 0) {
      entries.sort((left, right) => {
        const leftValue =
          this.orderByKeys!.length === 1
            ? readField(left.value, this.orderByKeys![0])
            : this.orderByKeys!.map((key) => readField(left.value, key));
        const rightValue =
          this.orderByKeys!.length === 1
            ? readField(right.value, this.orderByKeys![0])
            : this.orderByKeys!.map((key) => readField(right.value, key));
        return compareValues(leftValue, rightValue);
      });
    }

    if (this.reversed) entries.reverse();
    if (typeof this.maxItems === "number") {
      entries = entries.slice(0, this.maxItems);
    }

    return entries;
  };

  public readonly equals = (value: unknown): InMemoryCollection<T, TKey> => {
    return this.withIndexPredicate((indexedValue) => isEqual(indexedValue, value));
  };

  public readonly above = (value: unknown): InMemoryCollection<T, TKey> => {
    return this.withIndexPredicate((indexedValue) => compareValues(indexedValue, value) > 0);
  };

  public readonly aboveOrEqual = (value: unknown): InMemoryCollection<T, TKey> => {
    return this.withIndexPredicate((indexedValue) => compareValues(indexedValue, value) >= 0);
  };

  public readonly below = (value: unknown): InMemoryCollection<T, TKey> => {
    return this.withIndexPredicate((indexedValue) => compareValues(indexedValue, value) < 0);
  };

  public readonly belowOrEqual = (value: unknown): InMemoryCollection<T, TKey> => {
    return this.withIndexPredicate((indexedValue) => compareValues(indexedValue, value) <= 0);
  };

  public readonly between = (
    lowerValue: unknown,
    upperValue: unknown,
    includeLower = true,
    includeUpper = true,
  ): InMemoryCollection<T, TKey> => {
    return this.withIndexPredicate((indexedValue) => {
      const lowerOk = includeLower ? compareValues(indexedValue, lowerValue) >= 0 : compareValues(indexedValue, lowerValue) > 0;
      const upperOk = includeUpper ? compareValues(indexedValue, upperValue) <= 0 : compareValues(indexedValue, upperValue) < 0;

      return lowerOk && upperOk;
    });
  };

  public readonly startsWith = (prefix: string): InMemoryCollection<T, TKey> => {
    return this.withIndexPredicate((indexedValue) => typeof indexedValue === "string" ? indexedValue.startsWith(prefix) : false);
  };

  public readonly anyOf = (values: readonly unknown[]): InMemoryCollection<T, TKey> => {
    return this.withIndexPredicate((indexedValue) => values.some((value) => isEqual(indexedValue, value)));
  };

  public readonly and = (predicate: Predicate<T>): InMemoryCollection<T, TKey> => {
    return this.clone({ predicates: [...this.predicates, predicate] });
  };

  public readonly filter = (predicate: Predicate<T>): InMemoryCollection<T, TKey> => {
    return this.and(predicate);
  };

  public readonly reverse = (): InMemoryCollection<T, TKey> => {
    return this.clone({ reversed: !this.reversed });
  };

  public readonly limit = (limit: number): InMemoryCollection<T, TKey> => {
    return this.clone({ maxItems: Math.max(0, limit) });
  };

  public readonly toArray = async (): Promise<T[]> => {
    return this.resolveEntries().map(({ value }) => ensureObject(value));
  };

  public readonly first = async (): Promise<T | undefined> => {
    const firstEntry = this.resolveEntries()[0];
    return firstEntry ? ensureObject(firstEntry.value) : undefined;
  };

  public readonly count = async (): Promise<number> => {
    return this.resolveEntries().length;
  };

  public readonly delete = async (): Promise<number> => {
    const entries = this.resolveEntries();
    for (const { key } of entries) {
      this.tableRef.deleteBySerializedKey(key);
    }
    return entries.length;
  };

  public readonly modify = async (changes: Partial<T> | ModifyCallback<T, TKey>): Promise<number> => {
    const entries = this.resolveEntries();

    for (const { key, value } of entries) {
      const next = ensureObject(value);

      if (typeof changes === "function") {
        changes(next, {
          value: next,
          primKey: this.tableRef.deserializeSerializedKey(key),
        });
      } else {
        Object.assign(next, changes);
      }

      this.tableRef.replaceBySerializedKey(key, next);
    }

    return entries.length;
  };

  public readonly sortBy = async (field: keyof T | string): Promise<T[]> => {
    const rows = await this.toArray();
    rows.sort((left, right) => compareValues(readField(left, String(field)), readField(right, String(field))));
    return rows;
  };

  public readonly primaryKeys = async (): Promise<TKey[]> => {
    return this.resolveEntries().map(({ key }) => this.tableRef.deserializeSerializedKey(key));
  };

  public readonly each = async (callback: (item: T, cursor?: { primaryKey: TKey; }) => void | Promise<void>): Promise<void> => {
    for (const { key, value } of this.resolveEntries()) {
      await callback(ensureObject(value), {
        primaryKey: this.tableRef.deserializeSerializedKey(key),
      });
    }
  };

  public readonly offset = (): never => {
    throw new Error("[InMemoryLocalDB] Unsupported Dexie API: Collection.offset()");
  };

  public readonly until = (): never => {
    throw new Error("[InMemoryLocalDB] Unsupported Dexie API: Collection.until()");
  };

  public readonly startsWithIgnoreCase = (): never => {
    throw new Error("[InMemoryLocalDB] Unsupported Dexie API: Collection.startsWithIgnoreCase()");
  };

  public readonly equalsIgnoreCase = (): never => {
    throw new Error("[InMemoryLocalDB] Unsupported Dexie API: Collection.equalsIgnoreCase()");
  };

  public readonly or = (): never => {
    throw new Error("[InMemoryLocalDB] Unsupported Dexie API: Collection.or()");
  };

  public readonly keys = (): never => {
    throw new Error("[InMemoryLocalDB] Unsupported Dexie API: Collection.keys()");
  };
}
class InMemoryWhereClause<T extends object, TKey = string> {
  constructor(private readonly collection: InMemoryCollection<T, TKey>) {}

  public readonly equals = (value: unknown): InMemoryCollection<T, TKey> => this.collection.equals(value);
  public readonly above = (value: unknown): InMemoryCollection<T, TKey> => this.collection.above(value);
  public readonly aboveOrEqual = (value: unknown): InMemoryCollection<T, TKey> => this.collection.aboveOrEqual(value);
  public readonly below = (value: unknown): InMemoryCollection<T, TKey> => this.collection.below(value);
  public readonly belowOrEqual = (value: unknown): InMemoryCollection<T, TKey> => this.collection.belowOrEqual(value);
  public readonly between = (lowerValue: unknown, upperValue: unknown, includeLower = true, includeUpper = true): InMemoryCollection<T, TKey> => this.collection.between(lowerValue, upperValue, includeLower, includeUpper);
  public readonly startsWith = (prefix: string): InMemoryCollection<T, TKey> => this.collection.startsWith(prefix);
  public readonly anyOf = (values: readonly unknown[]): InMemoryCollection<T, TKey> => this.collection.anyOf(values);
}
class InMemoryTable<T extends object, TKey = string> {
  private readonly rows = new Map<string, T>();
  private readonly keyPathKeys: string[];

  constructor(
    public readonly name: string,
    private readonly keyPath: KeyPath = "id",
  ) {
    this.keyPathKeys = parseIndexKeys(keyPath);
  }

  private readonly deriveKeyFromRecord = (record: T): unknown => {
    if (this.keyPathKeys.length > 1) {
      return this.keyPathKeys.map((path) => readField(record, path));
    }
    return readField(record, this.keyPathKeys[0]);
  };

  private readonly ensureRecordKey = (record: T): unknown => {
    const currentKey = this.deriveKeyFromRecord(record);

    if (this.keyPathKeys.length > 1) {
      return currentKey;
    }

    if (currentKey !== undefined && currentKey !== null && String(currentKey).trim().length > 0) {
      return currentKey;
    }

    const nextKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : nanoid();

    asRecord(record)[this.keyPathKeys[0]] = nextKey;
    return nextKey;
  };

  private readonly serializeRecord = (record: T): string => serializeKey(this.ensureRecordKey(record));
  private readonly serializeInputKey = (key: unknown): string => serializeKey(key);

  public readonly deserializeSerializedKey = (serializedKey: string): TKey => {
    try {
      return JSON.parse(serializedKey) as TKey;
    } catch {
      return serializedKey as TKey;
    }
  };

  public readonly entries = (): Array<{ key: string; value: T; }> => Array.from(this.rows.entries()).map(([key, value]) => ({ key, value }));
  public readonly deleteBySerializedKey = (serializedKey: string): void => {
    this.rows.delete(serializedKey);
  };
  public readonly replaceBySerializedKey = (oldSerializedKey: string, value: T): void => {
    const nextSerializedKey = this.serializeRecord(value);
    if (nextSerializedKey !== oldSerializedKey) this.rows.delete(oldSerializedKey);
    this.rows.set(nextSerializedKey, value);
  };

  public readonly add = async (record: T): Promise<TKey> => {
    const value = ensureObject(record);
    const serializedKey = this.serializeRecord(value);
    if (this.rows.has(serializedKey)) throw new Error(`[InMemoryLocalDB] Duplicate key on add: ${this.name}`);
    this.rows.set(serializedKey, value);
    return this.deserializeSerializedKey(serializedKey);
  };

  public readonly put = async (record: T): Promise<TKey> => {
    const value = ensureObject(record);
    const serializedKey = this.serializeRecord(value);
    this.rows.set(serializedKey, value);
    return this.deserializeSerializedKey(serializedKey);
  };

  public readonly bulkPut = async (records: readonly T[]): Promise<void> => {
    for (const record of records) await this.put(record);
  };
  public readonly bulkAdd = async (records: readonly T[]): Promise<void> => {
    for (const record of records) await this.add(record);
  };
  public readonly bulkGet = async (keys: readonly unknown[]): Promise<Array<T | undefined>> => Promise.all(keys.map((key) => this.get(key)));
  public readonly get = async (key: unknown): Promise<T | undefined> => {
    const found = this.rows.get(this.serializeInputKey(key));
    return found ? ensureObject(found) : undefined;
  };
  public readonly update = async (key: unknown, changes: Partial<T> | Record<string, unknown> | ModifyCallback<T, TKey>): Promise<number> => {
    const serializedKey = this.serializeInputKey(key);
    const current = this.rows.get(serializedKey);
    if (!current) return 0;

    const next = ensureObject(current);
    if (typeof changes === "function") {
      changes(next, { value: next, primKey: this.deserializeSerializedKey(serializedKey) });
    } else {
      Object.assign(next, changes);
    }
    this.replaceBySerializedKey(serializedKey, next);
    return 1;
  };
  public readonly delete = async (key: unknown): Promise<void> => {
    this.rows.delete(this.serializeInputKey(key));
  };
  public readonly bulkDelete = async (keys: readonly unknown[]): Promise<void> => {
    for (const key of keys) this.rows.delete(this.serializeInputKey(key));
  };
  public readonly clear = async (): Promise<void> => {
    this.rows.clear();
  };
  public readonly count = async (): Promise<number> => this.rows.size;
  public readonly toArray = async (): Promise<T[]> => Array.from(this.rows.values()).map((value) => ensureObject(value));

  public where(index: KeyPath): InMemoryWhereClause<T, TKey>;
  public where(criteria: { [key: string]: unknown; }): InMemoryCollection<T, TKey>;
  public where(input: KeyPath | { [key: string]: unknown; }): InMemoryWhereClause<T, TKey> | InMemoryCollection<T, TKey> {
    if (typeof input === "string" || Array.isArray(input)) {
      return new InMemoryWhereClause(new InMemoryCollection<T, TKey>(this, [], parseIndexKeys(input), null, false, null));
    }

    return Object.entries(input).reduce<InMemoryCollection<T, TKey>>(
      (collection, [key, value]) => collection.and((item) => isEqual(readField(item, key), value)),
      new InMemoryCollection<T, TKey>(this),
    );
  }

  public readonly filter = (predicate: Predicate<T>): InMemoryCollection<T, TKey> => new InMemoryCollection<T, TKey>(this).filter(predicate);
  public readonly orderBy = (index: KeyPath): InMemoryCollection<T, TKey> => new InMemoryCollection<T, TKey>(this, [], null, parseIndexKeys(index), false, null);
  public readonly toCollection = (): InMemoryCollection<T, TKey> => new InMemoryCollection<T, TKey>(this);
}
class InMemoryLocalDB {
  public readonly name: string;
  public version = 0;
  public readonly isInMemoryFallback = true;
  public userId?: string;

  public folders!: InMemoryTable<Folder, string>;
  public cardSets!: InMemoryTable<CardSet, string>;
  public cards!: InMemoryTable<Card, string>;
  public documents!: InMemoryTable<DocumentItem, string>;
  public users!: InMemoryTable<Record<string, unknown>, string>;
  public userSettings!: InMemoryTable<UserSettings, string>;
  public userStats!: InMemoryTable<UserStats, string>;
  public syncMetadata!: InMemoryTable<SyncMetadata, string>;
  public levelHistories!: InMemoryTable<Record<string, unknown>, string>;
  public deviceMeta!: InMemoryTable<Record<string, unknown>, string>;
  public syncErrors!: InMemoryTable<SyncError, string>;
  public syncHistory!: InMemoryTable<SyncHistory, string>;
  public syncSettings!: InMemoryTable<SyncSettings, string>;
  public syncQueue!: InMemoryTable<SyncQueueItem, string>;
  public conflicts!: InMemoryTable<SyncConflict, string>;
  public metadata!: InMemoryTable<Record<string, unknown>, string>;
  public images!: InMemoryTable<AssetRecord | UploadedImage, string>;
  public cardRelations!: InMemoryTable<Record<string, unknown>, string>;
  public projectMaps!: InMemoryTable<Record<string, unknown>, string>;
  public studyLogs!: InMemoryTable<Record<string, unknown>, string>;

  public tables: RegisteredInMemoryTable[] = [];
  private readonly tableMap = new Map<string, unknown>();
  private opened = true;
  private syncTrigger: (() => void) | null = null;

  public get tagRecords(): InMemoryTable<TagRecord, string> {
    return this.table<TagRecord, string>(CURRENT_TAG_STORE);
  }

  constructor(userId?: string, name?: string) {
    this.userId = userId;
    this.name = name ?? `SivflowDB_mem_${userId ?? "anonymous"}`;

    this.folders = this.registerTable<Folder>("folders", "id");
    this.cardSets = this.registerTable<CardSet>("cardSets", "id");
    this.cards = this.registerTable<Card>("cards", "id");
    this.documents = this.registerTable<DocumentItem>("documents", "id");
    this.users = this.registerTable<Record<string, unknown>>("users", "id");
    this.userSettings = this.registerTable<UserSettings>("userSettings", "id");
    this.userStats = this.registerTable<UserStats>("userStats", "id");
    this.syncMetadata = this.registerTable<SyncMetadata>("syncMetadata", "userId");
    this.levelHistories = this.registerTable<Record<string, unknown>>("levelHistories", "id");
    this.deviceMeta = this.registerTable<Record<string, unknown>>("deviceMeta", "deviceId");
    this.syncErrors = this.registerTable<SyncError>("syncErrors", "id");
    this.syncHistory = this.registerTable<SyncHistory>("syncHistory", "id");
    this.syncSettings = this.registerTable<SyncSettings>("syncSettings", "id");
    this.syncQueue = this.registerTable<SyncQueueItem>("syncQueue", "id");
    this.conflicts = this.registerTable<SyncConflict>("conflicts", "id");
    this.metadata = this.registerTable<Record<string, unknown>>("metadata", "key");
    this.images = this.registerTable<AssetRecord | UploadedImage>("images", "id");
    this.cardRelations = this.registerTable<Record<string, unknown>>("cardRelations", "id");
    this.projectMaps = this.registerTable<Record<string, unknown>>("projectMaps", "id");
    this.studyLogs = this.registerTable<Record<string, unknown>>("studyLogs", "id");
    this.registerTable<TagRecord>(CURRENT_TAG_STORE, "id");
    this.registerTable<Record<string, unknown>>("documentFiles", "id");
  }

  private readonly registerTable = <T extends object, TKey = string>(name: string, keyPath: KeyPath): InMemoryTable<T, TKey> => {
    const table = new InMemoryTable<T, TKey>(name, keyPath);
    this.tableMap.set(name, table);
    this.tables.push({ name, clear: () => table.clear() });
    return table;
  };

  public readonly table = <T extends object, TKey = string>(name: string): InMemoryTable<T, TKey> => {
    const table = this.tableMap.get(name);
    if (!table) throw new Error(`[InMemoryLocalDB] Unknown table requested: ${name}`);
    return table as InMemoryTable<T, TKey>;
  };

  public readonly open = async (): Promise<this> => {
    this.opened = true;
    return this;
  };
  public readonly isOpen = (): boolean => this.opened;
  public readonly close = (): void => {
    this.opened = false;
  };
  public readonly delete = async (): Promise<void> => {
    this.version = 0;
    await Promise.all(this.tables.map((table) => table.clear()));
    this.opened = false;
  };
  public readonly transaction = async <T>(_mode: string, first: unknown, ...rest: unknown[]): Promise<T> => {
    const scope = typeof first === "function" ? (first as () => Promise<T> | T) : (rest.at(-1) as (() => Promise<T> | T) | undefined);
    if (!scope) throw new Error("[InMemoryLocalDB] transaction scope is required");
    return await scope();
  };
  public readonly runSyncTransaction = async <T>(scope: () => Promise<T>): Promise<T> => await scope();

  private readonly emitSyncTrigger = (): void => {
    if (!this.syncTrigger) return;
    setTimeout(() => this.syncTrigger?.(), 0);
  };

  public readonly queueUpsertSync = async <TEntity extends UpsertEntity>({ entity, operationType, payload, priority = "high" }: { entity: TEntity; operationType: "create" | "update"; payload: SyncPayloadByEntity[TEntity]; priority?: SyncPriority; }): Promise<void> => {
    const item = createUpsertQueueItem({ entity, operationType, payload, priority });
    await this.syncQueue.put(item);
    this.emitSyncTrigger();
  };

  public readonly queueDeleteSync = async <TEntity extends DeleteEntity>({ entity, id, userId, priority = "high" }: { entity: TEntity; id: string; userId: string; priority?: SyncPriority; }): Promise<void> => {
    const item = createDeleteQueueItem({ entity, id, userId, priority });
    await this.syncQueue.put(item);
    this.emitSyncTrigger();
  };

  public readonly getItem = async <TTable extends SyncableEntityTable>(table: TTable, id: string): Promise<LocalDBTableMap[TTable] | undefined> => {
    const item = await this.table<LocalDBTableMap[TTable]>(table).get(id);
    if (table === "cards") return (item ? normalizeCard(item as Card) : item) as LocalDBTableMap[TTable] | undefined;
    if (table === "folders") return (item ? normalizeFolderWithSilent(item as Folder) : item) as LocalDBTableMap[TTable] | undefined;
    return item;
  };

  public readonly getAllItems = async <TTable extends SyncableEntityTable>(table: TTable): Promise<Array<LocalDBTableMap[TTable]>> => {
    const items = await this.table<LocalDBTableMap[TTable]>(table).toArray();
    if (table === "cards") return items.map((item) => normalizeCard(item as Card) as LocalDBTableMap[TTable]);
    if (table === "folders") return items.map((item) => normalizeFolderWithSilent(item as Folder) as LocalDBTableMap[TTable]);
    return items;
  };

  public readonly getDirtyItems = async <TTable extends SyncableEntityTable>(table: TTable, userId: string, lastSyncTime: Date): Promise<Array<LocalDBTableMap[TTable]>> => {
    const rows = await this.table<LocalDBTableMap[TTable]>(table).toArray();
    const threshold = lastSyncTime.getTime();
    return rows.filter((row) => {
      const record = row as Record<string, unknown>;
      return record.userId === userId && toTimestamp(record.updatedAt) >= threshold;
    });
  };

  public readonly getLastSyncTime = async (userId: string): Promise<Date | null> => {
    const metadata = await this.syncMetadata.get(userId);
    return metadata?.lastSyncTime ? new Date(toTimestamp(metadata.lastSyncTime)) : null;
  };

  public readonly updateLastSyncTime = async (userId: string, syncTime: Date): Promise<void> => {
    await this.syncMetadata.put({ userId, deviceId: getOrCreateDeviceId(), deviceName: getDeviceName(), lastSyncTime: syncTime, lastHighResSync: null, isActive: true });
  };

  public readonly getPendingSyncItems = async (userId: string): Promise<SyncQueueItem[]> => this.syncQueue.where("userId").equals(userId).toArray();

  public readonly markSyncItemsCompleted = async (ids: string[]): Promise<void> => {
    await this.syncQueue.bulkDelete(ids);
  };

  public readonly markSyncItemsFailed = async (ids: string[], error: string): Promise<void> => {
    await Promise.all(ids.map((id) => this.syncQueue.update(id, { status: "failed", error, retryCount: 1 })));
  };

  public readonly clearSyncQueue = async (userId: string): Promise<void> => {
    await this.syncQueue.where("userId").equals(userId).delete();
  };

  public readonly upsert = async <TTable extends SyncableEntityTable>(tableName: TTable, item: LocalDBTableMap[TTable], skipSync = false): Promise<void> => {
    const table = this.table<LocalDBTableMap[TTable]>(tableName);
    await table.put(item);
    if (!skipSync && SYNCABLE_TABLES.has(tableName as never)) {
      const entity = getQueueEntityForTable(tableName);
      if (entity && entity !== "asset") {
        await this.queueUpsertSync({ entity: entity as UpsertEntity, operationType: "update", payload: item as never });
      }
    }
  };

  public readonly deleteItem = async <TTable extends SyncableEntityTable>(tableName: TTable, id: string): Promise<void> => {
    await this.table<LocalDBTableMap[TTable]>(tableName).delete(id);
    const entity = getQueueEntityForTable(tableName);
    if (entity && DELETE_CAPABLE_ENTITIES.has(entity as DeleteEntity)) {
      await this.queueDeleteSync({ entity: entity as DeleteEntity, id, userId: this.userId ?? "anonymous" });
    }
  };

  public readonly bulkUpsert = async <TTable extends SyncableEntityTable>(tableName: TTable, items: Array<LocalDBTableMap[TTable]>, skipSync = false): Promise<void> => {
    await this.table<LocalDBTableMap[TTable]>(tableName).bulkPut(items);
    if (!skipSync && SYNCABLE_TABLES.has(tableName as never)) {
      await Promise.all(items.map((item) => {
        const entity = getQueueEntityForTable(tableName);
        if (!entity || entity === "asset") return Promise.resolve();
        return this.queueUpsertSync({ entity: entity as UpsertEntity, operationType: "update", payload: item as never });
      }));
    }
  };

  public readonly setSyncTrigger = (trigger: () => void): void => {
    this.syncTrigger = trigger;
  };
}



export { InMemoryLocalDB };
