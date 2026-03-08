/**
 * 同期システムの高度な型定義
 * 可観測性・回復性・主導権を備えた分散同期システム用
 */

/**
 * SyncError - エラーライフサイクル管理
 * 同一エラーIDを更新し、retryCountで履歴を追跡
 */
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

/**
 * SyncHistory - 同期履歴
 * 各同期操作の結果を記録
 */
export interface SyncHistory {
  id: string;
  startedAt: number;
  finishedAt: number;
  result: "success" | "partial" | "failed" | "skipped_wifi";
  uploaded: number;
  downloaded: number;
}

/**
 * SyncSettings - ユーザー設定
 * 同期動作のカスタマイズ
 */
export interface SyncSettings {
  id: string; // 'default'
  autoSync: boolean;
  intervalMinutes: 5 | 15 | 30 | 60;
  wifiOnly: boolean;
  autoCleanupDevices: boolean; // 60日以上非アクティブな端末を自動整理
}

/**
 * SyncQueueItem - オフラインキュー（FIFO）
 * オフライン時の変更を順序を保持して保存
 */
export interface SyncQueueItem {
  id: string; // Queue ID
  idempotencyKey: string; // Idempotency Key for Cloud Functions

  targetId: string; // Entity ID (Card ID, etc.)
  entity: "card" | "folder" | "asset";
  operationType: "create" | "update" | "delete"; // Unified operation type
  type: "upload" | "download"; // Added for compatibility with SyncTask

  // Legacy compatibility: action field is deprecated but kept if needed for migration
  action?: "create" | "update" | "delete";

  payload: unknown;
  priority: "critical" | "high" | "medium" | "low";

  createdAt: number;
  updatedAt: number;

  status: "pending" | "processing" | "completed" | "failed";
  retryCount: number;
  nextRetryAt?: number;
  lastRetryAt?: number; // Added
  lastError?: string;
  processingStartedAt?: number; // Added for orphan detection

  // Legacy fields (kept for migration safety, can be removed later)
  clientSeq?: number;
  migrationKey?: string;
}

/**
 * SyncConflict - 競合情報
 * フィールド単位の競合を保存し、手動解決をサポート
 */
export interface SyncConflict {
  id: string;
  entityId: string;
  entityType: "card" | "folder";
  autoMerged: unknown;
  conflicts: Record<string, { local: unknown; remote: unknown }>;
  detectedAt: number;
}

/**
 * DiffResult - 差分検出結果
 * 2-way merge（base=local）の結果を表現
 */
export interface DiffResult {
  autoMerged: unknown;
  conflicts: Record<string, { local: unknown; remote: unknown }>;
}

/**
 * SyncResult - 同期操作の結果
 */
export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
}

/**
 * デフォルトの同期設定
 */
export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  id: "default",
  autoSync: true,
  intervalMinutes: 5,
  wifiOnly: false,
  autoCleanupDevices: true,
};




