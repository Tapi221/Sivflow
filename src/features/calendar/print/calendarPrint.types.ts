export type CalendarPrintRangeMode = "current" | "day" | "week" | "month" | "custom";

export type CalendarPrintRangeState = {
  mode: CalendarPrintRangeMode;
  customStartDate: string;
  customEndDate: string;
};
