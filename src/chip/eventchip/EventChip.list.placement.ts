import { addDays, getDaysInMonth, isSameDay, startOfMonth } from "date-fns";
import { eventChipDesign } from "@/chip/eventchip/eventChipDesign.generated";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type CalendarListPlacementDay = {
  date: Date;
  dateKey: string;
  events: GoogleCalendarEvent[];
  isSelected: boolean;
  isToday: boolean;
};
type CalendarListVirtualMetrics = {
  heights: number[];
  offsets: number[];
  totalHeight: number;
};
type CalendarListVirtualRange = {
  start: number;
  end: number;
};
type BuildListPlacementDaysParams = {
  days: Date[];
  events: GoogleCalendarEvent[];
  selectedDate: Date;
};

const LIST_DAY_SECTION_MIN_HEIGHT_PX = 430;
const LIST_DAY_GAP_PX = 8;
const LIST_EMPTY_DAY_HEIGHT_PX = 38;
const LIST_EVENT_ROW_HEIGHT_PX = eventChipDesign.list.rowHeightPx;
const LIST_EVENT_CHIP_HEIGHT_PX = eventChipDesign.list.chipHeightPx;
const LIST_ALL_DAY_EVENT_ROW_HEIGHT_PX = eventChipDesign.list.allDayRowHeightPx;
const LIST_ALL_DAY_EVENT_CHIP_HEIGHT_PX = eventChipDesign.list.allDayChipHeightPx;
const LIST_EVENT_ROW_GAP_PX = 6;
const LIST_VIRTUAL_OVERSCAN_PX = 6000;

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
const getEventInstanceKey = (dateKey: string, event: GoogleCalendarEvent): string => {
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt).getTime();
  return `${dateKey}:${event.id}:${startsAt}:${endsAt}`;
};
const buildListPlacementDays = ({ days, events, selectedDate }: BuildListPlacementDaysParams): CalendarListPlacementDay[] => {
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
const buildListVirtualMetrics = (days: CalendarListPlacementDay[]): CalendarListVirtualMetrics => {
  const heights: number[] = [];
  const offsets: number[] = [];
  let totalHeight = 0;
  days.forEach((day) => {
    offsets.push(totalHeight);
    const eventRowsHeight = day.events.reduce((sum, event) => sum + getListEventRowHeight(event), 0);
    const eventGapsHeight = Math.max(0, day.events.length - 1) * LIST_EVENT_ROW_GAP_PX;
    const contentHeight = day.events.length > 0 ? eventRowsHeight + eventGapsHeight : LIST_EMPTY_DAY_HEIGHT_PX;
    const dayHeight = Math.max(LIST_DAY_SECTION_MIN_HEIGHT_PX, contentHeight) + LIST_DAY_GAP_PX;
    heights.push(dayHeight);
    totalHeight += dayHeight;
  });
  return { heights, offsets, totalHeight };
};
const getListVirtualRange = (metrics: CalendarListVirtualMetrics, scrollTop: number, viewportHeight: number): CalendarListVirtualRange => {
  const startOffset = Math.max(0, scrollTop - LIST_VIRTUAL_OVERSCAN_PX);
  const endOffset = scrollTop + viewportHeight + LIST_VIRTUAL_OVERSCAN_PX;
  const start = findVirtualIndex(metrics.offsets, startOffset);
  let end = start;
  while (end < metrics.offsets.length && metrics.offsets[end] < endOffset) {
    end += 1;
  }
  return {
    start,
    end: Math.min(metrics.offsets.length, end + 1),
  };
};

export { LIST_ALL_DAY_EVENT_CHIP_HEIGHT_PX, LIST_ALL_DAY_EVENT_ROW_HEIGHT_PX, LIST_DAY_GAP_PX, LIST_DAY_SECTION_MIN_HEIGHT_PX, LIST_EMPTY_DAY_HEIGHT_PX, LIST_EVENT_CHIP_HEIGHT_PX, LIST_EVENT_ROW_GAP_PX, LIST_EVENT_ROW_HEIGHT_PX, buildListPlacementDays, buildListVirtualMetrics, getListVirtualRange };
export type { CalendarListPlacementDay, CalendarListVirtualMetrics, CalendarListVirtualRange };
