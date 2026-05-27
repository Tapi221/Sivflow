import type { CalendarBufferDays, CalendarViewMode } from "@/features/calendar/scheduleScreen.types";
import { useScheduleDays } from "@/features/calendar/grid/useScheduleColumns";

export const useCalendarVisibleRange = ({
  currentDate,
  selectedViewMode,
  calendarBuffer,
}: {
  currentDate: Date;
  selectedViewMode: CalendarViewMode;
  calendarBuffer: CalendarBufferDays;
}) => {
  return useScheduleDays({
    anchorDate: currentDate,
    viewMode: selectedViewMode,
    buffer: calendarBuffer,
  });
};