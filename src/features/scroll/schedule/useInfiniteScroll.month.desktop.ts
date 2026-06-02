import type { RefCallback, RefObject } from "react";
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, endOfDay, format, isSameMonth, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import type { CalendarMonthWeek } from "@/features/calendar/model/calendarMonth.model";
import { CALENDAR_MONTH_WEEK_DAY_COUNT, CALENDAR_MONTH_WEEK_STARTS_ON, getCalendarMonthKey, getCalendarWeekKey } from "@/features/calendar/model/calendarMonth.model";

type UseMonthInfiniteScrollOptions = {
  currentDate: Date;
  scrollTargetToken: number;
  monthRowHeight: number;
  onVisibleMonthChange?: (date: Date) => void;
};

export type UseMonthInfiniteScrollReturn = {
  monthWeeks: CalendarMonthWeek[];
  visibleWeekRange: CalendarDateRange;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  setScrollContainerRef: RefCallback<HTMLDivElement>;
};

type MonthVirtualWindow = {
  startWeekOffset: number;
  endWeekOffset: number;
};

type SetVirtualWindowOptions = {
  preserveScrollPosition?: boolean;
};

const MONTH_GRID_FIRST_WEEK_OFFSET_PX = C.CALENDAR_WEEKDAY_HEADER_HEIGHT;
const MONTH_VIRTUAL_PAST_WEEKS = 5200;
const MONTH_VIRTUAL_FUTURE_WEEKS = 5200;
const MONTH_RENDERED_WEEK_COUNT = 36;
const MONTH_VIRTUAL_WINDOW_GUARD_WEEKS = 6;
const VISIBLE_MONTH_SYNC_DELAY_MS = 96;
const MONTH_VIRTUAL_SPACER_HEIGHT = 0;

const getWeekStart = (date: Date): Date => startOfWeek(date, { weekStartsOn: CALENDAR_MONTH_WEEK_STARTS_ON });

const clampVirtualWeekOffset = (weekOffset: number): number => Math.min(MONTH_VIRTUAL_FUTURE_WEEKS, Math.max(-MONTH_VIRTUAL_PAST_WEEKS, weekOffset));

const buildWindowDateRange = (baseWeekStart: Date, virtualWindow: MonthVirtualWindow): CalendarDateRange => ({
  start: startOfDay(addWeeks(baseWeekStart, virtualWindow.startWeekOffset)),
  end: endOfDay(addDays(addWeeks(baseWeekStart, virtualWindow.endWeekOffset), CALENDAR_MONTH_WEEK_DAY_COUNT - 1)),
});

const isSameCalendarDateRange = (left: CalendarDateRange, right: CalendarDateRange): boolean => left.start.getTime() === right.start.getTime() && left.end.getTime() === right.end.getTime();

const createWindowAroundWeekOffset = (weekOffset: number): MonthVirtualWindow => {
  const leadingWeekCount = Math.floor((MONTH_RENDERED_WEEK_COUNT - 1) / 2);
  const trailingWeekCount = MONTH_RENDERED_WEEK_COUNT - leadingWeekCount - 1;
  const startWeekOffset = clampVirtualWeekOffset(weekOffset - leadingWeekCount);
  const endWeekOffset = clampVirtualWeekOffset(startWeekOffset + leadingWeekCount + trailingWeekCount);

  if (endWeekOffset - startWeekOffset + 1 >= MONTH_RENDERED_WEEK_COUNT) {
    return { startWeekOffset, endWeekOffset };
  }

  return {
    startWeekOffset: clampVirtualWeekOffset(endWeekOffset - MONTH_RENDERED_WEEK_COUNT + 1),
    endWeekOffset,
  };
};

const createWindowAroundVisibleWeeks = (firstVisibleWeekOffset: number, lastVisibleWeekOffset: number): MonthVirtualWindow => createWindowAroundWeekOffset(Math.floor((firstVisibleWeekOffset + lastVisibleWeekOffset) / 2));

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

const getMonthVirtualSpacerHeight = (): number => MONTH_VIRTUAL_SPACER_HEIGHT;

export const useMonthInfiniteScroll = ({
  currentDate,
  scrollTargetToken,
  monthRowHeight,
  onVisibleMonthChange,
}: UseMonthInfiniteScrollOptions): UseMonthInfiniteScrollReturn => {
  const initialBaseWeekStart = useMemo(() => getWeekStart(currentDate), []);
  const initialVirtualWindow = useMemo(() => createWindowAroundWeekOffset(0), []);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const baseWeekStartRef = useRef(initialBaseWeekStart);
  const visibleMonthSyncRafRef = useRef<number | null>(null);
  const visibleMonthSyncTimeoutRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollWeekOffsetRef = useRef<number | null>(0);
  const pendingScrollAdjustmentRef = useRef(0);
  const previousMonthRowHeightRef = useRef(monthRowHeight);
  const lastScrollTargetTokenRef = useRef(scrollTargetToken);
  const visibleMonthKeyRef = useRef(getCalendarMonthKey(currentDate));
  const virtualWindowRef = useRef(initialVirtualWindow);

  const [baseWeekStart, setBaseWeekStart] = useState(initialBaseWeekStart);
  const [virtualWindow, setVirtualWindowState] = useState(initialVirtualWindow);
  const [visibleWeekRange, setVisibleWeekRange] = useState(() => buildWindowDateRange(initialBaseWeekStart, initialVirtualWindow));

  const monthWeeks = useMemo(() => buildVirtualMonthWeeks(baseWeekStart, virtualWindow), [baseWeekStart, virtualWindow]);

  const getWeekOffsetFromScrollTop = useCallback((scrollTop: number, currentWindow = virtualWindowRef.current, rowHeight = monthRowHeight) => {
    const rawWeekIndex = Math.floor((scrollTop - MONTH_GRID_FIRST_WEEK_OFFSET_PX) / rowHeight);

    return clampVirtualWeekOffset(currentWindow.startWeekOffset + rawWeekIndex);
  }, [monthRowHeight]);

  const getWeekOffsetTop = useCallback((weekOffset: number, currentWindow = virtualWindowRef.current, rowHeight = monthRowHeight) => MONTH_GRID_FIRST_WEEK_OFFSET_PX + (weekOffset - currentWindow.startWeekOffset) * rowHeight, [monthRowHeight]);

  const setVirtualWindow = useCallback((nextWindow: MonthVirtualWindow, options: SetVirtualWindowOptions = {}) => {
    const currentWindow = virtualWindowRef.current;
    const nextRange = buildWindowDateRange(baseWeekStartRef.current, nextWindow);

    if (isSameVirtualWindow(currentWindow, nextWindow)) {
      setVisibleWeekRange((currentRange) => isSameCalendarDateRange(currentRange, nextRange) ? currentRange : nextRange);
      return;
    }

    if (options.preserveScrollPosition) {
      pendingScrollAdjustmentRef.current += (currentWindow.startWeekOffset - nextWindow.startWeekOffset) * monthRowHeight;
    }

    virtualWindowRef.current = nextWindow;

    startTransition(() => {
      setVirtualWindowState(nextWindow);
      setVisibleWeekRange((currentRange) => isSameCalendarDateRange(currentRange, nextRange) ? currentRange : nextRange);
    });
  }, [monthRowHeight]);

  const syncVisibleMonth = useCallback(() => {
    const scroller = scrollContainerRef.current;

    if (!scroller) return;

    const sampleOffsetTop = scroller.scrollTop + C.MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;
    const visibleWeek = buildCalendarVirtualMonthWeek(baseWeekStartRef.current, getWeekOffsetFromScrollTop(sampleOffsetTop));

    if (!onVisibleMonthChange) return;

    const nextKey = getCalendarMonthKey(visibleWeek.visibleMonthDate);

    if (nextKey === visibleMonthKeyRef.current) return;

    visibleMonthKeyRef.current = nextKey;
    startTransition(() => {
      onVisibleMonthChange(visibleWeek.visibleMonthDate);
    });
  }, [getWeekOffsetFromScrollTop, onVisibleMonthChange]);

  const scrollToPendingWeekOffset = useCallback((): boolean => {
    const targetWeekOffset = pendingScrollWeekOffsetRef.current;
    const scroller = scrollContainerRef.current;

    if (targetWeekOffset === null || !scroller || scroller.clientHeight <= 0) return false;

    const rowCenter = getWeekOffsetTop(targetWeekOffset) + monthRowHeight / 2;
    const viewCenter = scroller.clientHeight / 2;

    scroller.scrollTop = Math.max(0, rowCenter - viewCenter);
    pendingScrollWeekOffsetRef.current = null;
    syncVisibleMonth();

    return true;
  }, [getWeekOffsetTop, monthRowHeight, syncVisibleMonth]);

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

  const cancelVisibleMonthSync = useCallback(() => {
    if (visibleMonthSyncTimeoutRef.current !== null) {
      window.clearTimeout(visibleMonthSyncTimeoutRef.current);
      visibleMonthSyncTimeoutRef.current = null;
    }

    if (visibleMonthSyncRafRef.current === null) return;

    window.cancelAnimationFrame(visibleMonthSyncRafRef.current);
    visibleMonthSyncRafRef.current = null;
  }, []);

  const updateVirtualWindowForScroll = useCallback(
    (scroller: HTMLDivElement) => {
      const firstVisibleWeekOffset = getWeekOffsetFromScrollTop(scroller.scrollTop);
      const lastVisibleWeekOffset = getWeekOffsetFromScrollTop(scroller.scrollTop + scroller.clientHeight);
      const currentWindow = virtualWindowRef.current;

      if (firstVisibleWeekOffset >= currentWindow.startWeekOffset + MONTH_VIRTUAL_WINDOW_GUARD_WEEKS && lastVisibleWeekOffset <= currentWindow.endWeekOffset - MONTH_VIRTUAL_WINDOW_GUARD_WEEKS) {
        return;
      }

      setVirtualWindow(createWindowAroundVisibleWeeks(firstVisibleWeekOffset, lastVisibleWeekOffset), { preserveScrollPosition: true });
    },
    [getWeekOffsetFromScrollTop, setVirtualWindow],
  );

  const handleScroll = useCallback(
    (scroller: HTMLDivElement) => {
      pendingScrollContainerRef.current = scroller;

      if (scrollRafRef.current !== null) return;

      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;

        const pendingScroller = pendingScrollContainerRef.current;
        pendingScrollContainerRef.current = null;

        if (!pendingScroller) return;

        updateVirtualWindowForScroll(pendingScroller);
        scheduleVisibleMonthSync();
      });
    },
    [scheduleVisibleMonthSync, updateVirtualWindowForScroll],
  );

  const setScrollContainerRef = useCallback<RefCallback<HTMLDivElement>>((element) => {
    scrollContainerRef.current = element;

    if (!element) return;

    scrollToPendingWeekOffset();
  }, [scrollToPendingWeekOffset]);

  useLayoutEffect(() => {
    const scrollAdjustment = pendingScrollAdjustmentRef.current;
    const scroller = scrollContainerRef.current;

    if (scrollAdjustment === 0 || !scroller) return;

    pendingScrollAdjustmentRef.current = 0;
    scroller.scrollTop += scrollAdjustment;
  }, [virtualWindow]);

  useLayoutEffect(() => {
    const previousMonthRowHeight = previousMonthRowHeightRef.current;
    const scroller = scrollContainerRef.current;

    if (previousMonthRowHeight === monthRowHeight) return;

    previousMonthRowHeightRef.current = monthRowHeight;
    if (!scroller) return;

    const currentWindow = virtualWindowRef.current;
    const weekOffset = getWeekOffsetFromScrollTop(scroller.scrollTop, currentWindow, previousMonthRowHeight);
    const previousWeekTop = getWeekOffsetTop(weekOffset, currentWindow, previousMonthRowHeight);
    const relativeOffsetInWeek = (scroller.scrollTop - previousWeekTop) / Math.max(1, previousMonthRowHeight);

    scroller.scrollTop = getWeekOffsetTop(weekOffset, currentWindow, monthRowHeight) + relativeOffsetInWeek * monthRowHeight;
    scheduleVisibleMonthSync();
  }, [getWeekOffsetFromScrollTop, getWeekOffsetTop, monthRowHeight, scheduleVisibleMonthSync]);

  useLayoutEffect(() => {
    if (lastScrollTargetTokenRef.current === scrollTargetToken) return;

    const nextBaseWeekStart = getWeekStart(currentDate);
    const nextVirtualWindow = createWindowAroundWeekOffset(0);

    lastScrollTargetTokenRef.current = scrollTargetToken;
    baseWeekStartRef.current = nextBaseWeekStart;
    visibleMonthKeyRef.current = getCalendarMonthKey(currentDate);
    virtualWindowRef.current = nextVirtualWindow;
    pendingScrollAdjustmentRef.current = 0;
    pendingScrollWeekOffsetRef.current = 0;
    cancelVisibleMonthSync();

    startTransition(() => {
      setBaseWeekStart(nextBaseWeekStart);
      setVirtualWindowState(nextVirtualWindow);
      setVisibleWeekRange(buildWindowDateRange(nextBaseWeekStart, nextVirtualWindow));
    });
  }, [cancelVisibleMonthSync, currentDate, scrollTargetToken]);

  useLayoutEffect(() => {
    if (scrollToPendingWeekOffset()) return;

    let rafId: number;
    let retryCount = 0;

    const retryScroll = () => {
      if (retryCount++ >= 10 || scrollToPendingWeekOffset()) return;
      rafId = window.requestAnimationFrame(retryScroll);
    };

    rafId = window.requestAnimationFrame(retryScroll);

    return () => window.cancelAnimationFrame(rafId);
  }, [baseWeekStart, scrollToPendingWeekOffset, virtualWindow]);

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
    pendingScrollAdjustmentRef.current = 0;
  }, [cancelVisibleMonthSync]);

  return {
    monthWeeks,
    visibleWeekRange,
    topSpacerHeight: getMonthVirtualSpacerHeight(),
    bottomSpacerHeight: getMonthVirtualSpacerHeight(),
    scrollContainerRef,
    setScrollContainerRef,
  };
};