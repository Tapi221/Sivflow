import { useMemo } from "react";
import { toDateKey } from "./calendarKey";

export type CalendarSelection = {
  selectedKey: string;
  todayKey: string;
};

export const useCalendarSelection = (
  selectedDate: Date,
  today: Date,
): CalendarSelection => {
  return useMemo(() => {
    return {
      selectedKey: toDateKey(selectedDate),
      todayKey: toDateKey(today),
    };
  }, [selectedDate, today]);
};
