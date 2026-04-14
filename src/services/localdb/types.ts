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
import type { InMemoryLocalDB } from "@/services/InMemoryLocalDB";
import type {
  DeleteEntity,
  UpsertEntity,
} from "@/application/usecases/syncQueuePayloadGuards";
import type { SyncPayloadByEntity, SyncPriority } from "@/types/domain/sync";
import type { LocalDB } from "./LocalDB";

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

export interface LocalDBSyncApi {
  cards: { count(): Promise<number> };
  folders: { count(): Promise<number> };

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

export type LocalDBLike = (LocalDB | InMemoryLocalDB) & LocalDBSyncStore;
export type LocalDBInstance = LocalDBLike;
