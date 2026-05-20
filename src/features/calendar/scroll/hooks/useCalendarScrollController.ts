import type { UIEvent } from "react";
import { useCallback, useRef } from "react";

import type { CalendarViewMode } from "../../schedulePane.types";

import { useScrollEdgeDetector } from "./useScrollEdgeDetector";
import { useSyncHorizontalScroll } from "./useSyncHorizontalScroll";
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

  /**
   * ① エッジ検知（無限スクロールトリガー）
   */
  const { handleScroll: handleEdgeScroll, reset: resetEdge } =
    useScrollEdgeDetector({
      onExtendLeft,
      onExtendRight,
    });

  /**
   * ② ヘッダー同期
   */
  const { syncFromSource } = useSyncHorizontalScroll(
    scrollContainerRef,
    headerScrollRef,
  );

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

  /**
   * スクロールイベント統合
   * - edge detection + header sync
   */
  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scroller = event.currentTarget;

      handleEdgeScroll(event);
      syncFromSource();

      // 外部syncの保険（直接同期）
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scroller.scrollLeft;
      }
    },
    [handleEdgeScroll, syncFromSource],
  );

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
    handleTimelineScroll,
    resetAll,
  };
};