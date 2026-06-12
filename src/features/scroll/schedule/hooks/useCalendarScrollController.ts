import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { getCalendarDateKey } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import { persistScheduleCalendarScrollTop, readStoredScheduleCalendarScrollTop } from "@/features/calendar/scheduleNavigationPersistence";
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



const CALENDAR_TIMELINE_SCROLLED_CLASS_NAME = "calendar-timeline-scroll-scrolled";
const SCHEDULE_SCROLL_POSITION_PERSIST_DELAY_MS = 200;



const isWeekdayHorizontalViewMode = (viewMode: CalendarViewMode) =>
  viewMode === "days" ||
  viewMode === "threeDays" ||
  viewMode === "week" ||
  viewMode === "timetable";
const isRestorableVerticalScrollViewMode = (viewMode: CalendarViewMode): boolean => isWeekdayHorizontalViewMode(viewMode);
const updateTimelineScrollFadeVisibility = (scroller: HTMLDivElement): void => {
  scroller.classList.toggle(CALENDAR_TIMELINE_SCROLLED_CLASS_NAME, scroller.scrollTop > 0);
};
const useCalendarScrollController = ({ selectedViewMode, visibleDays, virtualRail, calendarBuffer, viewportWidth, calendarDayColumnWidth, onVisibleDateChange, scrollTargetToken }: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const latestScrollerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);
  const persistScrollTimeoutRef = useRef<number | null>(null);
  const lastVisibleDateKeyRef = useRef<string | null>(null);
  const didRestoreScrollTopRef = useRef(false);
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

  useLayoutEffect(() => {
    if (didRestoreScrollTopRef.current) return;
    if (!isRestorableVerticalScrollViewMode(selectedViewMode)) return;

    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    const storedScrollTop = readStoredScheduleCalendarScrollTop();
    if (storedScrollTop === null) return;

    scroller.scrollTop = storedScrollTop;
    updateTimelineScrollFadeVisibility(scroller);
    didRestoreScrollTopRef.current = true;
  }, [selectedViewMode]);

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

  const flushPendingScrollTop = useCallback(() => {
    if (persistScrollTimeoutRef.current !== null) {
      window.clearTimeout(persistScrollTimeoutRef.current);
      persistScrollTimeoutRef.current = null;
    }

    const pendingScrollTop = pendingScrollTopRef.current;
    pendingScrollTopRef.current = null;

    if (pendingScrollTop === null) return;

    persistScheduleCalendarScrollTop(pendingScrollTop);
  }, []);

  const scheduleVerticalScrollPositionPersistence = useCallback((scroller: HTMLDivElement) => {
    if (!isRestorableVerticalScrollViewMode(selectedViewMode)) return;

    pendingScrollTopRef.current = scroller.scrollTop;

    if (persistScrollTimeoutRef.current !== null) {
      window.clearTimeout(persistScrollTimeoutRef.current);
    }

    persistScrollTimeoutRef.current = window.setTimeout(flushPendingScrollTop, SCHEDULE_SCROLL_POSITION_PERSIST_DELAY_MS);
  }, [flushPendingScrollTop, selectedViewMode]);

  const scheduleScrollWork = useCallback((scroller: HTMLDivElement) => {
    latestScrollerRef.current = scroller;

    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      const latestScroller = latestScrollerRef.current;

      scrollRafRef.current = null;
      latestScrollerRef.current = null;

      if (!latestScroller) return;

      updateTimelineScrollFadeVisibility(latestScroller);
      syncVisibleDate(latestScroller);
      scheduleVerticalScrollPositionPersistence(latestScroller);
    });
  }, [scheduleVerticalScrollPositionPersistence, syncVisibleDate]);

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    const handleScroll = () => scheduleScrollWork(scroller);

    scroller.addEventListener("scroll", handleScroll, { passive: true });

    const initialFrameId = window.requestAnimationFrame(() => {
      updateTimelineScrollFadeVisibility(scroller);
      syncVisibleDate(scroller);
    });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      scroller.classList.remove(CALENDAR_TIMELINE_SCROLLED_CLASS_NAME);
      window.cancelAnimationFrame(initialFrameId);

      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }

      latestScrollerRef.current = null;
      flushPendingScrollTop();
    };
  }, [flushPendingScrollTop, scheduleScrollWork, syncVisibleDate]);

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



export { useCalendarScrollController };
