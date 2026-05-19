import {
  addDays,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode, TimelineBufferDays } from "../calendarPane.types";

const getRangeDayCount = (baseDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return getDaysInMonth(baseDate);
  return viewMode === "week" ? 7 : 1;
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
  const visibleDays = (() => {
    const normalized = startOfDay(currentDate);

    const startDate =
      selectedViewMode === "month"
        ? startOfMonth(normalized)
        : selectedViewMode === "week"
          ? startOfWeek(normalized, { weekStartsOn: C.WEEK_STARTS_ON_MONDAY })
          : normalized;

    const visibleCount = getRangeDayCount(normalized, selectedViewMode);
    const timelineStart = subDays(startDate, calendarBuffer.before);
    const totalCount = calendarBuffer.before + visibleCount + calendarBuffer.after;

    return Array.from({ length: totalCount }, (_, i) =>
      addDays(timelineStart, i),
    );
  })();

  return { visibleDays };
};