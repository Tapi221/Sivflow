import { useEffect, useRef, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";

import type {
  CalendarToolbarMode,
  CalendarViewMode,
} from "@/features/calendar/calendar.types";
import type { useGoogleCalendarIntegration } from "@/features/calendar/googlecalendar-integration/useGoogleCalendarIntegration";

import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";

import { auth } from "@/services/firebase";

type GoogleCalendarSlice = Pick<
  ReturnType<typeof useGoogleCalendarIntegration>,
  "forceSync" | "selectedCalendarIds"
>;

export type UseCalendarEventSyncOptions = {
  activeMode: CalendarToolbarMode;
  selectedViewMode: CalendarViewMode;
  visibleDays: Date[];
  monthTitleDate: Date;
  googleCalendar: GoogleCalendarSlice;
};

export const useCalendarEventSync = ({
  googleCalendar,
}: UseCalendarEventSyncOptions): void => {
  const { forceSync, selectedCalendarIds } = googleCalendar;

  const [userId, setUserId] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  const forceSyncRef = useRef(forceSync);
  forceSyncRef.current = forceSync;

  useEffect(() => {
    void forceSync();
  }, [forceSync, selectedCalendarIds]);

  useGoogleCalendarPushSync({
    userId,
    selectedCalendarIds,
    onNotification: (calendarId) => {
      console.info(
        `[CalendarEventSync] Push通知受信: calendarId=${calendarId} → 即時同期開始`,
      );

      void forceSyncRef.current();
    },
  });
};
