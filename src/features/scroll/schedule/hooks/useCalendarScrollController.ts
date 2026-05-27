import { useCallback, useEffect, useMemo, useRef } from "react";
import type { CalendarToolbarMode, CalendarViewMode } from "@/features/calendar/scheduleScreen.types";
import { useCalendarScrollPositionSync } from "./useCalendarScrollPositionSync.fixed";
import { usePreserveScrollOnPrepend } from "./usePreserveScrollOnPrepend";
import { useScrollEdgeDetector } from "./useScrollEdgeDetector";
import { useSyncedHorizontalScroll } from "./useSyncedHorizontalScroll";

type CalendarBuffer = {
  before: number;
  after: number;
};

type Props = {
  activeMode: CalendarToolbarMode;
  selectedViewMode: CalendarViewMode;
  visibleDays: Date[];
  calendarBuffer: CalendarBuffer;
  viewportWidth: number;
  calendarDayColumnWidth: number;
  onExtendLeft: () => void;
  onExtendRight: () => void;
  scrollTargetToken?: number;
};

export const useCalendarScrollController = ({
  activeMode,
  selectedViewMode,
  visibleDays,
  calendarBuffer,
  viewportWidth,
  calendarDayColumnWidth,
  onExtendLeft,
  onExtendRight,
  scrollTargetToken,
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const latestScrollerRef = useRef<HTMLDivElement | null>(null);
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
    activeMode,
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
    syncKey: `${activeMode}:${selectedViewMode}`,
  });

  const runScrollWork = useCallback((scroller: HTMLDivElement) => {
    if (activeMode !== "calendar") return;

    handleEdgeScroll(scroller);
  }, [activeMode, handleEdgeScroll]);

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

    return () => {
      scroller.removeEventListener("scroll", handleScroll);

      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }

      latestScrollerRef.current = null;
    };
  }, [scheduleScrollWork]);

  const resetAll = useCallback(() => {
    resetEdge();
    resetPrepend();
  }, [resetEdge, resetPrepend]);

  useEffect(() => {
    resetEdge();
  }, [resetEdge, visibleDays.length]);

  return {
    scrollContainerRef,
    headerScrollRef,
    allDayScrollRef,
    handleScroll: undefined,
    resetAll,
  };
};