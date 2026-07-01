import { addDays, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode, CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { getCalendarWeekStartsOn } from "@/features/calendar/calendarWeekStart";
import { DEFAULT_CALENDAR_MONTH_WEEK_START_DAY } from "@/features/calendar/model/calendarMonth.model";



type CalendarEventSyncRange = {
  rangeStart: Date;
  rangeEnd: Date;
};
type BuildCalendarEventSyncRangeOptions = {
  selectedViewMode: CalendarViewMode;
  visibleDays: Date[];
  monthTitleDate: Date;
  weekStartDay?: CalendarWeekStartDay;
  monthRenderedRange?: CalendarDateRange | null;
  yearRenderedRange?: CalendarDateRange | null;
  yearSyncRange?: CalendarDateRange | null;
};



const LIST_AND_PIE_CHART_SYNC_BUFFER_DAYS = 45;
const WEEKDAY_SYNC_BUFFER_DAYS = 21;
const WEEKDAY_PRIORITY_SYNC_BUFFER_DAYS = 7;
const DEFAULT_VISIBLE_DAY_BUFFER_DAYS = 2;



const buildMiniCalendarMonthRange = (monthTitleDate: Date, weekStartDay: CalendarWeekStartDay): CalendarEventSyncRange => {
  const weekStartsOn = getCalendarWeekStartsOn(weekStartDay);
  const gridStart = startOfWeek(startOfMonth(monthTitleDate), { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(monthTitleDate), { weekStartsOn });

  return {
    rangeStart: startOfDay(gridStart),
    rangeEnd: endOfDay(gridEnd),
  };
};
const mergeCalendarEventSyncRanges = (left: CalendarEventSyncRange, right: CalendarEventSyncRange): CalendarEventSyncRange => ({
  rangeStart: new Date(Math.min(left.rangeStart.getTime(), right.rangeStart.getTime())),
  rangeEnd: new Date(Math.max(left.rangeEnd.getTime(), right.rangeEnd.getTime())),
});
const buildYearCalendarEventSyncRange = (visibleDays: Date[], monthTitleDate: Date, yearSyncRange?: CalendarDateRange | null): CalendarEventSyncRange => {
  if (yearSyncRange) {
    return {
      rangeStart: startOfDay(yearSyncRange.start),
      rangeEnd: endOfDay(yearSyncRange.end),
    };
  }

  const fallbackDayTime = monthTitleDate.getTime();
  const firstVisibleDay = new Date(visibleDays[0]?.getTime() ?? fallbackDayTime);

  return {
    rangeStart: startOfDay(firstVisibleDay),
    rangeEnd: endOfDay(firstVisibleDay),
  };
};
const buildMonthCalendarEventSyncRange = (monthTitleDate: Date, weekStartDay: CalendarWeekStartDay): CalendarEventSyncRange => {
  const weekStartsOn = getCalendarWeekStartsOn(weekStartDay);
  const gridStart = startOfWeek(startOfMonth(monthTitleDate), { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(monthTitleDate), { weekStartsOn });

  return {
    rangeStart: startOfDay(subDays(gridStart, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS)),
    rangeEnd: endOfDay(addDays(gridEnd, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS)),
  };
};
const buildAnchoredCalendarEventSyncRange = (monthTitleDate: Date, bufferDays: number): CalendarEventSyncRange => ({
  rangeStart: startOfDay(subDays(monthTitleDate, bufferDays)),
  rangeEnd: endOfDay(addDays(monthTitleDate, bufferDays)),
});
const buildVisibleDaysCalendarEventSyncRange = (visibleDays: Date[], monthTitleDate: Date, bufferDays: number): CalendarEventSyncRange => {
  const fallbackDayTime = monthTitleDate.getTime();
  const firstVisibleDay = new Date(visibleDays[0]?.getTime() ?? fallbackDayTime);
  const lastVisibleDay = new Date(visibleDays.at(-1)?.getTime() ?? fallbackDayTime);

  return {
    rangeStart: startOfDay(subDays(firstVisibleDay, bufferDays)),
    rangeEnd: endOfDay(addDays(lastVisibleDay, bufferDays)),
  };
};
const buildDefaultCalendarEventSyncRange = (selectedViewMode: CalendarViewMode, visibleDays: Date[], monthTitleDate: Date): CalendarEventSyncRange => {
  if (selectedViewMode === "list" || selectedViewMode === "pieChart") {
    return buildAnchoredCalendarEventSyncRange(monthTitleDate, LIST_AND_PIE_CHART_SYNC_BUFFER_DAYS);
  }

  if (selectedViewMode === "days" || selectedViewMode === "threeDays" || selectedViewMode === "week" || selectedViewMode === "timetable") {
    return buildAnchoredCalendarEventSyncRange(monthTitleDate, WEEKDAY_SYNC_BUFFER_DAYS);
  }

  return buildVisibleDaysCalendarEventSyncRange(visibleDays, monthTitleDate, DEFAULT_VISIBLE_DAY_BUFFER_DAYS);
};
const buildCalendarEventSyncRange = ({ selectedViewMode, visibleDays, monthTitleDate, weekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY, yearSyncRange }: BuildCalendarEventSyncRangeOptions): CalendarEventSyncRange => {
  const miniCalendarRange = buildMiniCalendarMonthRange(monthTitleDate, weekStartDay);
  const viewRange = selectedViewMode === "year"
    ? buildYearCalendarEventSyncRange(visibleDays, monthTitleDate, yearSyncRange)
    : selectedViewMode === "month"
      ? buildMonthCalendarEventSyncRange(monthTitleDate, weekStartDay)
      : buildDefaultCalendarEventSyncRange(selectedViewMode, visibleDays, monthTitleDate);

  return mergeCalendarEventSyncRanges(viewRange, miniCalendarRange);
};
const buildCalendarEventPrioritySyncRange = ({ selectedViewMode, visibleDays, monthTitleDate, weekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY, monthRenderedRange, yearSyncRange }: BuildCalendarEventSyncRangeOptions): CalendarEventSyncRange => {
  if (selectedViewMode === "days" || selectedViewMode === "threeDays" || selectedViewMode === "week" || selectedViewMode === "timetable") {
    return buildVisibleDaysCalendarEventSyncRange(visibleDays, monthTitleDate, WEEKDAY_PRIORITY_SYNC_BUFFER_DAYS);
  }

  return buildCalendarEventSyncRange({
    selectedViewMode,
    visibleDays,
    monthTitleDate,
    weekStartDay,
    monthRenderedRange,
    yearSyncRange,
  });
};



export { buildCalendarEventSyncRange, buildCalendarEventPrioritySyncRange };


export type { CalendarEventSyncRange, BuildCalendarEventSyncRangeOptions };
