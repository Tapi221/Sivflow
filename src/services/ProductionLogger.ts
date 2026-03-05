import * as Sentry from "@sentry/react";

/**
 * 本番環境用のロギング・監視
 */
class ProductionLogger {
  /**
   * エラーログ（Sentry に送信）
   */
  error(
    step: string,
    message: string,
    error: unknown,
    context?: Record<string, unknown>,
  ): void {
    console.error(`[ImageUpload:${step}] ${message}`, error);

    // 本番環境では Sentry に送信(自動キャプチャ)
    if (import.meta.env.PROD && error instanceof Error) {
      console.error(`[Sentry] ${step}: ${message}`, error, context);
    }
  }

  /**
   * 警告ログ（Sentry に送信）
   */
  warn(step: string, message: string, context?: Record<string, unknown>): void {
    console.warn(`[ImageUpload:${step}] ${message}`, context);

    // 本番環境では Sentry に送信(自動キャプチャ)
    if (import.meta.env.PROD) {
      console.warn(`[Sentry] ${step}: ${message}`, context);
    }
  }

  /**
   * 情報ログ
   */
  info(step: string, message: string, context?: Record<string, unknown>): void {
    console.log(`[ImageUpload:${step}] ${message}`, context);

    // 本番環境では Sentry の breadcrumb に追加(自動キャプチャ)
    if (import.meta.env.PROD) {
      console.log(`[Sentry Breadcrumb] ${step}: ${message}`, context);
    }
  }

  /**
   * パフォーマンス計測
   */
  measurePerformance(
    step: string,
    duration: number,
    context?: Record<string, unknown>,
  ): void {
    console.log(`[Performance:${step}] ${duration}ms`, context);

    // 本番環境では Sentry の breadcrumb に追加
    if (import.meta.env.PROD) {
      // Sentry.addBreadcrumb は本番環境で自動的に動作
      console.log(`[Performance:${step}] ${duration}ms`, context);

      // 性能が悪い場合は警告
      if (duration > 5000) {
        console.warn(`Slow image upload: ${step} took ${duration}ms`, context);
      }
    }
  }

  /**
   * パフォーマンス計測開始
   */
  startMeasure(step: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.measurePerformance(step, duration);
    };
  }
}

/**
 * 本番環境用ロガーの統一インスタンス
 */
export const productionLogger = new ProductionLogger();
