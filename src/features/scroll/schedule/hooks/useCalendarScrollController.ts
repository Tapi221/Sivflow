import { useCallback, useEffect, useMemo, useRef } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { getCalendarDateKey } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";
import { useCalendarScrollPositionSync } from "./useCalendarScrollPositionSync";
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
  onVisibleDateChange?: (date: Date) => void;
  scrollTargetToken?: number;
};

const isWeekdayHorizontalViewMode = (viewMode: CalendarViewMode) =>
  viewMode === "days" ||
  viewMode === "threeDays" ||
  viewMode === "week" ||
  viewMode === "timetable";

export const useCalendarScrollController = ({
  selectedViewMode,
  visibleDays,
  virtualRail,
  calendarBuffer,
  viewportWidth,
  calendarDayColumnWidth,
  onVisibleDateChange,
  scrollTargetToken,
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const latestScrollerRef = useRef<HTMLDivElement | null>(null);
  const lastVisibleDateKeyRef = useRef<string | null>(null);
  const fixedRowScrollRefs = useMemo(() => [headerScrollRef, allDayScrollRef], []);

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
    if (!onVisibleDateChange || !isWeekdayHorizontalViewMode(selectedViewMode) || calendarDayColumnWidth <= 0) {
      return;
    }

    const anchorLeft = Math.max(0, scroller.scrollLeft + scroller.clientWidth / 2 - C.TIME_COLUMN_WIDTH);
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

  const scheduleScrollWork = useCallback((scroller: HTMLDivElement) => {
    latestScrollerRef.current = scroller;

    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      const latestScroller = latestScrollerRef.current;

      scrollRafRef.current = null;
      latestScrollerRef.current = null;

      if (!latestScroller) return;

      syncVisibleDate(latestScroller);
    });
  }, [syncVisibleDate]);

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    const handleScroll = () => scheduleScrollWork(scroller);

    scroller.addEventListener("scroll", handleScroll, { passive: true });

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

      latestScrollerRef.current = null;
    };
  }, [scheduleScrollWork, syncVisibleDate]);

  useEffect(() => {
    lastVisibleDateKeyRef.current = null;
  }, [selectedViewMode, scrollTargetToken]);

  return {
    scrollContainerRef,
    headerScrollRef,
    allDayScrollRef,
    handleScroll: undefined,
  };
};