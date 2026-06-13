import { useMemo } from "react";
import { compareCalendarEvents } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { toDateKey } from "./calendarKey";



type CalendarEventMap = Map<string, GoogleCalendarEvent[]>;



const useCalendarEventMap = (visibleEvents: GoogleCalendarEvent[]): CalendarEventMap => {
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

    for (const arr of map.values()) {
      arr.sort(compareCalendarEvents);
    }

    return map;
  }, [visibleEvents]);
};



export { useCalendarEventMap };


export type { CalendarEventMap };
