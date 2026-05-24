import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

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
};

export const buildCalendarEventSyncRange = ({
  selectedViewMode,
  visibleDays,
  monthTitleDate,
  monthRenderedRange,
}: BuildCalendarEventSyncRangeOptions): CalendarEventSyncRange => {
  if (selectedViewMode === "month") {
    if (monthRenderedRange) {
      return {
        rangeStart: startOfDay(
          subDays(monthRenderedRange.start, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
        ),
        rangeEnd: endOfDay(
          addDays(monthRenderedRange.end, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
        ),
      };
    }

    const gridStart = startOfWeek(startOfMonth(monthTitleDate), {
      weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
    });
    const gridEnd = endOfWeek(endOfMonth(monthTitleDate), {
      weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
    });

    return {
      rangeStart: startOfDay(
        subDays(gridStart, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
      ),
      rangeEnd: endOfDay(
        addDays(gridEnd, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
      ),
    };
  }

  const fallbackDayTime = monthTitleDate.getTime();
  const firstVisibleDay = new Date(visibleDays[0]?.getTime() ?? fallbackDayTime);
  const lastVisibleDay = new Date(visibleDays.at(-1)?.getTime() ?? fallbackDayTime);
  const bufferDays = selectedViewMode === "week" ? 3 : 2;

  return {
    rangeStart: startOfDay(subDays(firstVisibleDay, bufferDays)),
    rangeEnd: endOfDay(addDays(lastVisibleDay, bufferDays)),
  };
};
