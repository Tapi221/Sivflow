import { startTransition, useCallback, useEffect, useMemo, useRef } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";
import { useCalendarScrollPositionSync } from "./useCalendarScrollPositionSync.fixed";
import { usePreserveScrollOnPrepend } from "./usePreserveScrollOnPrepend";
import { useScrollEdgeDetector } from "./useScrollEdgeDetector";
import { useSyncedHorizontalScroll } from "./useSyncedHorizontalScroll";

type CalendarBuffer = {
  before: number;
  after: number;
};

type TimelineColumn = {
  id: string;
  start: Date;
};

type Props = {
  activeMode: "timeline" | "calendar" | string;
  selectedViewMode: CalendarViewMode;

  visibleDays: Date[];

  timelineColumns: TimelineColumn[];
  timelineColumnWidth: number;
  timelineAnchorColumnIndex: number;
  timelineUnitBuffer: CalendarBuffer;

  calendarBuffer: CalendarBuffer;

  viewportWidth: number;

  /** 日カラムの幅（px） */
  calendarDayColumnWidth: number;

  /** 左端スクロール時に呼ばれるコールバック */
  onExtendLeft: () => void;

  /** 右端スクロール時に呼ばれるコールバック */
  onExtendRight: () => void;

  onTimelineVisibleDateChange?: (date: Date) => void;

  /** 外部から初期スクロールを強制トリガーするトークン */
  scrollTargetToken?: number;
};

export const useCalendarScrollController = ({
  activeMode,
  selectedViewMode,
  visibleDays,
  timelineColumns,
  timelineColumnWidth,
  timelineAnchorColumnIndex,
  timelineUnitBuffer,
  calendarBuffer,
  viewportWidth,
  calendarDayColumnWidth,
  onExtendLeft,
  onExtendRight,
  onTimelineVisibleDateChange,
  scrollTargetToken,
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const visibleTimelineColumnIdRef = useRef<string | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const latestScrollerRef = useRef<HTMLDivElement | null>(null);
  const fixedRowScrollRefs = useMemo(
    () => [headerScrollRef, allDayScrollRef],
    [],
  );
  const prependTrigger =
    activeMode === "timeline" ? timelineUnitBuffer.before : calendarBuffer.before;
  const scrollExtentTrigger =
    activeMode === "timeline" ? timelineColumns.length : visibleDays.length;

  /**
   * ① エッジ検知（無限スクロールトリガー）
   */
  const { handleScroll: handleEdgeScroll, reset: resetEdge } =
    useScrollEdgeDetector({
      onExtendLeft,
      onExtendRight,
    });

  /**
   * ③ prepend後のスクロール位置維持
   */
  const { reset: resetPrepend } = usePreserveScrollOnPrepend({
    scrollerRef: scrollContainerRef,
    trigger: scrollExtentTrigger,
    prependTrigger,
    syncedRefs: fixedRowScrollRefs,
  });

  /**
   * ④ スクロール位置制御（token / viewport / mode依存）
   */
  useCalendarScrollPositionSync({
    activeMode,
    selectedViewMode,
    calendarBufferBefore: calendarBuffer.before,
    calendarDayColumnWidth,
    viewportWidth,
    timelineAnchorColumnIndex,
    timelineColumnWidth,
    scrollTargetToken,
    scrollRef: scrollContainerRef,
    headerRefs: fixedRowScrollRefs,
  });

  useSyncedHorizontalScroll({
    primaryRef: scrollContainerRef,
    syncedRefs: fixedRowScrollRefs,
    syncKey: `${activeMode}:${selectedViewMode}`,
  });

  const syncTimelineVisibleDate = useCallback((scroller: HTMLDivElement) => {
    if (!onTimelineVisibleDateChange || timelineColumns.length === 0) return;

    const visibleX = Math.max(
      0,
      scroller.scrollLeft + scroller.clientWidth / 2 - C.TIMELINE_LANE_LABEL_WIDTH,
    );
    const visibleIndex = Math.min(
      timelineColumns.length - 1,
      Math.max(0, Math.floor(visibleX / timelineColumnWidth)),
    );
    const visibleColumn = timelineColumns[visibleIndex];

    if (visibleColumn && visibleColumn.id !== visibleTimelineColumnIdRef.current) {
      visibleTimelineColumnIdRef.current = visibleColumn.id;
      startTransition(() => {
        onTimelineVisibleDateChange(visibleColumn.start);
      });
    }
  }, [onTimelineVisibleDateChange, timelineColumnWidth, timelineColumns]);

  const runScrollWork = useCallback((scroller: HTMLDivElement) => {
    handleEdgeScroll(scroller);
    if (activeMode === "timeline") {
      syncTimelineVisibleDate(scroller);
    }
  }, [activeMode, handleEdgeScroll, syncTimelineVisibleDate]);

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

  /**
   * buffer変化などでのリセット統合
   */
  const resetAll = useCallback(() => {
    resetEdge();
    resetPrepend();
  }, [resetEdge, resetPrepend]);

  useEffect(() => {
    resetEdge();
  }, [resetEdge, scrollExtentTrigger]);

  return {
    scrollContainerRef,
    headerScrollRef,
    allDayScrollRef,
    handleScroll: undefined,
    resetAll,
  };
};
