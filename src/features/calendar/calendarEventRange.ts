import { addDays, format, startOfDay } from "date-fns";

import type { GoogleCalendarEvent } from "./googlecalendar-integration/gcalSync.types";

const toDate = (value: Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
};

export const getCalendarDateKey = (date: Date): string =>
  format(date, "yyyy-MM-dd");

export const getDayRange = (date: Date): { start: Date; end: Date } => {
  const start = startOfDay(date);

  return {
    start,
    end: addDays(start, 1),
  };
};

export const eventOverlapsRange = (
  event: GoogleCalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): boolean => {
  const startsAt = toDate(event.startsAt);
  const endsAt = toDate(event.endsAt);

  if (!startsAt || !endsAt) return false;

  const startTime = startsAt.getTime();
  const endTime = endsAt.getTime();
  const normalizedEndTime = endTime > startTime ? endTime : startTime + 1;

  return startTime < rangeEnd.getTime() && normalizedEndTime > rangeStart.getTime();
};

export const eventOverlapsDay = (
  event: GoogleCalendarEvent,
  day: Date,
): boolean => {
  const { start, end } = getDayRange(day);

  return eventOverlapsRange(event, start, end);
};

export const getEventDateKeys = (event: GoogleCalendarEvent): string[] => {
  const startsAt = toDate(event.startsAt);
  const endsAt = toDate(event.endsAt);

  if (!startsAt || !endsAt) return [];

  const startTime = startsAt.getTime();
  const endTime = endsAt.getTime();
  const inclusiveEndTime = Math.max(startTime, endTime - 1);
  const lastDay = startOfDay(new Date(inclusiveEndTime));
  const keys: string[] = [];

  for (
    let cursor = startOfDay(startsAt);
    cursor.getTime() <= lastDay.getTime();
    cursor = addDays(cursor, 1)
  ) {
    keys.push(getCalendarDateKey(cursor));
  }

  return keys;
};

export const clipEventToDay = (
  event: GoogleCalendarEvent,
  day: Date,
): GoogleCalendarEvent | null => {
  const startsAt = toDate(event.startsAt);
  const endsAt = toDate(event.endsAt);

  if (!startsAt || !endsAt) return null;

  const { start: dayStart, end: dayEnd } = getDayRange(day);
  const clippedStart = new Date(
    Math.max(startsAt.getTime(), dayStart.getTime()),
  );
  const clippedEnd = new Date(Math.min(endsAt.getTime(), dayEnd.getTime()));

  if (clippedEnd.getTime() <= clippedStart.getTime()) return null;

  if (
    clippedStart.getTime() === startsAt.getTime() &&
    clippedEnd.getTime() === endsAt.getTime()
  ) {
    return event;
  }

  return {
    ...event,
    startsAt: clippedStart,
    endsAt: clippedEnd,
  };
};
