import type { CalendarResistanceLegendItem } from "./calendarTypes";

export const CALENDAR_RESISTANCE_LEGEND: CalendarResistanceLegendItem[] = [
  { label: "要復習 (Unstable)", min: 0, max: 20, color: "bg-red-400" },
  { label: "覚えかけ (Fragile)", min: 20, max: 40, color: "bg-orange-400" },
  { label: "定着途上 (Growing)", min: 40, max: 65, color: "bg-yellow-400" },
  { label: "安定 (Stable)", min: 65, max: 85, color: "bg-green-400" },
  { label: "長期保持 (Solid)", min: 85, max: 100, color: "bg-emerald-400" },
];

export const CALENDAR_WEEK_DAYS_SUNDAY = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;

export const CALENDAR_WEEK_DAYS_MONDAY = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
] as const;

export const CALENDAR_ARROW_DIFF_MAP = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
} as const;
