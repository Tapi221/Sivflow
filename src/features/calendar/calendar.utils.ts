import type { Translations } from "@shared/i18n/translations";
import { format } from "date-fns";
import type { CalendarStudyLogLike, CalendarTimestampLike, CalendarWeekStartDay } from "./calendar.types";
import { normalizeDate } from "@/utils/codec/date";



type CalendarArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";
type CalendarWeekDayLabel = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";



const CALENDAR_WEEK_DAYS_SUNDAY: CalendarWeekDayLabel[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const CALENDAR_WEEK_DAYS_MONDAY: CalendarWeekDayLabel[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const CALENDAR_ARROW_DIFF_MAP: Record<CalendarArrowKey, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const DEFAULT_TODAY_DESCRIPTION_LABELS: Pick<Translations, "todayDescriptionEmpty" | "todayDescriptionDue"> = { todayDescriptionEmpty: "今日の復習はありません", todayDescriptionDue: "今日の復習があります" };



const toDate = (value: CalendarTimestampLike): Date | null => normalizeDate(value);
const toDateKey = (value: Date) => format(value, "yyyy-MM-dd");
const normalizeDateOnly = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const getWeekDays = (weekStartDay: CalendarWeekStartDay) => weekStartDay === "sunday" ? [...CALENDAR_WEEK_DAYS_SUNDAY] : [...CALENDAR_WEEK_DAYS_MONDAY];
const getArrowDayDiff = (key: string): number | null => key in CALENDAR_ARROW_DIFF_MAP ? CALENDAR_ARROW_DIFF_MAP[key as CalendarArrowKey] : null;
const getCalendarIntensity = (count: number) => count <= 0 ? 0 : Math.min(5, Math.ceil(count / 5));
const getTodayDescription = (todayDueCount: number, t: Pick<Translations, "todayDescriptionEmpty" | "todayDescriptionDue"> = DEFAULT_TODAY_DESCRIPTION_LABELS) => todayDueCount === 0 ? t.todayDescriptionEmpty : t.todayDescriptionDue;
const isFocusableInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable;
};
const getLogDate = (log: CalendarStudyLogLike): Date | null => toDate(log.studiedAt ?? log.createdAt);
const buildStudyDateSet = (logs: CalendarStudyLogLike[]) => new Set(logs.map(getLogDate).filter((value): value is Date => value instanceof Date).map((value) => normalizeDateOnly(value).toDateString()));
const getStreakFromLogs = (logs: CalendarStudyLogLike[]) => {
  if (logs.length === 0) return 0;
  const dateSet = buildStudyDateSet(logs);
  const today = normalizeDateOnly(new Date());
  let count = 0;
  for (let index = 0; index < 365; index += 1) {
    const cursor = new Date(today);
    cursor.setDate(today.getDate() - index);
    if (dateSet.has(cursor.toDateString())) {
      count += 1;
      continue;
    }
    if (index !== 0) break;
  }
  return count;
};



export { buildStudyDateSet, getArrowDayDiff, getCalendarIntensity, getLogDate, getStreakFromLogs, getTodayDescription, getWeekDays, isFocusableInputTarget, normalizeDateOnly, toDate, toDateKey };
