import { useMemo } from "react";
import { toDateKey } from "./calendarKey";



type CalendarMonthGridDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};
type CalendarMonthGridWeek = {
  key: string;
  days: CalendarMonthGridDay[];
};
type CalendarDayModel = {
  key: string;
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  monthAnnotation: string | null;
};
type CalendarWeekModel = {
  key: string;
  days: CalendarDayModel[];
};
type CalendarGridModel = {
  weeks: CalendarWeekModel[];
};
type Params = {
  monthWeeks: CalendarMonthGridWeek[];
  selectedKey: string;
  todayKey: string;
};



const getMonthAnnotation = (date: Date): string | null => {
  if (date.getDate() !== 1) return null;
  return `${date.getMonth() + 1}月`;
};
const useCalendarGrid = ({ monthWeeks, selectedKey, todayKey }: Params): CalendarGridModel => {
  return useMemo(() => {
    const weeks: CalendarWeekModel[] = monthWeeks.map((week) => {
      return { key: week.key, days: week.days.map((day: CalendarMonthGridDay) => {
        const key = toDateKey(day.date);

        return {
          key,
          date: day.date,
          dayOfMonth: day.dayOfMonth,
          isCurrentMonth: day.isCurrentMonth,
          isToday: key === todayKey,
          isSelected: key === selectedKey,
          monthAnnotation: getMonthAnnotation(day.date),
        };
      }),
      };
    });

    return { weeks };
  }, [monthWeeks, selectedKey, todayKey]);
};



export { useCalendarGrid };


export type { CalendarDayModel, CalendarWeekModel, CalendarGridModel };
