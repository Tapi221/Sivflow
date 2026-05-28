import { addDays, endOfYear, getDaysInMonth, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays } from "date-fns";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

export type ScheduleColumnBuffer = {
  before: number;
  after: number;
};

export type ScheduleVirtualRail = {
  startDate: Date;
  anchorIndex: number;
  totalDayCount: number;
};

export const getScheduleViewStart = (
  anchorDate: Date,
  viewMode: CalendarViewMode,
) => {
  const normalized = startOfDay(anchorDate);

  if (viewMode === "year") return startOfYear(normalized);
  if (viewMode === "month" || viewMode === "list") return startOfMonth(normalized);

  if (viewMode === "week" || viewMode === "timetable") {
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

  if (viewMode === "month" || viewMode === "list") return getDaysInMonth(anchorDate);
  if (viewMode === "week" || viewMode === "timetable") return 7;
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

export const buildScheduleVirtualRail = (
  anchorDate: Date,
  viewMode: CalendarViewMode,
  buffer: ScheduleColumnBuffer,
): ScheduleVirtualRail => {
  const displayDays = buildScheduleDisplayDays(anchorDate, viewMode);
  const baseStart = displayDays[0] ?? getScheduleViewStart(anchorDate, viewMode);

  return {
    startDate: subDays(baseStart, buffer.before),
    anchorIndex: buffer.before,
    totalDayCount: buffer.before + displayDays.length + buffer.after,
  };
};

export const buildScheduleVirtualRailDays = (
  rail: ScheduleVirtualRail,
  startIndex: number,
  endIndex: number,
): Date[] => {
  const start = Math.max(0, Math.min(rail.totalDayCount, startIndex));
  const end = Math.max(start, Math.min(rail.totalDayCount, endIndex));

  return Array.from({ length: end - start }, (_, index) =>
    addDays(rail.startDate, start + index),
  );
};

export const getScheduleVirtualRailDate = (
  rail: ScheduleVirtualRail,
  index: number,
): Date | null => {
  if (index < 0 || index >= rail.totalDayCount) return null;

  return addDays(rail.startDate, index);
};