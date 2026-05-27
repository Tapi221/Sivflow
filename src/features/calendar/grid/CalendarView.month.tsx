import { startTransition, useEffect, useMemo, useRef } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { eventOverlapsRange } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { GridCalendarMonthDesktop } from "@/features/calendar/grid/Grid.calendar.month.desktop";
import { useMonthInfiniteScroll } from "@/features/scroll/schedule/useInfiniteScroll.month.desktop";
import { useMonthRowResize } from "@/features/calendar/grid/height/useRowResize.month.desktop";

const DAY_MS = 24 * 60 * 60 * 1000;

type CalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  visibleEvents?: GoogleCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
  onRenderedRangeChange?: (range: CalendarDateRange) => void;
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
  onRenderedRangeChange,
}: CalendarMonthViewProps) => {
  const today = useMemo(() => new Date(), []);

  const isResizingRef = useRef(false);
  const monthRowHeightRef = useRef(C.readStoredMonthRowHeight());

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

  const renderedRange = useMemo<CalendarDateRange | null>(() => {
    const firstWeek = scroll.monthWeeks[0];
    const lastWeek = scroll.monthWeeks[scroll.monthWeeks.length - 1];

    if (!firstWeek || !lastWeek) return null;

    return {
      start: getDayStart(firstWeek.days[0].date),
      end: getDayEnd(lastWeek.days[lastWeek.days.length - 1].date),
    };
  }, [scroll.monthWeeks]);

  useEffect(() => {
    if (!renderedRange) return;

    startTransition(() => {
      onRenderedRangeChange?.(renderedRange);
    });
  }, [onRenderedRangeChange, renderedRange]);

  const renderedEvents = useMemo(() => {
    if (!renderedRange) return visibleEvents;

    const rangeStart = new Date(
      renderedRange.start.getTime() -
        C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS * DAY_MS,
    );
    const rangeEnd = new Date(
      renderedRange.end.getTime() +
        C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS * DAY_MS,
    );

    return visibleEvents.filter((event) =>
      eventOverlapsRange(event, rangeStart, rangeEnd),
    );
  }, [renderedRange, visibleEvents]);

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
          today={today}
          selectedDate={selectedDate}
          visibleEvents={renderedEvents}
          monthWeeks={scroll.monthWeeks}
          monthRowHeight={monthRowHeight}
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
