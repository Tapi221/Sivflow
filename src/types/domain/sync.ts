import type { Timestamp } from "firebase/firestore";
import type { AssetRecord } from "./assets";
import type { Card } from "./card";
import type { CardSet } from "./cardSet";
import type { Document } from "./document";
import type { Folder } from "./folder";
import type { UserSettings } from "./user";



/**
 * 同期システムの型定義
 */
interface SyncMetadata {
  userId: string;
  deviceId: string;
  deviceName: string;
  lastSyncTime: Date | Timestamp | null;
  lastHighResSync: Date | Timestamp | null;
  isActive: boolean;
}
interface SyncError {
  id: string;
  occurredAt: number;
  phase: "upload" | "download" | "merge" | "queue_dlq";
  message: string;
  stack?: string;
  retryCount: number;
  retryable: boolean;
  metadata?: unknown;
}
interface SyncHistory {
  id: string;
  startedAt: number;
  finishedAt: number;
  result: "success" | "partial" | "failed" | "skipped_wifi";
  uploaded: number;
  downloaded: number;
}
interface SyncSettings {
  id: string;
  autoSync: boolean;
  intervalMinutes: 5 | 15 | 30 | 60;
  wifiOnly: boolean;
  autoCleanupDevices: boolean;
}
type SyncEntity = | "card" | "folder" | "cardSet" | "document" | "tag" | "userSetting" | "asset" | "projectMap";
type SyncOperationType = "create" | "update" | "delete";
type SyncDirection = "upload" | "download";
type SyncPriority = "critical" | "high" | "medium" | "low";
type SyncQueueStatus = "pending" | "processing" | "completed" | "failed";
type AssetSyncPayload = Pick<AssetRecord, "id"> & Partial<Omit<AssetRecord, "id">>;
type ProjectMapSyncPayload = {
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
type TagSyncPayload = {
  id: string;
  userId: string;
  name: string;
  nameLower: string;
  color: string;
  updatedAt: Date;
  createdAt?: Date;
  deviceId?: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  categoryId?: string;
  parentId?: string;
  orderIndex?: number;
};
type SyncPayloadByEntity = {
  card: Card;
  folder: Folder;
  cardSet: CardSet;
  document: Document;
  tag: TagSyncPayload;
  userSetting: UserSettings;
  asset: AssetSyncPayload;
  projectMap: ProjectMapSyncPayload;
};
type SyncDeletePayload = {
  id: string; };
interface SyncQueueItemBase<
  TEntity extends SyncEntity,
  TOperation extends SyncOperationType,
  TPayload,
> {
  id: string;
  idempotencyKey: string;

  targetId: string;
  entity: TEntity;
  operationType: TOperation;
  type: SyncDirection;

  action?: TOperation;

  payload: TPayload;
  priority: SyncPriority;

  createdAt: number;
  updatedAt: number;

  status: SyncQueueStatus;
  retryCount: number;
  nextRetryAt?: number;
  lastRetryAt?: number;
  lastError?: string;
  processingStartedAt?: number;

  clientSeq?: number;
  migrationKey?: string;
}
type SyncUpsertQueueItem<TEntity extends keyof SyncPayloadByEntity> =
  SyncQueueItemBase<TEntity, "create" | "update", SyncPayloadByEntity[TEntity]>;
type SyncDeleteEntity =
  | "card"
  | "folder"
  | "cardSet"
  | "document"
  | "tag"
  | "asset"
  | "projectMap";
type SyncDeleteQueueItem<TEntity extends SyncDeleteEntity> = SyncQueueItemBase<
  TEntity,
  "delete",
  SyncDeletePayload
>;
type SyncQueueItem = | SyncUpsertQueueItem<"card"> | SyncUpsertQueueItem<"folder"> | SyncUpsertQueueItem<"cardSet"> | SyncUpsertQueueItem<"document"> | SyncUpsertQueueItem<"tag"> | SyncUpsertQueueItem<"userSetting"> | SyncUpsertQueueItem<"asset"> | SyncUpsertQueueItem<"projectMap"> | SyncDeleteQueueItem<"card"> | SyncDeleteQueueItem<"folder"> | SyncDeleteQueueItem<"cardSet"> | SyncDeleteQueueItem<"document"> | SyncDeleteQueueItem<"tag"> | SyncDeleteQueueItem<"asset"> | SyncDeleteQueueItem<"projectMap">;
interface SyncConflict {
  id: string;
  entityId: string;
  entityType: SyncEntity;
  autoMerged: unknown;
  conflicts: Record<string, { local: unknown; remote: unknown; }>;
  detectedAt: number;
}
interface DiffResult {
  autoMerged: unknown;
  conflicts: Record<string, { local: unknown; remote: unknown; }>;
}
interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
}



const DEFAULT_SYNC_SETTINGS: SyncSettings = { id: "default", autoSync: true, intervalMinutes: 5, wifiOnly: false, autoCleanupDevices: true };



export { DEFAULT_SYNC_SETTINGS };


export type { SyncMetadata, SyncError, SyncHistory, SyncSettings, SyncEntity, SyncOperationType, SyncDirection, SyncPriority, SyncQueueStatus, AssetSyncPayload, ProjectMapSyncPayload, TagSyncPayload, SyncPayloadByEntity, SyncDeletePayload, SyncQueueItem, SyncConflict, DiffResult, SyncResult };
