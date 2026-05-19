import {
  CALENDAR_ARROW_DIFF_MAP,
  CALENDAR_WEEK_DAYS_MONDAY,
  CALENDAR_WEEK_DAYS_SUNDAY,
} from "@constants/shared/calendar";
import { normalizeDate } from "@/shared/codec/date";
import { format } from "date-fns";

import type {
  CalendarStudyLogLike,
  CalendarTimestampLike,
  CalendarWeekStartDay,
} from "./calendar.types";
import type { Translations } from "@/i18n/translations";

type CalendarArrowKey = keyof typeof CALENDAR_ARROW_DIFF_MAP;

export const toDate = (value: CalendarTimestampLike): Date | null => {
  return normalizeDate(value);
};

export const toDateKey = (value: Date) => {
  return format(value, "yyyy-MM-dd");
};

export const normalizeDateOnly = (value: Date) => {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
};

export const getWeekDays = (weekStartDay: CalendarWeekStartDay) => {
  return weekStartDay === "sunday"
    ? [...CALENDAR_WEEK_DAYS_SUNDAY]
    : [...CALENDAR_WEEK_DAYS_MONDAY];
};

export const getArrowDayDiff = (key: string): number | null => {
  if (!(key in CALENDAR_ARROW_DIFF_MAP)) {
    return null;
  }

  return CALENDAR_ARROW_DIFF_MAP[key as CalendarArrowKey];
};

export const getCalendarIntensity = (count: number) => {
  if (count <= 0) return 0;
  return Math.min(5, Math.ceil(count / 5));
};

/**
 * 今日の復習説明文を返す。
 * t（翻訳辞書）を受け取ることでロケール対応する。
 */
export const getTodayDescription = (
  todayDueCount: number,
  t: Pick<Translations, "todayDescriptionEmpty" | "todayDescriptionDue">,
) => {
  return todayDueCount === 0 ? t.todayDescriptionEmpty : t.todayDescriptionDue;
};

export const isFocusableInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable
  );
};

export const getLogDate = (log: CalendarStudyLogLike): Date | null => {
  const raw = log.studiedAt ?? log.createdAt;
  return toDate(raw);
};

export const buildStudyDateSet = (logs: CalendarStudyLogLike[]) => {
  return new Set(
    logs
      .map(getLogDate)
      .filter((value): value is Date => value instanceof Date)
      .map((value) => normalizeDateOnly(value).toDateString()),
  );
};

export const getStreakFromLogs = (logs: CalendarStudyLogLike[]) => {
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

    if (index !== 0) {
      break;
    }
  }

  return count;
};