import type { RefObject } from "react";
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, endOfDay, format, isSameMonth, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import type { CalendarMonthWeek } from "@/features/calendar/model/calendarMonth.model";
import { CALENDAR_MONTH_WEEK_DAY_COUNT, CALENDAR_MONTH_WEEK_STARTS_ON, getCalendarMonthKey, getCalendarWeekKey } from "@/features/calendar/model/calendarMonth.model";

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
  monthWeeks: CalendarMonthWeek[];
  visibleWeekRange: CalendarDateRange;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  weekRowRefsMap: RefObject<Map<string, HTMLElement>>;
  setWeekRowRef: (weekKey: string, node: HTMLElement | null) => void;
  /** リサイズ完了後など、外部から表示月を再同期する必要があるときに呼ぶ */
  syncVisibleMonth: () => void;
  /** リサイズ開始時など、遅延中の表示月同期をキャンセルしたいときに呼ぶ */
  cancelVisibleMonthSync: () => void;
};

type MonthVirtualWindow = {
  startWeekOffset: number;
  endWeekOffset: number;
};

const MONTH_GRID_FIRST_WEEK_OFFSET_PX = C.CALENDAR_WEEKDAY_HEADER_HEIGHT;
const MONTH_VIRTUAL_PAST_WEEKS = 5200;
const MONTH_VIRTUAL_FUTURE_WEEKS = 5200;
const MONTH_VIRTUAL_OVERSCAN_WEEKS = 18;
const MONTH_INITIAL_RENDERED_WEEKS = 48;
const VISIBLE_MONTH_SYNC_DELAY_MS = 96;

const getWeekStart = (date: Date): Date => startOfWeek(date, { weekStartsOn: CALENDAR_MONTH_WEEK_STARTS_ON });

const clampVirtualWeekOffset = (weekOffset: number): number => Math.min(MONTH_VIRTUAL_FUTURE_WEEKS, Math.max(-MONTH_VIRTUAL_PAST_WEEKS, weekOffset));

const buildWeekDateRange = (weekStart: Date): CalendarDateRange => ({
  start: startOfDay(weekStart),
  end: endOfDay(addDays(weekStart, CALENDAR_MONTH_WEEK_DAY_COUNT - 1)),
});

const isSameCalendarDateRange = (left: CalendarDateRange, right: CalendarDateRange): boolean => left.start.getTime() === right.start.getTime() && left.end.getTime() === right.end.getTime();

const createWindowAroundWeekOffset = (weekOffset: number): MonthVirtualWindow => {
  const halfWindow = Math.floor(MONTH_INITIAL_RENDERED_WEEKS / 2);

  return {
    startWeekOffset: clampVirtualWeekOffset(weekOffset - halfWindow),
    endWeekOffset: clampVirtualWeekOffset(weekOffset + halfWindow),
  };
};

const isSameVirtualWindow = (a: MonthVirtualWindow, b: MonthVirtualWindow): boolean => a.startWeekOffset === b.startWeekOffset && a.endWeekOffset === b.endWeekOffset;

const buildCalendarVirtualMonthWeek = (baseWeekStart: Date, weekOffset: number): CalendarMonthWeek => {
  const weekStart = addWeeks(baseWeekStart, weekOffset);
  const visibleMonthDate = startOfMonth(addDays(weekStart, 3));

  return {
    key: getCalendarWeekKey(weekStart),
    weekStart,
    visibleMonthDate,
    days: Array.from({ length: CALENDAR_MONTH_WEEK_DAY_COUNT }, (_, dayIndex) => {
      const date = addDays(weekStart, dayIndex);

      return {
        date,
        key: format(date, "yyyy-MM-dd"),
        dayOfMonth: date.getDate(),
        isCurrentMonth: isSameMonth(date, visibleMonthDate),
        isMonthStart: date.getDate() === 1,
      };
    }),
  };
};

const buildVirtualMonthWeeks = (baseWeekStart: Date, virtualWindow: MonthVirtualWindow): CalendarMonthWeek[] => {
  const weekCount = virtualWindow.endWeekOffset - virtualWindow.startWeekOffset + 1;

  return Array.from({ length: weekCount }, (_, index) => buildCalendarVirtualMonthWeek(baseWeekStart, virtualWindow.startWeekOffset + index));
};

const getTopSpacerHeight = (virtualWindow: MonthVirtualWindow, rowHeight: number): number => Math.max(0, virtualWindow.startWeekOffset + MONTH_VIRTUAL_PAST_WEEKS) * rowHeight;

const getBottomSpacerHeight = (virtualWindow: MonthVirtualWindow, rowHeight: number): number => Math.max(0, MONTH_VIRTUAL_FUTURE_WEEKS - virtualWindow.endWeekOffset) * rowHeight;

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
  const baseWeekStartRef = useRef(getWeekStart(currentDate));
  const visibleMonthSyncRafRef = useRef<number | null>(null);
  const visibleMonthSyncTimeoutRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollWeekOffsetRef = useRef<number | null>(0);

  const lastScrollTargetTokenRef = useRef(scrollTargetToken);
  const visibleMonthKeyRef = useRef(getCalendarMonthKey(currentDate));

  const monthWeeksRef = useRef<CalendarMonthWeek[]>([]);
  const virtualWindowRef = useRef(createWindowAroundWeekOffset(0));
  const scheduleVisibleMonthSyncRef = useRef<(() => void) | null>(null);

  const [virtualWindow, setVirtualWindowState] = useState(() => virtualWindowRef.current);
  const [visibleWeekRange, setVisibleWeekRange] = useState(() => buildWeekDateRange(baseWeekStartRef.current));

  const monthWeeks = useMemo(
    () => buildVirtualMonthWeeks(baseWeekStartRef.current, virtualWindow),
    [virtualWindow],
  );

  monthWeeksRef.current = monthWeeks;

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

  const setVirtualWindow = useCallback((nextWindow: MonthVirtualWindow) => {
    if (isSameVirtualWindow(virtualWindowRef.current, nextWindow)) return;

    virtualWindowRef.current = nextWindow;
    setVirtualWindowState(nextWindow);
  }, []);

  const getMonthRowHeight = useCallback(() => {
    const cachedHeight = monthRowHeightRef?.current;

    if (typeof cachedHeight === "number" && Number.isFinite(cachedHeight) && cachedHeight > 0) {
      return cachedHeight;
    }

    const firstWeek = monthWeeksRef.current[0];
    const firstRow = firstWeek ? weekRowRefsMap.current.get(firstWeek.key) : null;
    const measuredHeight = firstRow?.offsetHeight ?? 0;

    return measuredHeight > 0 ? measuredHeight : C.DEFAULT_MONTH_ROW_HEIGHT;
  }, [monthRowHeightRef]);

  const getWeekOffsetFromScrollTop = useCallback(
    (scrollTop: number) => {
      const rowHeight = getMonthRowHeight();
      const rawWeekIndex = Math.floor((scrollTop - MONTH_GRID_FIRST_WEEK_OFFSET_PX) / rowHeight);

      return clampVirtualWeekOffset(rawWeekIndex - MONTH_VIRTUAL_PAST_WEEKS);
    },
    [getMonthRowHeight],
  );

  const getWeekOffsetTop = useCallback(
    (weekOffset: number) => MONTH_GRID_FIRST_WEEK_OFFSET_PX + (weekOffset + MONTH_VIRTUAL_PAST_WEEKS) * getMonthRowHeight(),
    [getMonthRowHeight],
  );

  const updateVirtualWindowForScroll = useCallback(
    (scroller: HTMLDivElement) => {
      const firstVisibleWeekOffset = getWeekOffsetFromScrollTop(scroller.scrollTop);
      const lastVisibleWeekOffset = getWeekOffsetFromScrollTop(scroller.scrollTop + scroller.clientHeight);
      const nextWindow = {
        startWeekOffset: clampVirtualWeekOffset(firstVisibleWeekOffset - MONTH_VIRTUAL_OVERSCAN_WEEKS),
        endWeekOffset: clampVirtualWeekOffset(lastVisibleWeekOffset + MONTH_VIRTUAL_OVERSCAN_WEEKS),
      };

      setVirtualWindow(nextWindow);
    },
    [getWeekOffsetFromScrollTop, setVirtualWindow],
  );

  const syncVisibleMonth = useCallback(() => {
    const scroller = scrollContainerRef.current;

    if (!scroller) return;

    const sampleOffsetTop = scroller.scrollTop + C.MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;
    const visibleWeek = buildCalendarVirtualMonthWeek(baseWeekStartRef.current, getWeekOffsetFromScrollTop(sampleOffsetTop));
    const nextWeekRange = buildWeekDateRange(visibleWeek.weekStart);

    setVisibleWeekRange((currentRange) => isSameCalendarDateRange(currentRange, nextWeekRange) ? currentRange : nextWeekRange);

    if (!onVisibleMonthChange) return;

    const nextKey = getCalendarMonthKey(visibleWeek.visibleMonthDate);

    if (nextKey === visibleMonthKeyRef.current) return;

    visibleMonthKeyRef.current = nextKey;
    startTransition(() => {
      onVisibleMonthChange(visibleWeek.visibleMonthDate);
    });
  }, [getWeekOffsetFromScrollTop, onVisibleMonthChange]);

  const scheduleVisibleMonthSync = useCallback(() => {
    if (visibleMonthSyncTimeoutRef.current !== null) {
      window.clearTimeout(visibleMonthSyncTimeoutRef.current);
    }

    visibleMonthSyncTimeoutRef.current = window.setTimeout(() => {
      visibleMonthSyncTimeoutRef.current = null;

      if (visibleMonthSyncRafRef.current !== null) return;

      visibleMonthSyncRafRef.current = window.requestAnimationFrame(() => {
        visibleMonthSyncRafRef.current = null;
        syncVisibleMonth();
      });
    }, VISIBLE_MONTH_SYNC_DELAY_MS);
  }, [syncVisibleMonth]);

  scheduleVisibleMonthSyncRef.current = scheduleVisibleMonthSync;

  const cancelVisibleMonthSync = useCallback(() => {
    if (visibleMonthSyncTimeoutRef.current !== null) {
      window.clearTimeout(visibleMonthSyncTimeoutRef.current);
      visibleMonthSyncTimeoutRef.current = null;
    }

    if (visibleMonthSyncRafRef.current === null) return;

    window.cancelAnimationFrame(visibleMonthSyncRafRef.current);
    visibleMonthSyncRafRef.current = null;
  }, []);

  const handleScroll = useCallback(
    (scroller: HTMLDivElement) => {
      if (isResizingRef.current) return;

      pendingScrollContainerRef.current = scroller;

      if (scrollRafRef.current !== null) return;

      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;

        const pendingScroller = pendingScrollContainerRef.current;
        pendingScrollContainerRef.current = null;

        if (!pendingScroller || isResizingRef.current) return;

        updateVirtualWindowForScroll(pendingScroller);
        scheduleVisibleMonthSyncRef.current?.();
      });
    },
    [isResizingRef, updateVirtualWindowForScroll],
  );

  useLayoutEffect(() => {
    if (lastScrollTargetTokenRef.current === scrollTargetToken) return;

    lastScrollTargetTokenRef.current = scrollTargetToken;
    baseWeekStartRef.current = getWeekStart(currentDate);
    visibleMonthKeyRef.current = getCalendarMonthKey(currentDate);
    pendingScrollWeekOffsetRef.current = 0;
    cancelVisibleMonthSync();
    setVisibleWeekRange(buildWeekDateRange(baseWeekStartRef.current));
    setVirtualWindow(createWindowAroundWeekOffset(0));
  }, [cancelVisibleMonthSync, currentDate, scrollTargetToken, setVirtualWindow]);

  useLayoutEffect(() => {
    const targetWeekOffset = pendingScrollWeekOffsetRef.current;
    if (targetWeekOffset === null) return;

    const attemptScroll = (): boolean => {
      const scroller = scrollContainerRef.current;
      if (!scroller) return false;

      const rowCenter = getWeekOffsetTop(targetWeekOffset) + getMonthRowHeight() / 2;
      const viewCenter = scroller.clientHeight / 2;

      scroller.scrollTop = Math.max(0, rowCenter - viewCenter);
      pendingScrollWeekOffsetRef.current = null;
      updateVirtualWindowForScroll(scroller);
      syncVisibleMonth();

      return true;
    };

    if (attemptScroll()) return;

    let rafId: number;
    let retryCount = 0;

    const retryScroll = () => {
      if (retryCount++ >= 10 || attemptScroll()) return;
      rafId = window.requestAnimationFrame(retryScroll);
    };

    rafId = window.requestAnimationFrame(retryScroll);

    return () => window.cancelAnimationFrame(rafId);
  }, [getMonthRowHeight, getWeekOffsetTop, monthWeeks, syncVisibleMonth, updateVirtualWindowForScroll]);

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    const handlePassiveScroll = () => handleScroll(scroller);

    scroller.addEventListener("scroll", handlePassiveScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handlePassiveScroll);
    };
  }, [handleScroll]);

  useEffect(() => () => {
    cancelVisibleMonthSync();

    if (scrollRafRef.current !== null) {
      window.cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }

    pendingScrollContainerRef.current = null;
  }, [cancelVisibleMonthSync]);

  const rowHeight = getMonthRowHeight();

  return {
    monthWeeks,
    visibleWeekRange,
    topSpacerHeight: getTopSpacerHeight(virtualWindow, rowHeight),
    bottomSpacerHeight: getBottomSpacerHeight(virtualWindow, rowHeight),
    scrollContainerRef,
    weekRowRefsMap,
    setWeekRowRef,
    syncVisibleMonth,
    cancelVisibleMonthSync,
  };
};
