import type { CalendarWeekStartDay } from "./calendar.types";



type CalendarWeekStartsOn = 0 | 1;



const getCalendarWeekStartsOn = (weekStartDay: CalendarWeekStartDay): CalendarWeekStartsOn => weekStartDay === "sunday" ? 0 : 1;
const rotateCalendarWeekdayLabels = <T>(weekdayLabels: readonly T[], weekStartDay: CalendarWeekStartDay): readonly T[] => {
  if (weekStartDay === "sunday") return weekdayLabels;

  return [...weekdayLabels.slice(1), ...weekdayLabels.slice(0, 1)];
};



export { getCalendarWeekStartsOn, rotateCalendarWeekdayLabels };
