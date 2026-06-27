import React, { useEffect, useState } from "react";
import { ErrorDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.Error";
import { WarningDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.Warning";
import { InfoToast } from "./InfoToast";
import { notificationService } from "@/services/NotificationService";
import type { Notification } from "@/types/notification";



/**
 * 通知プロバイダー
 *
 * グローバル通知管理を提供する
 * レベル別の表示制御を行う
 */
const NotificationProvider: React.FC<{ children: React.ReactNode; }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // 通知サービスを購読
    const unsubscribe = notificationService.subscribe((notification) => {
      const isDismissEvent = notification.title === "" && notification.message === "";

      if (isDismissEvent) {
        // 削除通知
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id),
        );
        return;
      }

      // 追加通知（同一IDは置き換え）
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === notification.id);
        if (exists) {
          return prev.map((n) => (n.id === notification.id ? notification : n));
        }
        return [...prev, notification];
      });
    });

    return unsubscribe;
  }, []);

  // レベル別に通知を分類
  const infoNotifications = notifications.filter((n) => n.level === "info");
  const warningNotifications = notifications.filter(
    (n) => n.level === "warning",
  );
  const errorNotifications = notifications.filter((n) => n.level === "error");

  return (
    <>
      {children}

      {/* INFO レベルの通知（トースト） */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {infoNotifications.map((notification) => (
          <InfoToast
            key={notification.id}
            notification={notification}
            onDismiss={() => notificationService.dismiss(notification.id)}
          />
        ))}
      </div>

      {/* WARNING レベルの通知（ダイアログ） */}
      {warningNotifications.map((notification) => (
        <WarningDialog
          key={notification.id}
          notification={notification}
          onDismiss={() => notificationService.dismiss(notification.id)}
        />
      ))}

      {/* ERROR レベルの通知（ダイアログ） */}
      {errorNotifications.map((notification) => (
        <ErrorDialog
          key={notification.id}
          notification={notification}
          onDismiss={() => notificationService.dismiss(notification.id)}
        />
      ))}
    </>
  );
};



export { NotificationProvider };
