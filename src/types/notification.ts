type NotificationLevel = "info" | "warning" | "error";
type NotificationAction = {
  label: string;
  onClick: () => void;
  primary?: boolean;
};
interface Notification {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  details?: string;
  timestamp: number;
  autoClose: boolean;
  closeable: boolean;
  duration?: number;
  actions?: NotificationAction[];
}
interface NotificationOptions {
  details?: string;
  autoClose?: boolean;
  closeable?: boolean;
  duration?: number;
  actions?: NotificationAction[];
}

export type { NotificationLevel, NotificationAction, Notification, NotificationOptions };
