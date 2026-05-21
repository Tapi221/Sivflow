import type { RefObject } from "react";
import {
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
  onVisibleMonthChange?: (date: Date) => void;
};

export type UseMonthInfiniteScrollReturn = {
  monthWeeks: ReturnType<typeof buildCalendarMonthWeeks>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  weekRowRefsMap: RefObject<Map<string, HTMLElement>>;
  setWeekRowRef: (weekKey: string, node: HTMLElement | null) => void;
  /** リサイズ完了後など、外部から表示月を再同期する必要があるときに呼ぶ */
  syncVisibleMonth: () => void;
};

type MonthRangeAnchor = {
  weekKey: string;
  offsetTop: number;
};

// ── フック本体

export const useMonthInfiniteScroll = ({
  currentDate,
  scrollTargetToken,
  isResizingRef,
  onVisibleMonthChange,
}: UseMonthInfiniteScrollOptions): UseMonthInfiniteScrollReturn => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const weekRowRefsMap = useRef<Map<string, HTMLElement>>(new Map());
  const prependScrollHeightRef = useRef<number | null>(null);
  const rangeAnchorRef = useRef<MonthRangeAnchor | null>(null);
  const isExtendingBeforeRef = useRef(false);
  const isExtendingAfterRef = useRef(false);
  const visibleMonthSyncRafRef = useRef<number | null>(null);
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

  const getCurrentRangeAnchor = useCallback(
    (scroller: HTMLDivElement): MonthRangeAnchor | null => {
      const firstWeek = monthWeeks[0];
      if (!firstWeek) return null;

      const firstRow = weekRowRefsMap.current.get(firstWeek.key);
      if (!firstRow) return null;

      const rowHeight = firstRow.offsetHeight;
      if (rowHeight <= 0) return null;

      const rawWeekIndex = Math.floor(
        (scroller.scrollTop - firstRow.offsetTop) / rowHeight,
      );

      const weekIndex = Math.min(
        monthWeeks.length - 1,
        Math.max(0, rawWeekIndex),
      );

      const anchorWeek = monthWeeks[weekIndex];
      const anchorRow = anchorWeek
        ? weekRowRefsMap.current.get(anchorWeek.key)
        : null;

      if (!anchorWeek || !anchorRow) return null;

      return {
        weekKey: anchorWeek.key,
        offsetTop: anchorRow.offsetTop - scroller.scrollTop,
      };
    },
    [monthWeeks],
  );

  const syncVisibleMonth = useCallback(() => {
    const scroller = scrollContainerRef.current;
    const firstWeek = monthWeeks[0];

    if (!scroller || !firstWeek || !onVisibleMonthChange) return;

    const firstRow = weekRowRefsMap.current.get(firstWeek.key);
    if (!firstRow) return;

    const rowHeight = firstRow.offsetHeight;
    if (rowHeight <= 0) return;

    const sampleOffsetTop =
      scroller.scrollTop + C.MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;

    const rawWeekIndex = Math.floor(
      (sampleOffsetTop - firstRow.offsetTop) / rowHeight,
    );

    const weekIndex = Math.min(
      monthWeeks.length - 1,
      Math.max(0, rawWeekIndex),
    );

    const visibleWeek = monthWeeks[weekIndex];
    if (!visibleWeek) return;

    const nextKey = getCalendarMonthKey(visibleWeek.visibleMonthDate);
    if (nextKey === visibleMonthKeyRef.current) return;

    visibleMonthKeyRef.current = nextKey;
    onVisibleMonthChange(visibleWeek.visibleMonthDate);
  }, [monthWeeks, onVisibleMonthChange]);

  const scheduleVisibleMonthSync = useCallback(() => {
    if (visibleMonthSyncRafRef.current !== null) return;

    visibleMonthSyncRafRef.current = requestAnimationFrame(() => {
      visibleMonthSyncRafRef.current = null;
      syncVisibleMonth();
    });
  }, [syncVisibleMonth]);

  const cancelVisibleMonthSync = useCallback(() => {
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
      }

      const distToBottom =
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;

      if (
        distToBottom < C.MONTH_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingAfterRef.current
      ) {
        isExtendingAfterRef.current = true;
        rangeAnchorRef.current = getCurrentRangeAnchor(scroller);

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

    setAnchorMonth(currentDate);
    setMonthOffsetRange(C.createInitialMonthOffsetRange());
  }, [currentDate, scrollTargetToken]);

  useLayoutEffect(() => {
    const targetWeekKey = pendingScrollWeekKeyRef.current;
    if (!targetWeekKey) return;

    const attemptScroll = (): boolean => {
      const scroller = scrollContainerRef.current;
      const targetRow = weekRowRefsMap.current.get(targetWeekKey);

      if (!scroller || !targetRow) return false;

      // ── 修正後：対象行をビューポート中央へ
      const rowCenter =
        targetRow.offsetTop + targetRow.offsetHeight / 2;

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
  }, [monthWeeks, syncVisibleMonth]);

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
    const anchorRow = weekRowRefsMap.current.get(rangeAnchor.weekKey);
    if (!scroller || !anchorRow) {
      rangeAnchorRef.current = null;
      isExtendingAfterRef.current = false;
      return;
    }

    scroller.scrollTop = anchorRow.offsetTop - rangeAnchor.offsetTop;

    rangeAnchorRef.current = null;
    isExtendingAfterRef.current = false;
  }, [monthWeeks.length]);

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
  };
};