import { useMemo, useRef, useState } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { GridCalendarMonthDesktop } from "@/features/calendar/grid/Grid.calendar.month.desktop";

import { useMonthInfiniteScroll } from "../scroll/useInfiniteScroll.month.desktop";
import { useMonthRowResize } from "./height/useRowResize.month.desktop";

const CHIP_HEIGHT_PX = 21;
const CHIPS_TOP_OFFSET_PX = 60;
const CHIPS_BOTTOM_MARGIN_PX = 4;
const MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS = 7;

type CalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  visibleEvents?: GoogleCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
};

const getDayStartTime = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const getDayEndTime = (date: Date): number => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

export const CalendarMonthView = ({
  currentDate,
  selectedDate,
  scrollTargetToken = 0,
  visibleEvents = [],
  onSelectDate,
  onVisibleMonthChange,
}: CalendarMonthViewProps) => {
  const today = useMemo(() => new Date(), []);

  const isResizingRef = useRef(false);
  const monthRowHeightRef = useRef(C.readStoredMonthRowHeight());

  const [liveRowHeight, setLiveRowHeight] = useState(
    C.readStoredMonthRowHeight,
  );

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
    onAfterCommit: scroll.syncVisibleMonth,
    onLiveResize: (height) => {
      monthRowHeightRef.current = height;
      setLiveRowHeight(height);
    },
  });

  const renderedEvents = useMemo(() => {
    const firstWeek = scroll.monthWeeks[0];
    const lastWeek = scroll.monthWeeks[scroll.monthWeeks.length - 1];

    if (!firstWeek || !lastWeek) return visibleEvents;

    const rangeStart = getDayStartTime(firstWeek.days[0].date) -
      MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS * 24 * 60 * 60 * 1000;
    const rangeEnd = getDayEndTime(lastWeek.days[lastWeek.days.length - 1].date) +
      MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS * 24 * 60 * 60 * 1000;

    return visibleEvents.filter((event) => {
      const startsAt = event.startsAt instanceof Date
        ? event.startsAt
        : new Date(event.startsAt);

      const startsAtTime = startsAt.getTime();

      return Number.isFinite(startsAtTime) &&
        startsAtTime >= rangeStart &&
        startsAtTime <= rangeEnd;
    });
  }, [scroll.monthWeeks, visibleEvents]);

  const maxVisibleChips = Math.max(
    0,
    Math.floor(
      (liveRowHeight - CHIPS_TOP_OFFSET_PX - CHIPS_BOTTOM_MARGIN_PX) /
        CHIP_HEIGHT_PX,
    ),
  );

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
          maxVisibleChips={maxVisibleChips}
          monthRowHeight={monthRowHeight}
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