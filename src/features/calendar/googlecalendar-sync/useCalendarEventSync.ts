import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { onAuthStateChanged } from "firebase/auth";

import type {
  CalendarToolbarMode,
  CalendarViewMode,
} from "@/features/calendar/calendar.types";

import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";
import { auth } from "@/services/firebase";
import * as C from "@/features/calendar/calendar.constants.desktop";

type GoogleCalendarSlice = {
  selectedCalendarIds: Set<string>;
  forceSync?: (options?: {
    rangeStart?: Date;
    rangeEnd?: Date;
  }) => Promise<void> | void;
};

export type UseCalendarEventSyncOptions = {
  activeMode: CalendarToolbarMode;
  selectedViewMode: CalendarViewMode;
  visibleDays: Date[];
  monthTitleDate: Date;
  googleCalendar: GoogleCalendarSlice;
};

export const useCalendarEventSync = ({
  selectedViewMode,
  visibleDays,
  monthTitleDate,
  googleCalendar,
}: UseCalendarEventSyncOptions): void => {
  const { selectedCalendarIds, forceSync } = googleCalendar;

  const [userId, setUserId] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );

  const calendarKey = useMemo(() => {
    return Array.from(selectedCalendarIds).slice().sort().join("|");
  }, [selectedCalendarIds]);

  const fallbackDayTime = monthTitleDate.getTime();
  const firstVisibleDayTime = visibleDays[0]?.getTime() ?? fallbackDayTime;
  const lastVisibleDayTime = visibleDays.at(-1)?.getTime() ?? fallbackDayTime;

  const syncRange = useMemo(() => {
    if (selectedViewMode === "month") {
      const gridStart = startOfWeek(startOfMonth(monthTitleDate), {
        weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
      });
      const gridEnd = endOfWeek(endOfMonth(monthTitleDate), {
        weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
      });

      return {
        rangeStart: startOfDay(subDays(gridStart, 7)),
        rangeEnd: endOfDay(addDays(gridEnd, 7)),
      };
    }

    const firstVisibleDay = new Date(firstVisibleDayTime);
    const lastVisibleDay = new Date(lastVisibleDayTime);
    const bufferDays = selectedViewMode === "week" ? 3 : 2;

    return {
      rangeStart: startOfDay(subDays(firstVisibleDay, bufferDays)),
      rangeEnd: endOfDay(addDays(lastVisibleDay, bufferDays)),
    };
  }, [
    firstVisibleDayTime,
    lastVisibleDayTime,
    monthTitleDate,
    selectedViewMode,
  ]);

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

    void forceSync?.(syncRange);
  }, [calendarKey, forceSync, syncRange, syncRangeKey]);

  useGoogleCalendarPushSync({
    userId,
    selectedCalendarIds,
    onNotification: () => {
      void forceSync?.(syncRange);
    },
  });
};
