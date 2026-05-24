import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import type { CalendarToolbarMode } from "@/features/calendar/calendar.types";

import {
  buildCalendarEventSyncRange,
  type BuildCalendarEventSyncRangeOptions,
} from "./calendarEventSyncRange";
import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";
import { auth } from "@/services/firebase";

type GoogleCalendarSlice = {
  selectedCalendarIds: Set<string>;
  forceSyncRange?: (options: {
    rangeStart?: Date;
    rangeEnd?: Date;
  }) => Promise<void> | void;
};

export type UseCalendarEventSyncOptions = BuildCalendarEventSyncRangeOptions & {
  activeMode: CalendarToolbarMode;
  googleCalendar: GoogleCalendarSlice;
};

export const useCalendarEventSync = ({
  selectedViewMode,
  visibleDays,
  monthTitleDate,
  monthRenderedRange,
  googleCalendar,
}: UseCalendarEventSyncOptions): void => {
  const { selectedCalendarIds, forceSyncRange } = googleCalendar;

  const [userId, setUserId] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );

  const calendarKey = useMemo(() => {
    return Array.from(selectedCalendarIds).slice().sort().join("|");
  }, [selectedCalendarIds]);

  const firstVisibleDayTime = visibleDays[0]?.getTime() ?? null;
  const lastVisibleDayTime = visibleDays.at(-1)?.getTime() ?? null;
  const monthRenderedRangeStartTime = monthRenderedRange?.start.getTime() ?? null;
  const monthRenderedRangeEndTime = monthRenderedRange?.end.getTime() ?? null;

  const syncRange = useMemo(
    () =>
      buildCalendarEventSyncRange({
        selectedViewMode,
        visibleDays,
        monthTitleDate,
        monthRenderedRange,
      }),
    [
      firstVisibleDayTime,
      lastVisibleDayTime,
      monthRenderedRangeEndTime,
      monthRenderedRangeStartTime,
      monthTitleDate,
      selectedViewMode,
      visibleDays,
    ],
  );

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