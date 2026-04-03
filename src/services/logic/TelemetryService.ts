import type {
  ITelemetryService,
  LogContext,
  LogLevel,
  SyncLogEntry,
  TelemetryEventName,
} from "@/types/domain/telemetry";
import { sanitizeForLog } from "@/utils/logSanitizer";

/**
 * TelemetryService: 構造化ログとメトリクスを収集するサービス
 * 本番環境ではGoogle Cloud Loggingなどに送信することを想定
 */
export class TelemetryService implements ITelemetryService {
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
      context: sanitizeForLog(context || {}),
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

      logMethod(
        `[${level.toUpperCase()}] ${message}`,
        sanitizeForLog(context),
        sanitizeForLog(error),
      );
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
      context: sanitizeForLog(context || {}),
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

      logMethod(
        `[${level.toUpperCase()}] ${eventName}: ${message}`,
        sanitizeForLog(context),
        sanitizeForLog(error),
      );
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
        this.recordMetric(`transaction_duration_${name}`, duration, { status });
        this.log("info", `Transaction ${name} completed`, { duration, status });
      },
    };
  }

  /**
   * 集計データの取得（ダッシュボード用）
   */
  getMetricsSummary(): Record<
    string,
    { avg: number; p95: number; count: number }
  > {
    const summary: Record<string, { avg: number; p95: number; count: number }> =
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
