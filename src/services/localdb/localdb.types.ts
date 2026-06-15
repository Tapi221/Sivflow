import type { DeleteEntity, UpsertEntity } from "@/application/usecases/syncQueuePayloadGuards";
import type { AssetRecord, Card, CardSet, DocumentItem as Document, Folder, Note, SyncConflict, SyncError, SyncHistory, SyncSettings, UploadedImage, UserSettings, UserStats } from "@/types";
import type { SyncPayloadByEntity, SyncPriority } from "@/types/domain/sync";



type CardRelation = {
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
type ProjectMap = {
  id: string;
  userId: string;
  folderId?: string;
  name?: string;
  updatedAt?: Date;
  createdAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  [key: string]: unknown;
};
type TagRecord = {
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
  orderIndex?: number;
};
type DocumentFileRecord = {
  id: string;
  blob: Blob;
  updatedAt: number;
};
type LocalDBTableMap = {
  cards: Card;
  folders: Folder;
  cardSets: CardSet;
  documents: Document;
  notes: Note;
  tagRecords: TagRecord;
  images: AssetRecord | UploadedImage;
  userSettings: UserSettings;
  userStats: UserStats;
  projectMaps: ProjectMap;
};
type SyncableEntityTable = keyof LocalDBTableMap;
type QueryableKeyPath = string | string[];
interface QueryableCollection<T extends object, TKey = string> {
  equals(value: unknown): QueryableCollection<T, TKey>;
  and(predicate: (item: T) => boolean): QueryableCollection<T, TKey>;
  filter(predicate: (item: T) => boolean): QueryableCollection<T, TKey>;
  reverse(): QueryableCollection<T, TKey>;
  limit(limit: number): QueryableCollection<T, TKey>;
  toArray(): Promise<T[]>;
  first(): Promise<T | undefined>;
  count(): Promise<number>;
  delete(): Promise<number>;
  modify(changes: Partial<T> | ((item: T, ctx?: { value: T; primKey: TKey; }) => boolean | void)): Promise<number>;
  sortBy(field: keyof T | string): Promise<T[]>;
  primaryKeys(): Promise<TKey[]>;
  each(callback: (item: T, cursor?: { primaryKey: TKey; }) => void | Promise<void>): Promise<void>;
}
interface QueryableWhereClause<T extends object, TKey = string> {
  equals(value: unknown): QueryableCollection<T, TKey>;
  above(value: unknown): QueryableCollection<T, TKey>;
  aboveOrEqual(value: unknown): QueryableCollection<T, TKey>;
  below(value: unknown): QueryableCollection<T, TKey>;
  belowOrEqual(value: unknown): QueryableCollection<T, TKey>;
  between(lowerValue: unknown, upperValue: unknown, includeLower?: boolean, includeUpper?: boolean): QueryableCollection<T, TKey>;
  startsWith(prefix: string): QueryableCollection<T, TKey>;
  anyOf(values: readonly unknown[]): QueryableCollection<T, TKey>;
}
type QueryableWhereFunction<T extends object, TKey = string> = { (criteria: { [key: string]: unknown; }): QueryableCollection<T, TKey>;
  (index: QueryableKeyPath): QueryableWhereClause<T, TKey>;
  equals(value: unknown): QueryableCollection<T, TKey>;
};
interface QueryableTable<T extends object, TKey = string> {
  count(): Promise<number>;
  get(key: unknown): Promise<T | undefined>;
  put(record: T): Promise<unknown>;
  add(record: T): Promise<unknown>;
  update(key: unknown, changes: Partial<T> | Record<string, unknown> | ((item: T, ctx?: { value: T; primKey: TKey; }) => boolean | void)): Promise<number>;
  delete(key: unknown): Promise<void>;
  clear(): Promise<void>;
  toArray(): Promise<T[]>;
  where: QueryableWhereFunction<T, TKey>;
  filter(predicate: (item: T) => boolean): QueryableCollection<T, TKey>;
  orderBy(index: QueryableKeyPath): QueryableCollection<T, TKey>;
  toCollection(): QueryableCollection<T, TKey>;
  bulkDelete(keys: readonly unknown[]): Promise<void>;
  bulkPut(items: readonly T[]): Promise<unknown>;
  bulkGet(keys: readonly unknown[]): Promise<Array<T | undefined>>;
}
interface LocalDBSyncApi {
  cards: QueryableTable<Card, string>;
  folders: QueryableTable<Folder, string>;
  notes: QueryableTable<Note, string>;

  getItem<TTable extends SyncableEntityTable>(table: TTable, id: string): Promise<LocalDBTableMap[TTable] | undefined>;
  getAllItems<TTable extends SyncableEntityTable>(table: TTable): Promise<Array<LocalDBTableMap[TTable]>>;
  getDirtyItems<TTable extends SyncableEntityTable>(table: TTable, userId: string, lastSyncTime: Date): Promise<Array<LocalDBTableMap[TTable]>>;
  upsert<TTable extends SyncableEntityTable>(tableName: TTable, data: LocalDBTableMap[TTable], skipSync?: boolean): Promise<void>;
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
}
type LocalDBInstance = LocalDBSyncApi;
type LocalDBLike = LocalDBSyncApi & { cardSets: QueryableTable<CardSet, string>;
  documents: QueryableTable<Document, string>;
  tagRecords: QueryableTable<TagRecord, string>;
  documentFiles: QueryableTable<DocumentFileRecord, string>;
  images: QueryableTable<AssetRecord | UploadedImage, string>;
  userSettings: QueryableTable<UserSettings, string>;
  syncErrors: QueryableTable<SyncError, string>;
  conflicts: QueryableTable<SyncConflict, string>;

  transaction<T>(mode: string, ...args: unknown[]): Promise<T>;
  close(): void;
  delete(): Promise<void>;
  runSyncTransaction<T>(scope: () => Promise<T>): Promise<T>;
  clearSyncTables(tables: readonly SyncableEntityTable[]): Promise<void>;
  putSyncRecord<TTable extends SyncableEntityTable>(
    table: TTable,
    data: LocalDBTableMap[TTable],
  ): Promise<void>;
  getQueuedItemsOldestFirst(): Promise<import("@/types/domain/sync").SyncQueueItem[]>;
  removeSyncQueueItem(id: string): Promise<void>;
  putSyncQueueItem(item: import("@/types/domain/sync").SyncQueueItem): Promise<void>;
  getConflict(id: string): Promise<SyncConflict | undefined>;
  getConflicts(): Promise<SyncConflict[]>;
  putConflict(conflict: SyncConflict): Promise<void>;
  removeConflict(id: string): Promise<void>;
  listCardsByUser(userId: string): Promise<Card[]>;
  listFoldersByUser(userId: string): Promise<Folder[]>;
  listCardSetsByUser(userId: string): Promise<CardSet[]>;
  addCardSet(cardSet: CardSet): Promise<void>;
  updateCardById(id: string, changes: Partial<Card>): Promise<number>;
  setSyncTrigger(trigger: () => void): void;
};

export type { CardRelation, ProjectMap, TagRecord, LocalDBTableMap, SyncableEntityTable, QueryableKeyPath, QueryableCollection, QueryableWhereClause, QueryableWhereFunction, QueryableTable, LocalDBSyncApi, LocalDBInstance, LocalDBLike };
