import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/services/firebase";
import { buildCalendarEventSyncRange, type BuildCalendarEventSyncRangeOptions } from "./calendarEventSyncRange";
import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";

type GoogleCalendarSlice = {
  selectedCalendarIds: Set<string>;
  forceSyncRange?: (options: {
    rangeStart?: Date;
    rangeEnd?: Date;
  }) => Promise<void> | void;
};

export type UseCalendarEventSyncOptions = BuildCalendarEventSyncRangeOptions & {
  googleCalendar: GoogleCalendarSlice;
};

export const useCalendarEventSync = ({
  selectedViewMode,
  visibleDays,
  monthTitleDate,
  monthRenderedRange,
  yearSyncRange,
  googleCalendar,
}: UseCalendarEventSyncOptions): void => {
  const { selectedCalendarIds, forceSyncRange } = googleCalendar;

  const [userId, setUserId] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );

  const calendarKey = useMemo(() => {
    return Array.from(selectedCalendarIds).slice().sort().join("|");
  }, [selectedCalendarIds]);

  const syncRange = useMemo(() => {
    return buildCalendarEventSyncRange({
      selectedViewMode,
      visibleDays,
      monthTitleDate,
      monthRenderedRange,
      yearSyncRange,
    });
  }, [monthRenderedRange, monthTitleDate, selectedViewMode, visibleDays, yearSyncRange]);

  const syncRangeKey = useMemo(
    () => `${syncRange.rangeStart.toISOString()}|${syncRange.rangeEnd.toISOString()}`,
    [syncRange],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!calendarKey) return;

    void forceSyncRange?.(syncRange);
  }, [calendarKey, forceSyncRange, syncRange, syncRangeKey]);

  useGoogleCalendarPushSync({
    userId,
    selectedCalendarIds,
    onNotification: () => {
      void forceSyncRange?.(syncRange);
    },
  });
};
