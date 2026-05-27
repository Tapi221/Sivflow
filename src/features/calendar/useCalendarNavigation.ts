import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, addMonths, addYears, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subYears } from "date-fns";
import { createCalendarScrollBuffer, extendCalendarScrollBuffer } from "@/features/scroll/schedule/calendarScrollBuffer";
import type { CalendarViewMode, CalendarViewModeSelection } from "./scheduleScreen.types";

const LIST_PIE_CHART_VIEW_MODES = ["list", "pieChart"] as const satisfies readonly CalendarViewMode[];

const isListPieChartViewMode = (viewMode: CalendarViewMode) => (
  viewMode === "list" || viewMode === "pieChart"
);

const getNextDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "year") return addYears(current, 1);
  if (viewMode === "month" || viewMode === "list") return addMonths(current, 1);
  if (viewMode === "week") return addDays(current, 7);
  if (viewMode === "threeDays") return addDays(current, 3);
  return addDays(current, 1);
};

const getPreviousDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "year") return subYears(current, 1);
  if (viewMode === "month" || viewMode === "list") return subMonths(current, 1);
  if (viewMode === "week") return subDays(current, 7);
  if (viewMode === "threeDays") return subDays(current, 3);
  return subDays(current, 1);
};

const normalizeWeek = (date: Date) => startOfWeek(date, { weekStartsOn: 1 });

const normalizeViewDate = (date: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "year") return startOfYear(date);
  if (viewMode === "list") return startOfMonth(date);
  if (viewMode === "week") return normalizeWeek(date);
  return date;
};

const getPrimaryViewMode = (
  selection: CalendarViewModeSelection,
): CalendarViewMode => Array.isArray(selection) ? selection[0] : selection;

export const useCalendarNavigation = () => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [monthTitleDate, setMonthTitleDate] = useState(() =>
    startOfMonth(new Date()),
  );

  const [monthScrollTargetToken, setMonthScrollTargetToken] = useState(0);
  const [calendarScrollToken, setCalendarScrollToken] = useState(0);

  const [selectedViewMode, setSelectedViewMode] =
    useState<CalendarViewModeSelection>("days");
  const primaryViewMode = getPrimaryViewMode(selectedViewMode);

  const [calendarBuffer, setCalendarBuffer] = useState(() =>
    createCalendarScrollBuffer("calendar", "days"),
  );

  const [viewportWidth, setViewportWidth] = useState(0);

  const getProjectedViewportWidth = useCallback((includeTrailingPanel: boolean) => {
    const viewportEl = contentViewportRef.current;
    const bodyEl = viewportEl?.parentElement ?? null;

    if (!viewportEl || !bodyEl) return 0;

    const bodyWidth = bodyEl.getBoundingClientRect().width;
    const leftPanelEl = viewportEl.previousElementSibling;
    const rightPanelEl = viewportEl.nextElementSibling;
    const leftPanelWidth = leftPanelEl instanceof HTMLElement
      ? leftPanelEl.getBoundingClientRect().width
      : 0;
    const trailingPanelWidth = includeTrailingPanel && rightPanelEl instanceof HTMLElement
      ? rightPanelEl.getBoundingClientRect().width
      : 0;
    const projectedWidth = bodyWidth - leftPanelWidth - trailingPanelWidth;

    return Number.isFinite(projectedWidth) ? Math.max(0, projectedWidth) : 0;
  }, []);

  const requestMonthScrollTarget = useCallback(() => {
    setMonthScrollTargetToken((n) => n + 1);
  }, []);

  const resetCalendarPosition = useCallback((viewMode: CalendarViewMode) => {
    setCalendarBuffer(createCalendarScrollBuffer("calendar", viewMode));
    setCalendarScrollToken((n) => n + 1);
  }, []);

  const extendCalendarBufferLeft = useCallback(() => {
    setCalendarBuffer((prev) => extendCalendarScrollBuffer({
      surface: "calendar",
      viewMode: primaryViewMode,
      buffer: prev,
      direction: "left",
    }));
  }, [primaryViewMode]);

  const extendCalendarBufferRight = useCallback(() => {
    setCalendarBuffer((prev) => extendCalendarScrollBuffer({
      surface: "calendar",
      viewMode: primaryViewMode,
      buffer: prev,
      direction: "right",
    }));
  }, [primaryViewMode]);

  useEffect(() => {
    const el = contentViewportRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setViewportWidth(width);
    });

    ro.observe(el);
    setViewportWidth(el.getBoundingClientRect().width);

    return () => ro.disconnect();
  }, []);

  const handleSelectViewMode = useCallback(
    (next: CalendarViewMode) => {
      if (next !== "month") {
        const projectedViewportWidth = getProjectedViewportWidth(false);

        if (projectedViewportWidth > 0) {
          setViewportWidth(projectedViewportWidth);
        }
      }

      const resolvedNext: CalendarViewModeSelection = isListPieChartViewMode(next)
        ? Array.isArray(selectedViewMode) || isListPieChartViewMode(primaryViewMode)
          ? LIST_PIE_CHART_VIEW_MODES
          : next
        : next;
      const primaryNext = getPrimaryViewMode(resolvedNext);

      setSelectedViewMode(resolvedNext);

      const anchorDate = primaryNext === "pieChart" || primaryNext === "list" ? selectedDate : currentDate;
      const normalized = normalizeViewDate(anchorDate, primaryNext);

      setCurrentDate(normalized);
      setSelectedDate(primaryNext === "list" ? anchorDate : normalized);
      setMonthTitleDate(startOfMonth(normalized));

      if (primaryNext === "month") {
        requestMonthScrollTarget();
      }

      resetCalendarPosition(primaryNext);
    },
    [currentDate, getProjectedViewportWidth, primaryViewMode, requestMonthScrollTarget, resetCalendarPosition, selectedDate, selectedViewMode],
  );

  const handleToday = useCallback(() => {
    const now = new Date();
    const normalized = normalizeViewDate(now, primaryViewMode);

    setCurrentDate(normalized);
    setSelectedDate(primaryViewMode === "list" ? now : normalized);
    setMonthTitleDate(startOfMonth(normalized));

    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition]);

  const handlePrevious = useCallback(() => {
    setCurrentDate((c) => {
      const next = normalizeViewDate(getPreviousDate(c, primaryViewMode), primaryViewMode);

      setSelectedDate(next);
      setMonthTitleDate(startOfMonth(next));

      return next;
    });

    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition]);

  const handleNext = useCallback(() => {
    setCurrentDate((c) => {
      const next = normalizeViewDate(getNextDate(c, primaryViewMode), primaryViewMode);

      setSelectedDate(next);
      setMonthTitleDate(startOfMonth(next));

      return next;
    });

    requestMonthScrollTarget();
    resetCalendarPosition(primaryViewMode);
  }, [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition]);

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

  const handleSidebarSelectDate = useCallback(
    (date: Date) => {
      setCurrentDate(primaryViewMode === "list" ? startOfMonth(date) : date);
      setSelectedDate(date);
      setMonthTitleDate(startOfMonth(date));

      requestMonthScrollTarget();
      resetCalendarPosition(primaryViewMode);
    },
    [primaryViewMode, requestMonthScrollTarget, resetCalendarPosition],
  );

  const handleVisibleMonthChange = useCallback((date: Date) => {
    setMonthTitleDate(startOfMonth(date));
  }, []);

  const handleMonthCellSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
  }, []);

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
    handleToday,
    handlePrevious,
    handleNext,
    handleSidebarPreviousMonth,
    handleSidebarNextMonth,
    handleSidebarSelectDate,
    handleVisibleMonthChange,
    handleMonthCellSelectDate,

    resetCalendarPosition,

    extendCalendarBufferLeft,
    extendCalendarBufferRight,
  };
};