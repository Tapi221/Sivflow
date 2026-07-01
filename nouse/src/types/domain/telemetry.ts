type SecurityEventType = | "LOGIN_SUCCESS" | "LOGIN_FAILED" | "DEVICE_REVOKED" | "ACCESS_DENIED_REVOKED" | "SYNC_AUTH_ERROR" | "SENSITIVE_OP_REVOKED" | "DEVICE_NEW_REGISTER" | "LOCK_CONTENTION_EXCESS" | "SYNC_CONFLICT_EXCESS" | "ADMIN_DEVICE_REVOKE" | "ADMIN_ACCOUNT_LOCK" | "ADMIN_LOG_EXPORT";
type LogLevel = "debug" | "info" | "warn" | "error";
type SyncContextSource = | "user_initiated" | "background" | "periodic" | "force_resync" | "system";
type NetworkStatus = "excellent" | "good" | "poor" | "offline";
type TelemetryEventName = | "startup_degraded" | "sanitize_blob_url_from_cloud" | "rebuild_item_failed" | "rebuild_partial_failures";
interface LogContext {
  userId?: string;
  deviceId?: string;
  networkStatus?: NetworkStatus;
  syncContext?: SyncContextSource;
  batteryLevel?: number;
  isBackground?: boolean;
  [key: string]: unknown;
}
// System SLIs (Technical Health)
interface SystemMetrics {
  syncAvailability: number; // 1 = success, 0 = 5xx error
  throughput: number; // records / sec
  memoryUsage?: number; // MB
}
// User Experience SLIs (Perceived Quality)
interface UserMetrics {
  perceivedLatency: number; // ms (Action to UI feedback)
  consistencyRate: number; // 1 = consistent, 0 = inconsistent
  isSilentFailure: boolean; // true if failed without user notification
}
interface SyncLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  eventName?: TelemetryEventName;
  context: LogContext;
  error?: Error;
  metrics?: SystemMetrics | UserMetrics;

  // Fallback Tracking
  fallbackReason?:
  | "version_mismatch"
  | "conflict_unresolvable"
  | "checksum_error";
  isFallback?: boolean;
}
interface ITelemetryService {
  log(level: LogLevel, message: string, context?: LogContext, error?: Error,): void;
  logEvent(
    eventName: TelemetryEventName,
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void;
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void;
  startTransaction(name: string): {
    end: (status: "success" | "failure") => void;
  };
}
interface SecurityMetadata {
  ipAddress?: string; // (serverのみ信頼可能)
  userAgent?: string;
  path?: string; // アクセスしようとしたリソース
  reason?: string; // エラー詳細
  [key: string]: unknown;
}
interface SecurityLog {
  logId: string; // UUID
  userId: string;
  deviceId: string; // アクセス元デバイスID (不明な場合は 'unknown')
  deviceName?: string; // 記録時点でのデバイス名

  eventType: SecurityEventType;
  severity: "info" | "warning" | "critical";
  source: "client" | "server"; // ログの信頼度区分 (client=参考値, server=確定事実)
  isUserVisible: boolean; // UIに表示するかどうか

  description: string; // ログ詳細（日本語可）
  metadata?: SecurityMetadata;

  occurredAt: unknown; // Timestamp or Date
}

export type { SecurityEventType, LogLevel, SyncContextSource, NetworkStatus, TelemetryEventName, LogContext, SystemMetrics, UserMetrics, SyncLogEntry, ITelemetryService, SecurityMetadata, SecurityLog };
