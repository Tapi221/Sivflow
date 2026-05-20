import { useMemo, useRef, useState } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/useGoogleCalendarIntegration";
import { GridCalendarMonthDesktop } from "@/features/calendar/grid/Grid.calendar.month.desktop";

import { useMonthInfiniteScroll } from "../scroll/useInfiniteScroll.month.desktop";
import { useMonthRowResize } from "./height/useRowResize.month.desktop";

const CHIP_HEIGHT_PX = 21;
const CHIPS_TOP_OFFSET_PX = 60;
const CHIPS_BOTTOM_MARGIN_PX = 4;

type CalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  visibleEvents?: GoogleCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
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

  const [liveRowHeight, setLiveRowHeight] = useState(
    C.readStoredMonthRowHeight,
  );

  const scroll = useMonthInfiniteScroll({
    currentDate,
    scrollTargetToken,
    isResizingRef,
    onVisibleMonthChange,
  });

  const resize = useMonthRowResize({
    scrollContainerRef: scroll.scrollContainerRef,
    weekRowRefsMap: scroll.weekRowRefsMap,
    monthWeeks: scroll.monthWeeks,
    isResizingRef,
    onAfterCommit: scroll.syncVisibleMonth,
    onLiveResize: setLiveRowHeight,
  });

  const maxVisibleChips = Math.max(
    0,
    Math.floor(
      (liveRowHeight - CHIPS_TOP_OFFSET_PX - CHIPS_BOTTOM_MARGIN_PX) /
        CHIP_HEIGHT_PX,
    ),
  );

  return (
    <div
      ref={resize.rootRef}
      className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      style={resize.monthViewStyle}
    >
      <div
        ref={scroll.scrollContainerRef}
        className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white"
        onScroll={scroll.handleScroll}
      >
        <GridCalendarMonthDesktop
          today={today}
          selectedDate={selectedDate}
          visibleEvents={visibleEvents}
          monthWeeks={scroll.monthWeeks}
          maxVisibleChips={maxVisibleChips}
          monthRowHeight={resize.monthRowHeight}
          setWeekRowRef={scroll.setWeekRowRef}
          onSelectDate={onSelectDate}
          handleResizeReset={resize.handleResizeReset}
          handleResizeKeyDown={resize.handleResizeKeyDown}
          handleResizePointerDown={resize.handleResizePointerDown}
        />
      </div>
    </div>
  );
};
