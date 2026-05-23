import { useCallback, useEffect, useRef, type UIEvent } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "../../schedulePane.types";

import { useScrollEdgeDetector } from "./useScrollEdgeDetector";
import { usePreserveScrollOnPrepend } from "./usePreserveScrollOnPrepend";
import { useCalendarScrollPositionSync } from "./useCalendarScrollPositionSync";

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
  const syncRafRef = useRef<number | null>(null);
  const prependTrigger =
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
    trigger: prependTrigger,
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
    headerRefs: [headerScrollRef, allDayScrollRef],
  });

  const syncFixedRowScroll = useCallback((scrollLeft: number) => {
    if (syncRafRef.current !== null) return;

    syncRafRef.current = window.requestAnimationFrame(() => {
      syncRafRef.current = null;

      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollLeft;
      }

      if (allDayScrollRef.current) {
        allDayScrollRef.current.scrollLeft = scrollLeft;
      }
    });
  }, []);

  const handleTimelineVisibleDate = useCallback((scroller: HTMLDivElement) => {
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

    if (visibleColumn) {
      onTimelineVisibleDateChange(visibleColumn.start);
    }
  }, [onTimelineVisibleDateChange, timelineColumnWidth, timelineColumns]);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;

    handleEdgeScroll(scroller);

    if (activeMode === "timeline") {
      handleTimelineVisibleDate(scroller);
    }

    syncFixedRowScroll(scroller.scrollLeft);
  }, [activeMode, handleEdgeScroll, handleTimelineVisibleDate, syncFixedRowScroll]);

  useEffect(() => {
    return () => {
      if (syncRafRef.current !== null) {
        window.cancelAnimationFrame(syncRafRef.current);
      }
    };
  }, []);

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
    handleScroll,
    resetAll,
  };
};