import { useCallback, useEffect, useMemo, useRef } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { getCalendarDateKey } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";
import { useCalendarScrollPositionSync } from "./useCalendarScrollPositionSync.fixed";
import { usePreserveScrollOnPrepend } from "./usePreserveScrollOnPrepend";
import { useScrollEdgeDetector } from "./useScrollEdgeDetector";
import { useSyncedHorizontalScroll } from "./useSyncedHorizontalScroll";

type CalendarBuffer = {
  before: number;
  after: number;
};

type Props = {
  selectedViewMode: CalendarViewMode;
  visibleDays: Date[];
  virtualRail?: ScheduleVirtualRail;
  calendarBuffer: CalendarBuffer;
  viewportWidth: number;
  calendarDayColumnWidth: number;
  onExtendLeft: () => void;
  onExtendRight: () => void;
  onVisibleDateChange?: (date: Date) => void;
  scrollTargetToken?: number;
};

const WEEKDAY_SCROLL_SNAP_DELAY_MS = 120;
const WEEKDAY_SCROLL_SNAP_EPSILON_PX = 1;

const isWeekdayHorizontalViewMode = (viewMode: CalendarViewMode) =>
  viewMode === "days" ||
  viewMode === "threeDays" ||
  viewMode === "week" ||
  viewMode === "timetable";

const isDaySnapViewMode = (viewMode: CalendarViewMode) => viewMode === "days";

const clampScrollLeft = (scrollLeft: number, maxScrollLeft: number) => Math.min(Math.max(scrollLeft, 0), Math.max(maxScrollLeft, 0));

const getSnappedDayScrollLeft = (scrollLeft: number, calendarDayColumnWidth: number, maxScrollLeft: number) => {
  if (calendarDayColumnWidth <= 0) return scrollLeft;

  const contentLeft = Math.max(0, scrollLeft - C.TIME_COLUMN_WIDTH);
  const snappedDayIndex = Math.max(0, Math.round(contentLeft / calendarDayColumnWidth));

  return clampScrollLeft(C.TIME_COLUMN_WIDTH + snappedDayIndex * calendarDayColumnWidth, maxScrollLeft);
};

const syncFixedRowsScrollLeft = (fixedRowScrollRefs: React.RefObject<HTMLDivElement | null>[], scrollLeft: number) => {
  fixedRowScrollRefs.forEach((ref) => {
    const fixedRow = ref.current;

    if (fixedRow && fixedRow.scrollLeft !== scrollLeft) {
      fixedRow.scrollLeft = scrollLeft;
    }
  });
};

export const useCalendarScrollController = ({
  selectedViewMode,
  visibleDays,
  virtualRail,
  calendarBuffer,
  viewportWidth,
  calendarDayColumnWidth,
  onExtendLeft,
  onExtendRight,
  onVisibleDateChange,
  scrollTargetToken,
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const latestScrollerRef = useRef<HTMLDivElement | null>(null);
  const lastVisibleDateKeyRef = useRef<string | null>(null);
  const fixedRowScrollRefs = useMemo(
    () => [headerScrollRef, allDayScrollRef],
    [],
  );

  const { handleScroll: handleEdgeScroll, reset: resetEdge } =
    useScrollEdgeDetector({
      onExtendLeft,
      onExtendRight,
    });

  const { reset: resetPrepend } = usePreserveScrollOnPrepend({
    scrollerRef: scrollContainerRef,
    trigger: visibleDays.length,
    prependTrigger: calendarBuffer.before,
    syncedRefs: fixedRowScrollRefs,
  });

  useCalendarScrollPositionSync({
    selectedViewMode,
    calendarBufferBefore: calendarBuffer.before,
    calendarDayColumnWidth,
    viewportWidth,
    scrollTargetToken,
    scrollRef: scrollContainerRef,
    headerRefs: fixedRowScrollRefs,
  });

  useSyncedHorizontalScroll({
    primaryRef: scrollContainerRef,
    syncedRefs: fixedRowScrollRefs,
    syncKey: selectedViewMode,
  });

  const syncVisibleDate = useCallback((scroller: HTMLDivElement) => {
    if (
      !onVisibleDateChange ||
      !isWeekdayHorizontalViewMode(selectedViewMode) ||
      calendarDayColumnWidth <= 0
    ) {
      return;
    }

    const anchorLeft = Math.max(
      0,
      scroller.scrollLeft + scroller.clientWidth / 2 - C.TIME_COLUMN_WIDTH,
    );
    const visibleIndex = Math.max(0, Math.floor(anchorLeft / calendarDayColumnWidth));
    const visibleDate = virtualRail
      ? getScheduleVirtualRailDate(virtualRail, visibleIndex)
      : visibleDays[Math.min(visibleDays.length - 1, visibleIndex)];

    if (!visibleDate) return;

    const visibleDateKey = getCalendarDateKey(visibleDate);
    if (lastVisibleDateKeyRef.current === visibleDateKey) return;

    lastVisibleDateKeyRef.current = visibleDateKey;
    onVisibleDateChange(visibleDate);
  }, [calendarDayColumnWidth, onVisibleDateChange, selectedViewMode, virtualRail, visibleDays]);

  const snapDayScroll = useCallback((scroller: HTMLDivElement) => {
    if (!isDaySnapViewMode(selectedViewMode) || calendarDayColumnWidth <= 0) return;

    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current);
    }

    snapTimeoutRef.current = window.setTimeout(() => {
      snapTimeoutRef.current = null;

      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      const nextScrollLeft = getSnappedDayScrollLeft(scroller.scrollLeft, calendarDayColumnWidth, maxScrollLeft);

      if (Math.abs(scroller.scrollLeft - nextScrollLeft) <= WEEKDAY_SCROLL_SNAP_EPSILON_PX) return;

      scroller.scrollTo({ left: nextScrollLeft, top: scroller.scrollTop, behavior: "smooth" });
      syncFixedRowsScrollLeft(fixedRowScrollRefs, nextScrollLeft);
    }, WEEKDAY_SCROLL_SNAP_DELAY_MS);
  }, [calendarDayColumnWidth, fixedRowScrollRefs, selectedViewMode]);

  const runScrollWork = useCallback((scroller: HTMLDivElement) => {
    handleEdgeScroll(scroller);
    syncVisibleDate(scroller);
    snapDayScroll(scroller);
  }, [handleEdgeScroll, snapDayScroll, syncVisibleDate]);

  const scheduleScrollWork = useCallback((scroller: HTMLDivElement) => {
    latestScrollerRef.current = scroller;

    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      const latestScroller = latestScrollerRef.current;

      scrollRafRef.current = null;
      latestScrollerRef.current = null;

      if (!latestScroller) return;

      runScrollWork(latestScroller);
    });
  }, [runScrollWork]);

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    const handleScroll = () => scheduleScrollWork(scroller);

    scroller.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    const initialFrameId = window.requestAnimationFrame(() => {
      syncVisibleDate(scroller);
    });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(initialFrameId);

      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }

      if (snapTimeoutRef.current !== null) {
        window.clearTimeout(snapTimeoutRef.current);
        snapTimeoutRef.current = null;
      }

      latestScrollerRef.current = null;
    };
  }, [scheduleScrollWork, syncVisibleDate]);

  const resetAll = useCallback(() => {
    resetEdge();
    resetPrepend();
    lastVisibleDateKeyRef.current = null;

    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
  }, [resetEdge, resetPrepend]);

  useEffect(() => {
    resetEdge();
  }, [resetEdge, visibleDays.length]);

  useEffect(() => {
    lastVisibleDateKeyRef.current = null;

    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
  }, [selectedViewMode, scrollTargetToken]);

  return {
    scrollContainerRef,
    headerScrollRef,
    allDayScrollRef,
    handleScroll: undefined,
    resetAll,
  };
};
