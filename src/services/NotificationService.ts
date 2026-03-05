import type {
  Notification,
  NotificationLevel,
  NotificationOptions,
} from "../types/notification";

/**
 * 通知サービス
 *
 * エラーレベルに応じた通知を管理する
 * - INFO: 状態通知（自動で消える／邪魔しない）
 * - WARNING: 放置すると困る（閉じられる／軽い行動導線）
 * - ERROR: 続行不可（明確なアクション必須）
 */
class NotificationService {
  private listeners: Set<(notification: Notification) => void> = new Set();
  private notifications: Map<string, Notification> = new Map();

  /**
   * 通知リスナーを追加
   */
  subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知を発行
   */
  private notify(notification: Notification): void {
    this.notifications.set(notification.id, notification);
    this.listeners.forEach((listener) => listener(notification));
  }

  /**
   * INFO レベルの通知
   *
   * 特徴:
   * - 自動で消える
   * - 邪魔しない
   * - ユーザーの操作不要
   */
  info(title: string, message: string, options?: NotificationOptions): void {
    const notification: Notification = {
      id: `info-${Date.now()}`,
      level: "info",
      title,
      message,
      details: options?.details,
      timestamp: Date.now(),
      autoClose: options?.autoClose ?? true,
      closeable: false,
      duration: options?.duration ?? 5000, // デフォルト5秒
    };

    this.notify(notification);
  }

  /**
   * WARNING レベルの通知
   *
   * 特徴:
   * - 閉じられる
   * - 軽い行動導線
   * - 放置すると困る
   */
  warning(title: string, message: string, options?: NotificationOptions): void {
    const notification: Notification = {
      id: `warning-${Date.now()}`,
      level: "warning",
      title,
      message,
      details: options?.details,
      timestamp: Date.now(),
      autoClose: false,
      closeable: options?.closeable ?? true,
      actions: options?.actions,
    };

    this.notify(notification);
  }

  /**
   * ERROR レベルの通知
   *
   * 特徴:
   * - 明確なアクション必須
   * - 続行不可
   * - 閉じられない
   */
  error(title: string, message: string, options?: NotificationOptions): void {
    const notification: Notification = {
      id: `error-${Date.now()}`,
      level: "error",
      title,
      message,
      details: options?.details,
      timestamp: Date.now(),
      autoClose: false,
      closeable: false,
      actions: options?.actions ?? [
        {
          label: "サポートに連絡",
          onClick: () => {
            // サポート連絡処理
            window.open("mailto:support@example.com", "_blank");
          },
          primary: true,
        },
      ],
    };

    this.notify(notification);
  }

  /**
   * 通知を削除
   */
  dismiss(id: string): void {
    this.notifications.delete(id);
    // リスナーに削除を通知（null を送る）
    this.listeners.forEach((listener) => listener({ id } as unknown));
  }

  /**
   * 全ての通知を取得
   */
  getAll(): Notification[] {
    return Array.from(this.notifications.values());
  }
}

// シングルトンインスタンス
export const notificationService = new NotificationService();
