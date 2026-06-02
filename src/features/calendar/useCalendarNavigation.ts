import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, addMonths, addYears, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subYears } from "date-fns";
import { createCalendarScrollBuffer } from "@/features/scroll/schedule/calendarScrollBuffer";
import type { CalendarViewMode, CalendarViewModeSelection } from "./scheduleScreen.types";
import { persistScheduleNavigationState, readStoredScheduleNavigationState, type ScheduleNavigationState } from "./scheduleNavigationPersistence";

const MULTI_SELECT_VIEW_MODES = ["days", "timetable", "list", "pieChart"] as const satisfies readonly CalendarViewMode[];
const MULTI_SELECT_VIEW_MODE_SET = new Set<CalendarViewMode>(MULTI_SELECT_VIEW_MODES);
const MOBILE_CALENDAR_DRILLDOWN_MEDIA_QUERY = "(max-width: 767px)";

const isViewModeSelectionArray = (selection: CalendarViewModeSelection): selection is readonly CalendarViewMode[] => Array.isArray(selection);

const isMobileCalendarViewport = (): boolean => typeof window !== "undefined" && window.matchMedia(MOBILE_CALENDAR_DRILLDOWN_MEDIA_QUERY).matches;

const isMobileCalendarDrilldownView = (viewMode: CalendarViewMode): boolean => viewMode === "week" || viewMode === "threeDays" || viewMode === "month";

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

const normalizeWeek = (date: Date) => startOfWeek(date, { weekStartsOn: 1 });

const getThreeDaysStartDate = (date: Date) => subDays(startOfDay(date), 1);

const normalizeViewDate = (date: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "year") return startOfYear(date);
  if (viewMode === "list") return startOfMonth(date);
  if (viewMode === "pieChart") return startOfDay(date);
  if (viewMode === "week" || viewMode === "timetable") return normalizeWeek(date);
  return date;
};

const normalizeCurrentDateForSelectedDate = (date: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "list") return startOfMonth(date);
  if (viewMode === "threeDays") return getThreeDaysStartDate(date);
  return normalizeViewDate(date, viewMode);
};

const getSelectedDateStepViewMode = (selection: CalendarViewModeSelection, primaryViewMode: CalendarViewMode): CalendarViewMode => isMultiSelectViewModeSelection(selection) ? "pieChart" : primaryViewMode;

const getPrimaryViewMode = (selection: CalendarViewModeSelection): CalendarViewMode => isViewModeSelectionArray(selection) ? selection[0] : selection;

const resolveNextViewModeSelection = (currentSelection: CalendarViewModeSelection, primaryViewMode: CalendarViewMode, next: CalendarViewMode): CalendarViewModeSelection => {
  if (!isMultiSelectViewMode(next)) return next;

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

const createInitialScheduleNavigationState = (): ScheduleNavigationState => {
  const now = new Date();
  const stored = readStoredScheduleNavigationState();
  const selectedDate = stored?.selectedDate ?? now;
  const selectedViewMode = stored?.selectedViewMode ?? "days";
  const primaryViewMode = getPrimaryViewMode(selectedViewMode);

  return {
    currentDate: stored?.currentDate ?? normalizeCurrentDateForSelectedDate(selectedDate, primaryViewMode),
    selectedDate,
    monthTitleDate: stored?.monthTitleDate ?? startOfMonth(selectedDate),
    selectedViewMode,
  };
};

export const useCalendarNavigation = () => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const initialNavigationStateRef = useRef<ScheduleNavigationState | null>(null);
  if (!initialNavigationStateRef.current) initialNavigationStateRef.current = createInitialScheduleNavigationState();
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

  const handleSelectViewMode = useCallback((next: CalendarViewMode) => {
    if (next !== "month") {
      const projectedViewportWidth = getProjectedViewportWidth(false);
      if (projectedViewportWidth > 0) setViewportWidth(projectedViewportWidth);
    }

    const resolvedNext = resolveNextViewModeSelection(selectedViewMode, primaryViewMode, next);
    const primaryNext = getPrimaryViewMode(resolvedNext);
    const normalized = normalizeCurrentDateForSelectedDate(selectedDate, primaryNext);

    setSelectedViewMode(resolvedNext);
    setCurrentDate(normalized);
    setMonthTitleDate(startOfMonth(selectedDate));

    if (primaryNext === "month") requestMonthScrollTarget();

    resetCalendarPosition(primaryNext);
  }, [getProjectedViewportWidth, primaryViewMode, requestMonthScrollTarget, resetCalendarPosition, selectedDate, selectedViewMode]);

  const handleSelectDateViewMode = useCallback((date: Date, next: CalendarViewMode) => {
    if (next !== "month") {
      const projectedViewportWidth = getProjectedViewportWidth(false);
      if (projectedViewportWidth > 0) setViewportWidth(projectedViewportWidth);
    }

    setSelectedViewMode(next);
    setCurrentDate(normalizeCurrentDateForSelectedDate(date, next));
    setSelectedDate(date);
    setMonthTitleDate(startOfMonth(date));

    if (next === "month") requestMonthScrollTarget();

    resetCalendarPosition(next);
  }, [getProjectedViewportWidth, requestMonthScrollTarget, resetCalendarPosition]);

  const handleToday = useCallback(() => {
    const now = new Date();
    const nextSelectedDate = primaryViewMode === "list" ? now : normalizeViewDate(now, primaryViewMode);
    const nextCurrentDate = normalizeCurrentDateForSelectedDate(nextSelectedDate, primaryViewMode);
    setCurrentDate(nextCurrentDate);
    setSelectedDate(nextSelectedDate);
    setMonthTitleDate(startOfMonth(nextSelectedDate));
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition]);

  const handlePrevious = useCallback(() => {
    setCurrentDate((c) => {
      const baseDate = selectedDateStepViewMode === "pieChart" || selectedDateStepViewMode === "threeDays" ? selectedDate : c;
      const nextSelectedDate = normalizeViewDate(getPreviousDate(baseDate, selectedDateStepViewMode), selectedDateStepViewMode);
      const nextCurrentDate = normalizeCurrentDateForSelectedDate(nextSelectedDate, primaryViewMode);
      setSelectedDate(nextSelectedDate);
      setMonthTitleDate(startOfMonth(nextSelectedDate));
      return nextCurrentDate;
    });
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition, selectedDate, selectedDateStepViewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((c) => {
      const baseDate = selectedDateStepViewMode === "pieChart" || selectedDateStepViewMode === "threeDays" ? selectedDate : c;
      const nextSelectedDate = normalizeViewDate(getNextDate(baseDate, selectedDateStepViewMode), selectedDateStepViewMode);
      const nextCurrentDate = normalizeCurrentDateForSelectedDate(nextSelectedDate, primaryViewMode);
      setSelectedDate(nextSelectedDate);
      setMonthTitleDate(startOfMonth(nextSelectedDate));
      return nextCurrentDate;
    });
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition, selectedDate, selectedDateStepViewMode]);

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
    if (isMobileCalendarViewport() && isMobileCalendarDrilldownView(primaryViewMode)) {
      handleSelectDateViewMode(date, "days");
      return;
    }

    setCurrentDate(normalizeCurrentDateForSelectedDate(date, primaryViewMode));
    setSelectedDate(date);
    setMonthTitleDate(startOfMonth(date));
    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [handleSelectDateViewMode, primaryViewMode, requestMonthScrollTarget, resetCalendarPosition]);

  const handleVisibleDateChange = useCallback((date: Date) => setMonthTitleDate(startOfMonth(startOfDay(date))), []);

  const handleVisibleMonthChange = useCallback((date: Date) => setMonthTitleDate(startOfMonth(startOfDay(date))), []);

  const handleMonthCellSelectDate = useCallback((date: Date) => {
    if (isMobileCalendarViewport()) {
      handleSelectDateViewMode(date, "days");
      return;
    }

    setSelectedDate(date);
    setCurrentDate(date);
  }, [handleSelectDateViewMode]);

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
