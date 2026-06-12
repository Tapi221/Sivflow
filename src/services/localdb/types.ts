import type { CardRelation, LocalDBInstance, LocalDBLike as BaseLocalDBLike, LocalDBSyncApi, LocalDBTableMap, ProjectMap, QueryableCollection, QueryableKeyPath, QueryableTable, QueryableWhereClause, QueryableWhereFunction, SyncableEntityTable, TagRecord } from "./localdb.types";
import type { SyncConflict } from "@/types/domain/sync";

type LocalDBLike = BaseLocalDBLike & {
  table<T extends object = Record<string, unknown>, TKey = string>(name: string): QueryableTable<T, TKey>;
  transaction<T>(mode: string, first: unknown, ...rest: unknown[]): Promise<T>;
  close(): void;
  cleanupSyncHistory(): Promise<void>;
  cleanupSyncErrors(): Promise<void>;
  getConflict(id: string): Promise<SyncConflict | undefined>;
  removeConflict(id: string): Promise<void>;
  metadata: QueryableTable<Record<string, unknown>, string>;
  levelHistories: QueryableTable<Record<string, unknown>, string>;
  deviceMeta: QueryableTable<Record<string, unknown>, string>;
  cardRelations: QueryableTable<Record<string, unknown>, string>;
  projectMaps: QueryableTable<ProjectMap, string>;
  studyLogs: QueryableTable<Record<string, unknown>, string>;
};
type LocalDBSyncStore = LocalDBLike;

export type { CardRelation, LocalDBInstance, LocalDBLike, LocalDBSyncApi, LocalDBSyncStore, LocalDBTableMap, ProjectMap, QueryableCollection, QueryableKeyPath, QueryableTable, QueryableWhereClause, QueryableWhereFunction, SyncableEntityTable, TagRecord };
