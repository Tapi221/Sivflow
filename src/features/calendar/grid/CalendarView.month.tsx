import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import { eventOverlapsRange } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import type { CalendarEventSyncRange } from "@/features/calendar/googlecalendar-sync/useCalendarEventSync";
import { GridCalendarMonthDesktop } from "@/features/calendar/grid/Grid.calendar.month.desktop";

import { useMonthInfiniteScroll } from "../../scroll/schedule/useInfiniteScroll.month.desktop";
import { useMonthRowResize } from "./height/useRowResize.month.desktop";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_WEEKDAY_COUNT = 7;

type CalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  visibleEvents?: GoogleCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
  onEventSyncRangeChange?: (range: CalendarEventSyncRange) => void;
};

const getDayStart = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDayEnd = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const CalendarMonthView = ({
  currentDate,
  selectedDate,
  scrollTargetToken = 0,
  visibleEvents = [],
  onSelectDate,
  onVisibleMonthChange,
  onEventSyncRangeChange,
}: CalendarMonthViewProps) => {
  const today = useMemo(() => new Date(), []);

  const isResizingRef = useRef(false);
  const monthRowHeightRef = useRef(C.readStoredMonthRowHeight());
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const scrollHoverRafRef = useRef<number | null>(null);
  const [scrollHoverDayKey, setScrollHoverDayKey] = useState<string | null>(null);

  const scroll = useMonthInfiniteScroll({
    currentDate,
    scrollTargetToken,
    isResizingRef,
    monthRowHeightRef,
    onVisibleMonthChange,
  });

  const {
    rootRef,
    monthRowHeight,
    monthViewStyle,
    handleResizeReset,
    handleResizeKeyDown,
    handleResizePointerDown,
  } = useMonthRowResize({
    scrollContainerRef: scroll.scrollContainerRef,
    weekRowRefsMap: scroll.weekRowRefsMap,
    monthWeeks: scroll.monthWeeks,
    isResizingRef,
    onResizeStart: scroll.cancelVisibleMonthSync,
    onAfterCommit: scroll.syncVisibleMonth,
    onLiveResize: (height) => {
      monthRowHeightRef.current = height;
    },
  });

  const updateScrollHoverDay = useCallback(() => {
    scrollHoverRafRef.current = null;

    const pointerPosition = pointerPositionRef.current;
    const scroller = scroll.scrollContainerRef.current;

    if (!pointerPosition || !scroller || monthRowHeight <= 0) {
      setScrollHoverDayKey(null);
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const isPointerInsideScroller =
      pointerPosition.x >= scrollerRect.left &&
      pointerPosition.x <= scrollerRect.right &&
      pointerPosition.y >= scrollerRect.top &&
      pointerPosition.y <= scrollerRect.bottom;

    if (!isPointerInsideScroller) {
      setScrollHoverDayKey(null);
      return;
    }

    const gridX = pointerPosition.x - scrollerRect.left;
    const gridY =
      pointerPosition.y -
      scrollerRect.top -
      C.CALENDAR_WEEKDAY_HEADER_HEIGHT +
      scroller.scrollTop;

    const columnIndex = Math.floor(
      (gridX / scrollerRect.width) * MONTH_WEEKDAY_COUNT,
    );
    const weekIndex = Math.floor(gridY / monthRowHeight);

    const hoveredDayKey =
      gridY >= 0 &&
      columnIndex >= 0 &&
      columnIndex < MONTH_WEEKDAY_COUNT
        ? scroll.monthWeeks[weekIndex]?.days[columnIndex]?.key ?? null
        : null;

    setScrollHoverDayKey(hoveredDayKey);
  }, [monthRowHeight, scroll.monthWeeks, scroll.scrollContainerRef]);

  const requestScrollHoverUpdate = useCallback(() => {
    if (scrollHoverRafRef.current !== null) return;

    scrollHoverRafRef.current = requestAnimationFrame(updateScrollHoverDay);
  }, [updateScrollHoverDay]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointerPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    requestScrollHoverUpdate();
  }, [requestScrollHoverUpdate]);

  const handlePointerLeave = useCallback(() => {
    pointerPositionRef.current = null;

    if (scrollHoverRafRef.current !== null) {
      cancelAnimationFrame(scrollHoverRafRef.current);
      scrollHoverRafRef.current = null;
    }

    setScrollHoverDayKey(null);
  }, []);

  const handleMonthScroll = useCallback(() => {
    requestScrollHoverUpdate();
  }, [requestScrollHoverUpdate]);

  const visibleEventRange = useMemo<CalendarEventSyncRange | null>(() => {
    const firstWeek = scroll.monthWeeks[0];
    const lastWeek = scroll.monthWeeks[scroll.monthWeeks.length - 1];

    if (!firstWeek || !lastWeek) return null;

    return {
      rangeStart: getDayStart(firstWeek.days[0].date),
      rangeEnd: getDayEnd(lastWeek.days[lastWeek.days.length - 1].date),
    };
  }, [scroll.monthWeeks]);

  useEffect(() => {
    if (!visibleEventRange) return;

    onEventSyncRangeChange?.(visibleEventRange);
  }, [onEventSyncRangeChange, visibleEventRange]);

  const renderedEvents = useMemo(() => {
    if (!visibleEventRange) return visibleEvents;

    const rangeStart = new Date(
      visibleEventRange.rangeStart.getTime() -
        C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS * DAY_MS,
    );
    const rangeEnd = new Date(
      visibleEventRange.rangeEnd.getTime() +
        C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS * DAY_MS,
    );

    return visibleEvents.filter((event) =>
      eventOverlapsRange(event, rangeStart, rangeEnd),
    );
  }, [visibleEventRange, visibleEvents]);

  return (
    <div
      ref={rootRef}
      className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      style={monthViewStyle}
    >
      <div
        ref={scroll.scrollContainerRef}
        className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onScroll={handleMonthScroll}
      >
        <GridCalendarMonthDesktop
          today={today}
          selectedDate={selectedDate}
          visibleEvents={renderedEvents}
          monthWeeks={scroll.monthWeeks}
          monthRowHeight={monthRowHeight}
          scrollHoverDayKey={scrollHoverDayKey}
          setWeekRowRef={scroll.setWeekRowRef}
          onSelectDate={onSelectDate}
          handleResizeReset={handleResizeReset}
          handleResizeKeyDown={handleResizeKeyDown}
          handleResizePointerDown={handleResizePointerDown}
        />
      </div>
    </div>
  );
};