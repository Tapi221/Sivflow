// src/services/AutoBackupService.ts

const BACKUP_STORAGE_KEY = "app:autoBackups";
const LAST_BACKUP_KEY = "app:lastBackupAt";
const MAX_BACKUPS = 5;

export interface AutoBackup {
  id: string;
  userId: string;
  createdAt: string;
  payload: unknown;
}

class AutoBackupService {
  /**
   * localStorage / sessionStorage が
   * 「存在するかつ実際に使えるか」を安全に判定する。
   *
   * Safari private mode 等では
   * 存在するが setItem で例外を投げることがある。
   */
  private storageAvailable(type: "localStorage" | "sessionStorage"): boolean {
    if (typeof window === "undefined") return false;

    try {
      const storage = window[type];
      const testKey = "__storage_test__";

      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      if (e instanceof DOMException) {
        // 容量超過 or private mode など
        return (
          e.name === "QuotaExceededError" ||
          e.name === "NS_ERROR_DOM_QUOTA_REACHED"
        );
      }
      return false;
    }
  }

  /**
   * バックアップ実行
   */
  async performAutoBackup(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
      const snapshot = await this.buildSnapshot(userId);

      const existing = this.loadBackups();
      const next: AutoBackup[] = [snapshot, ...existing].slice(0, MAX_BACKUPS);

      // ---- localStorage 保存（縮退付き） ----
      if (this.storageAvailable("localStorage")) {
        try {
          localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          if (e instanceof DOMException && e.name === "QuotaExceededError") {
            console.warn(
              "[AutoBackup] QuotaExceededError. Keeping latest only.",
            );

            try {
              localStorage.setItem(
                BACKUP_STORAGE_KEY,
                JSON.stringify(next.slice(0, 1)),
              );
            } catch (e2) {
              console.error(
                "[AutoBackup] Failed to persist even 1 backup. Clearing key.",
                e2,
              );
              try {
                localStorage.removeItem(BACKUP_STORAGE_KEY);
              } catch {
                /* noop */
              }
            }
          } else {
            throw e;
          }
        }

        try {
          localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
        } catch {
          // lastBackupAt は致命的でないため握りつぶす
        }
      } else {
        console.warn(
          "[AutoBackup] localStorage unavailable. Skipping local backup.",
        );
      }

      return true;
    } catch (err) {
      console.error("[AutoBackup] Failed:", err);
      return false;
    }
  }

  /**
   * バックアップ一覧ロード
   */
  private loadBackups(): AutoBackup[] {
    if (!this.storageAvailable("localStorage")) return [];

    try {
      const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) return [];

      return parsed;
    } catch {
      return [];
    }
  }

  /**
   * 実際のバックアップデータ生成
   * 実プロジェクト側のデータ収集ロジックに差し替えること。
   */
  private async buildSnapshot(userId: string): Promise<AutoBackup> {
    const payload = await this.collectUserData(userId);

    return {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      payload,
    };
  }

  /**
   * 実データ収集（ここは実装依存）
   */
  private async collectUserData(userId: string): Promise<unknown> {
    // TODO: IndexedDB / Firestore / etc からデータ収集
    return {
      userId,
      timestamp: Date.now(),
    };
  }

  /**
   * 最終バックアップ日時取得
   */
  getLastBackupAt(): string | null {
    if (!this.storageAvailable("localStorage")) return null;

    try {
      return localStorage.getItem(LAST_BACKUP_KEY);
    } catch {
      return null;
    }
  }
}

export const autoBackupService = new AutoBackupService();
