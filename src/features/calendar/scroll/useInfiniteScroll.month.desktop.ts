import type { RefObject, UIEvent } from "react";
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
  type CalendarMonthWeek,
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
  monthWeeks: CalendarMonthWeek[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  weekRowRefsMap: RefObject<Map<string, HTMLElement>>;
  setWeekRowRef: (weekKey: string, node: HTMLElement | null) => void;
  handleScroll: (event: UIEvent<HTMLDivElement>) => void;
  /** リサイズ完了後など、外部から表示月を再同期する必要があるときに呼ぶ */
  syncVisibleMonth: () => void;
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

  const syncVisibleMonth = useCallback(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller || !onVisibleMonthChange || monthWeeks.length === 0) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const sampleY =
      scrollerRect.top + C.MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;

    let best: CalendarMonthWeek | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const week of monthWeeks) {
      const row = weekRowRefsMap.current.get(week.key);
      if (!row) continue;

      const rect = row.getBoundingClientRect();

      if (rect.top <= sampleY && rect.bottom > sampleY) {
        best = week;
        break;
      }

      const dist = Math.min(
        Math.abs(rect.top - sampleY),
        Math.abs(rect.bottom - sampleY),
      );

      if (dist < bestDist) {
        bestDist = dist;
        best = week;
      }
    }

    if (!best) return;

    const nextKey = getCalendarMonthKey(best.visibleMonthDate);
    if (nextKey === visibleMonthKeyRef.current) return;

    visibleMonthKeyRef.current = nextKey;
    onVisibleMonthChange(best.visibleMonthDate);
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
    (event: UIEvent<HTMLDivElement>) => {
      if (isResizingRef.current) return;
      const scroller = event.currentTarget;

      if (
        scroller.scrollTop < C.MONTH_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingBeforeRef.current
      ) {
        isExtendingBeforeRef.current = true;
        prependScrollHeightRef.current = scroller.scrollHeight;

        setMonthOffsetRange((c) => ({
          ...c,
          startOffset: c.startOffset - C.MONTH_EXTEND_COUNT,
        }));
      }

      const distToBottom =
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;

      if (
        distToBottom < C.MONTH_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingAfterRef.current
      ) {
        isExtendingAfterRef.current = true;

        setMonthOffsetRange((c) => ({
          ...c,
          endOffset: c.endOffset + C.MONTH_EXTEND_COUNT,
        }));
      }

      scheduleVisibleMonthSync();
    },
    [isResizingRef, scheduleVisibleMonthSync],
  );

  useLayoutEffect(() => {
    if (lastScrollTargetTokenRef.current === scrollTargetToken) return;

    lastScrollTargetTokenRef.current = scrollTargetToken;

    visibleMonthKeyRef.current = getCalendarMonthKey(currentDate);
    pendingScrollWeekKeyRef.current = getCalendarWeekKey(currentDate);

    prependScrollHeightRef.current = null;
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

  useEffect(() => {
    isExtendingAfterRef.current = false;
  }, [monthOffsetRange.endOffset]);

  useEffect(() => cancelVisibleMonthSync, [cancelVisibleMonthSync]);

  return {
    monthWeeks,
    scrollContainerRef,
    weekRowRefsMap,
    setWeekRowRef,
    handleScroll,
    syncVisibleMonth,
  };
};