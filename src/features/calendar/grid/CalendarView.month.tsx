import { startTransition, useCallback, useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from "react";
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

type MonthDragScrollDirection = "up" | "down";

type MonthDragPointerSnapshot = {
  pointerId: number;
  buttons: number;
  clientX: number;
  clientY: number;
};

const FIXED_MONTH_ROW_HEIGHT = C.DEFAULT_MONTH_ROW_HEIGHT;
const MONTH_DRAG_SCROLL_EDGE_PX = 88;
const MONTH_DRAG_SCROLL_STEP_PX = 28;
const MONTH_DRAG_SCROLL_INTERVAL_MS = 16;
const MONTH_VIEW_STYLE: MonthViewStyle = {
  "--calendar-month-row-height": `${FIXED_MONTH_ROW_HEIGHT}px`,
};

const createMonthDragPointerSnapshot = (pointerId: number, buttons: number, clientX: number, clientY: number): MonthDragPointerSnapshot => ({ pointerId, buttons, clientX, clientY });

const isCalendarMonthEventDragTarget = (target: EventTarget | null): boolean => target instanceof Element && target.closest(".cursor-grab") !== null;

const dispatchMonthDragPointerMove = (snapshot: MonthDragPointerSnapshot): void => {
  if (typeof window === "undefined" || typeof window.PointerEvent === "undefined") return;

  window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, pointerId: snapshot.pointerId, buttons: snapshot.buttons, clientX: snapshot.clientX, clientY: snapshot.clientY }));
};

const getMonthDragScrollDirection = (element: HTMLDivElement, clientY: number): MonthDragScrollDirection | null => {
  const rect = element.getBoundingClientRect();
  const canScrollUp = element.scrollTop > 0;
  const canScrollDown = element.scrollTop + element.clientHeight < element.scrollHeight;

  if (canScrollUp && clientY <= rect.top + MONTH_DRAG_SCROLL_EDGE_PX) return "up";
  if (canScrollDown && clientY >= rect.bottom - MONTH_DRAG_SCROLL_EDGE_PX) return "down";

  return null;
};

const getMonthDragScrollDelta = (direction: MonthDragScrollDirection): number => direction === "up" ? -MONTH_DRAG_SCROLL_STEP_PX : MONTH_DRAG_SCROLL_STEP_PX;

const useMonthDragAutoScroll = (scrollContainerRef: RefObject<HTMLDivElement | null>) => {
  const pointerSnapshotRef = useRef<MonthDragPointerSnapshot | null>(null);
  const scrollDirectionRef = useRef<MonthDragScrollDirection | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  const clearScrollInterval = useCallback(() => {
    if (scrollIntervalRef.current === null) return;

    window.clearInterval(scrollIntervalRef.current);
    scrollIntervalRef.current = null;
  }, []);

  const stopAutoScroll = useCallback(() => {
    pointerSnapshotRef.current = null;
    scrollDirectionRef.current = null;
    clearScrollInterval();
  }, [clearScrollInterval]);

  const pauseAutoScroll = useCallback(() => {
    scrollDirectionRef.current = null;
    clearScrollInterval();
  }, [clearScrollInterval]);

  const scrollOnce = useCallback((direction: MonthDragScrollDirection) => {
    const element = scrollContainerRef.current;
    const snapshot = pointerSnapshotRef.current;
    if (!element || !snapshot) return;

    const previousScrollTop = element.scrollTop;
    element.scrollTop += getMonthDragScrollDelta(direction);
    if (element.scrollTop === previousScrollTop) {
      pauseAutoScroll();
      return;
    }

    window.requestAnimationFrame(() => dispatchMonthDragPointerMove(snapshot));
  }, [pauseAutoScroll, scrollContainerRef]);

  const startAutoScroll = useCallback((direction: MonthDragScrollDirection) => {
    if (scrollDirectionRef.current === direction && scrollIntervalRef.current !== null) return;

    clearScrollInterval();
    scrollDirectionRef.current = direction;
    scrollOnce(direction);
    scrollIntervalRef.current = window.setInterval(() => {
      const currentDirection = scrollDirectionRef.current;
      if (!currentDirection || !pointerSnapshotRef.current) {
        clearScrollInterval();
        return;
      }

      scrollOnce(currentDirection);
    }, MONTH_DRAG_SCROLL_INTERVAL_MS);
  }, [clearScrollInterval, scrollOnce]);

  const updateAutoScroll = useCallback((pointerId: number, buttons: number, clientX: number, clientY: number) => {
    const previousSnapshot = pointerSnapshotRef.current;
    if (!previousSnapshot || previousSnapshot.pointerId !== pointerId) return;

    pointerSnapshotRef.current = createMonthDragPointerSnapshot(pointerId, buttons, clientX, clientY);

    const element = scrollContainerRef.current;
    if (buttons !== 1 || !element) {
      stopAutoScroll();
      return;
    }

    const direction = getMonthDragScrollDirection(element, clientY);
    if (!direction) {
      pauseAutoScroll();
      return;
    }

    startAutoScroll(direction);
  }, [pauseAutoScroll, scrollContainerRef, startAutoScroll, stopAutoScroll]);

  const handlePointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !isCalendarMonthEventDragTarget(event.target)) return;

    pointerSnapshotRef.current = createMonthDragPointerSnapshot(event.pointerId, event.buttons, event.clientX, event.clientY);
  }, []);

  const handlePointerMoveCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    updateAutoScroll(event.pointerId, event.buttons, event.clientX, event.clientY);
  }, [updateAutoScroll]);

  const handlePointerEndCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerSnapshotRef.current?.pointerId !== event.pointerId) return;

    stopAutoScroll();
  }, [stopAutoScroll]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePointerMove = (event: PointerEvent) => updateAutoScroll(event.pointerId, event.buttons, event.clientX, event.clientY);
    const handlePointerEnd = (event: PointerEvent) => {
      if (pointerSnapshotRef.current?.pointerId !== event.pointerId) return;

      stopAutoScroll();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      clearScrollInterval();
    };
  }, [clearScrollInterval, stopAutoScroll, updateAutoScroll]);

  return { handlePointerDownCapture, handlePointerMoveCapture, handlePointerEndCapture };
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
  const dragAutoScroll = useMonthDragAutoScroll(scroll.scrollContainerRef);

  useEffect(() => {
    startTransition(() => {
      onRenderedRangeChange?.(scroll.visibleWeekRange);
    });
  }, [onRenderedRangeChange, scroll.visibleWeekRange]);

  return (
    <div className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white" style={MONTH_VIEW_STYLE}>
      <div ref={scroll.scrollContainerRef} className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white" onPointerDownCapture={dragAutoScroll.handlePointerDownCapture} onPointerMoveCapture={dragAutoScroll.handlePointerMoveCapture} onPointerUpCapture={dragAutoScroll.handlePointerEndCapture} onPointerCancelCapture={dragAutoScroll.handlePointerEndCapture}>
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
          onSelectDate={onSelectDate}
          onMoveCalendarEvent={onMoveCalendarEvent}
        />
      </div>
    </div>
  );
};

export { CalendarMonthView };
