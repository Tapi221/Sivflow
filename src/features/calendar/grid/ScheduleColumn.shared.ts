import { addDays, endOfMonth, endOfWeek, endOfYear, getDaysInMonth, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays } from "date-fns";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

export type ScheduleColumnBuffer = {
  before: number;
  after: number;
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