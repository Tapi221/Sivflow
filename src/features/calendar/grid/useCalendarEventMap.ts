import { useMemo } from "react";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/useGoogleCalendarIntegration";
import { toDateKey } from "./calendarKey";

export type CalendarEventMap = Map<string, GoogleCalendarEvent[]>;

export const useCalendarEventMap = (
  visibleEvents: GoogleCalendarEvent[],
): CalendarEventMap => {
  return useMemo(() => {
    const map: CalendarEventMap = new Map();

    for (const event of visibleEvents) {
      const key = toDateKey(event.startsAt);

      const arr = map.get(key);
      if (arr) {
        arr.push(event);
      } else {
        map.set(key, [event]);
      }
    }

    // sort only once per day bucket
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    }

    return map;
  }, [visibleEvents]);
};
