import type { CalendarWeekStartDay } from "./calendar.types";
import type { CalendarBufferDays, CalendarViewMode } from "./scheduleScreen.types";
import { useScheduleDays } from "@/features/calendar/grid/useScheduleColumns";

export const useCalendarVisibleRange = ({
  currentDate,
  selectedViewMode,
  calendarBuffer,
  weekStartDay,
}: {
  currentDate: Date;
  selectedViewMode: CalendarViewMode;
  calendarBuffer: CalendarBufferDays;
  weekStartDay: CalendarWeekStartDay;
}) => {
  return useScheduleDays({
    anchorDate: currentDate,
    viewMode: selectedViewMode,
    buffer: calendarBuffer,
    weekStartDay,
  });
};
