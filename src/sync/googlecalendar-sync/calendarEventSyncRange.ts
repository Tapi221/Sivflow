import { addDays, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "@/features/calendar/calendar.types";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";

export type CalendarEventSyncRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

export type BuildCalendarEventSyncRangeOptions = {
  selectedViewMode: CalendarViewMode;
  visibleDays: Date[];
  monthTitleDate: Date;
  monthRenderedRange?: CalendarDateRange | null;
  yearRenderedRange?: CalendarDateRange | null;
  yearSyncRange?: CalendarDateRange | null;
};

const LIST_AND_PIE_CHART_SYNC_BUFFER_DAYS = 45;
const WEEKDAY_SYNC_BUFFER_DAYS = 21;
const DEFAULT_VISIBLE_DAY_BUFFER_DAYS = 2;

const buildMiniCalendarMonthRange = (monthTitleDate: Date): CalendarEventSyncRange => {
  const gridStart = startOfWeek(startOfMonth(monthTitleDate), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(monthTitleDate), { weekStartsOn: 0 });

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

const buildMonthCalendarEventSyncRange = (monthTitleDate: Date, monthRenderedRange?: CalendarDateRange | null): CalendarEventSyncRange => {
  if (monthRenderedRange) {
    return {
      rangeStart: startOfDay(subDays(monthRenderedRange.start, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS)),
      rangeEnd: endOfDay(addDays(monthRenderedRange.end, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS)),
    };
  }

  const gridStart = startOfWeek(startOfMonth(monthTitleDate), { weekStartsOn: C.WEEK_STARTS_ON_MONDAY });
  const gridEnd = endOfWeek(endOfMonth(monthTitleDate), { weekStartsOn: C.WEEK_STARTS_ON_MONDAY });

  return {
    rangeStart: startOfDay(subDays(gridStart, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS)),
    rangeEnd: endOfDay(addDays(gridEnd, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS)),
  };
};

const buildAnchoredCalendarEventSyncRange = (monthTitleDate: Date, bufferDays: number): CalendarEventSyncRange => ({
  rangeStart: startOfDay(subDays(monthTitleDate, bufferDays)),
  rangeEnd: endOfDay(addDays(monthTitleDate, bufferDays)),
});

const buildDefaultCalendarEventSyncRange = (selectedViewMode: CalendarViewMode, visibleDays: Date[], monthTitleDate: Date): CalendarEventSyncRange => {
  if (selectedViewMode === "list" || selectedViewMode === "pieChart") {
    return buildAnchoredCalendarEventSyncRange(monthTitleDate, LIST_AND_PIE_CHART_SYNC_BUFFER_DAYS);
  }

  if (selectedViewMode === "days" || selectedViewMode === "threeDays" || selectedViewMode === "week" || selectedViewMode === "timetable") {
    return buildAnchoredCalendarEventSyncRange(monthTitleDate, WEEKDAY_SYNC_BUFFER_DAYS);
  }

  const fallbackDayTime = monthTitleDate.getTime();
  const firstVisibleDay = new Date(visibleDays[0]?.getTime() ?? fallbackDayTime);
  const lastVisibleDay = new Date(visibleDays.at(-1)?.getTime() ?? fallbackDayTime);

  return {
    rangeStart: startOfDay(subDays(firstVisibleDay, DEFAULT_VISIBLE_DAY_BUFFER_DAYS)),
    rangeEnd: endOfDay(addDays(lastVisibleDay, DEFAULT_VISIBLE_DAY_BUFFER_DAYS)),
  };
};

export const buildCalendarEventSyncRange = ({
  selectedViewMode,
  visibleDays,
  monthTitleDate,
  monthRenderedRange,
  yearSyncRange,
}: BuildCalendarEventSyncRangeOptions): CalendarEventSyncRange => {
  const miniCalendarRange = buildMiniCalendarMonthRange(monthTitleDate);
  const viewRange = selectedViewMode === "year"
    ? buildYearCalendarEventSyncRange(visibleDays, monthTitleDate, yearSyncRange)
    : selectedViewMode === "month"
      ? buildMonthCalendarEventSyncRange(monthTitleDate, monthRenderedRange)
      : buildDefaultCalendarEventSyncRange(selectedViewMode, visibleDays, monthTitleDate);

  return mergeCalendarEventSyncRanges(viewRange, miniCalendarRange);
};
