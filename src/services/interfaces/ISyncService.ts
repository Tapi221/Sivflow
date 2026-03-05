import type { SyncContextSource, NetworkStatus } from "../../types/telemetry";
import type { SyncResult } from "../../types/sync";

/**
 * JSONっぽい値を表現したい時用（ログ/永続化/ネットワーク境界で便利）
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export type SyncTaskType = "upload" | "download";
export type SyncEntity = "card" | "folder" | "userSetting" | "asset";
export type SyncPriority = "critical" | "high" | "medium" | "low";
export type SyncOperationType = "create" | "update" | "delete";

export type MergeStrategy = "server_wins" | "client_wins" | "manual";

/**
 * Domain Entities
 * - payload は境界が広いので unknown をデフォルトにする（ここを any にすると全部崩壊する）
 * - 必要になったら SyncTask<YourPayload> で具体化していけばOK
 */
export interface SyncTask<TPayload = unknown> {
  id: string;

  // Legacy / compatibility fields
  idempotencyKey?: string;
  targetId?: string;
  operationType?: SyncOperationType;

  type: SyncTaskType;
  entity: SyncEntity;

  payload: TPayload;

  priority: SyncPriority;
  createdAt: number; // epoch ms
}

export interface BatchConstraint {
  maxSize: number;
  concurrency: number;
  timeoutMs: number;
}

// 1. Network Monitor Interface
export interface INetworkMonitor {
  readonly status: NetworkStatus;
  getBatchConstraint(context: SyncContextSource): BatchConstraint;
  reportResult(success: boolean, durationMs: number): void;
  subscribe(callback: (status: NetworkStatus) => void): () => void;
}

// 2. Queue Manager Interface
export interface IQueueManager {
  enqueue(task: SyncTask): Promise<void>;
  peekBatch(constraint: BatchConstraint): Promise<SyncTask[]>;
  complete(taskIds: string[]): Promise<void>;
  fail(taskIds: string[], reason: string, retryable: boolean): Promise<void>;
  getQueueDepth(): Promise<number>;
}

/**
 * フォルダ循環検出に必要な最小形
 * 実体の Folder 型がもっと色々持ってても OK なように拡張許容にしておく
 */
export interface FolderLike {
  id: string;
  parentId?: string | null;
  [key: string]: unknown;
}

// 3. Diff Engine Interface
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

/**
 * サーバー差分の1件。形はバックエンド仕様に寄るので「壊れにくい」Recordで受ける。
 * 後で運用が固まったらちゃんと厳密化すればいい。
 */
export type SyncChange = Record<string, unknown>;

// 4. Cloud Sync Adapter Interface
export interface ICloudSyncAdapter {
  pullDiff(
    since: number,
  ): Promise<{ changes: SyncChange[]; serverTime: number }>;

  pushBatch(
    changes: SyncChange[],
  ): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown }>;

  pullFull(entityIds: string[]): Promise<unknown[]>;
}

/**
 * 同期統計（UI/診断で欲しい最小単位）
 */
export interface SyncStats {
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  lastServerTime?: number;

  lastErrorMessage?: string;
  lastErrorCode?: string;

  avgDurationMs?: number;
  recentSuccessRate?: number; // 0..1
  queueDepth?: number;
}

/**
 * 未解決競合（解決UIの足場）
 */
export interface SyncConflict {
  id: string;
  entity: SyncEntity;
  targetId: string;

  local: unknown;
  remote: unknown;

  createdAt: number;
  updatedAt?: number;
}

/**
 * 設定スナップショット（Legacy互換）
 */
export interface UserSettingsSnapshot {
  version?: number;
  updatedAt?: number;
  data: Record<string, unknown>;
}

/**
 * キュー処理のエラー表現（ログ/表示用）
 */
export interface SyncProcessingError {
  taskId?: string;
  message: string;
  retryable?: boolean;
  cause?: unknown;
}

/**
 * セキュリティ監視用
 */
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

// 5. Sync Orchestrator Interface (Main Service)
export interface ISyncService {
  /**
   * 明示的な同期要求 (レガシー互換)
   */
  synchronize(onProgress?: (msg: string) => void): Promise<SyncResult>;

  /**
   * 同期を実行 (V2 形式)
   */
  sync(source: SyncContextSource): Promise<void>;

  /**
   * 起動時同期を実行（Pullファースト）
   */
  performStartupSync(): Promise<void>;

  /**
   * 状態監視
   */
  getQueueStatus(): Promise<{ pending: number; isSyncing: boolean }>;

  /**
   * 強制フル同期（トラブルシューティング用）
   */
  forceFullResync(): Promise<void>;

  /**
   * デバイス管理: 解除
   */
  removeDevice(deviceId: string): Promise<void>;

  /**
   * デバイス管理: 名前更新
   */
  updateDeviceName(deviceId: string, newName: string): Promise<void>;

  /**
   * 非アクティブ端末のクリーンアップ
   */
  cleanupInactiveDevices(): Promise<number>;

  /**
   * 同期統計の取得
   */
  getSyncStats(): Promise<SyncStats>;

  /**
   * 未解決の競合を取得
   */
  getUnresolvedConflicts(): Promise<SyncConflict[]>;

  /**
   * 設定読み込み (Legacy互換)
   */
  loadSettings(): Promise<UserSettingsSnapshot>;

  /**
   * フル同期実行 (Legacy互換)
   */
  performFullSync(): Promise<void>;

  /**
   * キュー処理実行 (Legacy互換)
   */
  processQueue(): Promise<{ processed: number; errors: SyncProcessingError[] }>;

  /**
   * セキュリティ状態の監視開始
   * @returns 監視停止（unsubscribe）関数
   */
  monitorSecurity(callback: (state: SecurityState) => void): () => void;

  /**
   * セキュリティアラートを既読にする
   */
  dismissSecurityAlert(alertId: string): Promise<void>;
}
