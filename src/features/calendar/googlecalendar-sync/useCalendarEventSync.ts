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
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";

import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";
import { auth } from "@/services/firebase";
import * as C from "@/features/calendar/calendar.constants.desktop";

type GoogleCalendarSlice = {
  selectedCalendarIds: Set<string>;
  forceSyncRange?: (options: {
    rangeStart?: Date;
    rangeEnd?: Date;
  }) => Promise<void> | void;
};

export type CalendarEventSyncRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

export type BuildCalendarEventSyncRangeOptions = {
  selectedViewMode: CalendarViewMode;
  visibleDays: Date[];
  monthTitleDate: Date;
  monthRenderedRange?: CalendarDateRange | null;
};

export type UseCalendarEventSyncOptions = BuildCalendarEventSyncRangeOptions & {
  activeMode: CalendarToolbarMode;
  googleCalendar: GoogleCalendarSlice;
};

export const buildCalendarEventSyncRange = ({
  selectedViewMode,
  visibleDays,
  monthTitleDate,
  monthRenderedRange,
}: BuildCalendarEventSyncRangeOptions): CalendarEventSyncRange => {
  if (selectedViewMode === "month") {
    if (monthRenderedRange) {
      return {
        rangeStart: startOfDay(
          subDays(monthRenderedRange.start, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
        ),
        rangeEnd: endOfDay(
          addDays(monthRenderedRange.end, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
        ),
      };
    }

    const gridStart = startOfWeek(startOfMonth(monthTitleDate), {
      weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
    });
    const gridEnd = endOfWeek(endOfMonth(monthTitleDate), {
      weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
    });

    return {
      rangeStart: startOfDay(
        subDays(gridStart, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
      ),
      rangeEnd: endOfDay(
        addDays(gridEnd, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
      ),
    };
  }

  const fallbackDayTime = monthTitleDate.getTime();
  const firstVisibleDay = new Date(visibleDays[0]?.getTime() ?? fallbackDayTime);
  const lastVisibleDay = new Date(visibleDays.at(-1)?.getTime() ?? fallbackDayTime);
  const bufferDays = selectedViewMode === "week" ? 3 : 2;

  return {
    rangeStart: startOfDay(subDays(firstVisibleDay, bufferDays)),
    rangeEnd: endOfDay(addDays(lastVisibleDay, bufferDays)),
  };
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