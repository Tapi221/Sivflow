import { startTransition, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import type { CalendarEventMoveHandler } from "@/features/calendar/scheduleScreen.types";
import { useMonthInfiniteScroll } from "@/features/scroll/schedule/useInfiniteScroll.month.desktop";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { GridCalendarMonthDesktop } from "./Grid.calendar.month.desktop";

type CalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  visibleEvents?: GoogleCalendarEvent[];
  showEventTimeLabel?: boolean;
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
  onRenderedRangeChange?: (range: CalendarDateRange) => void;
  onMoveCalendarEvent?: CalendarEventMoveHandler;
};

type MonthViewStyle = CSSProperties & {
  "--calendar-month-row-height": string;
};

const FIXED_MONTH_ROW_HEIGHT = C.DEFAULT_MONTH_ROW_HEIGHT;
const MONTH_VIEW_STYLE: MonthViewStyle = {
  "--calendar-month-row-height": `${FIXED_MONTH_ROW_HEIGHT}px`,
};

const CalendarMonthView = ({
  currentDate,
  selectedDate,
  scrollTargetToken = 0,
  visibleEvents = [],
  showEventTimeLabel = true,
  onSelectDate,
  onVisibleMonthChange,
  onRenderedRangeChange,
  onMoveCalendarEvent,
}: CalendarMonthViewProps) => {
  const todayRef = useRef(new Date());

  const scroll = useMonthInfiniteScroll({
    currentDate,
    scrollTargetToken,
    onVisibleMonthChange,
  });

  useEffect(() => {
    startTransition(() => {
      onRenderedRangeChange?.(scroll.visibleWeekRange);
    });
  }, [onRenderedRangeChange, scroll.visibleWeekRange]);

  return (
    <div className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white" style={MONTH_VIEW_STYLE}>
      <div ref={scroll.setScrollContainerRef} className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white">
        <GridCalendarMonthDesktop
          today={todayRef.current}
          selectedDate={selectedDate}
          visibleEvents={visibleEvents}
          monthWeeks={scroll.monthWeeks}
          monthRowHeight={FIXED_MONTH_ROW_HEIGHT}
          topSpacerHeight={scroll.topSpacerHeight}
          bottomSpacerHeight={scroll.bottomSpacerHeight}
          scrollHoverDayKey={null}
          showEventTimeLabel={showEventTimeLabel}
          monthScrollContainerRef={scroll.scrollContainerRef}
          onSelectDate={onSelectDate}
          onMoveCalendarEvent={onMoveCalendarEvent}
        />
      </div>
    </div>
  );
};

export { CalendarMonthView };
