import {
  addDays,
  addMonths,
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

  return Array.from({ length: CALENDAR_MONTH_GRID_CELL_COUNT }, (_, index) => {
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
