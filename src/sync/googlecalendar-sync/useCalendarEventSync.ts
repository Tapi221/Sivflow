import { endOfDay, startOfDay } from "date-fns";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import type { CalendarToolbarMode } from "@/features/calendar/calendar.types";
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

type CalendarEventSyncColumn = {
  start: Date;
  end: Date;
};

export type UseCalendarEventSyncOptions = BuildCalendarEventSyncRangeOptions & {
  activeMode: CalendarToolbarMode;
  googleCalendar: GoogleCalendarSlice;
  timelineColumns?: CalendarEventSyncColumn[];
};

const buildTimelineEventSyncRange = (
  timelineColumns: CalendarEventSyncColumn[],
) => {
  const firstColumn = timelineColumns[0];
  const lastColumn = timelineColumns[timelineColumns.length - 1];

  if (!firstColumn || !lastColumn) return null;

  return {
    rangeStart: startOfDay(firstColumn.start),
    rangeEnd: endOfDay(lastColumn.end),
  };
};

export const useCalendarEventSync = ({
  activeMode,
  selectedViewMode,
  visibleDays,
  monthTitleDate,
  monthRenderedRange,
  yearRenderedRange,
  googleCalendar,
  timelineColumns = [],
}: UseCalendarEventSyncOptions): void => {
  const { selectedCalendarIds, forceSyncRange } = googleCalendar;

  const [userId, setUserId] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );

  const calendarKey = useMemo(() => {
    return Array.from(selectedCalendarIds).slice().sort().join("|");
  }, [selectedCalendarIds]);

  const syncRange = useMemo(() => {
    const timelineRange = activeMode === "timeline"
      ? buildTimelineEventSyncRange(timelineColumns)
      : null;

    if (timelineRange) return timelineRange;

    return buildCalendarEventSyncRange({
      selectedViewMode,
      visibleDays,
      monthTitleDate,
      monthRenderedRange,
      yearRenderedRange,
    });
  }, [activeMode, monthRenderedRange, monthTitleDate, selectedViewMode, timelineColumns, visibleDays, yearRenderedRange]);

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
