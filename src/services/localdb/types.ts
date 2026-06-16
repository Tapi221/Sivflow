import type { CardRelation, LocalDBInstance, LocalDBLike as BaseLocalDBLike, LocalDBSyncApi, LocalDBTableMap, ProjectMap, QueryableCollection, QueryableKeyPath, QueryableTable, QueryableWhereClause, QueryableWhereFunction, SyncableEntityTable, TagRecord } from "./localdb.types";
import type { Card, Folder } from "@/types";
import type { SyncConflict, SyncQueueItem, SyncSettings } from "@/types/domain/sync";



type LocalDBLike = BaseLocalDBLike & {
  table<T extends object = Record<string, unknown>, TKey = string>(name: string): QueryableTable<T, TKey>;
  transaction<T>(mode: string, first: unknown, ...rest: unknown[]): Promise<T>;
  close(): void;
  addItem(table: string, item: unknown, skipSync?: boolean): Promise<string>;
  updateItem(table: string, id: string, changes: Record<string, unknown>, skipSync?: boolean): Promise<number>;
  deleteItem(table: string, id: string): Promise<void>;
  softDelete(table: string, id: string): Promise<number>;
  restore(table: string, id: string): Promise<number>;
  clearTable(table: string): Promise<void>;
  bulkUpsert(table: string, items: unknown[], skipSync?: boolean): Promise<void>;
  cleanupSyncHistory(): Promise<void>;
  cleanupSyncErrors(): Promise<void>;
  getAllCards(): Promise<Card[]>;
  getAllFolders(): Promise<Folder[]>;
  getConflict(id: string): Promise<SyncConflict | undefined>;
  removeConflict(id: string): Promise<void>;
  metadata: QueryableTable<Record<string, unknown>, string>;
  levelHistories: QueryableTable<Record<string, unknown>, string>;
  deviceMeta: QueryableTable<Record<string, unknown>, string>;
  cardRelations: QueryableTable<Record<string, unknown>, string>;
  projectMaps: QueryableTable<ProjectMap, string>;
  studyLogs: QueryableTable<Record<string, unknown>, string>;
  syncQueue: QueryableTable<SyncQueueItem, string>;
  syncSettings: QueryableTable<SyncSettings, string>;
};
type LocalDBSyncStore = LocalDBLike;

export type { CardRelation, LocalDBInstance, LocalDBLike, LocalDBSyncApi, LocalDBSyncStore, LocalDBTableMap, ProjectMap, QueryableCollection, QueryableKeyPath, QueryableTable, QueryableWhereClause, QueryableWhereFunction, SyncableEntityTable, TagRecord };
