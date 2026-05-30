import { addDays, differenceInCalendarDays, isSameDay, max, min, startOfDay } from "date-fns";
import type { CalendarEvent } from "./calendarEvent.types";

export type CalendarEventSegment = {
  event: CalendarEvent;
  span: number;
  left: number;
  right: number;
  startsBeforeRange: boolean;
  endsAfterRange: boolean;
};

export type CalendarEventLevelsResult = {
  levels: CalendarEventSegment[][];
  extra: CalendarEventSegment[];
};

const DAY_STEP = 1;

const findDateIndex = (range: readonly Date[], target: Date): number =>
  range.findIndex((date) => isSameDay(date, target));

const getExclusiveDayEnd = (date: Date): Date => addDays(startOfDay(date), DAY_STEP);

const compareSegments = (
  a: CalendarEventSegment,
  b: CalendarEventSegment,
): number => {
  if (a.left !== b.left) return a.left - b.left;
  if (a.right !== b.right) return b.right - a.right;

  return a.event.id.localeCompare(b.event.id);
};

export const getCalendarEventSegment = (
  event: CalendarEvent,
  range: readonly Date[],
): CalendarEventSegment | null => {
  if (range.length === 0) return null;

  const first = startOfDay(range[0]);
  const last = getExclusiveDayEnd(range[range.length - 1]);
  const rawStart = event.startsAt instanceof Date ? event.startsAt : new Date(event.startsAt);
  const rawEnd = event.endsAt instanceof Date ? event.endsAt : new Date(event.endsAt);

  if (!Number.isFinite(rawStart.getTime()) || !Number.isFinite(rawEnd.getTime())) return null;

  const normalizedEnd = rawEnd.getTime() > rawStart.getTime() ? rawEnd : new Date(rawStart.getTime() + 1);
  const clippedStart = max([startOfDay(rawStart), first]);
  const clippedEnd = min([getExclusiveDayEnd(new Date(normalizedEnd.getTime() - 1)), last]);

  if (clippedEnd.getTime() <= clippedStart.getTime()) return null;

  const padding = findDateIndex(range, clippedStart);

  if (padding < 0) return null;

  const slots = differenceInCalendarDays(last, first);
  const span = Math.max(1, Math.min(differenceInCalendarDays(clippedEnd, clippedStart), slots));
  const left = padding + 1;

  return {
    event,
    span,
    left,
    right: Math.max(padding + span, 1),
    startsBeforeRange: rawStart.getTime() < first.getTime(),
    endsAfterRange: normalizedEnd.getTime() > last.getTime(),
  };
};

export const calendarEventSegmentsOverlap = (
  segment: CalendarEventSegment,
  otherSegments: readonly CalendarEventSegment[],
): boolean =>
  otherSegments.some(
    (otherSegment) =>
      otherSegment.left <= segment.right && otherSegment.right >= segment.left,
  );

export const getCalendarEventLevels = (
  rowSegments: readonly CalendarEventSegment[],
  limit = Number.POSITIVE_INFINITY,
): CalendarEventLevelsResult => {
  const levels: CalendarEventSegment[][] = [];
  const extra: CalendarEventSegment[] = [];

  for (const segment of [...rowSegments].sort(compareSegments)) {
    const levelIndex = levels.findIndex(
      (level) => !calendarEventSegmentsOverlap(segment, level),
    );
    const targetIndex = levelIndex === -1 ? levels.length : levelIndex;

    if (targetIndex >= limit) {
      extra.push(segment);
    } else {
      levels[targetIndex] = [...(levels[targetIndex] ?? []), segment].sort(compareSegments);
    }
  }

  return { levels, extra };
};
