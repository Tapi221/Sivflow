type CalendarPrintRangeMode = "current" | "day" | "week" | "month" | "custom";
type CalendarPrintRangeState = {
  mode: CalendarPrintRangeMode;
  customStartDate: string;
  customEndDate: string;
};

export type { CalendarPrintRangeMode, CalendarPrintRangeState };
