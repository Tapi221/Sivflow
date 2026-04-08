import { format } from "date-fns";

import type {
  CalendarStudyLogLike,
  CalendarTimestampLike,
  CalendarWeekStartDay,
} from "./calendarTypes";
import {
  CALENDAR_ARROW_DIFF_MAP,
  CALENDAR_WEEK_DAYS_MONDAY,
  CALENDAR_WEEK_DAYS_SUNDAY,
} from "./calendarConstants";

type CalendarArrowKey = keyof typeof CALENDAR_ARROW_DIFF_MAP;

export const toDate = (value: CalendarTimestampLike): Date | null => {
  if (!value) return null;

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const nextDate = value.toDate();
    return nextDate instanceof Date && !Number.isNaN(nextDate.getTime())
      ? nextDate
      : null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object") {
    const seconds =
      typeof value.seconds === "number"
        ? value.seconds
        : typeof value._seconds === "number"
          ? value._seconds
          : null;

    const nanoseconds =
      typeof value.nanoseconds === "number"
        ? value.nanoseconds
        : typeof value._nanoseconds === "number"
          ? value._nanoseconds
          : 0;

    if (seconds !== null) {
      const nextDate = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
      return Number.isNaN(nextDate.getTime()) ? null : nextDate;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const nextDate = new Date(value);
    return Number.isNaN(nextDate.getTime()) ? null : nextDate;
  }

  return null;
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

export const getTodayDescription = (todayDueCount: number) => {
  return todayDueCount === 0
    ? "今日の復習はありません。"
    : "忘れる前に復習しましょう。";
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

  for (let i = 0; i < 365; i += 1) {
    const cursor = new Date(today);
    cursor.setDate(today.getDate() - i);

    if (dateSet.has(cursor.toDateString())) {
      count += 1;
      continue;
    }

    if (i !== 0) {
      break;
    }
  }

  return count;
};
