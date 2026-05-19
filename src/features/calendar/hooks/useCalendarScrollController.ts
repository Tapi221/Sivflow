import { useCallback, useLayoutEffect, useRef } from "react";
import type { UIEvent } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "../calendarPane.types";

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
  timelineColumns,
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

  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);

  const prependScrollWidthRef = useRef<number | null>(null);

  const prevBufferBeforeRef = useRef(calendarBuffer.before);

  // 追加: トークンガード用
  const lastScrollTargetTokenRef = useRef<number | null>(null);

  const syncHeader = useCallback((scrollLeft: number) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scroller = event.currentTarget;
      syncHeader(scroller.scrollLeft);

      const distLeft = scroller.scrollLeft;
      const distRight =
        scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;

      if (
        distLeft < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingLeftRef.current
      ) {
        isExtendingLeftRef.current = true;
        prependScrollWidthRef.current = scroller.scrollWidth;
        onExtendLeft();
      }

      if (
        distRight < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;
        onExtendRight();
      }
    },
    [onExtendLeft, onExtendRight, syncHeader],
  );

  useLayoutEffect(() => {
    const prevWidth = prependScrollWidthRef.current;
    if (prevWidth === null) return;

    const scroller = scrollContainerRef.current;
    if (!scroller) {
      prependScrollWidthRef.current = null;
      isExtendingLeftRef.current = false;
      return;
    }

    const widthDiff = scroller.scrollWidth - prevWidth;
    if (widthDiff > 0) {
      scroller.scrollLeft += widthDiff;
      syncHeader(scroller.scrollLeft);
    }

    prependScrollWidthRef.current = null;
    isExtendingLeftRef.current = false;
  }, [visibleDays.length, syncHeader]);

  useLayoutEffect(() => {
    isExtendingRightRef.current = false;
  }, [visibleDays.length]);

  useLayoutEffect(() => {
    const prev = prevBufferBeforeRef.current;
    const current = calendarBuffer.before;

    if (current < prev) {
      isExtendingLeftRef.current = false;
      isExtendingRightRef.current = false;
      prependScrollWidthRef.current = null;
    }

    prevBufferBeforeRef.current = current;
  }, [calendarBuffer.before]);

  useLayoutEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    const currentToken = scrollTargetToken ?? 0;

    // 追加ガード: 同じトークンなら何もしない
    if (lastScrollTargetTokenRef.current === currentToken) return;
    lastScrollTargetTokenRef.current = currentToken;

    if (prependScrollWidthRef.current !== null) return;

    let nextScrollLeft = 0;

    if (activeMode === "timeline") {
      nextScrollLeft = timelineAnchorColumnIndex * timelineColumnWidth;
    } else {
      const anchorOffset = calendarBuffer.before * calendarDayColumnWidth;
      const availableWidth = Math.max(0, viewportWidth - C.TIME_COLUMN_WIDTH);
      const centerOffset = Math.max(
        0,
        (availableWidth - calendarDayColumnWidth) / 2,
      );

      nextScrollLeft = Math.max(0, anchorOffset - centerOffset);
    }

    scroller.scrollLeft = nextScrollLeft;
    syncHeader(nextScrollLeft);
  }, [
    activeMode,
    calendarBuffer.before,
    calendarDayColumnWidth,
    timelineAnchorColumnIndex,
    timelineColumnWidth,
    viewportWidth,
    syncHeader,
    scrollTargetToken,
  ]);

  return {
    scrollContainerRef,
    headerScrollRef,
    handleTimelineScroll,
  };
};