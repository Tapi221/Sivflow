import { startTransition, useEffect, useMemo, useRef } from "react";
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
  monthVisibleEventCount?: number;
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
  onRenderedRangeChange?: (range: CalendarDateRange) => void;
  onMoveCalendarEvent?: CalendarEventMoveHandler;
};

type MonthViewStyle = CSSProperties & {
  "--calendar-month-row-height": string;
};

const MONTH_ROW_HEIGHT_PER_EVENT_COUNT = 22;

const getMonthRowHeight = (monthVisibleEventCount: number): number => {
  const normalizedEventCount = Number.isFinite(monthVisibleEventCount)
    ? Math.max(C.MONTH_VISIBLE_EVENT_COUNT_MIN, Math.round(monthVisibleEventCount))
    : C.DEFAULT_MONTH_VISIBLE_EVENT_COUNT;
  const eventCountDelta = normalizedEventCount - C.DEFAULT_MONTH_VISIBLE_EVENT_COUNT;

  return C.DEFAULT_MONTH_ROW_HEIGHT + eventCountDelta * MONTH_ROW_HEIGHT_PER_EVENT_COUNT;
};

const createMonthViewStyle = (monthRowHeight: number): MonthViewStyle => ({
  "--calendar-month-row-height": `${monthRowHeight}px`,
});

const CalendarMonthView = ({
  currentDate,
  selectedDate,
  scrollTargetToken = 0,
  visibleEvents = [],
  showEventTimeLabel = true,
  monthVisibleEventCount = C.DEFAULT_MONTH_VISIBLE_EVENT_COUNT,
  onSelectDate,
  onVisibleMonthChange,
  onRenderedRangeChange,
  onMoveCalendarEvent,
}: CalendarMonthViewProps) => {
  const todayRef = useRef(new Date());
  const monthRowHeight = getMonthRowHeight(monthVisibleEventCount);
  const monthViewStyle = useMemo(() => createMonthViewStyle(monthRowHeight), [monthRowHeight]);

  const scroll = useMonthInfiniteScroll({
    currentDate,
    scrollTargetToken,
    monthRowHeight,
    onVisibleMonthChange,
  });

  useEffect(() => {
    startTransition(() => {
      onRenderedRangeChange?.(scroll.visibleWeekRange);
    });
  }, [onRenderedRangeChange, scroll.visibleWeekRange]);

  return (
    <div className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white" style={monthViewStyle}>
      <div ref={scroll.setScrollContainerRef} className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white">
        <GridCalendarMonthDesktop
          today={todayRef.current}
          selectedDate={selectedDate}
          visibleEvents={visibleEvents}
          monthWeeks={scroll.monthWeeks}
          monthRowHeight={monthRowHeight}
          maxVisibleEventCount={monthVisibleEventCount}
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
