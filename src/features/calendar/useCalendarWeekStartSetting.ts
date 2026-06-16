import type { CalendarWeekStartDay } from "./calendar.types";
import { DEFAULT_CALENDAR_MONTH_WEEK_START_DAY } from "@/features/calendar/model/calendarMonth.model";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";



const useCalendarWeekStartSetting = (override?: CalendarWeekStartDay): CalendarWeekStartDay => {
  const { settings } = useUserSettings();

  return override ?? settings?.weekStartDay ?? DEFAULT_CALENDAR_MONTH_WEEK_START_DAY;
};



export { useCalendarWeekStartSetting };
