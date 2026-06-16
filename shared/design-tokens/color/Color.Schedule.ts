type ScheduleRgbColor = {
  red: number;
  green: number;
  blue: number;
};
type ScheduleContentColor = {
  surface: string;
  monthSurface: string;
  monthSurfaceInset: string;
  weekdaySurface: string;
  transparentBorder: string;
};
type ScheduleDateColor = {
  selectedBackground: string;
  selectedText: string;
  todayText: string;
  todayFocusRing: string;
  weekdayText: string;
  emptyDayBorder: string;
};
type ScheduleListColor = {
  timeText: string;
  railLine: string;
  dotBackground: string;
};
type SchedulePieChartColor = {
  defaultSegment: string;
  gapSegment: string;
};
type ScheduleSourceColor = {
  calendarFallback: string;
  linkedDotBorder: string;
  linkedDotRing: string;
};
type ScheduleEventColor = {
  fallbackAccent: string;
  textMixTarget: ScheduleRgbColor;
  lightAccentLuminanceThreshold: number;
  lightAccentBorderMixAmount: number;
  lightTextLuminanceThreshold: number;
  lightTextMixAmount: number;
  darkTextMixAmount: number;
};



const SCHEDULE_CONTENT_COLOR = {
  surface: "#fff",
  monthSurface: "rgba(255, 255, 255, 0.92)",
  monthSurfaceInset: "rgba(255, 255, 255, 0.9)",
  weekdaySurface: "#fff",
  transparentBorder: "transparent",
} as const satisfies ScheduleContentColor;
const SCHEDULE_DATE_COLOR = {
  selectedBackground: "#3a77b2",
  selectedText: "#fff",
  todayText: "#0a84ff",
  todayFocusRing: "rgba(10, 132, 255, 0.25)",
  weekdayText: "rgba(60, 60, 67, 0.58)",
  emptyDayBorder: "#dedede",
} as const satisfies ScheduleDateColor;
const SCHEDULE_LIST_COLOR = {
  timeText: "#85827e",
  railLine: "#e2e8f0",
  dotBackground: "#fff",
} as const satisfies ScheduleListColor;
const SCHEDULE_PIE_CHART_COLOR = {
  defaultSegment: "#8e8e93",
  gapSegment: "#f2f2f7",
} as const satisfies SchedulePieChartColor;
const SCHEDULE_SOURCE_COLOR = {
  calendarFallback: "#64748b",
  linkedDotBorder: "#fff",
  linkedDotRing: "rgba(0, 0, 0, 0.1)",
} as const satisfies ScheduleSourceColor;
const SCHEDULE_EVENT_COLOR = {
  fallbackAccent: "#185FA5",
  textMixTarget: { red: 0, green: 0, blue: 0 },
  lightAccentLuminanceThreshold: 0.8,
  lightAccentBorderMixAmount: 0.28,
  lightTextLuminanceThreshold: 0.55,
  lightTextMixAmount: 0.62,
  darkTextMixAmount: 0.32,
} as const satisfies ScheduleEventColor;



export { SCHEDULE_CONTENT_COLOR, SCHEDULE_DATE_COLOR, SCHEDULE_EVENT_COLOR, SCHEDULE_LIST_COLOR, SCHEDULE_PIE_CHART_COLOR, SCHEDULE_SOURCE_COLOR };


export type { ScheduleContentColor, ScheduleDateColor, ScheduleEventColor, ScheduleListColor, SchedulePieChartColor, ScheduleRgbColor, ScheduleSourceColor };
