import { addDays, addMonths, addWeeks, differenceInCalendarDays, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import type { CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import { getCalendarWeekStartsOn } from "@/features/calendar/calendarWeekStart";



type CalendarMonthGridDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isMonthStart: boolean;
};
type CalendarMonthPage = {
  key: string;
  monthStart: Date;
  label: string;
  days: CalendarMonthGridDay[];
};
type CalendarMonthWeek = {
  key: string;
  weekStart: Date;
  visibleMonthDate: Date;
  days: CalendarMonthGridDay[];
};



const CALENDAR_MONTH_GRID_CELL_COUNT = 42;
const CALENDAR_MONTH_WEEK_DAY_COUNT = 7;
const DEFAULT_CALENDAR_MONTH_WEEK_START_DAY: CalendarWeekStartDay = "monday";



const getCalendarMonthKey = (date: Date): string => {
  return format(startOfMonth(date), "yyyy-MM");
};
const getCalendarWeekKey = (date: Date, weekStartDay: CalendarWeekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY): string => {
  return format(startOfWeek(date, { weekStartsOn: getCalendarWeekStartsOn(weekStartDay) }), "yyyy-MM-dd");
};
const addCalendarMonths = (date: Date, amount: number): Date => {
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
const buildCalendarMonthGridDays = (baseDate: Date, weekStartDay: CalendarWeekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY): CalendarMonthGridDay[] => {
  const monthStart = startOfMonth(baseDate);
  const gridStart = startOfWeek(monthStart, {
    weekStartsOn: getCalendarWeekStartsOn(weekStartDay),
  });

  return Array.from({ length: CALENDAR_MONTH_GRID_CELL_COUNT }, (_, index) => {
    const date = addDays(gridStart, index);
    return buildCalendarGridDay(date, monthStart);
  });
};
const buildCalendarMonthPage = (baseDate: Date, weekStartDay: CalendarWeekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY): CalendarMonthPage => {
  const monthStart = startOfMonth(baseDate);

  return {
    key: getCalendarMonthKey(monthStart),
    monthStart,
    label: format(monthStart, "yyyy年 M月", { locale: ja }),
    days: buildCalendarMonthGridDays(monthStart, weekStartDay),
  };
};
const buildCalendarMonthPages = ({ anchorDate, startOffset, endOffset, weekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY }: { anchorDate: Date;
  startOffset: number;
  endOffset: number;
  weekStartDay?: CalendarWeekStartDay;
}): CalendarMonthPage[] => {
  const anchorMonth = startOfMonth(anchorDate);
  const pageCount = Math.max(0, endOffset - startOffset + 1);

  return Array.from({ length: pageCount }, (_, index) =>
    buildCalendarMonthPage(addCalendarMonths(anchorMonth, startOffset + index), weekStartDay),
  );
};
const buildCalendarMonthWeeks = ({ anchorDate, startOffset, endOffset, weekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY }: { anchorDate: Date;
  startOffset: number;
  endOffset: number;
  weekStartDay?: CalendarWeekStartDay;
}): CalendarMonthWeek[] => {
  if (endOffset < startOffset) return [];

  const weekStartsOn = getCalendarWeekStartsOn(weekStartDay);
  const anchorMonth = startOfMonth(anchorDate);
  const firstMonth = addCalendarMonths(anchorMonth, startOffset);
  const lastMonth = addCalendarMonths(anchorMonth, endOffset);
  const rangeStart = startOfWeek(startOfMonth(firstMonth), {
    weekStartsOn,
  });
  const rangeEnd = endOfWeek(endOfMonth(lastMonth), {
    weekStartsOn,
  });
  const weekCount =
    Math.floor(differenceInCalendarDays(rangeEnd, rangeStart) / 7) + 1;

  return Array.from({ length: weekCount }, (_, weekIndex) => {
    const weekStart = addWeeks(rangeStart, weekIndex);
    const visibleMonthDate = resolveVisibleMonthDateForWeek(weekStart);

    return {
      key: getCalendarWeekKey(weekStart, weekStartDay),
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



export { CALENDAR_MONTH_GRID_CELL_COUNT, CALENDAR_MONTH_WEEK_DAY_COUNT, DEFAULT_CALENDAR_MONTH_WEEK_START_DAY, getCalendarMonthKey, getCalendarWeekKey, addCalendarMonths, buildCalendarMonthGridDays, buildCalendarMonthPage, buildCalendarMonthPages, buildCalendarMonthWeeks };


export type { CalendarMonthGridDay, CalendarMonthPage, CalendarMonthWeek };
