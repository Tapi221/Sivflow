/**
 * ストレージ監視サービス
 *
 * ブラウザのストレージ容量を監視し、
 * 容量不足を事前に検知する（インラインバリデーション）
 */
class StorageMonitor {
  private intervalId: number | null = null;
  private listeners: Set<(quota: StorageQuota) => void> = new Set();

  /**
   * ストレージ容量をチェック
   */
  async checkQuota(): Promise<StorageQuota> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        usage: 0,
        quota: 0,
        percent: 0,
      };
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percent = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, percent };
  }

  /**
   * 監視を開始
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.intervalId) {
      return; // 既に監視中
    }

    // 即座にチェック
    this.checkAndNotify();

    // 定期的にチェック
    this.intervalId = window.setInterval(() => {
      this.checkAndNotify();
    }, intervalMs) as unknown as number;
  }

  /**
   * 監視を停止
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * リスナーを追加
   */
  subscribe(listener: (quota: StorageQuota) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * チェックして通知
   */
  private async checkAndNotify(): Promise<void> {
    const quota = await this.checkQuota();
    this.listeners.forEach((listener) => listener(quota));
  }
}

export interface StorageQuota {
  usage: number;
  quota: number;
  percent: number;
}

// シングルトンインスタンス
export const storageMonitor = new StorageMonitor();



