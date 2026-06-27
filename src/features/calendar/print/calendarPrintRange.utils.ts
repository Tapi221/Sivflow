import { endOfDay, endOfMonth, endOfWeek, format, isValid, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { getCalendarWeekStartsOn } from "@/features/calendar/calendarWeekStart";
import { DEFAULT_CALENDAR_MONTH_WEEK_START_DAY } from "@/features/calendar/model/calendarMonth.model";
import type { CalendarPrintRangeState } from "./calendarPrint.types";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";



type CalendarPrintRangeInput = {
  printRange: CalendarPrintRangeState;
  primaryViewMode: CalendarViewMode;
  currentDate: Date;
  selectedDate: Date;
  visibleDays: Date[];
  currentDisplayRange: CalendarDateRange;
  weekStartDay?: CalendarWeekStartDay;
};



const normalizeRange = (left: Date, right: Date): CalendarDateRange => {
  if (left.getTime() <= right.getTime()) {
    return { start: startOfDay(left), end: endOfDay(right) };
  }

  return { start: startOfDay(right), end: endOfDay(left) };
};
const parseDateInputValue = (value: string): Date | null => {
  if (!value) return null;
  const parsed = parseISO(value);

  return isValid(parsed) ? parsed : null;
};
const getCurrentRangeLabel = (primaryViewMode: CalendarViewMode): string => {
  if (primaryViewMode === "month") return "表示中の月表示";
  if (primaryViewMode === "week") return "表示中の週表示";
  if (primaryViewMode === "threeDays") return "表示中の3日表示";
  if (primaryViewMode === "days") return "表示中の日表示";
  if (primaryViewMode === "year") return "表示中の年表示";
  if (primaryViewMode === "list") return "表示中のリスト表示";
  if (primaryViewMode === "timetable") return "表示中の時間割";
  if (primaryViewMode === "pieChart") return "表示中の円グラフ";

  return "表示中";
};
const createCalendarPrintDateInputValue = (date: Date): string => format(date, "yyyy-MM-dd");
const getCalendarPrintRange = ({ printRange, primaryViewMode, currentDate, selectedDate, visibleDays, currentDisplayRange, weekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY }: CalendarPrintRangeInput): CalendarDateRange => {
  if (printRange.mode === "day") return normalizeRange(selectedDate, selectedDate);

  if (printRange.mode === "week") {
    const weekStartsOn = getCalendarWeekStartsOn(weekStartDay);

    return normalizeRange(startOfWeek(selectedDate, { weekStartsOn }), endOfWeek(selectedDate, { weekStartsOn }));
  }

  if (printRange.mode === "month") {
    return normalizeRange(startOfMonth(currentDate), endOfMonth(currentDate));
  }

  if (printRange.mode === "custom") {
    const start = parseDateInputValue(printRange.customStartDate) ?? selectedDate;
    const end = parseDateInputValue(printRange.customEndDate) ?? start;

    return normalizeRange(start, end);
  }

  if (visibleDays.length > 0 && primaryViewMode !== "month" && primaryViewMode !== "year") {
    return normalizeRange(visibleDays[0], visibleDays.at(-1) ?? visibleDays[0]);
  }

  return currentDisplayRange;
};
const getCalendarPrintRangeLabel = (range: CalendarDateRange, mode: CalendarPrintRangeState["mode"], primaryViewMode: CalendarViewMode): string => {
  const startLabel = format(range.start, "yyyy年M月d日");
  const endLabel = format(range.end, "yyyy年M月d日");

  if (startLabel === endLabel) return startLabel;
  if (mode === "current") return `${getCurrentRangeLabel(primaryViewMode)} / ${startLabel} - ${endLabel}`;

  return `${startLabel} - ${endLabel}`;
};



export { createCalendarPrintDateInputValue, getCalendarPrintRange, getCalendarPrintRangeLabel };
