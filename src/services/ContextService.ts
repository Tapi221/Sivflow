/**
 * コンテキストサービス
 *
 * ユーザーの状況に応じて適切なメッセージを提供する
 * 同じ処理でも「意味」を変える
 */
class ContextService {
  /**
   * 初期化コンテキストを取得
   */
  getInitContext(userId: string): "first_time" | "normal" | "recovery" {
    // LocalStorage から前回の起動情報を取得
    const lastInitKey = `last_init_${userId}`;
    const lastInit = localStorage.getItem(lastInitKey);

    if (!lastInit) {
      // 初回起動
      localStorage.setItem(lastInitKey, Date.now().toString());
      return "first_time";
    }

    // エラーフラグをチェック
    const errorFlagKey = `error_flag_${userId}`;
    const errorFlag = localStorage.getItem(errorFlagKey);

    if (errorFlag) {
      // エラー後の復旧
      localStorage.removeItem(errorFlagKey);
      return "recovery";
    }

    // 通常起動
    localStorage.setItem(lastInitKey, Date.now().toString());
    return "normal";
  }

  /**
   * 同期コンテキストを取得
   */
  getSyncContext(userId: string): "initial" | "update" | "offline_recovery" {
    // 前回の同期時刻を取得
    const lastSyncKey = `last_sync_${userId}`;
    const lastSync = localStorage.getItem(lastSyncKey);

    if (!lastSync) {
      // 初回同期
      return "initial";
    }

    // オフライン期間をチェック
    const lastSyncTime = parseInt(lastSync, 10);
    const now = Date.now();
    const offlineDuration = now - lastSyncTime;

    // 1時間以上オフラインだった場合
    if (offlineDuration > 60 * 60 * 1000) {
      return "offline_recovery";
    }

    // 通常の更新
    return "update";
  }

  /**
   * エラーフラグを設定
   */
  setErrorFlag(userId: string): void {
    const errorFlagKey = `error_flag_${userId}`;
    localStorage.setItem(errorFlagKey, "true");
  }

  /**
   * 同期完了を記録
   */
  recordSync(userId: string): void {
    const lastSyncKey = `last_sync_${userId}`;
    localStorage.setItem(lastSyncKey, Date.now().toString());
  }
}

// シングルトンインスタンス
export const contextService = new ContextService();
