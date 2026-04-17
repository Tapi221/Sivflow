import {
  CONTEXT_STORAGE_KEY_PREFIXES,
  CONTEXT_SYNC_THRESHOLDS,
} from "@constants/web/app";

/**
 * コンテキストサービス
 *
 * ユーザーの状況に応じて適切なメッセージを提供する
 * 同じ処理でも「意味」を変える
 */
class ContextService {
  private buildLastInitKey = (userId: string) => {
    return `${CONTEXT_STORAGE_KEY_PREFIXES.lastInit}${userId}`;
  };

  private buildErrorFlagKey = (userId: string) => {
    return `${CONTEXT_STORAGE_KEY_PREFIXES.errorFlag}${userId}`;
  };

  private buildLastSyncKey = (userId: string) => {
    return `${CONTEXT_STORAGE_KEY_PREFIXES.lastSync}${userId}`;
  };

  getInitContext = (userId: string): "first_time" | "normal" | "recovery" => {
    const lastInitKey = this.buildLastInitKey(userId);
    const lastInit = localStorage.getItem(lastInitKey);

    if (!lastInit) {
      localStorage.setItem(lastInitKey, Date.now().toString());
      return "first_time";
    }

    const errorFlagKey = this.buildErrorFlagKey(userId);
    const errorFlag = localStorage.getItem(errorFlagKey);

    if (errorFlag) {
      localStorage.removeItem(errorFlagKey);
      return "recovery";
    }

    localStorage.setItem(lastInitKey, Date.now().toString());
    return "normal";
  };

  getSyncContext = (
    userId: string,
  ): "initial" | "update" | "offline_recovery" => {
    const lastSyncKey = this.buildLastSyncKey(userId);
    const lastSync = localStorage.getItem(lastSyncKey);

    if (!lastSync) {
      return "initial";
    }

    const lastSyncTime = parseInt(lastSync, 10);
    const offlineDuration = Date.now() - lastSyncTime;

    if (offlineDuration > CONTEXT_SYNC_THRESHOLDS.offlineRecoveryMs) {
      return "offline_recovery";
    }

    return "update";
  };

  setErrorFlag = (userId: string): void => {
    localStorage.setItem(this.buildErrorFlagKey(userId), "true");
  };

  recordSync = (userId: string): void => {
    localStorage.setItem(this.buildLastSyncKey(userId), Date.now().toString());
  };
}

export const contextService = new ContextService();
