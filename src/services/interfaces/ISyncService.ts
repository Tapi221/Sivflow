import type { SyncContextSource, NetworkStatus } from '../../types/telemetry';
import type { SyncResult } from '../../types/sync';

// Domain Entities
export interface SyncTask {
  id: string;
  idempotencyKey?: string; // Added for compatibility
  targetId?: string;       // Added for compatibility
  operationType?: 'create' | 'update' | 'delete'; // Added for compatibility
  
  type: 'upload' | 'download';
  entity: 'card' | 'folder' | 'userSetting';
  payload: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: number;
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

// 3. Diff Engine Interface
export interface IDiffEngine {
  calculateDiff(local: any, remote: any): any | null;
  merge(local: any, remote: any, strategy: 'server_wins' | 'client_wins' | 'manual'): {
    merged: any;
    conflict: boolean;
  };
  validateConsistency(local: any, remote: any): boolean;
  detectCycle(targetId: string, newParentId: string | null, allFolders: any[]): boolean;
}

// 4. Cloud Sync Adapter Interface
export interface ICloudSyncAdapter {
  pullDiff(since: number): Promise<{ changes: any[], serverTime: number }>;
  pushBatch(changes: any[]): Promise<{ successIds: string[], failedIds: string[], error?: any }>;
  pullFull(entityIds: string[]): Promise<any[]>;
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
  getSyncStats(): Promise<any>;

  /**
   * 未解決の競合を取得
   */
  getUnresolvedConflicts(): Promise<any[]>;

  /**
   * 設定読み込み (Legacy互換)
   */
  loadSettings(): Promise<any>;

  /**
   * フル同期実行 (Legacy互換)
   */
  performFullSync(): Promise<void>;

  /**
   * キュー処理実行 (Legacy互換)
   */
  processQueue(): Promise<{ processed: number; errors: any[] }>;

  /**
   * セキュリティ状態の監視開始
   * @returns 監視停止（unsubscribe）関数
   */
  monitorSecurity(callback: (state: { isLocked: boolean; requires2FA: boolean; alerts: any[] }) => void): () => void;

  /**
   * セキュリティアラートを既読にする
   */
  dismissSecurityAlert(alertId: string): Promise<void>;
}
