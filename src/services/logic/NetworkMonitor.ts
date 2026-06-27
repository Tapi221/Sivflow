import type { BatchConstraint, INetworkMonitor } from "@/services/interfaces/ISyncService";
import type { NetworkStatus, SyncContextSource } from "@/types/domain/telemetry";



/**
 * NetworkMonitor: ネットワーク状態を監視し、実測値ベースで健全性を判断
 * 状態遷移にヒステリシス（履歴効果）を持たせ、頻繁な揺れを防ぐ
 */
class NetworkMonitor implements INetworkMonitor {
  private _status: NetworkStatus = "good";
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  private recentDurations: number[] = [];
  private listeners: Array<(status: NetworkStatus) => void> = [];

  private readonly DURATION_WINDOW = 5; // 直近5回の平均を取る

  // 状態遷移の閾値
  private readonly THRESHOLDS = {
    EXCELLENT_SUCCESS_COUNT: 5,
    GOOD_SUCCESS_COUNT: 3,
    POOR_ERROR_RATE: 0.1,
    RTT_SLOW: 2000,
    RTT_FAST: 100,
  };

  private handleOnline = () => {
    console.log("[NetworkMonitor] ネットワークはオンラインです");
    this.updateStatus();
    // 復帰時に即座にgoodに戻す試み（updateStatus内でのロジックに依存）
    if (this._status === "offline") {
      this._status = "poor"; // リセット
      this.notifyListeners();
    }
  };

  private handleOffline = () => {
    console.log("[NetworkMonitor] ネットワークはオフラインです");
    this._status = "offline";
    this.notifyListeners();
  };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
  }

  get status(): NetworkStatus {
    return this._status;
  }

  /**
   * バッチ制約を環境コンテキストに応じて返す
   */
  getBatchConstraint(context: SyncContextSource): BatchConstraint {
    // ユーザー主導の同期は最優先
    if (context === "user_initiated") {
      return {
        maxSize: 100,
        concurrency: 3,
        timeoutMs: 30000,
      };
    }

    // ネットワーク状態に応じた制約
    const baseConstraint = this.getBaseConstraintByNetwork();

    // バックグラウンドは控えめに
    if (context === "background") {
      return {
        maxSize: Math.min(baseConstraint.maxSize, 20),
        concurrency: 1,
        timeoutMs: 10000,
      };
    }

    return baseConstraint;
  }

  private getBaseConstraintByNetwork(): BatchConstraint {
    switch (this._status) {
      case "excellent":
        return { maxSize: 50, concurrency: 2, timeoutMs: 20000 };
      case "good":
        return { maxSize: 30, concurrency: 1, timeoutMs: 15000 };
      case "poor":
        return { maxSize: 10, concurrency: 1, timeoutMs: 10000 };
      case "offline":
        return { maxSize: 0, concurrency: 0, timeoutMs: 0 };
    }
  }

  /**
   * 同期結果を報告し、状態遷移を判定
   */
  reportResult(success: boolean, durationMs: number): void {
    // 持続時間の記録
    this.recentDurations.push(durationMs);
    if (this.recentDurations.length > this.DURATION_WINDOW) {
      this.recentDurations.shift();
    }

    // 連続成功/失敗のカウント
    if (success) {
      this.consecutiveSuccesses++;
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
    }

    // 状態遷移の判定
    this.updateStatus();
  }

  private updateStatus(): void {
    const avgDuration = this.getAverageDuration();
    const oldStatus = this._status;

    // オフライン判定（即座に降格）
    if (!navigator.onLine) {
      this._status = "offline";
    }
    // Poor判定（エラー率または極端な遅延で即座に降格）
    else if (
      this.consecutiveFailures >= 2 ||
      avgDuration > this.THRESHOLDS.RTT_SLOW
    ) {
      this._status = "poor";
    }
    // Poor -> Good への昇格（慎重に、連続成功が必要）
    else if (
      this._status === "poor" &&
      this.consecutiveSuccesses >= this.THRESHOLDS.GOOD_SUCCESS_COUNT
    ) {
      this._status = "good";
    }
    // Good -> Excellent への昇格（さらに慎重に）
    else if (
      this._status === "good" &&
      this.consecutiveSuccesses >= this.THRESHOLDS.EXCELLENT_SUCCESS_COUNT &&
      avgDuration < this.THRESHOLDS.RTT_FAST
    ) {
      this._status = "excellent";
    }
    // Offline -> Poor への復帰
    else if (this._status === "offline" && navigator.onLine) {
      this._status = "poor"; // 復帰直後は慎重にpoorから開始
    }

    // 状態変化があればリスナーに通知
    if (oldStatus !== this._status) {
      console.log(
        `[NetworkMonitor] 状態が変わりました: ${oldStatus} -> ${this._status}`,
      );
      this.notifyListeners();
    }
  }

  private getAverageDuration(): number {
    if (this.recentDurations.length === 0) return 100; // デフォルト値
    return (
      this.recentDurations.reduce((a, b) => a + b, 0) /
      this.recentDurations.length
    );
  }

  /**
   * 状態変化のリスナー登録
   */
  subscribe(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this._status));
  }
}



export { NetworkMonitor };
