import { addDays, getDaysInMonth, isSameDay, startOfMonth } from "date-fns";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

export type CalendarListPlacementDay = {
  date: Date;
  dateKey: string;
  events: GoogleCalendarEvent[];
  isSelected: boolean;
  isToday: boolean;
};

export type CalendarListVirtualMetrics = {
  heights: number[];
  offsets: number[];
  totalHeight: number;
};

export type CalendarListVirtualRange = {
  start: number;
  end: number;
};

export const LIST_DAY_SECTION_MIN_HEIGHT_PX = 430;
export const LIST_DAY_GAP_PX = 8;
export const LIST_EMPTY_DAY_HEIGHT_PX = 38;
export const LIST_EVENT_ROW_HEIGHT_PX = 52;
export const LIST_EVENT_CHIP_HEIGHT_PX = 46;
export const LIST_ALL_DAY_EVENT_ROW_HEIGHT_PX = 34;
export const LIST_ALL_DAY_EVENT_CHIP_HEIGHT_PX = 28;
export const LIST_EVENT_ROW_GAP_PX = 6;
export const LIST_VIRTUAL_OVERSCAN_PX = 6000;

const buildMonthDays = (date: Date): Date[] => {
  const monthStart = startOfMonth(date);

  return Array.from({ length: getDaysInMonth(monthStart) }, (_, index) => addDays(monthStart, index));
};

const getListEventRowHeight = (event: GoogleCalendarEvent): number => event.isAllDay ? LIST_ALL_DAY_EVENT_ROW_HEIGHT_PX : LIST_EVENT_ROW_HEIGHT_PX;

const findVirtualIndex = (offsets: number[], targetOffset: number): number => {
  if (offsets.length === 0) return 0;

  let low = 0;
  let high = offsets.length - 1;
  let result = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (offsets[middle] <= targetOffset) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return result;
};

export const getEventInstanceKey = (dateKey: string, event: GoogleCalendarEvent): string => {
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt).getTime();

  return `${dateKey}:${event.id}:${startsAt}:${endsAt}`;
};

export const buildListPlacementDays = ({
  days,
  events,
  selectedDate,
}: {
  days: Date[];
  events: GoogleCalendarEvent[];
  selectedDate: Date;
}): CalendarListPlacementDay[] => {
  const resolvedDays = days.length > 0 ? days : buildMonthDays(selectedDate);
  const today = new Date();
  const eventsByDay = new Map<string, GoogleCalendarEvent[]>();
  const dayByKey = new Map<string, Date>();

  resolvedDays.forEach((day) => {
    const dayKey = getCalendarDateKey(day);

    dayByKey.set(dayKey, day);
    eventsByDay.set(dayKey, []);
  });

  events.forEach((event) => {
    getEventDateKeys(event).forEach((dayKey) => {
      const day = dayByKey.get(dayKey);
      const dayEvents = eventsByDay.get(dayKey);

      if (!day || !dayEvents) return;

      if (event.isAllDay) {
        dayEvents.push(event);
        return;
      }

      const clippedEvent = clipEventToDay(event, day);
      if (clippedEvent) {
        dayEvents.push(clippedEvent);
      }
    });
  });

  return resolvedDays.map((date) => {
    const dateKey = getCalendarDateKey(date);
    const dayEvents = eventsByDay.get(dateKey) ?? [];

    dayEvents.sort(compareCalendarEvents);

    return {
      date,
      dateKey,
      events: dayEvents,
      isSelected: isSameDay(date, selectedDate),
      isToday: isSameDay(date, today),
    };
  });
};

export const getListDayEstimatedHeight = (day: CalendarListPlacementDay): number => {
  if (day.events.length === 0) return LIST_EMPTY_DAY_HEIGHT_PX;

  const eventRowsHeight = day.events.reduce((total, event) => total + getListEventRowHeight(event), 0);

  return eventRowsHeight + Math.max(0, day.events.length - 1) * LIST_EVENT_ROW_GAP_PX;
};

export const getListDayHeight = (day: CalendarListPlacementDay): number => Math.max(getListDayEstimatedHeight(day), LIST_DAY_SECTION_MIN_HEIGHT_PX);

export const buildListVirtualMetrics = (days: CalendarListPlacementDay[]): CalendarListVirtualMetrics => {
  let totalHeight = 0;
  const offsets: number[] = [];
  const heights = days.map((day, index) => {
    const height = getListDayHeight(day) + (index < days.length - 1 ? LIST_DAY_GAP_PX : 0);

    offsets.push(totalHeight);
    totalHeight += height;

    return height;
  });

  return { heights, offsets, totalHeight };
};

export const getListVirtualRange = (
  metrics: CalendarListVirtualMetrics,
  scrollTop: number,
  viewportHeight: number,
): CalendarListVirtualRange => {
  if (metrics.heights.length === 0) return { start: 0, end: 0 };

  const rangeStartOffset = Math.max(0, scrollTop - LIST_VIRTUAL_OVERSCAN_PX);
  const rangeEndOffset = scrollTop + viewportHeight + LIST_VIRTUAL_OVERSCAN_PX;
  const start = findVirtualIndex(metrics.offsets, rangeStartOffset);
  let end = start;

  while (end < metrics.heights.length && metrics.offsets[end] < rangeEndOffset) {
    end += 1;
  }

  return {
    start,
    end: Math.min(metrics.heights.length, end + 1),
  };
};

export const areListVirtualRangesEqual = (
  left: CalendarListVirtualRange,
  right: CalendarListVirtualRange,
): boolean => left.start === right.start && left.end === right.end;

export const getListVisibleDate = (
  days: CalendarListPlacementDay[],
  metrics: CalendarListVirtualMetrics,
  targetOffset: number,
): Date | null => {
  const index = findVirtualIndex(metrics.offsets, targetOffset);

  return days[index]?.date ?? null;
};
