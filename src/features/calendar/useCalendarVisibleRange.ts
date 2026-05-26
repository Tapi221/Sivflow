import type { CalendarViewMode, TimelineBufferDays } from "@/features/calendar/scheduleScreen.types";
import { useScheduleDays } from "@/features/calendar/grid/useScheduleColumns";

export const useCalendarVisibleRange = ({
  currentDate,
  selectedViewMode,
  calendarBuffer,
}: {
  currentDate: Date;
  selectedViewMode: CalendarViewMode;
  calendarBuffer: TimelineBufferDays;
}) => {
  return useScheduleDays({
    anchorDate: currentDate,
    viewMode: selectedViewMode,
    buffer: calendarBuffer,
  });
};