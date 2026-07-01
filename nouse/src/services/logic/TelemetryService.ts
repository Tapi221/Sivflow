import type { ITelemetryService, LogContext, LogLevel, SyncLogEntry, TelemetryEventName } from "@/types/domain/telemetry";
import { sanitizeForLog } from "@/utils/logSanitizer";



const TELEMETRY_MESSAGE_LABELS: Record<string, string> = {
  "Sync already in progress, skipping": "同期はすでに実行中のためスキップしました",
  "Sync started": "同期を開始しました",
  "Offline, sync deferred": "オフラインのため同期を延期しました",
  "Network poor, deferring heavy sync": "ネットワーク状態が不安定なため重い同期を延期しました",
  "Sync failed": "同期に失敗しました",
  "Starting startup sync (local replica first)": "起動時同期を開始しました（ローカル複製を優先）",
  "Startup sync deferred by network status": "ネットワーク状態により起動時同期を延期しました",
  "Startup sync failed": "起動時同期に失敗しました",
  "Force replica repair sync initiated": "複製修復のための完全同期を開始しました",
  "Revoking device access": "デバイスのアクセス権を取り消しています",
  "Backing up local changes": "ローカル変更をバックアップしています",
  "Task failed": "同期タスクに失敗しました",
  "Remote replica conflict detected; keeping local record authoritative": "リモート複製の競合を検出しました。ローカル記録を優先します",
  "Circular reference detected during applyRemoteChanges, healing by setting parent to null": "リモート変更適用中に循環参照を検出しました。親を未設定にして修復します",
  "Security Alert: Access attempt from revoked device": "セキュリティ警告: 取り消し済みデバイスからのアクセスを検出しました",
  "Could not check device status": "デバイス状態を確認できませんでした",
};



const toDisplayMessage = (message: string): string => {
  const backingUpMatch = /^Backing up (\d+) local changes$/.exec(message);
  if (backingUpMatch) return `${backingUpMatch[1]} 件のローカル変更をバックアップしています`;

  return TELEMETRY_MESSAGE_LABELS[message] ?? message;
};
const toDisplayTransactionName = (name: string): string => {
  if (name === "sync") return "同期";
  if (name === "startup_sync") return "起動時同期";
  return name;
};
const buildConsoleArgs = (prefix: string, context?: LogContext, error?: Error): unknown[] => {
  const args: unknown[] = [prefix];
  const sanitizedContext = sanitizeForLog(context);
  const sanitizedError = sanitizeForLog(error);

  if (sanitizedContext !== undefined) args.push(sanitizedContext);
  if (sanitizedError !== undefined) args.push(sanitizedError);

  return args;
};
/**
 * TelemetryService: 構造化ログとメトリクスを収集するサービス
 * 本番環境ではGoogle Cloud Loggingなどに送信することを想定
 */
class TelemetryService implements ITelemetryService {
  private logs: SyncLogEntry[] = [];
  private metrics: Map<string, number[]> = new Map();

  /**
   * 構造化ログを記録
   */
  log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void {
    const entry: SyncLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: sanitizeForLog(context ?? {}),
      error,
    };

    this.logs.push(entry);

    // コンソール出力は開発環境のみ
    if (import.meta.env.DEV) {
      const logMethod =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : console.log;

      logMethod(...buildConsoleArgs(`[${level.toUpperCase()}] ${toDisplayMessage(message)}`, context, error));
    }

    // ログの保持数制限（メモリリーク防止）
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
  }

  logEvent(
    eventName: TelemetryEventName,
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void {
    const entry: SyncLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      eventName,
      message,
      context: sanitizeForLog(context ?? {}),
      error,
    };

    this.logs.push(entry);

    if (import.meta.env.DEV) {
      const logMethod =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : console.log;

      logMethod(...buildConsoleArgs(`[${level.toUpperCase()}] ${eventName}: ${toDisplayMessage(message)}`, context, error));
    }

    if (this.logs.length > 1000) {
      this.logs.shift();
    }
  }

  /**
   * メトリクスを記録
   */
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    const key = tags ? `${name}_${JSON.stringify(tags)}` : name;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push(value);

    // メトリクスの保持数制限
    const values = this.metrics.get(key)!;
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * トランザクション計測（durationを自動記録）
   */
  startTransaction(name: string): {
    end: (status: "success" | "failure") => void;
  } {
    const startTime = performance.now();

    return {
      end: (status: "success" | "failure") => {
        const duration = performance.now() - startTime;
        const displayStatus = status === "success" ? "成功" : "失敗";
        this.recordMetric(`transaction_duration_${name}`, duration, { status });
        this.log("info", `${toDisplayTransactionName(name)}トランザクションが完了しました`, { duration, status: displayStatus });
      },
    };
  }

  /**
   * 集計データの取得（ダッシュボード用）
   */
  getMetricsSummary(): Record<
    string,
    { avg: number; p95: number; count: number; }
  > {
    const summary: Record<string, { avg: number; p95: number; count: number; }> =
      {};

    this.metrics.forEach((values, key) => {
      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const p95Index = Math.floor(values.length * 0.95);
      const p95 = sorted[p95Index] ?? sorted[sorted.length - 1];

      summary[key] = { avg, p95, count: values.length };
    });

    return summary;
  }

  /**
   * 直近のエラーログを取得
   */
  getRecentErrors(limit: number = 10): SyncLogEntry[] {
    return this.logs.filter((log) => log.level === "error").slice(-limit);
  }
}



export { TelemetryService };
