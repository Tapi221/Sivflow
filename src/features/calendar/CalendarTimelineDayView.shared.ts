import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ja } from "date-fns/locale";

const WEEK_STARTS_ON_MONDAY = 1;

export type TimelineViewMode = "month" | "week" | "days";

export type TimelineUnitBuffer = {
  before: number;
  after: number;
};

export type TimelineColumn = {
  id: string;
  start: Date;
  end: Date;
  topLabel: string;
  bottomLabel: string;
  isToday: boolean;
  kind: "month" | "week" | "day";
};

const buildMonthColumns = (anchorDate: Date, buffer: TimelineUnitBuffer) => {
  const columns: TimelineColumn[] = [];
  const anchorStart = startOfMonth(anchorDate);
  const today = new Date();

  for (let offset = -buffer.before; offset <= buffer.after; offset += 1) {
    const start = addMonths(anchorStart, offset);
    const end = endOfMonth(start);

    columns.push({
      id: `month-${start.toISOString()}`,
      start,
      end,
      topLabel: format(start, "M", { locale: ja }),
      bottomLabel: "月",
      isToday: isSameMonth(start, today),
      kind: "month",
    });
  }

  return columns;
};

const buildWeekColumns = (anchorDate: Date, buffer: TimelineUnitBuffer) => {
  const columns: TimelineColumn[] = [];
  const anchorStart = startOfWeek(anchorDate, {
    weekStartsOn: WEEK_STARTS_ON_MONDAY,
  });
  const today = new Date();

  for (let offset = -buffer.before; offset <= buffer.after; offset += 1) {
    const start = addDays(anchorStart, offset * 7);
    const end = endOfWeek(start, {
      weekStartsOn: WEEK_STARTS_ON_MONDAY,
    });

    columns.push({
      id: `week-${start.toISOString()}`,
      start,
      end,
      topLabel: format(start, "M/d", { locale: ja }),
      bottomLabel: format(end, "M/d", { locale: ja }),
      isToday: today >= start && today <= end,
      kind: "week",
    });
  }

  return columns;
};

const buildDayColumns = (anchorDate: Date, buffer: TimelineUnitBuffer) => {
  const columns: TimelineColumn[] = [];
  const anchorStart = startOfDay(anchorDate);
  const today = new Date();

  for (let offset = -buffer.before; offset <= buffer.after; offset += 1) {
    const start = addDays(anchorStart, offset);

    columns.push({
      id: `day-${start.toISOString()}`,
      start,
      end: start,
      topLabel: format(start, "d", { locale: ja }),
      bottomLabel: format(start, "E", { locale: ja }),
      isToday: isSameDay(start, today),
      kind: "day",
    });
  }

  return columns;
};

export const buildTimelineColumns = (
  viewMode: TimelineViewMode,
  anchorDate: Date,
  buffer: TimelineUnitBuffer,
) => {
  if (viewMode === "month") {
    return buildMonthColumns(anchorDate, buffer);
  }

  if (viewMode === "week") {
    return buildWeekColumns(anchorDate, buffer);
  }

  return buildDayColumns(anchorDate, buffer);
};

export const getTimelineColumnWidth = (
  viewMode: TimelineViewMode,
  dayColumnWidth: number,
) => {
  if (viewMode === "month") {
    return Math.max(168, Math.round(dayColumnWidth * 1.6));
  }

  if (viewMode === "week") {
    return Math.max(132, Math.round(dayColumnWidth * 1.2));
  }

  return dayColumnWidth;
};

export const getTimelineAnchorColumnIndex = (
  columns: TimelineColumn[],
  selectedDate: Date,
) => {
  const selectedTime = selectedDate.getTime();
  const matchIndex = columns.findIndex((column) => {
    return (
      selectedTime >= column.start.getTime() &&
      selectedTime <= column.end.getTime()
    );
  });

  return matchIndex >= 0 ? matchIndex : 0;
};
