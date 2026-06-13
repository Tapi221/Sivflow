import { useMemo } from "react";
import { toDateKey } from "./calendarKey";



type CalendarSelection = {
  selectedKey: string;
  todayKey: string;
};



const useCalendarSelection = (selectedDate: Date, today: Date): CalendarSelection => {
  return useMemo(() => {
    return { selectedKey: toDateKey(selectedDate), todayKey: toDateKey(today) };
  }, [selectedDate, today]);
};



export { useCalendarSelection };


export type { CalendarSelection };
