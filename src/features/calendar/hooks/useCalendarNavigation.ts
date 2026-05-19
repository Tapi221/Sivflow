import { addDays, addMonths, startOfMonth, subDays, subMonths } from "date-fns";
import { useCallback, useRef, useState } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type {
  CalendarToolbarMode,
  CalendarViewMode,
} from "../calendarPane.types";

const createInitialCalendarBuffer = () => ({
  before: C.INITIAL_CALENDAR_BUFFER_DAYS,
  after: C.INITIAL_CALENDAR_BUFFER_DAYS,
});

const createInitialTimelineUnitBuffer = (viewMode: CalendarViewMode) => {
  if (viewMode === "month") return { before: 3, after: 8 };
  if (viewMode === "week") return { before: 4, after: 8 };
  return { before: 7, after: 14 };
};

const getNextDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return addMonths(current, 1);
  if (viewMode === "week") return addDays(current, 7);
  return addDays(current, 1);
};

const getPreviousDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return subMonths(current, 1);
  if (viewMode === "week") return subDays(current, 7);
  return subDays(current, 1);
};

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

  const [selectedViewMode, setSelectedViewMode] =
    useState<CalendarViewMode>("days");

  const [activeMode, setActiveMode] = useState<CalendarToolbarMode>("timeline");

  const [calendarBuffer, setCalendarBuffer] = useState(
    createInitialCalendarBuffer,
  );

  const [timelineUnitBuffer, setTimelineUnitBuffer] = useState(() =>
    createInitialTimelineUnitBuffer("days"),
  );

  const [viewportWidth, setViewportWidth] = useState(0);

  const requestMonthScrollTarget = useCallback(() => {
    setMonthScrollTargetToken((n) => n + 1);
  }, []);

  const resetTimelinePosition = useCallback((viewMode: CalendarViewMode) => {
    setCalendarBuffer(createInitialCalendarBuffer());
    setTimelineUnitBuffer(createInitialTimelineUnitBuffer(viewMode));
  }, []);

  // ─────────────────────────────────────────────
  // 無限横スクロール用バッファ拡張
  // ─────────────────────────────────────────────

  const extendCalendarBufferLeft = useCallback(() => {
    setCalendarBuffer((prev) => ({
      ...prev,
      before: prev.before + C.CALENDAR_EXTEND_DAYS,
    }));
  }, []);

  const extendCalendarBufferRight = useCallback(() => {
    setCalendarBuffer((prev) => ({
      ...prev,
      after: prev.after + C.CALENDAR_EXTEND_DAYS,
    }));
  }, []);

  // ─────────────────────────────────────────────

  const handleSelectViewMode = useCallback(
    (next: CalendarViewMode) => {
      setSelectedViewMode(next);
      setActiveMode("calendar");

      if (next === "month") {
        setMonthTitleDate(startOfMonth(currentDate));
        requestMonthScrollTarget();
      }

      resetTimelinePosition(next);
    },
    [currentDate, requestMonthScrollTarget, resetTimelinePosition],
  );

  const handleToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    setMonthTitleDate(startOfMonth(now));

    requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [selectedViewMode, requestMonthScrollTarget, resetTimelinePosition]);

  const handlePrevious = useCallback(() => {
    setCurrentDate((c) => {
      const next = getPreviousDate(c, selectedViewMode);
      setSelectedDate(next);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });

    requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [selectedViewMode, requestMonthScrollTarget, resetTimelinePosition]);

  const handleNext = useCallback(() => {
    setCurrentDate((c) => {
      const next = getNextDate(c, selectedViewMode);
      setSelectedDate(next);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });

    requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [selectedViewMode, requestMonthScrollTarget, resetTimelinePosition]);

  const handleSidebarPreviousMonth = useCallback(() => {
    setCurrentDate((c) => {
      const next = subMonths(c, 1);
      setSelectedDate(next);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });

    requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [selectedViewMode, requestMonthScrollTarget, resetTimelinePosition]);

  const handleSidebarNextMonth = useCallback(() => {
    setCurrentDate((c) => {
      const next = addMonths(c, 1);
      setSelectedDate(next);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });

    requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [selectedViewMode, requestMonthScrollTarget, resetTimelinePosition]);

  const handleSidebarSelectDate = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      setSelectedDate(date);
      setMonthTitleDate(startOfMonth(date));

      requestMonthScrollTarget();
      resetTimelinePosition(selectedViewMode);
    },
    [selectedViewMode, requestMonthScrollTarget, resetTimelinePosition],
  );

  const handleVisibleMonthChange = useCallback((date: Date) => {
    setMonthTitleDate(startOfMonth(date));
  }, []);

  // ─────────────────────────────────────────────
  // 月セル選択（副作用なし）
  // ─────────────────────────────────────────────
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

    selectedViewMode,
    activeMode,
    setActiveMode,

    calendarBuffer,
    timelineUnitBuffer,
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

    resetTimelinePosition,

    extendCalendarBufferLeft,
    extendCalendarBufferRight,
  };
};
