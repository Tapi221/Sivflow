// 通知レベルの型定義
type NotificationLevel = "info" | "warning" | "error";
// 通知アクションの型定義
interface NotificationAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}
// 通知の型定義
interface Notification {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  details?: string;
  timestamp: number;
  autoClose?: boolean; // 自動で消えるか（INFO のみ）
  closeable?: boolean; // 閉じられるか（WARNING のみ）
  actions?: NotificationAction[]; // アクション（ERROR のみ）
  duration?: number; // 自動で消えるまでの時間（ms）
}
// 通知オプションの型定義
interface NotificationOptions {
  details?: string;
  autoClose?: boolean;
  closeable?: boolean;
  actions?: NotificationAction[];
  duration?: number;
}

export type { NotificationLevel, NotificationAction, Notification, NotificationOptions };
