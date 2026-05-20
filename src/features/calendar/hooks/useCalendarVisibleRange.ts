import {
  addDays,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

import * as C from "@/features/calendar/calendar.constants.desktop";

import type {
  CalendarViewMode,
  TimelineBufferDays,
} from "../schedulePane.types";
const getRangeDayCount = (baseDate: Date, viewMode: CalendarViewMode) => {
  switch (viewMode) {
    case "month":
      return getDaysInMonth(baseDate);
    case "week":
      return 7;
    case "days":
    default:
      return 1;
  }
};
export const useCalendarVisibleRange = ({
  currentDate,
  selectedViewMode,
  calendarBuffer,
}: {
  currentDate: Date;
  selectedViewMode: CalendarViewMode;
  calendarBuffer: TimelineBufferDays;
}) => {
  const normalized = startOfDay(currentDate);
  const startDate =
    selectedViewMode === "month"
      ? startOfMonth(normalized)
      : selectedViewMode === "week"
        ? startOfWeek(normalized, {
          weekStartsOn: C.WEEK_STARTS_ON_MONDAY,
        })
        : normalized;
  const visibleCount = getRangeDayCount(normalized, selectedViewMode);
  const displayDays = Array.from({ length: visibleCount }, (_, i) =>
    addDays(startDate, i),
  );
  const timelineStart = subDays(startDate, calendarBuffer.before);
  const totalCount =
    calendarBuffer.before + visibleCount + calendarBuffer.after;
  const visibleDays = Array.from({ length: totalCount }, (_, i) =>
    addDays(timelineStart, i),
  );
  return {
    displayDays,
    visibleDays,
  };
};
