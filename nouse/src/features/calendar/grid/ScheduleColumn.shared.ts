import { addDays, endOfYear, getDaysInMonth, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays } from "date-fns";
import type { CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import { getCalendarWeekStartsOn } from "@/features/calendar/calendarWeekStart";
import { DEFAULT_CALENDAR_MONTH_WEEK_START_DAY } from "@/features/calendar/model/calendarMonth.model";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";



type ScheduleColumnBuffer = {
  before: number;
  after: number;
};
type ScheduleVirtualRail = {
  startDate: Date;
  anchorIndex: number;
  totalDayCount: number;
};



const getScheduleViewStart = (anchorDate: Date, viewMode: CalendarViewMode, weekStartDay: CalendarWeekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY) => {
  const normalized = startOfDay(anchorDate);

  if (viewMode === "year") return startOfYear(normalized);
  if (viewMode === "month" || viewMode === "list") return startOfMonth(normalized);

  if (viewMode === "week" || viewMode === "timetable") {
    return startOfWeek(normalized, {
      weekStartsOn: getCalendarWeekStartsOn(weekStartDay),
    });
  }

  return normalized;
};
const getScheduleViewDayCount = (anchorDate: Date, viewMode: CalendarViewMode) => {
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
const buildScheduleDisplayDays = (anchorDate: Date, viewMode: CalendarViewMode, weekStartDay: CalendarWeekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY) => {
  const baseStart = getScheduleViewStart(anchorDate, viewMode, weekStartDay);
  const visibleCount = getScheduleViewDayCount(anchorDate, viewMode);

  return Array.from({ length: visibleCount }, (_, index) =>
    addDays(baseStart, index),
  );
};
const buildScheduleInteractionDays = (anchorDate: Date, viewMode: CalendarViewMode, buffer: ScheduleColumnBuffer, weekStartDay: CalendarWeekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY) => {
  const displayDays = buildScheduleDisplayDays(anchorDate, viewMode, weekStartDay);
  const baseStart = displayDays[0] ?? getScheduleViewStart(anchorDate, viewMode, weekStartDay);
  const interactionStart = subDays(baseStart, buffer.before);
  const interactionCount = buffer.before + displayDays.length + buffer.after;

  return Array.from({ length: interactionCount }, (_, index) =>
    addDays(interactionStart, index),
  );
};
const buildScheduleVirtualRail = (anchorDate: Date, viewMode: CalendarViewMode, buffer: ScheduleColumnBuffer, weekStartDay: CalendarWeekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY): ScheduleVirtualRail => {
  const displayDays = buildScheduleDisplayDays(anchorDate, viewMode, weekStartDay);
  const baseStart = displayDays[0] ?? getScheduleViewStart(anchorDate, viewMode, weekStartDay);

  return {
    startDate: subDays(baseStart, buffer.before),
    anchorIndex: buffer.before,
    totalDayCount: buffer.before + displayDays.length + buffer.after,
  };
};
const buildScheduleVirtualRailDays = (rail: ScheduleVirtualRail, startIndex: number, endIndex: number): Date[] => {
  const start = Math.max(0, Math.min(rail.totalDayCount, startIndex));
  const end = Math.max(start, Math.min(rail.totalDayCount, endIndex));

  return Array.from({ length: end - start }, (_, index) =>
    addDays(rail.startDate, start + index),
  );
};
const getScheduleVirtualRailDate = (rail: ScheduleVirtualRail, index: number): Date | null => {
  if (index < 0 || index >= rail.totalDayCount) return null;

  return addDays(rail.startDate, index);
};



export { getScheduleViewStart, getScheduleViewDayCount, buildScheduleDisplayDays, buildScheduleInteractionDays, buildScheduleVirtualRail, buildScheduleVirtualRailDays, getScheduleVirtualRailDate };


export type { ScheduleColumnBuffer, ScheduleVirtualRail };
