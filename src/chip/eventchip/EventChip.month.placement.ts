import { compareCalendarEvents, getEventDateKeys } from "@/features/calendar/calendarEventRange";
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

type CalendarMonthEventIndex = Map<string, GoogleCalendarEvent[]>;

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

const createMonthEventIndex = (
  visibleEvents: GoogleCalendarEvent[],
): CalendarMonthEventIndex => {
  const eventIndex = new Map<string, GoogleCalendarEvent[]>();

  for (const event of visibleEvents) {
    for (const dayKey of getEventDateKeys(event)) {
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

const insertVisibleEvent = (
  dayEvents: CalendarMonthDayEvents,
  event: GoogleCalendarEvent,
  maxVisibleEventCandidates: number,
) => {
  if (maxVisibleEventCandidates <= 0) return;

  const visibleEvents = dayEvents.visibleEvents;
  const insertAt = visibleEvents.findIndex(
    (visibleEvent) => compareCalendarEvents(event, visibleEvent) < 0,
  );
  const boundedInsertAt =
    insertAt === -1 ? visibleEvents.length : insertAt;

  if (boundedInsertAt >= maxVisibleEventCandidates) return;

  visibleEvents.splice(boundedInsertAt, 0, event);

  if (visibleEvents.length > maxVisibleEventCandidates) {
    visibleEvents.length = maxVisibleEventCandidates;
  }
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
  monthWeeks,
  monthRowHeight,
}: {
  visibleEvents: GoogleCalendarEvent[];
  monthWeeks: CalendarMonthPlacementWeek[];
  monthRowHeight: number;
}) => {
  const eventsByDayKey = createMonthEventIndex(visibleEvents);
  const groupedEvents = new Map<string, CalendarMonthDayEvents>();
  const maxVisibleEventCandidates =
    getVisibleMonthEventChipCount(Number.MAX_SAFE_INTEGER, monthRowHeight) + 1;

  for (const week of monthWeeks) {
    for (const day of week.days) {
      const sourceEvents = eventsByDayKey.get(day.key);

      if (!sourceEvents?.length) continue;

      const dayEvents: CalendarMonthDayEvents = {
        visibleEvents: [],
        totalCount: sourceEvents.length,
        color: sourceEvents[0]?.accentColor ?? null,
      };

      for (const event of sourceEvents) {
        insertVisibleEvent(dayEvents, event, maxVisibleEventCandidates);
      }

      groupedEvents.set(day.key, dayEvents);
    }
  }

  for (const dayEvents of groupedEvents.values()) {
    const visibleChipCount = getVisibleMonthEventChipCount(
      dayEvents.totalCount,
      monthRowHeight,
    );

    if (dayEvents.visibleEvents.length > visibleChipCount) {
      dayEvents.visibleEvents.length = visibleChipCount;
    }
  }

  return groupedEvents;
};
