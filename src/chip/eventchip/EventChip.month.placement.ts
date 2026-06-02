import { addDays, startOfDay } from "date-fns";
import { compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

export type CalendarMonthDayEvents = {
  visibleEvents: GoogleCalendarEvent[];
  totalCount: number;
  color: string | null;
};

export type CalendarMonthPlacementDay = {
  key: string;
};

export type CalendarMonthPlacementWeek = {
  days: CalendarMonthPlacementDay[];
};

export type CalendarMonthEventIndex = Map<string, GoogleCalendarEvent[]>;

type CalendarMonthAllowedDayRange = {
  start: Date;
  endExclusive: Date;
};

const MONTH_EVENT_CHIP_HEIGHT_PX = 18.3;
const MONTH_EVENT_CHIP_GAP_PX = 3;
const MONTH_EVENT_OVERFLOW_TEXT_HEIGHT_PX = 11;
const MONTH_EVENT_BOTTOM_PADDING_PX = 0;
const MONTH_EVENT_CONTENT_TOP_PX = 32;

export const EMPTY_MONTH_DAY_EVENTS: CalendarMonthDayEvents = {
  visibleEvents: [],
  totalCount: 0,
  color: null,
};

const toValidDateOrNull = (value: Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
};

const parseCalendarDateKey = (dateKey: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);

  return Number.isFinite(date.getTime()) ? date : null;
};

const getAllowedDayKeyRange = (
  allowedDayKeys: ReadonlySet<string>,
): CalendarMonthAllowedDayRange | null => {
  let minDayKey: string | null = null;
  let maxDayKey: string | null = null;

  for (const dayKey of allowedDayKeys) {
    if (minDayKey === null || dayKey < minDayKey) minDayKey = dayKey;
    if (maxDayKey === null || dayKey > maxDayKey) maxDayKey = dayKey;
  }

  if (minDayKey === null || maxDayKey === null) return null;

  const start = parseCalendarDateKey(minDayKey);
  const lastDay = parseCalendarDateKey(maxDayKey);
  if (!start || !lastDay) return null;

  return {
    start,
    endExclusive: addDays(lastDay, 1),
  };
};

const getEventDateKeysWithinAllowedRange = (
  event: GoogleCalendarEvent,
  allowedRange: CalendarMonthAllowedDayRange,
): string[] => {
  const startsAt = toValidDateOrNull(event.startsAt);
  const endsAt = toValidDateOrNull(event.endsAt);

  if (!startsAt || !endsAt) return [];

  const startTime = startsAt.getTime();
  const endTime = endsAt.getTime();
  const normalizedEndTime = endTime > startTime ? endTime : startTime + 1;
  const rangeStartTime = allowedRange.start.getTime();
  const rangeEndTime = allowedRange.endExclusive.getTime();

  if (startTime >= rangeEndTime || normalizedEndTime <= rangeStartTime) {
    return [];
  }

  const clippedStartTime = Math.max(startTime, rangeStartTime);
  const inclusiveEndTime = Math.max(startTime, endTime - 1);
  const clippedInclusiveEndTime = Math.min(inclusiveEndTime, rangeEndTime - 1);
  const lastDay = startOfDay(new Date(clippedInclusiveEndTime));
  const keys: string[] = [];

  for (
    let cursor = startOfDay(new Date(clippedStartTime));
    cursor.getTime() <= lastDay.getTime();
    cursor = addDays(cursor, 1)
  ) {
    keys.push(getCalendarDateKey(cursor));
  }

  return keys;
};

const getMonthEventChipCount = (contentHeight: number) => {
  if (contentHeight <= 0) return 0;

  return Math.max(
    0,
    Math.floor(
      (contentHeight + MONTH_EVENT_CHIP_GAP_PX) /
        (MONTH_EVENT_CHIP_HEIGHT_PX + MONTH_EVENT_CHIP_GAP_PX),
    ),
  );
};

const getMonthVisibleEventLimit = (
  eventCount: number,
  monthRowHeight: number,
  maxVisibleEventCount?: number,
) => {
  const visibleChipCount = getVisibleMonthEventChipCount(eventCount, monthRowHeight);

  if (typeof maxVisibleEventCount !== "number" || !Number.isFinite(maxVisibleEventCount)) return visibleChipCount;

  return Math.max(0, Math.min(visibleChipCount, Math.floor(maxVisibleEventCount)));
};

export const createMonthEventIndex = (
  visibleEvents: GoogleCalendarEvent[],
  allowedDayKeys?: ReadonlySet<string>,
): CalendarMonthEventIndex => {
  const eventIndex = new Map<string, GoogleCalendarEvent[]>();
  const allowedRange = allowedDayKeys ? getAllowedDayKeyRange(allowedDayKeys) : null;

  if (allowedDayKeys && !allowedRange) return eventIndex;

  for (const event of visibleEvents) {
    const eventDayKeys = allowedRange
      ? getEventDateKeysWithinAllowedRange(event, allowedRange)
      : getEventDateKeys(event);

    for (const dayKey of eventDayKeys) {
      if (allowedDayKeys && !allowedDayKeys.has(dayKey)) continue;

      const dayEvents = eventIndex.get(dayKey);

      if (dayEvents) {
        dayEvents.push(event);
      } else {
        eventIndex.set(dayKey, [event]);
      }
    }
  }

  return eventIndex;
};

const createMonthWeekDayKeySet = (
  monthWeeks: CalendarMonthPlacementWeek[],
): Set<string> => {
  const dayKeys = new Set<string>();

  for (const week of monthWeeks) {
    for (const day of week.days) {
      dayKeys.add(day.key);
    }
  }

  return dayKeys;
};

const insertSortedVisibleEvent = (
  visibleEvents: GoogleCalendarEvent[],
  event: GoogleCalendarEvent,
  maxVisibleEventCandidates: number,
) => {
  let insertIndex = visibleEvents.length;

  while (
    insertIndex > 0 &&
    compareCalendarEvents(event, visibleEvents[insertIndex - 1]) < 0
  ) {
    insertIndex -= 1;
  }

  if (insertIndex >= maxVisibleEventCandidates) return;

  visibleEvents.splice(insertIndex, 0, event);

  if (visibleEvents.length > maxVisibleEventCandidates) {
    visibleEvents.length = maxVisibleEventCandidates;
  }
};

const getVisibleMonthEvents = (
  sourceEvents: GoogleCalendarEvent[],
  maxVisibleEventCandidates: number,
) => {
  if (sourceEvents.length <= maxVisibleEventCandidates) {
    return sourceEvents.slice().sort(compareCalendarEvents);
  }

  const visibleEvents: GoogleCalendarEvent[] = [];

  for (const event of sourceEvents) {
    insertSortedVisibleEvent(visibleEvents, event, maxVisibleEventCandidates);
  }

  return visibleEvents;
};

export const getVisibleMonthEventChipCount = (
  eventCount: number,
  monthRowHeight: number,
) => {
  const contentHeight =
    monthRowHeight -
    MONTH_EVENT_CONTENT_TOP_PX -
    MONTH_EVENT_BOTTOM_PADDING_PX;

  const maxChipsWithoutOverflow = getMonthEventChipCount(contentHeight);

  if (eventCount <= maxChipsWithoutOverflow) return eventCount;

  const overflowReservedHeight =
    MONTH_EVENT_OVERFLOW_TEXT_HEIGHT_PX + MONTH_EVENT_CHIP_GAP_PX;

  return getMonthEventChipCount(contentHeight - overflowReservedHeight);
};

export const computeMonthEventsByDay = ({
  visibleEvents,
  eventIndex,
  monthWeeks,
  monthRowHeight,
  maxVisibleEventCount,
}: {
  visibleEvents?: GoogleCalendarEvent[];
  eventIndex?: CalendarMonthEventIndex;
  monthWeeks: CalendarMonthPlacementWeek[];
  monthRowHeight: number;
  maxVisibleEventCount?: number;
}) => {
  const eventsByDayKey = eventIndex ?? createMonthEventIndex(visibleEvents ?? [], createMonthWeekDayKeySet(monthWeeks));
  const groupedEvents = new Map<string, CalendarMonthDayEvents>();
  const maxVisibleEventCandidates =
    getMonthVisibleEventLimit(Number.MAX_SAFE_INTEGER, monthRowHeight, maxVisibleEventCount) + 1;

  for (const week of monthWeeks) {
    for (const day of week.days) {
      const sourceEvents = eventsByDayKey.get(day.key);

      if (!sourceEvents?.length) continue;

      const visibleEvents = getVisibleMonthEvents(
        sourceEvents,
        maxVisibleEventCandidates,
      );

      const dayEvents: CalendarMonthDayEvents = {
        visibleEvents,
        totalCount: sourceEvents.length,
        color: visibleEvents[0]?.accentColor ?? null,
      };

      groupedEvents.set(day.key, dayEvents);
    }
  }

  for (const dayEvents of groupedEvents.values()) {
    const visibleChipCount = getMonthVisibleEventLimit(
      dayEvents.totalCount,
      monthRowHeight,
      maxVisibleEventCount,
    );

    if (dayEvents.visibleEvents.length > visibleChipCount) {
      dayEvents.visibleEvents.length = visibleChipCount;
    }
  }

  return groupedEvents;
};
