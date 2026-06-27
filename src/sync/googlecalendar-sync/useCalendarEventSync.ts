import { useEffect, useMemo, useState } from "react";
import { auth } from "@platform/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import type { BuildCalendarEventSyncRangeOptions, CalendarEventSyncRange } from "./calendarEventSyncRange";
import { buildCalendarEventPrioritySyncRange, buildCalendarEventSyncRange } from "./calendarEventSyncRange";
import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";



type GoogleCalendarSlice = {
  selectedCalendarIds: Set<string>;
  forceSyncRange?: (options: {
    rangeStart?: Date;
    rangeEnd?: Date;
  }) => Promise<void> | void;
};
type UseCalendarEventSyncOptions = BuildCalendarEventSyncRangeOptions & { googleCalendar: GoogleCalendarSlice;
};



const PREFETCH_SYNC_DELAY_MS = 250;



const isSameCalendarEventSyncRange = (left: CalendarEventSyncRange, right: CalendarEventSyncRange): boolean => left.rangeStart.getTime() === right.rangeStart.getTime() && left.rangeEnd.getTime() === right.rangeEnd.getTime();
const toCalendarEventSyncRangeKey = (range: CalendarEventSyncRange): string => `${range.rangeStart.toISOString()}|${range.rangeEnd.toISOString()}`;
const fromCalendarEventSyncRangeKey = (key: string): CalendarEventSyncRange => {
  const [rangeStart, rangeEnd] = key.split("|");

  return {
    rangeStart: new Date(rangeStart),
    rangeEnd: new Date(rangeEnd),
  };
};
const useCalendarEventSync = ({ selectedViewMode, visibleDays, monthTitleDate, weekStartDay, monthRenderedRange, yearSyncRange, googleCalendar }: UseCalendarEventSyncOptions): void => {
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
      weekStartDay,
      monthRenderedRange,
      yearSyncRange,
    });
  }, [monthRenderedRange, monthTitleDate, selectedViewMode, visibleDays, weekStartDay, yearSyncRange]);
  const prioritySyncRange = useMemo(() => {
    return buildCalendarEventPrioritySyncRange({
      selectedViewMode,
      visibleDays,
      monthTitleDate,
      weekStartDay,
      monthRenderedRange,
      yearSyncRange,
    });
  }, [monthRenderedRange, monthTitleDate, selectedViewMode, visibleDays, weekStartDay, yearSyncRange]);

  const syncRangeKey = useMemo(() => toCalendarEventSyncRangeKey(syncRange), [syncRange]);
  const prioritySyncRangeKey = useMemo(() => toCalendarEventSyncRangeKey(prioritySyncRange), [prioritySyncRange]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!calendarKey) return;
    if (!forceSyncRange) return;

    let cancelled = false;
    let prefetchTimeoutId: number | null = null;

    void (async () => {
      const currentPrioritySyncRange = fromCalendarEventSyncRangeKey(prioritySyncRangeKey);
      const currentSyncRange = fromCalendarEventSyncRangeKey(syncRangeKey);

      await forceSyncRange(currentPrioritySyncRange);
      if (cancelled || isSameCalendarEventSyncRange(currentPrioritySyncRange, currentSyncRange)) return;

      prefetchTimeoutId = window.setTimeout(() => {
        if (cancelled) return;
        void forceSyncRange(currentSyncRange);
      }, PREFETCH_SYNC_DELAY_MS);
    })();

    return () => {
      cancelled = true;

      if (prefetchTimeoutId !== null) {
        window.clearTimeout(prefetchTimeoutId);
      }
    };
  }, [calendarKey, forceSyncRange, prioritySyncRangeKey, syncRangeKey]);

  useGoogleCalendarPushSync({
    userId,
    selectedCalendarIds,
    onNotification: () => {
      void forceSyncRange?.(syncRange);
    },
  });
};



export { useCalendarEventSync };


export type { UseCalendarEventSyncOptions };
