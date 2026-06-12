import type { CalendarRecurrenceFrequency, CalendarRecurrenceRule, CalendarWeekday } from "@core/calendar";
import { normalizeCalendarRecurrenceRule } from "@core/calendar";



const GOOGLE_FREQUENCY_BY_CALENDAR_FREQUENCY: Record<CalendarRecurrenceFrequency, string> = {
  daily: "DAILY",
  monthly: "MONTHLY",
  weekly: "WEEKLY",
  yearly: "YEARLY",
};
const CALENDAR_FREQUENCY_BY_GOOGLE_FREQUENCY: Record<string, CalendarRecurrenceFrequency> = {
  DAILY: "daily",
  MONTHLY: "monthly",
  WEEKLY: "weekly",
  YEARLY: "yearly",
};
const GOOGLE_DAY_BY_WEEKDAY: Record<CalendarWeekday, string> = {
  0: "SU",
  1: "MO",
  2: "TU",
  3: "WE",
  4: "TH",
  5: "FR",
  6: "SA",
};
const WEEKDAY_BY_GOOGLE_DAY: Record<string, CalendarWeekday> = {
  FR: 5,
  MO: 1,
  SA: 6,
  SU: 0,
  TH: 4,
  TU: 2,
  WE: 3,
};
const RRULE_PREFIX = "RRULE:";



const formatGoogleUntilDate = (date: Date): string => date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
const parseIntegerList = (value: string | undefined): number[] | undefined => {
  if (!value) return undefined;

  const values = value
    .split(",")
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item));

  return values.length > 0 ? values : undefined;
};
const parseGoogleUntilDate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;

  const dateOnlyMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);

    return Number.isFinite(date.getTime()) ? date : undefined;
  }

  const utcMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!utcMatch) return undefined;

  const [, year, month, day, hour, minute, second] = utcMatch;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));

  return Number.isFinite(date.getTime()) ? date : undefined;
};
const parseGoogleDayList = (value: string | undefined): CalendarWeekday[] | undefined => {
  if (!value) return undefined;

  const days = value
    .split(",")
    .map((item) => item.match(/(SU|MO|TU|WE|TH|FR|SA)$/)?.[1])
    .map((item) => (item ? WEEKDAY_BY_GOOGLE_DAY[item] : undefined))
    .filter((item): item is CalendarWeekday => item !== undefined);

  return days.length > 0 ? days : undefined;
};
const serializeGoogleRecurrenceRule = (rule: CalendarRecurrenceRule | null | undefined): string | null => {
  const normalized = normalizeCalendarRecurrenceRule(rule);
  if (!normalized) return null;

  const parts = [`FREQ=${GOOGLE_FREQUENCY_BY_CALENDAR_FREQUENCY[normalized.frequency]}`];

  if (normalized.interval) parts.push(`INTERVAL=${normalized.interval}`);
  if (normalized.endDate) parts.push(`UNTIL=${formatGoogleUntilDate(normalized.endDate)}`);
  else if (normalized.occurrence) parts.push(`COUNT=${normalized.occurrence}`);
  if (normalized.daysOfWeek?.length) parts.push(`BYDAY=${normalized.daysOfWeek.map((day) => GOOGLE_DAY_BY_WEEKDAY[day]).join(",")}`);
  if (normalized.daysOfMonth?.length) parts.push(`BYMONTHDAY=${normalized.daysOfMonth.join(",")}`);
  if (normalized.monthsOfYear?.length) parts.push(`BYMONTH=${normalized.monthsOfYear.join(",")}`);

  return `${RRULE_PREFIX}${parts.join(";")}`;
};
const parseGoogleRecurrenceRule = (recurrence: readonly string[] | undefined): CalendarRecurrenceRule | undefined => {
  const rawRRule = recurrence?.find((item) => item.toUpperCase().startsWith(RRULE_PREFIX));
  if (!rawRRule) return undefined;

  const tokens = rawRRule.slice(RRULE_PREFIX.length).split(";");
  const values = new Map<string, string>();

  for (const token of tokens) {
    const [rawKey, ...rawValue] = token.split("=");
    const key = rawKey?.trim().toUpperCase();
    const value = rawValue.join("=").trim();

    if (key && value) values.set(key, value);
  }

  const frequency = CALENDAR_FREQUENCY_BY_GOOGLE_FREQUENCY[values.get("FREQ")?.toUpperCase() ?? ""];
  if (!frequency) return undefined;

  return normalizeCalendarRecurrenceRule({
    frequency,
    interval: Number.parseInt(values.get("INTERVAL") ?? "", 10),
    endDate: parseGoogleUntilDate(values.get("UNTIL")),
    occurrence: Number.parseInt(values.get("COUNT") ?? "", 10),
    daysOfWeek: parseGoogleDayList(values.get("BYDAY")),
    daysOfMonth: parseIntegerList(values.get("BYMONTHDAY")),
    monthsOfYear: parseIntegerList(values.get("BYMONTH")),
  });
};



export { serializeGoogleRecurrenceRule, parseGoogleRecurrenceRule };
