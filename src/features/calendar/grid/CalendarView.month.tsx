import { startTransition, useDeferredValue, useEffect, useRef } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { useMonthRowResize } from "@/features/calendar/grid/height/useRowResize.month.desktop";
import { useMonthInfiniteScroll } from "@/features/scroll/schedule/useInfiniteScroll.month.desktop";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { GridCalendarMonthDesktop } from "./Grid.calendar.month.desktop";

const RENDERED_RANGE_NOTIFY_DELAY_MS = 180;

type CalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  visibleEvents?: GoogleCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
  onRenderedRangeChange?: (range: CalendarDateRange) => void;
};

export const CalendarMonthView = ({
  currentDate,
  selectedDate,
  scrollTargetToken = 0,
  visibleEvents = [],
  onSelectDate,
  onVisibleMonthChange,
  onRenderedRangeChange,
}: CalendarMonthViewProps) => {
  const todayRef = useRef(new Date());
  const deferredVisibleEvents = useDeferredValue(visibleEvents);

  const isResizingRef = useRef(false);
  const monthRowHeightRef = useRef(C.readStoredMonthRowHeight());
  const renderedRangeNotifyTimeoutRef = useRef<number | null>(null);

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
    onResizeStart: () => {
      scroll.cancelVisibleMonthSync();
    },
    onAfterCommit: scroll.syncVisibleMonth,
    onLiveResize: (height) => {
      monthRowHeightRef.current = height;
    },
  });

  useEffect(() => {
    if (renderedRangeNotifyTimeoutRef.current !== null) {
      window.clearTimeout(renderedRangeNotifyTimeoutRef.current);
    }

    renderedRangeNotifyTimeoutRef.current = window.setTimeout(() => {
      renderedRangeNotifyTimeoutRef.current = null;

      startTransition(() => {
        onRenderedRangeChange?.(scroll.visibleWeekRange);
      });
    }, RENDERED_RANGE_NOTIFY_DELAY_MS);

    return () => {
      if (renderedRangeNotifyTimeoutRef.current === null) return;

      window.clearTimeout(renderedRangeNotifyTimeoutRef.current);
      renderedRangeNotifyTimeoutRef.current = null;
    };
  }, [onRenderedRangeChange, scroll.visibleWeekRange]);

  return (
    <div
      ref={rootRef}
      className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      style={monthViewStyle}
    >
      <div
        ref={scroll.scrollContainerRef}
        className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white"
      >
        <GridCalendarMonthDesktop
          today={todayRef.current}
          selectedDate={selectedDate}
          visibleEvents={deferredVisibleEvents}
          monthWeeks={scroll.monthWeeks}
          monthRowHeight={monthRowHeight}
          topSpacerHeight={scroll.topSpacerHeight}
          bottomSpacerHeight={scroll.bottomSpacerHeight}
          scrollHoverDayKey={null}
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
