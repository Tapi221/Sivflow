import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, addMonths, addYears, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subYears } from "date-fns";
import type { CalendarWeekStartDay } from "./calendar.types";
import { getCalendarWeekStartsOn } from "./calendarWeekStart";
import { DEFAULT_CALENDAR_MONTH_WEEK_START_DAY } from "@/features/calendar/model/calendarMonth.model";
import type { ScheduleNavigationState } from "./scheduleNavigationPersistence";
import { persistScheduleNavigationState, readStoredScheduleNavigationState } from "./scheduleNavigationPersistence";
import type { CalendarViewMode, CalendarViewModeSelection } from "./scheduleScreen.types";
import { createCalendarScrollBuffer } from "@/features/scroll/schedule/calendarScrollBuffer";



type CalendarNavigationOptions = {
  allowMultiSelectViewMode?: boolean; weekStartDay?: CalendarWeekStartDay; };



const MULTI_SELECT_VIEW_MODES = ["days", "timetable", "list", "pieChart"] as const satisfies readonly CalendarViewMode[];
const MULTI_SELECT_VIEW_MODE_SET = new Set<CalendarViewMode>(MULTI_SELECT_VIEW_MODES);



const isViewModeSelectionArray = (selection: CalendarViewModeSelection): selection is readonly CalendarViewMode[] => Array.isArray(selection);
const isMultiSelectViewMode = (viewMode: CalendarViewMode): boolean => MULTI_SELECT_VIEW_MODE_SET.has(viewMode);
const isMultiSelectViewModeSelection = (selection: CalendarViewModeSelection): boolean => isViewModeSelectionArray(selection) && selection.length > 1;
const appendMultiSelectViewMode = (currentSelection: readonly CalendarViewMode[], next: CalendarViewMode): CalendarViewMode[] => [...currentSelection.filter(isMultiSelectViewMode), next].slice(-2);
const getNextDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "year") return addYears(current, 1);
  if (viewMode === "month" || viewMode === "list") return addMonths(current, 1);
  if (viewMode === "week" || viewMode === "timetable") return addDays(current, 7);
  if (viewMode === "threeDays") return addDays(current, 3);
  return addDays(current, 1);
};
const getPreviousDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "year") return subYears(current, 1);
  if (viewMode === "month" || viewMode === "list") return subMonths(current, 1);
  if (viewMode === "week" || viewMode === "timetable") return subDays(current, 7);
  if (viewMode === "threeDays") return subDays(current, 3);
  return subDays(current, 1);
};
const normalizeWeek = (date: Date, weekStartDay: CalendarWeekStartDay) => startOfWeek(date, { weekStartsOn: getCalendarWeekStartsOn(weekStartDay) });
const getThreeDaysStartDate = (date: Date) => subDays(startOfDay(date), 1);
const normalizeViewDate = (date: Date, viewMode: CalendarViewMode, weekStartDay: CalendarWeekStartDay) => {
  if (viewMode === "year") return startOfYear(date);
  if (viewMode === "list") return startOfMonth(date);
  if (viewMode === "pieChart") return startOfDay(date);
  if (viewMode === "week" || viewMode === "timetable") return normalizeWeek(date, weekStartDay);
  return date;
};
const normalizeCurrentDateForSelectedDate = (date: Date, viewMode: CalendarViewMode, weekStartDay: CalendarWeekStartDay) => {
  if (viewMode === "list") return startOfMonth(date);
  if (viewMode === "threeDays") return getThreeDaysStartDate(date);
  return normalizeViewDate(date, viewMode, weekStartDay);
};
const getSelectedDateStepViewMode = (selection: CalendarViewModeSelection, primaryViewMode: CalendarViewMode): CalendarViewMode => isMultiSelectViewModeSelection(selection) ? "pieChart" : primaryViewMode;
const getPrimaryViewMode = (selection: CalendarViewModeSelection): CalendarViewMode => isViewModeSelectionArray(selection) ? selection[0] : selection;
const resolveNextViewModeSelection = (currentSelection: CalendarViewModeSelection, primaryViewMode: CalendarViewMode, next: CalendarViewMode, allowMultiSelectViewMode: boolean): CalendarViewModeSelection => {
  if (!allowMultiSelectViewMode || !isMultiSelectViewMode(next)) return next;

  if (isViewModeSelectionArray(currentSelection)) {
    if (currentSelection.includes(next)) {
      const remainingSelection = currentSelection.filter((viewMode) => viewMode !== next);
      return remainingSelection[0] ?? next;
    }

    return appendMultiSelectViewMode(currentSelection, next);
  }

  if (isMultiSelectViewMode(primaryViewMode) && primaryViewMode !== next) return [primaryViewMode, next];

  return next;
};
const createInitialScheduleNavigationState = ({ allowMultiSelectViewMode, weekStartDay }: Required<CalendarNavigationOptions>): ScheduleNavigationState => {
  const now = new Date();
  const stored = readStoredScheduleNavigationState();
  const selectedDate = stored?.selectedDate ?? now;
  const storedSelectedViewMode = stored?.selectedViewMode ?? "days";
  const selectedViewMode = allowMultiSelectViewMode ? storedSelectedViewMode : getPrimaryViewMode(storedSelectedViewMode);
  const primaryViewMode = getPrimaryViewMode(selectedViewMode);

  return {
    currentDate: stored?.currentDate ?? normalizeCurrentDateForSelectedDate(selectedDate, primaryViewMode, weekStartDay),
    selectedDate,
    monthTitleDate: stored?.monthTitleDate ?? startOfMonth(selectedDate),
    selectedViewMode,
  };
};
const useCalendarNavigation = ({ allowMultiSelectViewMode = true, weekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY }: CalendarNavigationOptions = {}) => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const initialNavigationStateRef = useRef<ScheduleNavigationState | null>(null);
  if (!initialNavigationStateRef.current) initialNavigationStateRef.current = createInitialScheduleNavigationState({ allowMultiSelectViewMode, weekStartDay });
  const initialNavigationState = initialNavigationStateRef.current;
  const [currentDate, setCurrentDate] = useState(() => initialNavigationState.currentDate);
  const [selectedDate, setSelectedDate] = useState(() => initialNavigationState.selectedDate);
  const [monthTitleDate, setMonthTitleDate] = useState(() => initialNavigationState.monthTitleDate);
  const [monthScrollTargetToken, setMonthScrollTargetToken] = useState(0);
  const [calendarScrollToken, setCalendarScrollToken] = useState(0);
  const [selectedViewMode, setSelectedViewMode] = useState<CalendarViewModeSelection>(() => initialNavigationState.selectedViewMode);
  const primaryViewMode = getPrimaryViewMode(selectedViewMode);
  const selectedDateStepViewMode = getSelectedDateStepViewMode(selectedViewMode, primaryViewMode);
  const [calendarBuffer, setCalendarBuffer] = useState(() => createCalendarScrollBuffer("calendar", primaryViewMode));
  const [viewportWidth, setViewportWidth] = useState(0);

  const getProjectedViewportWidth = useCallback((includeTrailingPanel: boolean) => {
    const viewportEl = contentViewportRef.current;
    const bodyEl = viewportEl?.parentElement ?? null;
    if (!viewportEl || !bodyEl) return 0;
    const bodyWidth = bodyEl.getBoundingClientRect().width;
    const leftPanelEl = viewportEl.previousElementSibling;
    const rightPanelEl = viewportEl.nextElementSibling;
    const leftPanelWidth = leftPanelEl instanceof HTMLElement ? leftPanelEl.getBoundingClientRect().width : 0;
    const trailingPanelWidth = includeTrailingPanel && rightPanelEl instanceof HTMLElement ? rightPanelEl.getBoundingClientRect().width : 0;
    const projectedWidth = bodyWidth - leftPanelWidth - trailingPanelWidth;
    return Number.isFinite(projectedWidth) ? Math.max(0, projectedWidth) : 0;
  }, []);

  const requestMonthScrollTarget = useCallback(() => setMonthScrollTargetToken((n) => n + 1), []);

  const resetCalendarPosition = useCallback((viewMode: CalendarViewMode) => {
    setCalendarBuffer(createCalendarScrollBuffer("calendar", viewMode));
    setCalendarScrollToken((n) => n + 1);
  }, []);

  useEffect(() => {
    const el = contentViewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setViewportWidth(entries[0]?.contentRect.width ?? 0));
    ro.observe(el);
    setViewportWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    persistScheduleNavigationState({ currentDate, selectedDate, monthTitleDate, selectedViewMode });
  }, [currentDate, monthTitleDate, selectedDate, selectedViewMode]);

  useEffect(() => {
    if (primaryViewMode !== "week" && primaryViewMode !== "timetable") return;

    setCurrentDate((date) => normalizeCurrentDateForSelectedDate(date, primaryViewMode, weekStartDay));
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, resetCalendarPosition, weekStartDay]);

  const handleSelectViewMode = useCallback((next: CalendarViewMode) => {
    if (next !== "month") {
      const projectedViewportWidth = getProjectedViewportWidth(false);
      if (projectedViewportWidth > 0) setViewportWidth(projectedViewportWidth);
    }

    const resolvedNext = resolveNextViewModeSelection(selectedViewMode, primaryViewMode, next, allowMultiSelectViewMode);
    const primaryNext = getPrimaryViewMode(resolvedNext);
    const normalized = normalizeCurrentDateForSelectedDate(selectedDate, primaryNext, weekStartDay);

    setSelectedViewMode(resolvedNext);
    setCurrentDate(normalized);
    setMonthTitleDate(startOfMonth(selectedDate));

    if (primaryNext === "month") requestMonthScrollTarget();

    resetCalendarPosition(primaryNext);
  }, [allowMultiSelectViewMode, getProjectedViewportWidth, primaryViewMode, requestMonthScrollTarget, resetCalendarPosition, selectedDate, selectedViewMode, weekStartDay]);

  const handleSelectDateViewMode = useCallback((date: Date, next: CalendarViewMode) => {
    if (next !== "month") {
      const projectedViewportWidth = getProjectedViewportWidth(false);
      if (projectedViewportWidth > 0) setViewportWidth(projectedViewportWidth);
    }

    setSelectedViewMode(next);
    setCurrentDate(normalizeCurrentDateForSelectedDate(date, next, weekStartDay));
    setSelectedDate(date);
    setMonthTitleDate(startOfMonth(date));

    if (next === "month") requestMonthScrollTarget();

    resetCalendarPosition(next);
  }, [getProjectedViewportWidth, requestMonthScrollTarget, resetCalendarPosition, weekStartDay]);

  const handleToday = useCallback(() => {
    const now = new Date();
    const nextSelectedDate = primaryViewMode === "list" ? now : normalizeViewDate(now, primaryViewMode, weekStartDay);
    const nextCurrentDate = normalizeCurrentDateForSelectedDate(nextSelectedDate, primaryViewMode, weekStartDay);
    setCurrentDate(nextCurrentDate);
    setSelectedDate(nextSelectedDate);
    setMonthTitleDate(startOfMonth(nextSelectedDate));
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition, weekStartDay]);

  const handlePrevious = useCallback(() => {
    setCurrentDate((c) => {
      const baseDate = selectedDateStepViewMode === "pieChart" || selectedDateStepViewMode === "threeDays" ? selectedDate : c;
      const nextSelectedDate = normalizeViewDate(getPreviousDate(baseDate, selectedDateStepViewMode), selectedDateStepViewMode, weekStartDay);
      const nextCurrentDate = normalizeCurrentDateForSelectedDate(nextSelectedDate, primaryViewMode, weekStartDay);
      setSelectedDate(nextSelectedDate);
      setMonthTitleDate(startOfMonth(nextSelectedDate));
      return nextCurrentDate;
    });
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition, selectedDate, selectedDateStepViewMode, weekStartDay]);

  const handleNext = useCallback(() => {
    setCurrentDate((c) => {
      const baseDate = selectedDateStepViewMode === "pieChart" || selectedDateStepViewMode === "threeDays" ? selectedDate : c;
      const nextSelectedDate = normalizeViewDate(getNextDate(baseDate, selectedDateStepViewMode), selectedDateStepViewMode, weekStartDay);
      const nextCurrentDate = normalizeCurrentDateForSelectedDate(nextSelectedDate, primaryViewMode, weekStartDay);
      setSelectedDate(nextSelectedDate);
      setMonthTitleDate(startOfMonth(nextSelectedDate));
      return nextCurrentDate;
    });
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition, selectedDate, selectedDateStepViewMode, weekStartDay]);

  const handleSidebarPreviousMonth = useCallback(() => {
    setCurrentDate((c) => {
      const next = subMonths(c, 1);
      setSelectedDate(next);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition]);

  const handleSidebarNextMonth = useCallback(() => {
    setCurrentDate((c) => {
      const next = addMonths(c, 1);
      setSelectedDate(next);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition]);

  const handleSidebarSelectDate = useCallback((date: Date) => {
    setCurrentDate(normalizeCurrentDateForSelectedDate(date, primaryViewMode, weekStartDay));
    setSelectedDate(date);
    setMonthTitleDate(startOfMonth(date));
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition, weekStartDay]);

  const handleVisibleDateChange = useCallback((date: Date) => setMonthTitleDate(startOfMonth(startOfDay(date))), []);

  const handleVisibleMonthChange = useCallback((date: Date) => setMonthTitleDate(startOfMonth(startOfDay(date))), []);

  const handleMonthCellSelectDate = useCallback((date: Date) => {
    if (primaryViewMode === "year") {
      setSelectedViewMode("days");
      setCurrentDate(normalizeCurrentDateForSelectedDate(date, "days", weekStartDay));
      setSelectedDate(date);
      setMonthTitleDate(startOfMonth(date));
      resetCalendarPosition("days");
      return;
    }

    setSelectedDate(date);
    setCurrentDate(date);
  }, [primaryViewMode, resetCalendarPosition, weekStartDay]);

  return {
    contentViewportRef,
    scrollContainerRef,
    headerScrollRef,
    currentDate,
    selectedDate,
    monthTitleDate,
    setMonthTitleDate,
    monthScrollTargetToken,
    calendarScrollToken,
    selectedViewMode,
    primaryViewMode,
    calendarBuffer,
    viewportWidth,
    setViewportWidth,
    handleSelectViewMode,
    handleSelectDateViewMode,
    handleToday,
    handlePrevious,
    handleNext,
    handleSidebarPreviousMonth,
    handleSidebarNextMonth,
    handleSidebarSelectDate,
    handleVisibleDateChange,
    handleVisibleMonthChange,
    handleMonthCellSelectDate,
    resetCalendarPosition,
  };
};



export { useCalendarNavigation };
