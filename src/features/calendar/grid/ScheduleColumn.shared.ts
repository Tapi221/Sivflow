import { addDays, addMonths, addYears, endOfDay, endOfMonth, endOfWeek, endOfYear, format, getDaysInMonth, isSameDay, isSameMonth, isSameYear, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

export type ScheduleColumnBuffer = {
  before: number;
  after: number;
};

export type ScheduleColumnKind = "year" | "month" | "week" | "day";

export type ScheduleColumn = {
  id: string;
  start: Date;
  end: Date;
  topLabel: string;
  bottomLabel: string;
  isToday: boolean;
  kind: ScheduleColumnKind;
};

export const getScheduleViewStart = (
  anchorDate: Date,
  viewMode: CalendarViewMode,
) => {
  const normalized = startOfDay(anchorDate);

  if (viewMode === "year") return startOfYear(normalized);
  if (viewMode === "month") return startOfMonth(normalized);

  if (viewMode === "week") {
    return startOfWeek(normalized, {
      weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
    });
  }

  return normalized;
};

export const getScheduleViewDayCount = (
  anchorDate: Date,
  viewMode: CalendarViewMode,
) => {
  if (viewMode === "year") {
    const start = startOfYear(anchorDate);
    const end = endOfYear(anchorDate);

    return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  }

  if (viewMode === "month") return getDaysInMonth(anchorDate);
  if (viewMode === "week") return 7;
  if (viewMode === "threeDays") return 3;
  return 1;
};

export const buildScheduleDisplayDays = (
  anchorDate: Date,
  viewMode: CalendarViewMode,
) => {
  const baseStart = getScheduleViewStart(anchorDate, viewMode);
  const visibleCount = getScheduleViewDayCount(anchorDate, viewMode);

  return Array.from({ length: visibleCount }, (_, index) =>
    addDays(baseStart, index),
  );
};

export const buildScheduleInteractionDays = (
  anchorDate: Date,
  viewMode: CalendarViewMode,
  buffer: ScheduleColumnBuffer,
) => {
  const displayDays = buildScheduleDisplayDays(anchorDate, viewMode);
  const baseStart = displayDays[0] ?? getScheduleViewStart(anchorDate, viewMode);
  const interactionStart = subDays(baseStart, buffer.before);
  const interactionCount = buffer.before + displayDays.length + buffer.after;

  return Array.from({ length: interactionCount }, (_, index) =>
    addDays(interactionStart, index),
  );
};

const buildYearTimelineColumns = (
  anchorDate: Date,
  buffer: ScheduleColumnBuffer,
) => {
  const columns: ScheduleColumn[] = [];
  const anchorStart = startOfYear(anchorDate);
  const today = new Date();

  for (let offset = -buffer.before; offset <= buffer.after; offset += 1) {
    const start = addYears(anchorStart, offset);
    const end = endOfYear(start);

    columns.push({
      id: `year-${start.toISOString()}`,
      start,
      end,
      topLabel: format(start, "yyyy", { locale: ja }),
      bottomLabel: "年",
      isToday: isSameYear(start, today),
      kind: "year",
    });
  }

  return columns;
};

const buildMonthTimelineColumns = (
  anchorDate: Date,
  buffer: ScheduleColumnBuffer,
) => {
  const columns: ScheduleColumn[] = [];
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

const buildWeekTimelineColumns = (
  anchorDate: Date,
  buffer: ScheduleColumnBuffer,
) => {
  const columns: ScheduleColumn[] = [];
  const anchorStart = startOfWeek(anchorDate, {
    weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
  });
  const today = new Date();

  for (let offset = -buffer.before; offset <= buffer.after; offset += 1) {
    const start = addDays(anchorStart, offset * 7);
    const end = endOfWeek(start, {
      weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
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

const buildDayTimelineColumns = (
  anchorDate: Date,
  buffer: ScheduleColumnBuffer,
) => {
  const columns: ScheduleColumn[] = [];
  const anchorStart = startOfDay(anchorDate);
  const today = new Date();

  for (let offset = -buffer.before; offset <= buffer.after; offset += 1) {
    const start = addDays(anchorStart, offset);

    columns.push({
      id: `day-${start.toISOString()}`,
      start,
      end: endOfDay(start),
      topLabel: format(start, "d", { locale: ja }),
      bottomLabel: format(start, "E", { locale: ja }),
      isToday: isSameDay(start, today),
      kind: "day",
    });
  }

  return columns;
};

export const buildScheduleTimelineColumns = (
  viewMode: CalendarViewMode,
  anchorDate: Date,
  buffer: ScheduleColumnBuffer,
) => {
  if (viewMode === "year") return buildYearTimelineColumns(anchorDate, buffer);
  if (viewMode === "month") return buildMonthTimelineColumns(anchorDate, buffer);
  if (viewMode === "week") return buildWeekTimelineColumns(anchorDate, buffer);
  return buildDayTimelineColumns(anchorDate, buffer);
};