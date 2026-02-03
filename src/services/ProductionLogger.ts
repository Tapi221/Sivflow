import * as Sentry from '@sentry/react';

/**
 * 本番環境用のロギング・監視
 */
class ProductionLogger {
  /**
   * エラーログ（Sentry に送信）
   */
  error(step: string, message: string, error: any, context?: Record<string, any>): void {
    console.error(`[ImageUpload:${step}] ${message}`, error);
    
    // 本番環境では Sentry に送信
    if (import.meta.env.PROD) {
      Sentry.captureException(error, {
        tags: { step },
        extra: { message, ...context }
      });
    }
  }
  
  /**
   * 警告ログ（Sentry に送信）
   */
  warn(step: string, message: string, context?: Record<string, any>): void {
    console.warn(`[ImageUpload:${step}] ${message}`, context);
    
    // 本番環境では Sentry に送信
    if (import.meta.env.PROD) {
      Sentry.captureMessage(`[${step}] ${message}`, {
        level: 'warning',
        extra: context
      });
    }
  }
  
  /**
   * 情報ログ
   */
  info(step: string, message: string, context?: Record<string, any>): void {
    console.log(`[ImageUpload:${step}] ${message}`, context);
    
    // 本番環境では Sentry の breadcrumb に追加
    if (import.meta.env.PROD) {
      Sentry.addBreadcrumb({
        category: 'image-upload',
        message: `${step}: ${message}`,
        level: 'info',
        data: context
      });
    }
  }
  
  /**
   * パフォーマンス計測
   */
  measurePerformance(step: string, duration: number, context?: Record<string, any>): void {
    console.log(`[Performance:${step}] ${duration}ms`, context);
    
    // 本番環境では Sentry に送信
    if (import.meta.env.PROD) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${step}: ${duration}ms`,
        level: 'info',
        data: context
      });
      
      // 性能が悪い場合は警告
      if (duration > 5000) {
        Sentry.captureMessage(`Slow image upload: ${step} took ${duration}ms`, {
          level: 'warning',
          extra: context
        });
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
