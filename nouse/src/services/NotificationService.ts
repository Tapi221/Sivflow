import { platform } from "@platform/index";
import type { Notification, NotificationOptions } from "@/types/notification";

type NotificationListener = (notification: Notification) => void;

const createDismissedNotification = (id: string): Notification => {
  return {
    id,
    level: "info",
    title: "",
    message: "",
    timestamp: Date.now(),
    autoClose: true,
    closeable: true,
    duration: 0,
  };
};
class NotificationService {
  private readonly listeners = new Set<NotificationListener>();
  private readonly notifications = new Map<string, Notification>();

  public readonly subscribe = (
    listener: NotificationListener,
  ): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private readonly notify = (notification: Notification): void => {
    this.notifications.set(notification.id, notification);
    this.listeners.forEach((listener) => listener(notification));
  };

  public readonly info = (
    title: string,
    message: string,
    options?: NotificationOptions,
  ): void => {
    const notification: Notification = {
      id: `info-${Date.now()}`,
      level: "info",
      title,
      message,
      details: options?.details,
      timestamp: Date.now(),
      autoClose: options?.autoClose ?? true,
      closeable: false,
      duration: options?.duration ?? 5000,
    };

    this.notify(notification);
  };

  public readonly warning = (
    title: string,
    message: string,
    options?: NotificationOptions,
  ): void => {
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
  };

  public readonly error = (
    title: string,
    message: string,
    options?: NotificationOptions,
  ): void => {
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
            void platform.shell.openExternal("mailto:support@example.com");
          },
          primary: true,
        },
      ],
    };

    this.notify(notification);
  };

  public readonly dismiss = (id: string): void => {
    this.notifications.delete(id);
    this.listeners.forEach((listener) =>
      listener(createDismissedNotification(id)),
    );
  };

  public readonly getAll = (): Notification[] => {
    return Array.from(this.notifications.values());
  };
}
;

const notificationService = new NotificationService();

export { notificationService };
