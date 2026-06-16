import { useEffect, useMemo, useRef } from "react";
import { firestoreDb } from "@platform/firebase/client";
import type { Unsubscribe } from "firebase/firestore";
import { collection, onSnapshot, query } from "firebase/firestore";



type UseGoogleCalendarPushSyncOptions = {
  userId: string | null;
  selectedCalendarIds: Set<string>;
  onNotification: (calendarId: string) => void;
};



const NOTIFICATION_DEBOUNCE_MS = 250;



const isPermissionDeniedError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown; }).code === "permission-denied"
  );
};
const useGoogleCalendarPushSync = ({ userId, selectedCalendarIds, onNotification }: UseGoogleCalendarPushSyncOptions): void => {
  const onNotificationRef = useRef(onNotification);
  const selectedCalendarIdsRef = useRef(selectedCalendarIds);
  const listenerDisabledRef = useRef(false);
  const pendingNotificationTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const calendarKey = useMemo(() => {
    return Array.from(selectedCalendarIds).slice().sort().join("|");
  }, [selectedCalendarIds]);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    selectedCalendarIdsRef.current = selectedCalendarIds;
  }, [selectedCalendarIds]);

  useEffect(() => {
    listenerDisabledRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (
      !userId ||
      calendarKey.length === 0 ||
      !firestoreDb ||
      listenerDisabledRef.current
    ) {
      return;
    }

    const pendingNotificationTimers = pendingNotificationTimersRef.current;
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

          if (!selectedCalendarIdsRef.current.has(calendarId)) {
            return;
          }

          console.info(`[PushSync] ${calendarId} の変更通知を受信 → 即時同期`);

          const existingTimer = pendingNotificationTimers.get(calendarId);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          const timer = setTimeout(() => {
            pendingNotificationTimers.delete(calendarId);
            onNotificationRef.current(calendarId);
          }, NOTIFICATION_DEBOUNCE_MS);

          pendingNotificationTimers.set(calendarId, timer);
        });
      },

      (error) => {
        if (isPermissionDeniedError(error)) {
          listenerDisabledRef.current = true;
          console.info(
            "[PushSync] Firestore listener disabled because the current user cannot read gcal_notifications.",
          );
          unsubscribe();
          return;
        }

        console.warn("[PushSync] Firestoreリスナーエラー:", error);
      },
    );

    return () => {
      unsubscribe();
      pendingNotificationTimers.forEach((timer) => clearTimeout(timer));
      pendingNotificationTimers.clear();
    };
  }, [userId, calendarKey]);
};



export { useGoogleCalendarPushSync };
