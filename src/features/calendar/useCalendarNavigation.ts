import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import type { CalendarToolbarMode, CalendarViewMode } from "./scheduleScreen.types";
import { createCalendarScrollBuffer, getCalendarScrollBufferExtendUnits } from "../scroll/schedule/calendarScrollBuffer";

const getNextDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return addMonths(current, 1);
  if (viewMode === "week") return addDays(current, 7);
  if (viewMode === "threeDays") return addDays(current, 3);
  return addDays(current, 1);
};

const getPreviousDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return subMonths(current, 1);
  if (viewMode === "week") return subDays(current, 7);
  if (viewMode === "threeDays") return subDays(current, 3);
  return subDays(current, 1);
};

const normalizeWeek = (date: Date) => startOfWeek(date, { weekStartsOn: 1 });

const isSameTimelineTitleDate = (a: Date, b: Date) =>
  startOfDay(a).getTime() === startOfDay(b).getTime();

type UseCalendarNavigationOptions = {
  initialActiveMode?: CalendarToolbarMode;
};

export const useCalendarNavigation = ({
  initialActiveMode = "timeline",
}: UseCalendarNavigationOptions = {}) => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [timelineTitleDate, setTimelineTitleDate] = useState(() => new Date());
  const [monthTitleDate, setMonthTitleDate] = useState(() =>
    startOfMonth(new Date()),
  );

  const [monthScrollTargetToken, setMonthScrollTargetToken] = useState(0);
  const [calendarScrollToken, setCalendarScrollToken] = useState(0);

  const [selectedViewMode, setSelectedViewMode] =
    useState<CalendarViewMode>("days");

  const [activeMode, setActiveMode] =
    useState<CalendarToolbarMode>(initialActiveMode);

  const [calendarBuffer, setCalendarBuffer] = useState(() =>
    createCalendarScrollBuffer("calendar", "days"),
  );

  const [timelineUnitBuffer, setTimelineUnitBuffer] = useState(() =>
    createCalendarScrollBuffer("timeline", "days"),
  );

  const [viewportWidth, setViewportWidth] = useState(0);

  const requestMonthScrollTarget = useCallback(() => {
    setMonthScrollTargetToken((n) => n + 1);
  }, []);

  const resetTimelinePosition = useCallback((viewMode: CalendarViewMode) => {
    setCalendarBuffer(createCalendarScrollBuffer("calendar", viewMode));
    setTimelineUnitBuffer(createCalendarScrollBuffer("timeline", viewMode));
    setCalendarScrollToken((n) => n + 1);
  }, []);

  const extendCalendarBufferLeft = useCallback(() => {
    setCalendarBuffer((prev) => ({
      ...prev,
      before:
        prev.before +
        getCalendarScrollBufferExtendUnits("calendar", selectedViewMode),
    }));
  }, [selectedViewMode]);

  const extendCalendarBufferRight = useCallback(() => {
    setCalendarBuffer((prev) => ({
      ...prev,
      after:
        prev.after +
        getCalendarScrollBufferExtendUnits("calendar", selectedViewMode),
    }));
  }, [selectedViewMode]);

  const extendTimelineUnitBufferLeft = useCallback(() => {
    setTimelineUnitBuffer((prev) => ({
      ...prev,
      before:
        prev.before +
        getCalendarScrollBufferExtendUnits("timeline", selectedViewMode),
    }));
  }, [selectedViewMode]);

  const extendTimelineUnitBufferRight = useCallback(() => {
    setTimelineUnitBuffer((prev) => ({
      ...prev,
      after:
        prev.after +
        getCalendarScrollBufferExtendUnits("timeline", selectedViewMode),
    }));
  }, [selectedViewMode]);

  const handleTimelineVisibleDateChange = useCallback((date: Date) => {
    setTimelineTitleDate((prev) =>
      isSameTimelineTitleDate(prev, date) ? prev : date,
    );
  }, []);

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
      setSelectedViewMode(next);

      // timeline中はtimeline、それ以外はcalendarへ
      setActiveMode((current) =>
        current === "timeline" ? "timeline" : "calendar",
      );

      const normalized =
        next === "week" ? normalizeWeek(currentDate) : currentDate;

      setCurrentDate(normalized);
      setSelectedDate(normalized);
      setTimelineTitleDate(normalized);

      if (next === "month") {
        setMonthTitleDate(startOfMonth(normalized));
        requestMonthScrollTarget();
      }

      resetTimelinePosition(next);
    },
    [currentDate, requestMonthScrollTarget, resetTimelinePosition],
  );

  const handleToday = useCallback(() => {
    const now = new Date();
    const normalized = selectedViewMode === "week" ? normalizeWeek(now) : now;

    setCurrentDate(normalized);
    setSelectedDate(normalized);
    setTimelineTitleDate(normalized);
    setMonthTitleDate(startOfMonth(normalized));

    requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [selectedViewMode, requestMonthScrollTarget, resetTimelinePosition]);

  const handlePrevious = useCallback(() => {
    setCurrentDate((c) => {
      let next = getPreviousDate(c, selectedViewMode);

      if (selectedViewMode === "week") {
        next = normalizeWeek(next);
      }

      setSelectedDate(next);
      setTimelineTitleDate(next);
      setMonthTitleDate(startOfMonth(next));

      return next;
    });

    requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [selectedViewMode, requestMonthScrollTarget, resetTimelinePosition]);

  const handleNext = useCallback(() => {
    setCurrentDate((c) => {
      let next = getNextDate(c, selectedViewMode);

      if (selectedViewMode === "week") {
        next = normalizeWeek(next);
      }

      setSelectedDate(next);
      setTimelineTitleDate(next);
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
      setTimelineTitleDate(next);
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
      setTimelineTitleDate(next);
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
      setTimelineTitleDate(date);
      setMonthTitleDate(startOfMonth(date));

      requestMonthScrollTarget();
      resetTimelinePosition(selectedViewMode);
    },
    [selectedViewMode, requestMonthScrollTarget, resetTimelinePosition],
  );

  const handleTimelineSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setTimelineTitleDate(date);
    setMonthTitleDate(startOfMonth(date));
  }, []);

  const handleVisibleMonthChange = useCallback((date: Date) => {
    setMonthTitleDate(startOfMonth(date));
  }, []);

  const handleMonthCellSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setTimelineTitleDate(date);
  }, []);

  return {
    contentViewportRef,
    scrollContainerRef,
    headerScrollRef,

    currentDate,
    selectedDate,
    timelineTitleDate,
    monthTitleDate,
    setMonthTitleDate,

    monthScrollTargetToken,
    calendarScrollToken,

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
    handleTimelineSelectDate,
    handleVisibleMonthChange,
    handleMonthCellSelectDate,
    handleTimelineVisibleDateChange,

    resetTimelinePosition,

    extendCalendarBufferLeft,
    extendCalendarBufferRight,
    extendTimelineUnitBufferLeft,
    extendTimelineUnitBufferRight,
  };
};