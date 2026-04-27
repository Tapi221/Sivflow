import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ja } from "date-fns/locale";

export type CalendarMonthGridDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isMonthStart: boolean;
};

export type CalendarMonthPage = {
  key: string;
  monthStart: Date;
  label: string;
  days: CalendarMonthGridDay[];
};

export type CalendarMonthWeek = {
  key: string;
  weekStart: Date;
  visibleMonthDate: Date;
  days: CalendarMonthGridDay[];
};

export const CALENDAR_MONTH_GRID_CELL_COUNT = 42;
export const CALENDAR_MONTH_WEEK_STARTS_ON = 0;
export const CALENDAR_MONTH_WEEK_DAY_COUNT = 7;

export const getCalendarMonthKey = (date: Date): string => {
  return format(startOfMonth(date), "yyyy-MM");
};

export const getCalendarWeekKey = (date: Date): string => {
  return format(
    startOfWeek(date, { weekStartsOn: CALENDAR_MONTH_WEEK_STARTS_ON }),
    "yyyy-MM-dd",
  );
};

export const addCalendarMonths = (date: Date, amount: number): Date => {
  return startOfMonth(addMonths(startOfMonth(date), amount));
};

const buildCalendarGridDay = (
  date: Date,
  currentMonthDate: Date,
): CalendarMonthGridDay => {
  return {
    date,
    key: format(date, "yyyy-MM-dd"),
    dayOfMonth: date.getDate(),
    isCurrentMonth: isSameMonth(date, currentMonthDate),
    isMonthStart: date.getDate() === 1,
  };
};

const resolveVisibleMonthDateForWeek = (weekStart: Date): Date => {
  return startOfMonth(addDays(weekStart, 3));
};

export const buildCalendarMonthGridDays = (
  baseDate: Date,
): CalendarMonthGridDay[] => {
  const monthStart = startOfMonth(baseDate);
  const gridStart = startOfWeek(monthStart, {
    weekStartsOn: CALENDAR_MONTH_WEEK_STARTS_ON,
  });

  return Array.from({ length: CALENDAR_MONTH_GRID_CELL_COUNT }, (_, index) => {
    const date = addDays(gridStart, index);
    return buildCalendarGridDay(date, monthStart);
  });
};

export const buildCalendarMonthPage = (baseDate: Date): CalendarMonthPage => {
  const monthStart = startOfMonth(baseDate);

  return {
    key: getCalendarMonthKey(monthStart),
    monthStart,
    label: format(monthStart, "yyyy年 M月", { locale: ja }),
    days: buildCalendarMonthGridDays(monthStart),
  };
};

export const buildCalendarMonthPages = ({
  anchorDate,
  startOffset,
  endOffset,
}: {
  anchorDate: Date;
  startOffset: number;
  endOffset: number;
}): CalendarMonthPage[] => {
  const anchorMonth = startOfMonth(anchorDate);
  const pageCount = Math.max(0, endOffset - startOffset + 1);

  return Array.from({ length: pageCount }, (_, index) =>
    buildCalendarMonthPage(addCalendarMonths(anchorMonth, startOffset + index)),
  );
};

export const buildCalendarMonthWeeks = ({
  anchorDate,
  startOffset,
  endOffset,
}: {
  anchorDate: Date;
  startOffset: number;
  endOffset: number;
}): CalendarMonthWeek[] => {
  if (endOffset < startOffset) return [];

  const anchorMonth = startOfMonth(anchorDate);
  const firstMonth = addCalendarMonths(anchorMonth, startOffset);
  const lastMonth = addCalendarMonths(anchorMonth, endOffset);
  const rangeStart = startOfWeek(startOfMonth(firstMonth), {
    weekStartsOn: CALENDAR_MONTH_WEEK_STARTS_ON,
  });
  const rangeEnd = endOfWeek(endOfMonth(lastMonth), {
    weekStartsOn: CALENDAR_MONTH_WEEK_STARTS_ON,
  });
  const weekCount =
    Math.floor(differenceInCalendarDays(rangeEnd, rangeStart) / 7) + 1;

  return Array.from({ length: weekCount }, (_, weekIndex) => {
    const weekStart = addWeeks(rangeStart, weekIndex);
    const visibleMonthDate = resolveVisibleMonthDateForWeek(weekStart);

    return {
      key: getCalendarWeekKey(weekStart),
      weekStart,
      visibleMonthDate,
      days: Array.from(
        { length: CALENDAR_MONTH_WEEK_DAY_COUNT },
        (_, dayIndex) =>
          buildCalendarGridDay(addDays(weekStart, dayIndex), visibleMonthDate),
      ),
    };
  });
};
