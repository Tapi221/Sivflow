import { startTransition, useCallback, useEffect, useMemo, useRef } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";
import { useScrollEdgeDetector } from "./useScrollEdgeDetector";
import { usePreserveScrollOnPrepend } from "./usePreserveScrollOnPrepend";
import { useCalendarScrollPositionSync } from "./useCalendarScrollPositionSync.fixed";
import { useSyncedHorizontalScroll } from "./useSyncedHorizontalScroll";

type CalendarBuffer = {
  before: number;
  after: number;
};

type TimelineColumn = {
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
  const timelineVisibleDateRafRef = useRef<number | null>(null);
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

  const scheduleTimelineVisibleDate = useCallback((scroller: HTMLDivElement) => {
    if (timelineVisibleDateRafRef.current !== null) return;

    timelineVisibleDateRafRef.current = window.requestAnimationFrame(() => {
      timelineVisibleDateRafRef.current = null;
      syncTimelineVisibleDate(scroller);
    });
  }, [syncTimelineVisibleDate]);

  const handlePassiveScroll = useCallback((scroller: HTMLDivElement) => {
    handleEdgeScroll(scroller);
    if (activeMode === "timeline") {
      scheduleTimelineVisibleDate(scroller);
    }
  }, [activeMode, handleEdgeScroll, scheduleTimelineVisibleDate]);

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    const handleScroll = () => handlePassiveScroll(scroller);

    scroller.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);

      if (timelineVisibleDateRafRef.current !== null) {
        window.cancelAnimationFrame(timelineVisibleDateRafRef.current);
        timelineVisibleDateRafRef.current = null;
      }
    };
  }, [handlePassiveScroll]);

  /**
   * buffer変化などでのリセット統合
   */
  const resetAll = useCallback(() => {
    resetEdge();
    resetPrepend();
  }, [resetEdge, resetPrepend]);

  return {
    scrollContainerRef,
    headerScrollRef,
    allDayScrollRef,
    handleScroll: undefined,
    resetAll,
  };
};