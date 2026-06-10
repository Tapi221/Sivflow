import type { CalendarTimetablePeriod, CalendarTimetableSlot, CalendarTimetableVisibleDayCount, CalendarTimetableWeekdayIndex } from "./timetable.types";

const TIMETABLE_MIN_VISIBLE_DAY_COUNT: CalendarTimetableVisibleDayCount = 5;
const TIMETABLE_MAX_WEEKDAY_INDEX = 6;

const isValidCalendarTimetableWeekdayIndex = (value: number): value is CalendarTimetableWeekdayIndex => Number.isInteger(value) && value >= 0 && value <= TIMETABLE_MAX_WEEKDAY_INDEX;

const normalizeCalendarTimetableText = (value: string): string => value.trim().replace(/\s+/g, " ");

const createCalendarTimetableSearchText = (values: string[]): string => values.map((value) => normalizeCalendarTimetableText(value).toLowerCase()).filter(Boolean).join(" ");

const normalizeCalendarTimetableVisibleDayCount = (value: number): CalendarTimetableVisibleDayCount => value <= TIMETABLE_MIN_VISIBLE_DAY_COUNT ? 5 : value === 6 ? 6 : 7;

const sortCalendarTimetablePeriods = (periods: CalendarTimetablePeriod[]): CalendarTimetablePeriod[] => [...periods].sort((left, right) => left.order - right.order);

const normalizeCalendarTimetableSlot = (slot: CalendarTimetableSlot, periodIds: Set<string>): CalendarTimetableSlot | null => {
  if (!isValidCalendarTimetableWeekdayIndex(slot.dayIndex) || !periodIds.has(slot.periodId)) return null;
  return { dayIndex: slot.dayIndex, periodId: slot.periodId };
};

const normalizeCalendarTimetableSlots = (slots: CalendarTimetableSlot[], periods: CalendarTimetablePeriod[]): CalendarTimetableSlot[] => {
  const periodIds = new Set(periods.map((period) => period.id));
  const seenKeys = new Set<string>();
  const normalizedSlots: CalendarTimetableSlot[] = [];

  slots.forEach((slot) => {
    const normalizedSlot = normalizeCalendarTimetableSlot(slot, periodIds);
    if (!normalizedSlot) return;

    const key = `${normalizedSlot.dayIndex}:${normalizedSlot.periodId}`;
    if (seenKeys.has(key)) return;

    seenKeys.add(key);
    normalizedSlots.push(normalizedSlot);
  });

  return normalizedSlots;
};

export { createCalendarTimetableSearchText, isValidCalendarTimetableWeekdayIndex, normalizeCalendarTimetableSlots, normalizeCalendarTimetableText, normalizeCalendarTimetableVisibleDayCount, sortCalendarTimetablePeriods };
