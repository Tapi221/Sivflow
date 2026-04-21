import type {
  AssetRecord,
  Card,
  CardSet,
  DocumentItem as Document,
  Folder,
  SyncConflict,
  SyncError,
  SyncHistory,
  SyncQueueItem,
  SyncSettings,
  UploadedImage,
  UserSettings,
  UserStats,
} from "@/types";
import type {
  DeleteEntity,
  UpsertEntity,
} from "@/application/usecases/syncQueuePayloadGuards";
import type { SyncPayloadByEntity, SyncPriority } from "@/types/domain/sync";

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

export type TagRecord = {
  id: string;
  name: string;
  nameLower: string;
  color: string;
  userId: string;
  updatedAt: Date;
  createdAt?: Date;
  deviceId?: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  categoryId?: string;
  parentId?: string;
};

export type LocalDBTableMap = {
  cards: Card;
  folders: Folder;
  cardSets: CardSet;
  documents: Document;
  tagRecords: TagRecord;
  images: AssetRecord | UploadedImage;
  userSettings: UserSettings;
  userStats: UserStats;
};

export type SyncableEntityTable = keyof LocalDBTableMap;

export interface QueryableCollection<T extends object, TKey = string> {
  and(predicate: (item: T) => boolean): QueryableCollection<T, TKey>;
  filter(predicate: (item: T) => boolean): QueryableCollection<T, TKey>;
  reverse(): QueryableCollection<T, TKey>;
  limit(limit: number): QueryableCollection<T, TKey>;
  toArray(): Promise<T[]>;
  first(): Promise<T | undefined>;
  count(): Promise<number>;
  delete(): Promise<number>;
  modify(
    changes:
      | Partial<T>
      | ((item: T, ctx?: { value: T; primKey: TKey }) => boolean | void),
  ): Promise<number>;
  sortBy(field: keyof T | string): Promise<T[]>;
  primaryKeys(): Promise<TKey[]>;
  each(
    callback: (
      item: T,
      cursor?: { primaryKey: TKey },
    ) => void | Promise<void>,
  ): Promise<void>;
}

export interface QueryableWhereClause<T extends object, TKey = string> {
  equals(value: unknown): QueryableCollection<T, TKey>;
  above(value: unknown): QueryableCollection<T, TKey>;
  aboveOrEqual(value: unknown): QueryableCollection<T, TKey>;
  below(value: unknown): QueryableCollection<T, TKey>;
  belowOrEqual(value: unknown): QueryableCollection<T, TKey>;
  between(
    lowerValue: unknown,
    upperValue: unknown,
    includeLower?: boolean,
    includeUpper?: boolean,
  ): QueryableCollection<T, TKey>;
  startsWith(prefix: string): QueryableCollection<T, TKey>;
  anyOf(values: readonly unknown[]): QueryableCollection<T, TKey>;
}

export interface QueryableTable<T extends object, TKey = string> {
  count(): Promise<number>;
  get(key: unknown): Promise<T | undefined>;
  put(record: T): PromiseLike<unknown> | Promise<unknown>;
  add(record: T): PromiseLike<unknown> | Promise<unknown>;
  update(key: unknown, changes: unknown): PromiseLike<number> | Promise<number>;
  delete(key: unknown): PromiseLike<void> | Promise<void>;
  clear(): PromiseLike<void> | Promise<void>;
  toArray(): Promise<T[]>;
  where(index: string | string[]): QueryableWhereClause<T, TKey>;
  where(criteria: { [key: string]: unknown }): QueryableCollection<T, TKey>;
  filter(predicate: (item: T) => boolean): QueryableCollection<T, TKey>;
  orderBy(index: string | string[]): QueryableCollection<T, TKey>;
  bulkDelete?(keys: readonly unknown[]): PromiseLike<void> | Promise<void>;
  bulkPut?(items: readonly T[]): PromiseLike<unknown> | Promise<unknown>;
}

export interface LocalDBSyncApi {
  cards: QueryableTable<Card, string>;
  folders: QueryableTable<Folder, string>;

  getItem<TTable extends SyncableEntityTable>(
    table: TTable,
    id: string,
  ): Promise<LocalDBTableMap[TTable] | undefined>;
  getAllItems<TTable extends SyncableEntityTable>(
    table: TTable,
  ): Promise<Array<LocalDBTableMap[TTable]>>;
  getDirtyItems<TTable extends SyncableEntityTable>(
    table: TTable,
    userId: string,
    lastSyncTime: Date,
  ): Promise<Array<LocalDBTableMap[TTable]>>;
  upsert<TTable extends SyncableEntityTable>(
    tableName: TTable,
    data: LocalDBTableMap[TTable],
    skipSync?: boolean,
  ): Promise<void>;
  queueUpsertSync<TEntity extends UpsertEntity>(args: {
    entity: TEntity;
    operationType: "create" | "update";
    payload: SyncPayloadByEntity[TEntity];
    priority?: SyncPriority;
  }): Promise<void>;
  queueDeleteSync(args: {
    entity: DeleteEntity;
    targetId: string;
    priority?: SyncPriority;
  }): Promise<void>;

  getLastSyncTime(userId: string): Promise<Date | null>;
  updateLastSyncTime(userId: string, syncTime: Date): Promise<void>;
  clearAllData(): Promise<void>;
  purge(table: string, id: string): Promise<void>;

  getSyncSettings(id: string): Promise<SyncSettings | undefined>;
  putSyncSettings(settings: SyncSettings): Promise<void>;

  getSyncError(id: string): Promise<SyncError | undefined>;
  putSyncError(error: SyncError): Promise<void>;
  clearSyncErrors(): Promise<void>;
  getRetryableSyncErrors(): Promise<SyncError[]>;
  findQueueProcessingErrorsByTargetId(targetId: string): Promise<SyncError[]>;

  putSyncHistory(history: SyncHistory): Promise<void>;
  getRecentSyncHistory(limit?: number): Promise<SyncHistory[]>;
  getSyncStatsSince(timestamp: number): Promise<{
    histories: SyncHistory[];
    errors: SyncError[];
  }>;

  getSyncQueueCount(): Promise<number>;
  getQueuedItemsOldestFirst(): Promise<SyncQueueItem[]>;
  trimSyncQueueToLimit(limit: number): Promise<void>;
  putSyncQueueItem(item: SyncQueueItem): Promise<void>;
  removeSyncQueueItem(id: string): Promise<void>;

  putConflict(conflict: SyncConflict): Promise<void>;
  getConflict(id: string): Promise<SyncConflict | undefined>;
  getConflicts(): Promise<SyncConflict[]>;
  removeConflict(id: string): Promise<void>;

  getImageRecord(id: string): Promise<AssetRecord | UploadedImage | undefined>;
  putImageRecord(record: AssetRecord | UploadedImage): Promise<void>;
  updateImageRecord(
    id: string,
    changes: Partial<AssetRecord & UploadedImage>,
  ): Promise<number>;
}

export interface LocalDBSyncStore extends LocalDBSyncApi {
  readonly name: string;
  cards: QueryableTable<Card, string>;
  folders: QueryableTable<Folder, string>;
  cardSets: QueryableTable<CardSet, string>;
  documents: QueryableTable<Document, string>;
  tagRecords: QueryableTable<TagRecord, string>;
  images: QueryableTable<AssetRecord | UploadedImage, string>;
  userSettings: QueryableTable<UserSettings, string>;
  userStats: QueryableTable<UserStats, string>;
  levelHistories: QueryableTable<Record<string, unknown>, string>;
  deviceMeta: QueryableTable<Record<string, unknown>, string>;
  syncErrors: QueryableTable<SyncError, string>;
  syncHistory: QueryableTable<SyncHistory, string>;
  syncSettings: QueryableTable<SyncSettings, string>;
  syncQueue: QueryableTable<SyncQueueItem, string>;
  conflicts: QueryableTable<SyncConflict, string>;
  metadata: QueryableTable<Record<string, unknown>, string>;

  table<T extends object, TKey = string>(
    name: string,
  ): QueryableTable<T, TKey>;
  transaction<T>(mode: string, ...args: unknown[]): Promise<T>;
  isOpen(): boolean;
  close(): void;

  listCardsByUser(userId: string): Promise<Card[]>;
  listFoldersByUser(userId: string): Promise<Folder[]>;
  listCardSetsByUser(userId: string): Promise<CardSet[]>;
  addCardSet(cardSet: CardSet): Promise<void>;
  updateCardById(id: string, changes: Partial<Card>): Promise<number>;
  runSyncTransaction<T>(scope: () => Promise<T>): Promise<T>;
  clearSyncTables(tables: readonly SyncableEntityTable[]): Promise<void>;
  putSyncRecord<TTable extends SyncableEntityTable>(
    table: TTable,
    data: LocalDBTableMap[TTable],
  ): Promise<void>;
}

export type LocalDBLike = LocalDBSyncStore;
export type LocalDBInstance = LocalDBSyncStore;
