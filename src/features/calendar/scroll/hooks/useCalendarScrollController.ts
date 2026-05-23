import { useCallback, useEffect, useRef, type UIEvent } from "react";

import type { CalendarViewMode } from "../../schedulePane.types";

import { useScrollEdgeDetector } from "./useScrollEdgeDetector";
import { usePreserveScrollOnPrepend } from "./usePreserveScrollOnPrepend";
import { useCalendarScrollPositionSync } from "./useCalendarScrollPositionSync";

type CalendarBuffer = {
  before: number;
  after: number;
};

type Props = {
  activeMode: "timeline" | "calendar" | string;
  selectedViewMode: CalendarViewMode;

  visibleDays: Date[];

  timelineColumns: unknown[];
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

  /** 外部から初期スクロールを強制トリガーするトークン */
  scrollTargetToken?: number;
};

export const useCalendarScrollController = ({
  activeMode,
  visibleDays,
  timelineColumnWidth,
  timelineAnchorColumnIndex,
  calendarBuffer,
  viewportWidth,
  calendarDayColumnWidth,
  onExtendLeft,
  onExtendRight,
  scrollTargetToken,
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const syncRafRef = useRef<number | null>(null);

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
    trigger: visibleDays.length,
  });

  /**
   * ④ スクロール位置制御（token / viewport / mode依存）
   */
  useCalendarScrollPositionSync({
    activeMode,
    calendarBufferBefore: calendarBuffer.before,
    calendarDayColumnWidth,
    viewportWidth,
    timelineAnchorColumnIndex,
    timelineColumnWidth,
    scrollTargetToken,
    scrollRef: scrollContainerRef,
    headerRef: headerScrollRef,
  });

  const syncHeaderScroll = useCallback((scrollLeft: number) => {
    if (syncRafRef.current !== null) return;

    syncRafRef.current = window.requestAnimationFrame(() => {
      syncRafRef.current = null;

      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollLeft;
      }
    });
  }, []);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;

    if (activeMode !== "timeline") {
      handleEdgeScroll(scroller);
    }

    syncHeaderScroll(scroller.scrollLeft);
  }, [activeMode, handleEdgeScroll, syncHeaderScroll]);

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
    handleScroll,
    resetAll,
  };
};