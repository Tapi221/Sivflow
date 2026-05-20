import { useEffect, useRef } from "react";

import {
  collection,
  onSnapshot,
  query,
  type Unsubscribe,
} from "firebase/firestore";

import { firestoreDb } from "@/services/firebase";

type UseGoogleCalendarPushSyncOptions = {
  /** Firebase Auth の UID。null の場合はリスナーを張らない */
  userId: string | null;

  /** 監視対象のカレンダーID一覧 */
  selectedCalendarIds: Set<string>;

  /** Push通知を受け取ったときのコールバック */
  onNotification: (calendarId: string) => void;
};

export const useGoogleCalendarPushSync = ({
  userId,
  selectedCalendarIds,
  onNotification,
}: UseGoogleCalendarPushSyncOptions): void => {
  /**
   * コールバックは毎レンダーで参照が変わる可能性があるため、
   * ref に保持して stale closure を防ぐ
   */
  const onNotificationRef = useRef(onNotification);

  onNotificationRef.current = onNotification;

  useEffect(() => {
    /**
     * 初期化前や未ログイン時は何もしない
     */
    if (!userId || selectedCalendarIds.size === 0 || !firestoreDb) {
      return;
    }

    /**
     * /gcal_notifications/{userId}/calendars
     */
    const colRef = collection(
      firestoreDb,
      "gcal_notifications",
      userId,
      "calendars",
    );

    /**
     * Firestore の初回 snapshot は
     * 現在状態の同期なので Push通知として扱わない
     */
    let isInitialSnapshot = true;

    const unsubscribe: Unsubscribe = onSnapshot(
      query(colRef),

      (snapshot) => {
        /**
         * 初回同期は無視
         */
        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          /**
           * 削除イベントは無視
           */
          if (change.type !== "added" && change.type !== "modified") {
            return;
          }

          const calendarId = change.doc.id;

          /**
           * 現在選択中のカレンダーのみ同期
           */
          if (!selectedCalendarIds.has(calendarId)) {
            return;
          }

          console.info(`[PushSync] ${calendarId} の変更通知を受信 → 即時同期`);

          onNotificationRef.current(calendarId);
        });
      },

      (error) => {
        console.warn("[PushSync] Firestoreリスナーエラー:", error);
      },
    );

    /**
     * unmount 時に listener cleanup
     */
    return () => {
      unsubscribe();
    };

    /**
     * selectedCalendarIds は Set のため
     * 直接依存配列に入れると比較が壊れる
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedCalendarIds.size]);
};
