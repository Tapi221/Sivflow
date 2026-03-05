/**
 * Phase 1.5 PoC 3: Adaptive Flush
 *
 * 目的: ネットワーク状況とサーバー負荷に応じて動的にバッチサイズとフラッシュ間隔を調整
 *
 * アルゴリズム:
 * - RTT（Round Trip Time）測定       // 往復時間を測る
 * - スループット履歴の追跡         // 1秒あたり何件処理できたか記録
 * - 動的なバッチサイズ・フラッシュ間隔の計算 // それを元に最適な設定を決める
 */

// フラッシュ（まとめて送信）時の設定を表す型
interface FlushConfig {
  batchSize: number; // 1 回でまとめて送る件数（1〜100 件）
  flushInterval: number; // 何 ms ごとにフラッシュするか（100〜5000ms）
}

// ネットワーク計測値を表す型（将来拡張用）
// ネットワーク状況に応じてバッチサイズ/間隔を調整するサービスクラス
export class AdaptiveFlushService {
  // RTT・スループットの履歴を何件まで保持するか
  private static readonly HISTORY_SIZE = 10;
  // RTT 計測に使う軽量な ping API のパス
  private static readonly RTT_PING_ENDPOINT = "/api/ping";

  // 過去の RTT 計測値を入れておく配列
  private rttHistory: number[] = [];
  // 過去のスループット計測値を入れておく配列
  private throughputHistory: number[] = [];
  // 最後にフラッシュした時刻（スループット計算用）
  private lastFlushTime: number = Date.now();
  // 最後のフラッシュで何件処理したか（現状あまり使っていないが記録している）
  private lastFlushCount: number = 0;

  /**
   * RTT（Round Trip Time）を測定
   */
  async measureRtt(): Promise<number> {
    // 計測開始時刻を記録（高精度タイマー）
    const start = performance.now();

    try {
      // 軽量な Ping エンドポイントに HEAD リクエストを送る
      await fetch(AdaptiveFlushService.RTT_PING_ENDPOINT, {
        method: "HEAD",
        cache: "no-cache", // キャッシュせず毎回生のレスポンスを取りにいく
      });

      // 応答が返ってくるまでの時間 = RTT
      const rtt = performance.now() - start;
      // 計測値を履歴に追加
      this.addRttSample(rtt);

      // 測定した RTT を呼び出し側にも返す
      return rtt;
    } catch (error) {
      console.warn("Failed to measure RTT:", error);
      // 失敗した場合は「かなり遅いネットワーク」とみなす保守的な値を返す
      return 1000;
    }
  }

  /**
   * スループットを記録
   * （前回フラッシュから今回までに operationCount 件処理した、という想定）
   */
  recordThroughput(operationCount: number): void {
    const now = Date.now();
    // 前回フラッシュからの経過秒
    const elapsedSeconds = (now - this.lastFlushTime) / 1000;

    if (elapsedSeconds > 0) {
      // 1 秒あたり何件処理したかを計算
      const throughput = operationCount / elapsedSeconds;
      // 履歴に追加
      this.addThroughputSample(throughput);
    }

    // 次回計算用に基準を更新
    this.lastFlushTime = now;
    this.lastFlushCount = operationCount;
  }

  /**
   * 現在のネットワーク状況から「最適なフラッシュ設定」を計算する
   */
  calculateOptimalConfig(): FlushConfig {
    const avgRtt = this.getAverageRtt(); // RTT の平均値
    const avgThroughput = this.getAverageThroughput(); // スループットの平均値

    // 最終的なバッチサイズとフラッシュ間隔
    let batchSize: number;
    let flushInterval: number;

    // まず RTT（遅延時間）ベースで大まかに決める
    if (avgRtt > 500) {
      // 高遅延ネットワーク（モバイル 3G 等）
      // → 1 回あたりの件数を多くし、通信回数を減らす方向に
      batchSize = 50;
      flushInterval = 2000;
    } else if (avgRtt > 200) {
      // 中遅延ネットワーク（モバイル 4G 等）
      batchSize = 30;
      flushInterval = 1000;
    } else if (avgRtt > 100) {
      // 低遅延ネットワーク（一般的な WiFi 等）
      batchSize = 20;
      flushInterval = 500;
    } else {
      // 超低遅延ネットワーク（有線 LAN 等）
      // → 小さいバッチを高頻度で送り、レイテンシを最小化
      batchSize = 10;
      flushInterval = 300;
    }

    // 次にスループット（どれだけ捌けるか）で微調整
    if (avgThroughput > 100) {
      // 高スループット → サーバーもクライアントも良く捌けている
      // → まとめて送っても問題ないのでバッチサイズを増やす
      batchSize = Math.min(100, Math.floor(batchSize * 1.5));
    } else if (avgThroughput < 10) {
      // 低スループット → あまり処理できていない
      // → 小さめバッチでレスポンス優先
      batchSize = Math.max(5, Math.floor(batchSize * 0.7));
    }

    // 計算された設定を返す
    return { batchSize, flushInterval };
  }

  /**
   * ネットワーク状態の診断情報を取得
   * （UI に出したり、ログに出す用の人間向け情報）
   */
  getNetworkDiagnostics(): {
    avgRtt: number;
    avgThroughput: number;
    currentConfig: FlushConfig;
    recommendation: string;
  } {
    const avgRtt = this.getAverageRtt();
    const avgThroughput = this.getAverageThroughput();
    const currentConfig = this.calculateOptimalConfig();

    // 現在の RTT に応じたコメント文を決める
    let recommendation: string;
    if (avgRtt > 500) {
      recommendation =
        "Poor network detected. Using large batches to reduce round trips.";
      // ネットワークが悪いので、回数を減らすためにバッチを大きくしている
    } else if (avgRtt < 100) {
      recommendation =
        "Excellent network detected. Using small batches for low latency.";
      // ネットワークが良いので、小さいバッチを頻繁に送って低レイテンシを目指す
    } else {
      recommendation = "Normal network conditions. Balanced configuration.";
      // その中間なので、バランス重視の設定
    }

    // 診断情報をまとめて返す
    return {
      avgRtt,
      avgThroughput,
      currentConfig,
      recommendation,
    };
  }

  // ===== 以下はクラス内部で使うヘルパー関数群 =====

  // RTT の履歴に新しい値を追加（古いものは捨てる）
  private addRttSample(rtt: number): void {
    this.rttHistory.push(rtt);
    if (this.rttHistory.length > AdaptiveFlushService.HISTORY_SIZE) {
      // サイズ上限を超えたら最古のデータを削除
      this.rttHistory.shift();
    }
  }

  // スループット履歴に新しい値を追加
  private addThroughputSample(throughput: number): void {
    this.throughputHistory.push(throughput);
    if (this.throughputHistory.length > AdaptiveFlushService.HISTORY_SIZE) {
      this.throughputHistory.shift();
    }
  }

  // RTT の平均値を求める
  private getAverageRtt(): number {
    if (this.rttHistory.length === 0) {
      // まだ計測サンプルが無い場合は「普通くらい」として 200ms にする
      return 200;
    }

    const sum = this.rttHistory.reduce((a, b) => a + b, 0);
    return sum / this.rttHistory.length;
  }

  // スループットの平均値を求める
  private getAverageThroughput(): number {
    if (this.throughputHistory.length === 0) {
      // まだ計測サンプルが無い場合は中程度（50 ops/sec）と仮定
      return 50;
    }

    const sum = this.throughputHistory.reduce((a, b) => a + b, 0);
    return sum / this.throughputHistory.length;
  }

  /**
   * 定期的に RTT を測定（バックグラウンドで環境変化を追跡）
   */
  startPeriodicRttMeasurement(intervalMs: number = 30000): void {
    // intervalMs ごとに measureRtt を実行し続ける
    setInterval(async () => {
      await this.measureRtt();
    }, intervalMs);
  }
}
