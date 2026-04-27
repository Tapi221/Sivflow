import {
  addDays,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarMonthGridDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isMonthStart: boolean;
};

export const CALENDAR_MONTH_GRID_CELL_COUNT = 42;
export const CALENDAR_MONTH_WEEK_STARTS_ON = 0;

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
