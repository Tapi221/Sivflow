import type { RefObject } from "react";
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import {
  buildCalendarMonthWeeks,
  getCalendarMonthKey,
  getCalendarWeekKey,
} from "@/features/calendar/model/calendarMonth.model";

// ── 公開型

type UseMonthInfiniteScrollOptions = {
  currentDate: Date;
  scrollTargetToken: number;
  /** リサイズ中はスクロールイベントを無視するためのフラグ */
  isResizingRef: RefObject<boolean>;
  /** スクロール中のレイアウト計算で DOM 計測を避けるための行高キャッシュ */
  monthRowHeightRef?: RefObject<number>;
  onVisibleMonthChange?: (date: Date) => void;
};

export type UseMonthInfiniteScrollReturn = {
  monthWeeks: ReturnType<typeof buildCalendarMonthWeeks>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  weekRowRefsMap: RefObject<Map<string, HTMLElement>>;
  setWeekRowRef: (weekKey: string, node: HTMLElement | null) => void;
  /** リサイズ完了後など、外部から表示月を再同期する必要があるときに呼ぶ */
  syncVisibleMonth: () => void;
  /** リサイズ開始時など、遅延中の表示月同期をキャンセルしたいときに呼ぶ */
  cancelVisibleMonthSync: () => void;
};

type MonthRangeAnchor = {
  weekKey: string;
  offsetTop: number;
};

const MONTH_GRID_FIRST_WEEK_OFFSET_PX = C.CALENDAR_WEEKDAY_HEADER_HEIGHT;
const VISIBLE_MONTH_SYNC_DELAY_MS = 96;

// ── フック本体

export const useMonthInfiniteScroll = ({
  currentDate,
  scrollTargetToken,
  isResizingRef,
  monthRowHeightRef,
  onVisibleMonthChange,
}: UseMonthInfiniteScrollOptions): UseMonthInfiniteScrollReturn => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const weekRowRefsMap = useRef<Map<string, HTMLElement>>(new Map());
  const prependScrollHeightRef = useRef<number | null>(null);
  const rangeAnchorRef = useRef<MonthRangeAnchor | null>(null);
  const isExtendingBeforeRef = useRef(false);
  const isExtendingAfterRef = useRef(false);
  const visibleMonthSyncRafRef = useRef<number | null>(null);
  const visibleMonthSyncTimeoutRef = useRef<number | null>(null);
  const pendingScrollWeekKeyRef = useRef<string | null>(
    getCalendarWeekKey(currentDate),
  );

  const lastScrollTargetTokenRef = useRef(scrollTargetToken);
  const visibleMonthKeyRef = useRef(getCalendarMonthKey(currentDate));

  const [anchorMonth, setAnchorMonth] = useState(() => currentDate);
  const [monthOffsetRange, setMonthOffsetRange] = useState(
    C.createInitialMonthOffsetRange,
  );

  const monthWeeks = useMemo(
    () =>
      buildCalendarMonthWeeks({
        anchorDate: anchorMonth,
        startOffset: monthOffsetRange.startOffset,
        endOffset: monthOffsetRange.endOffset,
      }),
    [anchorMonth, monthOffsetRange.endOffset, monthOffsetRange.startOffset],
  );

  const setWeekRowRef = useCallback(
    (weekKey: string, node: HTMLElement | null) => {
      if (node) {
        weekRowRefsMap.current.set(weekKey, node);
      } else {
        weekRowRefsMap.current.delete(weekKey);
      }
    },
    [],
  );

  const getMonthRowHeight = useCallback(() => {
    const cachedHeight = monthRowHeightRef?.current;

    if (
      typeof cachedHeight === "number" &&
      Number.isFinite(cachedHeight) &&
      cachedHeight > 0
    ) {
      return cachedHeight;
    }

    const firstWeek = monthWeeks[0];
    const firstRow = firstWeek
      ? weekRowRefsMap.current.get(firstWeek.key)
      : null;
    const measuredHeight = firstRow?.offsetHeight ?? 0;

    return measuredHeight > 0 ? measuredHeight : C.DEFAULT_MONTH_ROW_HEIGHT;
  }, [monthRowHeightRef, monthWeeks]);

  const getWeekIndexFromScrollTop = useCallback(
    (scrollTop: number) => {
      const rowHeight = getMonthRowHeight();
      const rawWeekIndex = Math.floor(
        (scrollTop - MONTH_GRID_FIRST_WEEK_OFFSET_PX) / rowHeight,
      );

      return Math.min(
        monthWeeks.length - 1,
        Math.max(0, rawWeekIndex),
      );
    },
    [getMonthRowHeight, monthWeeks.length],
  );

  const getWeekOffsetTop = useCallback(
    (weekIndex: number) =>
      MONTH_GRID_FIRST_WEEK_OFFSET_PX + weekIndex * getMonthRowHeight(),
    [getMonthRowHeight],
  );

  const getCurrentRangeAnchor = useCallback(
    (scroller: HTMLDivElement): MonthRangeAnchor | null => {
      if (monthWeeks.length === 0) return null;

      const weekIndex = getWeekIndexFromScrollTop(scroller.scrollTop);
      const anchorWeek = monthWeeks[weekIndex];

      if (!anchorWeek) return null;

      return {
        weekKey: anchorWeek.key,
        offsetTop: getWeekOffsetTop(weekIndex) - scroller.scrollTop,
      };
    },
    [getWeekIndexFromScrollTop, getWeekOffsetTop, monthWeeks],
  );

  const syncVisibleMonth = useCallback(() => {
    const scroller = scrollContainerRef.current;

    if (!scroller || monthWeeks.length === 0 || !onVisibleMonthChange) return;

    const sampleOffsetTop =
      scroller.scrollTop + C.MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;

    const weekIndex = getWeekIndexFromScrollTop(sampleOffsetTop);
    const visibleWeek = monthWeeks[weekIndex];

    if (!visibleWeek) return;

    const nextKey = getCalendarMonthKey(visibleWeek.visibleMonthDate);
    if (nextKey === visibleMonthKeyRef.current) return;

    visibleMonthKeyRef.current = nextKey;
    onVisibleMonthChange(visibleWeek.visibleMonthDate);
  }, [getWeekIndexFromScrollTop, monthWeeks, onVisibleMonthChange]);

  const scheduleVisibleMonthSync = useCallback(() => {
    if (visibleMonthSyncTimeoutRef.current !== null) {
      window.clearTimeout(visibleMonthSyncTimeoutRef.current);
    }

    visibleMonthSyncTimeoutRef.current = window.setTimeout(() => {
      visibleMonthSyncTimeoutRef.current = null;

      if (visibleMonthSyncRafRef.current !== null) return;

      visibleMonthSyncRafRef.current = requestAnimationFrame(() => {
        visibleMonthSyncRafRef.current = null;
        syncVisibleMonth();
      });
    }, VISIBLE_MONTH_SYNC_DELAY_MS);
  }, [syncVisibleMonth]);

  const cancelVisibleMonthSync = useCallback(() => {
    if (visibleMonthSyncTimeoutRef.current !== null) {
      window.clearTimeout(visibleMonthSyncTimeoutRef.current);
      visibleMonthSyncTimeoutRef.current = null;
    }

    if (visibleMonthSyncRafRef.current === null) return;

    cancelAnimationFrame(visibleMonthSyncRafRef.current);
    visibleMonthSyncRafRef.current = null;
  }, []);

  const handleScroll = useCallback(
    (scroller: HTMLDivElement) => {
      if (isResizingRef.current) return;

      if (
        scroller.scrollTop < C.MONTH_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingBeforeRef.current
      ) {
        isExtendingBeforeRef.current = true;
        prependScrollHeightRef.current = scroller.scrollHeight;
        rangeAnchorRef.current = null;

        startTransition(() => {
          setMonthOffsetRange((currentRange) => ({
            startOffset: currentRange.startOffset - C.MONTH_EXTEND_COUNT,
            endOffset:
              currentRange.endOffset - currentRange.startOffset +
                1 +
                C.MONTH_EXTEND_COUNT >
              C.MONTH_MAX_RENDERED_MONTHS
                ? currentRange.endOffset
                : currentRange.endOffset,
          }));
        });
      }

      const distToBottom =
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;

      if (
        distToBottom < C.MONTH_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingAfterRef.current
      ) {
        isExtendingAfterRef.current = true;
        rangeAnchorRef.current = getCurrentRangeAnchor(scroller);

        startTransition(() => {
          setMonthOffsetRange((currentRange) => ({
            startOffset:
              currentRange.endOffset - currentRange.startOffset +
                1 +
                C.MONTH_EXTEND_COUNT >
              C.MONTH_MAX_RENDERED_MONTHS
                ? currentRange.startOffset + C.MONTH_EXTEND_COUNT
                : currentRange.startOffset,
            endOffset: currentRange.endOffset + C.MONTH_EXTEND_COUNT,
          }));
        });
      }

      scheduleVisibleMonthSync();
    },
    [getCurrentRangeAnchor, isResizingRef, scheduleVisibleMonthSync],
  );

  useLayoutEffect(() => {
    if (lastScrollTargetTokenRef.current === scrollTargetToken) return;

    lastScrollTargetTokenRef.current = scrollTargetToken;

    visibleMonthKeyRef.current = getCalendarMonthKey(currentDate);
    pendingScrollWeekKeyRef.current = getCalendarWeekKey(currentDate);

    prependScrollHeightRef.current = null;
    rangeAnchorRef.current = null;
    isExtendingBeforeRef.current = false;
    isExtendingAfterRef.current = false;
    cancelVisibleMonthSync();

    setAnchorMonth(currentDate);
    setMonthOffsetRange(C.createInitialMonthOffsetRange());
  }, [cancelVisibleMonthSync, currentDate, scrollTargetToken]);

  useLayoutEffect(() => {
    const targetWeekKey = pendingScrollWeekKeyRef.current;
    if (!targetWeekKey) return;

    const attemptScroll = (): boolean => {
      const scroller = scrollContainerRef.current;
      const targetWeekIndex = monthWeeks.findIndex(
        (week) => week.key === targetWeekKey,
      );

      if (!scroller || targetWeekIndex === -1) return false;

      const rowCenter =
        getWeekOffsetTop(targetWeekIndex) + getMonthRowHeight() / 2;

      const viewCenter = scroller.clientHeight / 2;

      scroller.scrollTop = Math.max(0, rowCenter - viewCenter);

      pendingScrollWeekKeyRef.current = null;
      syncVisibleMonth();

      return true;
    };

    if (attemptScroll()) return;

    let rafId: number;
    let retryCount = 0;

    const retryScroll = () => {
      if (retryCount++ >= 10 || attemptScroll()) return;
      rafId = requestAnimationFrame(retryScroll);
    };

    rafId = requestAnimationFrame(retryScroll);

    return () => cancelAnimationFrame(rafId);
  }, [getMonthRowHeight, getWeekOffsetTop, monthWeeks, syncVisibleMonth]);

  useLayoutEffect(() => {
    const prevHeight = prependScrollHeightRef.current;
    if (prevHeight === null) return;

    const scroller = scrollContainerRef.current;
    if (!scroller) {
      prependScrollHeightRef.current = null;
      isExtendingBeforeRef.current = false;
      return;
    }

    scroller.scrollTop += scroller.scrollHeight - prevHeight;

    prependScrollHeightRef.current = null;
    isExtendingBeforeRef.current = false;
  }, [monthWeeks.length]);

  useLayoutEffect(() => {
    const rangeAnchor = rangeAnchorRef.current;
    if (!rangeAnchor) return;

    const scroller = scrollContainerRef.current;
    const anchorWeekIndex = monthWeeks.findIndex(
      (week) => week.key === rangeAnchor.weekKey,
    );

    if (!scroller || anchorWeekIndex === -1) {
      rangeAnchorRef.current = null;
      isExtendingAfterRef.current = false;
      return;
    }

    scroller.scrollTop = getWeekOffsetTop(anchorWeekIndex) - rangeAnchor.offsetTop;

    rangeAnchorRef.current = null;
    isExtendingAfterRef.current = false;
  }, [getWeekOffsetTop, monthWeeks]);

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    const handlePassiveScroll = () => handleScroll(scroller);

    scroller.addEventListener("scroll", handlePassiveScroll, {
      passive: true,
    });

    return () => {
      scroller.removeEventListener("scroll", handlePassiveScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    isExtendingAfterRef.current = false;
  }, [monthOffsetRange.endOffset]);

  useEffect(() => cancelVisibleMonthSync, [cancelVisibleMonthSync]);

  return {
    monthWeeks,
    scrollContainerRef,
    weekRowRefsMap,
    setWeekRowRef,
    syncVisibleMonth,
    cancelVisibleMonthSync,
  };
};