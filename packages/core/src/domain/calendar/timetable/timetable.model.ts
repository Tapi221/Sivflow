import type { CalendarTimetablePeriod, CalendarTimetableSlot, CalendarTimetableVisibleDayCount, CalendarTimetableWeekdayIndex } from "./timetable.types";



const TIMETABLE_MIN_VISIBLE_DAY_COUNT: CalendarTimetableVisibleDayCount = 5;
const TIMETABLE_MAX_WEEKDAY_INDEX = 6;
const DEFAULT_CALENDAR_TIMETABLE_PERIODS: readonly CalendarTimetablePeriod[] = [
  { id: "period-1", label: "1", startTime: "08:50", endTime: "10:20", order: 0 },
  { id: "period-2", label: "2", startTime: "10:30", endTime: "12:00", order: 1 },
  { id: "period-3", label: "3", startTime: "13:00", endTime: "14:30", order: 2 },
  { id: "period-4", label: "4", startTime: "14:40", endTime: "16:10", order: 3 },
  { id: "period-5", label: "5", startTime: "16:20", endTime: "17:50", order: 4 },
  { id: "period-6", label: "6", startTime: "18:00", endTime: "19:30", order: 5 },
  { id: "period-7", label: "7", startTime: "19:40", endTime: "21:10", order: 6 },
];



const createDefaultCalendarTimetablePeriods = (): CalendarTimetablePeriod[] => DEFAULT_CALENDAR_TIMETABLE_PERIODS.map((period) => ({ ...period }));
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



export { createCalendarTimetableSearchText, createDefaultCalendarTimetablePeriods, isValidCalendarTimetableWeekdayIndex, normalizeCalendarTimetableSlots, normalizeCalendarTimetableText, normalizeCalendarTimetableVisibleDayCount, sortCalendarTimetablePeriods };
