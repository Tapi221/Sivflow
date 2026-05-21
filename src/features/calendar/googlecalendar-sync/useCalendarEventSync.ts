import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import type {
  CalendarToolbarMode,
  CalendarViewMode,
} from "@/features/calendar/calendar.types";

import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";
import { auth } from "@/services/firebase";

type GoogleCalendarSlice = {
  selectedCalendarIds: Set<string>;
  forceSync?: () => Promise<void> | void;
};

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
  const { selectedCalendarIds, forceSync } = googleCalendar;

  const [userId, setUserId] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );

  const forceSyncRef = useRef(forceSync);

  forceSyncRef.current = forceSync;

  const calendarKey = useMemo(() => {
    return Array.from(selectedCalendarIds).slice().sort().join("|");
  }, [selectedCalendarIds]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!calendarKey) return;

    void forceSyncRef.current?.();
  }, [calendarKey]);

  useGoogleCalendarPushSync({
    userId,
    selectedCalendarIds,
    onNotification: () => {
      void forceSyncRef.current?.();
    },
  });
};