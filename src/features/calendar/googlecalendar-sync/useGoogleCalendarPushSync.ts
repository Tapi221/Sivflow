import { useEffect, useMemo, useRef } from "react";

import {
  collection,
  onSnapshot,
  query,
  type Unsubscribe,
} from "firebase/firestore";

import { firestoreDb } from "@/services/firebase";

type UseGoogleCalendarPushSyncOptions = {
  userId: string | null;
  selectedCalendarIds: Set<string>;
  onNotification: (calendarId: string) => void;
};

export const useGoogleCalendarPushSync = ({
  userId,
  selectedCalendarIds,
  onNotification,
}: UseGoogleCalendarPushSyncOptions): void => {
  const onNotificationRef = useRef(onNotification);

  onNotificationRef.current = onNotification;

  const calendarKey = useMemo(() => {
    return Array.from(selectedCalendarIds).slice().sort().join("|");
  }, [selectedCalendarIds]);

  useEffect(() => {
    if (!userId || selectedCalendarIds.size === 0 || !firestoreDb) {
      return;
    }

    const colRef = collection(
      firestoreDb,
      "gcal_notifications",
      userId,
      "calendars",
    );

    let isInitialSnapshot = true;

    const unsubscribe: Unsubscribe = onSnapshot(
      query(colRef),

      (snapshot) => {
        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added" && change.type !== "modified") {
            return;
          }

          const calendarId = change.doc.id;

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

    return () => {
      unsubscribe();
    };
  }, [userId, calendarKey, selectedCalendarIds]);
};