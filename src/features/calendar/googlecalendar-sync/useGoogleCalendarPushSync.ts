/**
 * useGoogleCalendarPushSync
 *
 * Firestore の /gcal_notifications/{userId}/calendars を監視し、
 * Google Calendar から Push通知が届いたら即座に SyncEngine を起動する。
 *
 * useGoogleCalendarIntegration.ts の中で呼び出すこと。
 *
 * --- 使い方 ---
 * useGoogleCalendarPushSync({
 *   userId,
 *   selectedCalendarIds,
 *   onNotification: (calendarId) => syncEngine.forceSync(),
 * });
 */

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
  // コールバックは毎レンダーで参照が変わるため ref で安定化
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  useEffect(() => {
    if (!userId || selectedCalendarIds.size === 0) return;

    // /gcal_notifications/{userId}/calendars コレクションを購読
    const colRef = collection(
      db,
      "gcal_notifications",
      userId,
      "calendars",
    );

    // 初回のスナップショット（マウント時）はスキップして、
    // その後の変更のみをトリガーとして扱う
    let isInitialSnapshot = true;

    const unsubscribe: Unsubscribe = onSnapshot(
      query(colRef),
      (snapshot) => {
        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          // 新規 or 変更（削除は無視）
          if (change.type === "added" || change.type === "modified") {
            const calendarId = change.doc.id;

            // 選択中のカレンダーのみ反応
            if (selectedCalendarIds.has(calendarId)) {
              console.info(
                `[PushSync] ${calendarId} の変更通知を受信 → 即時同期`,
              );
              onNotificationRef.current(calendarId);
            }
          }
        });
      },
      (error) => {
        console.warn("[PushSync] Firestoreリスナーエラー:", error);
      },
    );

    return () => {
      unsubscribe();
    };

    // selectedCalendarIds は Set のため依存配列に直接入れると比較できない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedCalendarIds.size]);
};