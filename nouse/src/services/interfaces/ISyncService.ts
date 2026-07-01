import type { SyncConflict as DomainSyncConflict, SyncEntity, SyncResult } from "@/types/domain/sync";
import type { NetworkStatus, SyncContextSource } from "@/types/domain/telemetry";



type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonObject = {
  [key: string]: JsonValue; };
type JsonArray = JsonValue[];
type SyncTaskType = "upload" | "download";
type SyncPriority = "critical" | "high" | "medium" | "low";
type SyncOperationType = "create" | "update" | "delete";
type MergeStrategy = "server_wins" | "client_wins" | "manual";
type CloudDeviceStatus = "active" | "revoked" | "unknown";
type SyncConflict = Pick<DomainSyncConflict, "id"> & { entity: DomainSyncConflict["entityType"];
  targetId: DomainSyncConflict["entityId"];
  local: unknown;
  remote: unknown;
  createdAt: DomainSyncConflict["detectedAt"];
};
interface SyncTask<TPayload = unknown> {
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
interface BatchConstraint {
  maxSize: number;
  concurrency: number;
  timeoutMs: number;
}
interface INetworkMonitor {
  readonly status: NetworkStatus;
  getBatchConstraint(context: SyncContextSource): BatchConstraint;
  reportResult(success: boolean, durationMs: number): void;
  subscribe(callback: (status: NetworkStatus) => void): () => void;
}
interface IQueueManager {
  enqueue(task: SyncTask): Promise<void>;
  peekBatch(constraint: BatchConstraint): Promise<SyncTask[]>;
  complete(taskIds: string[]): Promise<void>;
  fail(taskIds: string[], reason: string, retryable: boolean): Promise<void>;
  getQueueDepth(): Promise<number>;
}
interface FolderLike {
  id: string;
  parentId?: string | null;
  parentFolderId?: string | null;
}
interface IDiffEngine {
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
type SyncChange = Record<string, unknown>;
interface ICloudSyncAdapter {
  pullDiff(since: number,): Promise<{ changes: SyncChange[]; serverTime: number; }>;
  pushBatch(
    changes: SyncChange[],
  ): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown; }>;
  pullFull(entityIds: string[]): Promise<unknown[]>;
  getDeviceStatus(deviceId: string): Promise<CloudDeviceStatus>;
  revokeDevice(deviceId: string): Promise<void>;
  updateDeviceName(deviceId: string, newName: string): Promise<void>;
  cleanupInactiveDevices(): Promise<number>;
}
interface SyncStats {
  isSyncing?: boolean;
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  lastServerTime?: number;
  lastErrorMessage?: string;
  lastErrorCode?: string;
  avgDurationMs?: number;
  recentSuccessRate?: number;
  queueDepth?: number;
}
interface UserSettingsSnapshot {
  version?: number;
  updatedAt?: number;
  data: Record<string, unknown>;
}
interface SyncProcessingError {
  taskId?: string;
  message: string;
  retryable?: boolean;
  cause?: unknown;
}
interface SecurityAlert {
  id: string;
  type: string;
  createdAt: number;
  message?: string;
  data?: Record<string, unknown>;
}
interface SecurityState {
  isLocked: boolean;
  requires2FA: boolean;
  alerts: SecurityAlert[];
}
interface ISyncService {
  synchronize(onProgress?: (msg: string) => void): Promise<SyncResult>;
  sync(source: SyncContextSource): Promise<void>;
  performStartupSync(): Promise<void>;
  getQueueStatus(): Promise<{ pending: number; isSyncing: boolean; }>;
  forceFullResync(): Promise<void>;
  removeDevice(deviceId: string): Promise<void>;
  updateDeviceName(deviceId: string, newName: string): Promise<void>;
  cleanupInactiveDevices(): Promise<number>;
  getSyncStats(): Promise<SyncStats>;
  getUnresolvedConflicts(): Promise<SyncConflict[]>;
  loadSettings(): Promise<UserSettingsSnapshot>;
  performFullSync(): Promise<void>;
  processQueue(): Promise<{ processed: number; errors: SyncProcessingError[]; }>;
  monitorSecurity(callback: (state: SecurityState) => void): () => void;
  dismissSecurityAlert(alertId: string): Promise<void>;
}

export type { SyncEntity, JsonPrimitive, JsonValue, JsonObject, JsonArray, SyncTaskType, SyncPriority, SyncOperationType, MergeStrategy, CloudDeviceStatus, SyncConflict, SyncTask, BatchConstraint, INetworkMonitor, IQueueManager, FolderLike, IDiffEngine, SyncChange, ICloudSyncAdapter, SyncStats, UserSettingsSnapshot, SyncProcessingError, SecurityAlert, SecurityState, ISyncService };
