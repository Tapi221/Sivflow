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

export interface SyncMetadata {
  userId: string;
  deviceId: string;
  deviceName: string;
  lastSyncTime: Date | Timestamp | null;
  lastHighResSync: Date | Timestamp | null;
  isActive: boolean;
}

export interface SyncError {
  id: string;
  occurredAt: number;
  phase: "upload" | "download" | "merge" | "queue_dlq";
  message: string;
  stack?: string;
  retryCount: number;
  retryable: boolean;
  metadata?: unknown;
}

export interface SyncHistory {
  id: string;
  startedAt: number;
  finishedAt: number;
  result: "success" | "partial" | "failed" | "skipped_wifi";
  uploaded: number;
  downloaded: number;
}

export interface SyncSettings {
  id: string;
  autoSync: boolean;
  intervalMinutes: 5 | 15 | 30 | 60;
  wifiOnly: boolean;
  autoCleanupDevices: boolean;
}

export type SyncEntity =
  | "card"
  | "folder"
  | "cardSet"
  | "document"
  | "tag"
  | "userSetting"
  | "asset";

export type SyncOperationType = "create" | "update" | "delete";
export type SyncDirection = "upload" | "download";
export type SyncPriority = "critical" | "high" | "medium" | "low";
export type SyncQueueStatus = "pending" | "processing" | "completed" | "failed";

export type AssetSyncPayload = Pick<AssetRecord, "id"> &
  Partial<Omit<AssetRecord, "id">>;

export type TagSyncPayload = {
  id: string;
  userId: string;
  name: string;
  nameLower: string;
  color: string;
  updatedAt: Date;
  categoryId?: string;
  parentId?: string;
};

export type SyncPayloadByEntity = {
  card: Card;
  folder: Folder;
  cardSet: CardSet;
  document: Document;
  tag: TagSyncPayload;
  userSetting: UserSettings;
  asset: AssetSyncPayload;
};

export type SyncDeletePayload = { id: string };

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
  | "asset";

type SyncDeleteQueueItem<TEntity extends SyncDeleteEntity> = SyncQueueItemBase<
  TEntity,
  "delete",
  SyncDeletePayload
>;

export type SyncQueueItem =
  | SyncUpsertQueueItem<"card">
  | SyncUpsertQueueItem<"folder">
  | SyncUpsertQueueItem<"cardSet">
  | SyncUpsertQueueItem<"document">
  | SyncUpsertQueueItem<"tag">
  | SyncUpsertQueueItem<"userSetting">
  | SyncUpsertQueueItem<"asset">
  | SyncDeleteQueueItem<"card">
  | SyncDeleteQueueItem<"folder">
  | SyncDeleteQueueItem<"cardSet">
  | SyncDeleteQueueItem<"document">
  | SyncDeleteQueueItem<"tag">
  | SyncDeleteQueueItem<"asset">;

export interface SyncConflict {
  id: string;
  entityId: string;
  entityType: SyncEntity;
  autoMerged: unknown;
  conflicts: Record<string, { local: unknown; remote: unknown }>;
  detectedAt: number;
}

export interface DiffResult {
  autoMerged: unknown;
  conflicts: Record<string, { local: unknown; remote: unknown }>;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
}

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  id: "default",
  autoSync: true,
  intervalMinutes: 5,
  wifiOnly: false,
  autoCleanupDevices: true,
};
