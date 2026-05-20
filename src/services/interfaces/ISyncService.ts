import type { SyncResult } from "@/types/domain/sync";
import type {
  NetworkStatus,
  SyncContextSource,
} from "@/types/domain/telemetry";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export type SyncTaskType = "upload" | "download";
export type SyncEntity =
  | "card"
  | "folder"
  | "cardSet"
  | "document"
  | "tag"
  | "userSetting"
  | "asset";
export type SyncPriority = "critical" | "high" | "medium" | "low";
export type SyncOperationType = "create" | "update" | "delete";
export type MergeStrategy = "server_wins" | "client_wins" | "manual";

export interface SyncTask<TPayload = unknown> {
  id: string;
  idempotencyKey?: string;
  targetId?: string;
  operationType?: SyncOperationType;
  type: SyncTaskType;
  entity: SyncEntity;
  payload: TPayload;
  priority: SyncPriority;
  createdAt: number;
}

export interface BatchConstraint {
  maxSize: number;
  concurrency: number;
  timeoutMs: number;
}

export interface INetworkMonitor {
  readonly status: NetworkStatus;
  getBatchConstraint(context: SyncContextSource): BatchConstraint;
  reportResult(success: boolean, durationMs: number): void;
  subscribe(callback: (status: NetworkStatus) => void): () => void;
}

export interface IQueueManager {
  enqueue(task: SyncTask): Promise<void>;
  peekBatch(constraint: BatchConstraint): Promise<SyncTask[]>;
  complete(taskIds: string[]): Promise<void>;
  fail(taskIds: string[], reason: string, retryable: boolean): Promise<void>;
  getQueueDepth(): Promise<number>;
}

export interface FolderLike {
  id: string;
  parentId?: string | null;
  parentFolderId?: string | null;
}

export interface IDiffEngine {
  calculateDiff(local: unknown, remote: unknown): unknown | null;
  merge(
    local: unknown,
    remote: unknown,
    strategy: MergeStrategy,
  ): {
    merged: unknown;
    conflict: boolean;
  };
  validateConsistency(local: unknown, remote: unknown): boolean;
  detectCycle(
    targetId: string,
    newParentId: string | null,
    allFolders: ReadonlyArray<FolderLike>,
  ): boolean;
}

export type SyncChange = Record<string, unknown>;

export interface ICloudSyncAdapter {
  pullDiff(
    since: number,
  ): Promise<{ changes: SyncChange[]; serverTime: number }>;
  pushBatch(
    changes: SyncChange[],
  ): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown }>;
  pullFull(entityIds: string[]): Promise<unknown[]>;
}

export interface SyncStats {
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  lastServerTime?: number;
  lastErrorMessage?: string;
  lastErrorCode?: string;
  avgDurationMs?: number;
  recentSuccessRate?: number;
  queueDepth?: number;
}

export interface SyncConflict {
  id: string;
  entity: SyncEntity;
  targetId: string;
  local: unknown;
  remote: unknown;
  createdAt: number;
  updatedAt?: number;
}

export interface UserSettingsSnapshot {
  version?: number;
  updatedAt?: number;
  data: Record<string, unknown>;
}

export interface SyncProcessingError {
  taskId?: string;
  message: string;
  retryable?: boolean;
  cause?: unknown;
}

export interface SecurityAlert {
  id: string;
  type: string;
  createdAt: number;
  message?: string;
  data?: Record<string, unknown>;
}

export interface SecurityState {
  isLocked: boolean;
  requires2FA: boolean;
  alerts: SecurityAlert[];
}

export interface ISyncService {
  synchronize(onProgress?: (msg: string) => void): Promise<SyncResult>;
  sync(source: SyncContextSource): Promise<void>;
  performStartupSync(): Promise<void>;
  getQueueStatus(): Promise<{ pending: number; isSyncing: boolean }>;
  forceFullResync(): Promise<void>;
  removeDevice(deviceId: string): Promise<void>;
  updateDeviceName(deviceId: string, newName: string): Promise<void>;
  cleanupInactiveDevices(): Promise<number>;
  getSyncStats(): Promise<SyncStats>;
  getUnresolvedConflicts(): Promise<SyncConflict[]>;
  loadSettings(): Promise<UserSettingsSnapshot>;
  performFullSync(): Promise<void>;
  processQueue(): Promise<{ processed: number; errors: SyncProcessingError[] }>;
  monitorSecurity(callback: (state: SecurityState) => void): () => void;
  dismissSecurityAlert(alertId: string): Promise<void>;
}
