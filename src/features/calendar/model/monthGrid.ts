import {
  addDays,
  addMonths,
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

export const CALENDAR_MONTH_GRID_CELL_COUNT = 42;
export const CALENDAR_MONTH_WEEK_STARTS_ON = 0;

const buildCalendarMonthDaysBetween = ({
  monthStart,
  gridStart,
  gridEnd,
}: {
  monthStart: Date;
  gridStart: Date;
  gridEnd: Date;
}): CalendarMonthGridDay[] => {
  const cellCount = differenceInCalendarDays(gridEnd, gridStart) + 1;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = addDays(gridStart, index);

    return {
      date,
      key: format(date, "yyyy-MM-dd"),
      dayOfMonth: date.getDate(),
      isCurrentMonth: isSameMonth(date, monthStart),
      isMonthStart: date.getDate() === 1,
    };
  });
};

export const getCalendarMonthKey = (date: Date): string => {
  return format(startOfMonth(date), "yyyy-MM");
};

export const addCalendarMonths = (date: Date, amount: number): Date => {
  return startOfMonth(addMonths(startOfMonth(date), amount));
};

export const buildCalendarMonthGridDays = (
  baseDate: Date,
): CalendarMonthGridDay[] => {
  const monthStart = startOfMonth(baseDate);
  const gridStart = startOfWeek(monthStart, {
    weekStartsOn: CALENDAR_MONTH_WEEK_STARTS_ON,
  });
  const gridEnd = addDays(gridStart, CALENDAR_MONTH_GRID_CELL_COUNT - 1);

  return buildCalendarMonthDaysBetween({
    monthStart,
    gridStart,
    gridEnd,
  });
};

export const buildCalendarMonthStackGridDays = (
  baseDate: Date,
): CalendarMonthGridDay[] => {
  const monthStart = startOfMonth(baseDate);
  const gridStart = startOfWeek(monthStart, {
    weekStartsOn: CALENDAR_MONTH_WEEK_STARTS_ON,
  });
  const gridEnd = endOfWeek(endOfMonth(monthStart), {
    weekStartsOn: CALENDAR_MONTH_WEEK_STARTS_ON,
  });

  return buildCalendarMonthDaysBetween({
    monthStart,
    gridStart,
    gridEnd,
  });
};

export const buildCalendarMonthPage = (baseDate: Date): CalendarMonthPage => {
  const monthStart = startOfMonth(baseDate);

  return {
    key: getCalendarMonthKey(monthStart),
    monthStart,
    label: format(monthStart, "yyyy年 M月", { locale: ja }),
    days: buildCalendarMonthStackGridDays(monthStart),
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
