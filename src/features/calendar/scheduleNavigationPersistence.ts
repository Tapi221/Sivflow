import * as C from "./calendar.constants.desktop";
import type { CalendarViewMode, CalendarViewModeSelection } from "./scheduleScreen.types";



type StoredScheduleNavigationState = {
  currentDate?: unknown;
  selectedDate?: unknown;
  monthTitleDate?: unknown;
  selectedViewMode?: unknown;
  calendarScrollTop?: unknown;
  monthVisibleEventCount?: unknown;
};
type ScheduleNavigationState = {
  currentDate: Date;
  selectedDate: Date;
  monthTitleDate: Date;
  selectedViewMode: CalendarViewModeSelection;
};



const SCHEDULE_NAVIGATION_STORAGE_KEY = "sivflow:schedule:navigation";
const LEGACY_SCHEDULE_NAVIGATION_STORAGE_KEY = "flashcard-master:schedule:navigation";
const CALENDAR_VIEW_MODES = ["year", "month", "week", "threeDays", "days", "timetable", "list", "pieChart"] as const satisfies readonly CalendarViewMode[];
const CALENDAR_VIEW_MODE_SET = new Set<CalendarViewMode>(CALENDAR_VIEW_MODES);
const MULTI_SELECT_VIEW_MODES = ["days", "timetable", "list", "pieChart"] as const satisfies readonly CalendarViewMode[];
const MULTI_SELECT_VIEW_MODE_SET = new Set<CalendarViewMode>(MULTI_SELECT_VIEW_MODES);



const isStoredScheduleNavigationState = (value: unknown): value is StoredScheduleNavigationState => typeof value === "object" && value !== null && !Array.isArray(value);
const isCalendarViewMode = (value: unknown): value is CalendarViewMode => typeof value === "string" && CALENDAR_VIEW_MODE_SET.has(value as CalendarViewMode);
const isMultiSelectViewMode = (viewMode: CalendarViewMode): boolean => MULTI_SELECT_VIEW_MODE_SET.has(viewMode);
const readStoredDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const readStoredScrollTop = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const readStoredSelectedViewMode = (value: unknown): CalendarViewModeSelection | null => {
  if (isCalendarViewMode(value)) return value;
  if (!Array.isArray(value)) return null;

  const selection = Array.from(new Set(value.filter(isCalendarViewMode).filter(isMultiSelectViewMode))).slice(-2);
  return selection.length > 1 ? selection : selection[0] ?? null;
};
const readStoredScheduleNavigationRaw = (): string | null => {
  const current = window.localStorage.getItem(SCHEDULE_NAVIGATION_STORAGE_KEY);
  if (current) return current;

  const legacy = window.localStorage.getItem(LEGACY_SCHEDULE_NAVIGATION_STORAGE_KEY);
  if (!legacy) return null;

  window.localStorage.setItem(SCHEDULE_NAVIGATION_STORAGE_KEY, legacy);
  window.localStorage.removeItem(LEGACY_SCHEDULE_NAVIGATION_STORAGE_KEY);
  return legacy;
};
const readStoredScheduleNavigationObject = (): StoredScheduleNavigationState | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = readStoredScheduleNavigationRaw();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isStoredScheduleNavigationState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
const writeStoredScheduleNavigationObject = (state: StoredScheduleNavigationState) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SCHEDULE_NAVIGATION_STORAGE_KEY, JSON.stringify(state));
    window.localStorage.removeItem(LEGACY_SCHEDULE_NAVIGATION_STORAGE_KEY);
  } catch {
    // localStorage が使えない環境では React state の状態だけ維持する。
  }
};
const normalizeScheduleMonthVisibleEventCount = (value: number): number => Math.min(C.MONTH_VISIBLE_EVENT_COUNT_MAX, Math.max(C.MONTH_VISIBLE_EVENT_COUNT_MIN, Math.round(value)));
const readStoredScheduleNavigationState = (): Partial<ScheduleNavigationState> | null => {
  const parsed = readStoredScheduleNavigationObject();
  if (!parsed) return null;

  const currentDate = readStoredDate(parsed.currentDate);
  const selectedDate = readStoredDate(parsed.selectedDate);
  const monthTitleDate = readStoredDate(parsed.monthTitleDate);
  const selectedViewMode = readStoredSelectedViewMode(parsed.selectedViewMode);

  return {
    ...(currentDate ? { currentDate } : {}),
    ...(selectedDate ? { selectedDate } : {}),
    ...(monthTitleDate ? { monthTitleDate } : {}),
    ...(selectedViewMode ? { selectedViewMode } : {}),
  };
};
const readStoredScheduleCalendarScrollTop = (): number | null => {
  const parsed = readStoredScheduleNavigationObject();
  if (!parsed) return null;

  return readStoredScrollTop(parsed.calendarScrollTop);
};
const readStoredScheduleMonthVisibleEventCount = (): number | null => {
  const parsed = readStoredScheduleNavigationObject();
  if (!parsed || typeof parsed.monthVisibleEventCount !== "number" || !Number.isFinite(parsed.monthVisibleEventCount)) return null;

  return normalizeScheduleMonthVisibleEventCount(parsed.monthVisibleEventCount);
};
const persistScheduleNavigationState = ({ currentDate, selectedDate, monthTitleDate, selectedViewMode }: ScheduleNavigationState) => {
  const stored = readStoredScheduleNavigationObject() ?? {};

  writeStoredScheduleNavigationObject({
    ...stored,
    currentDate: currentDate.toISOString(),
    selectedDate: selectedDate.toISOString(),
    monthTitleDate: monthTitleDate.toISOString(),
    selectedViewMode,
  });
};
const persistScheduleCalendarScrollTop = (scrollTop: number) => {
  if (!Number.isFinite(scrollTop)) return;

  const stored = readStoredScheduleNavigationObject() ?? {};

  writeStoredScheduleNavigationObject({
    ...stored,
    calendarScrollTop: Math.max(0, scrollTop),
  });
};
const persistScheduleMonthVisibleEventCount = (monthVisibleEventCount: number) => {
  if (!Number.isFinite(monthVisibleEventCount)) return;

  const stored = readStoredScheduleNavigationObject() ?? {};

  writeStoredScheduleNavigationObject({
    ...stored,
    monthVisibleEventCount: normalizeScheduleMonthVisibleEventCount(monthVisibleEventCount),
  });
};



export { SCHEDULE_NAVIGATION_STORAGE_KEY, normalizeScheduleMonthVisibleEventCount, readStoredScheduleNavigationState, readStoredScheduleCalendarScrollTop, readStoredScheduleMonthVisibleEventCount, persistScheduleNavigationState, persistScheduleCalendarScrollTop, persistScheduleMonthVisibleEventCount };


export type { ScheduleNavigationState };
