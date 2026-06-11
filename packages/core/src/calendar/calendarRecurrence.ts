type CalendarRecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";
type CalendarWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type CalendarRecurrenceRule = { frequency: CalendarRecurrenceFrequency;
  interval?: number;
  endDate?: Date;
  occurrence?: number;
  daysOfWeek?: CalendarWeekday[];
  daysOfMonth?: number[];
  monthsOfYear?: number[];
};

const CALENDAR_RECURRENCE_FREQUENCIES: readonly CalendarRecurrenceFrequency[] = ["daily", "weekly", "monthly", "yearly"];

const clampPositiveInteger = (value: number | undefined): number | undefined => {
  if (value === undefined || !Number.isFinite(value)) return undefined;

  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : undefined;
};
const toValidDate = (value: Date | undefined): Date | undefined => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return undefined;

  return new Date(value);
};
const uniqueNumbersInRange = <T extends number>(values: readonly number[] | undefined, min: number, max: number): T[] | undefined => {
  if (!values) return undefined;

  const normalized = Array.from(new Set(values.filter((value) => Number.isInteger(value) && value >= min && value <= max))).sort((a, b) => a - b) as T[];

  return normalized.length > 0 ? normalized : undefined;
};
const normalizeCalendarRecurrenceRule = (rule: CalendarRecurrenceRule | null | undefined): CalendarRecurrenceRule | undefined => {
  if (!rule || !CALENDAR_RECURRENCE_FREQUENCIES.includes(rule.frequency)) return undefined;

  const normalized: CalendarRecurrenceRule = {
    frequency: rule.frequency,
  };
  const interval = clampPositiveInteger(rule.interval);
  const occurrence = clampPositiveInteger(rule.occurrence);
  const endDate = toValidDate(rule.endDate);
  const daysOfWeek = uniqueNumbersInRange<CalendarWeekday>(rule.daysOfWeek, 0, 6);
  const daysOfMonth = uniqueNumbersInRange(rule.daysOfMonth, -31, 31)?.filter((value) => value !== 0);
  const monthsOfYear = uniqueNumbersInRange(rule.monthsOfYear, 1, 12);

  if (interval && interval !== 1) normalized.interval = interval;
  if (endDate) normalized.endDate = endDate;
  if (!endDate && occurrence) normalized.occurrence = occurrence;
  if (daysOfWeek) normalized.daysOfWeek = daysOfWeek;
  if (daysOfMonth?.length) normalized.daysOfMonth = daysOfMonth;
  if (monthsOfYear) normalized.monthsOfYear = monthsOfYear;

  return normalized;
};

export { CALENDAR_RECURRENCE_FREQUENCIES, normalizeCalendarRecurrenceRule };
export type { CalendarRecurrenceFrequency, CalendarWeekday, CalendarRecurrenceRule };
