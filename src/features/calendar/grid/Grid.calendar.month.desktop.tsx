import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarEventChipMonth } from "@web-renderer/chip/eventchip/EventChip.month";
import type { CalendarMonthDayEvents } from "@web-renderer/chip/eventchip/EventChip.month.placement";
import { computeMonthEventsByDay, EMPTY_MONTH_DAY_EVENTS } from "@web-renderer/chip/eventchip/EventChip.month.placement";
import { CalendarDayNumberCircle } from "@web-renderer/chip/icons/CalendarDayNumberCircle";
import { cn } from "@web-renderer/lib/utils";
import { addDays, format, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { WEEKDAY_LABELS } from "@/features/calendar/calendar.text";
import type { CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import { rotateCalendarWeekdayLabels } from "@/features/calendar/calendarWeekStart";
import type { CalendarEventDragPointerSnapshot } from "./calendarEventDrag.shared";
import { areSameCalendarEventTimes, CALENDAR_EVENT_DRAGGING_STYLE, createCalendarEventDragPointerSnapshot, createCalendarEventDragPreview, createCalendarEventKey, getCalendarEventDateOrNull, isCalendarEventDraggable, isSameCalendarEventMove, useCalendarEventDragAutoScroll, useCalendarEventDragBodyStyle } from "./calendarEventDrag.shared";
import * as COLOR from "./grid.color.constants.desktop";
import * as GD from "./grid.layout.constants.desktop";
import type { CalendarEventMoveHandler } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type CalendarMonthGridDay = {
  date: Date; key: string; dayOfMonth: number; isCurrentMonth: boolean; };
type CalendarMonthGridWeek = {
  key: string; days: CalendarMonthGridDay[]; };
type MonthEventDragState = {
  eventKey: string; event: GoogleCalendarEvent; pointerId: number; durationMs: number; sourceDayKey: string; previewStartsAt: Date; previewEndsAt: Date; previewIsAllDay: boolean; };
type MonthDayCellHit = {
  day: CalendarMonthGridDay; element: HTMLDivElement; };
type MonthEventDragPreview = {
  previewStartsAt: Date; previewEndsAt: Date; previewIsAllDay: boolean; };
type MonthEventRenderItem = {
  event: GoogleCalendarEvent; eventKey: string; renderKey: string; isDragPreview: boolean; };
type GridCalendarMonthDesktopProps = {
  today: Date;
  selectedDate: Date;
  weekStartDay: CalendarWeekStartDay;
  visibleEvents: GoogleCalendarEvent[];
  monthWeeks: CalendarMonthGridWeek[];
  monthRowHeight: number;
  maxVisibleEventCount?: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  scrollHoverDayKey: string | null;
  showEventTimeLabel?: boolean;
  monthScrollContainerRef?: RefObject<HTMLDivElement | null>;
  onSelectDate: (date: Date) => void;
  onMoveCalendarEvent?: CalendarEventMoveHandler;
};
type CalendarMonthDayCellProps = {
  day: CalendarMonthGridDay;
  dayEvents: CalendarMonthDayEvents;
  isToday: boolean;
  selected: boolean;
  isScrollHovered: boolean;
  hasLeadingBorder: boolean;
  dragState: MonthEventDragState | null;
  dragPreviewEvent: GoogleCalendarEvent | null;
  dragPreviewDayKey: string | null;
  showEventTimeLabel: boolean;
  setDayCellRef: (dayKey: string) => (element: HTMLDivElement | null) => void;
  onSelectDate: (date: Date) => void;
  onEventClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onEventPointerDown: (event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent) => void;
  onMoveCalendarEvent?: CalendarEventMoveHandler;
};
type CalendarMonthWeekRowProps = {
  week: CalendarMonthGridWeek;
  eventsByDay: Map<string, CalendarMonthDayEvents>;
  selectedDayKey: string;
  todayDayKey: string;
  scrollHoverDayKey: string | null;
  monthRowHeight: number;
  dragState: MonthEventDragState | null;
  dragPreviewEvent: GoogleCalendarEvent | null;
  dragPreviewDayKey: string | null;
  showEventTimeLabel: boolean;
  setDayCellRef: (dayKey: string) => (element: HTMLDivElement | null) => void;
  onSelectDate: (date: Date) => void;
  onEventClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onEventPointerDown: (event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent) => void;
  onMoveCalendarEvent?: CalendarEventMoveHandler;
};



const MONTH_GRID_BORDER_STYLE: CSSProperties = { borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB };
const DEFAULT_MONTH_TIMED_EVENT_DURATION_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_EVENT_DRAG_FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";



const getCanUseCalendarEventDragPointer = (): boolean => {
  if (typeof window === "undefined") return false;

  return window.matchMedia(CALENDAR_EVENT_DRAG_FINE_POINTER_QUERY).matches;
};
const useCalendarEventDragEnabled = (): boolean => {
  const [isEnabled, setIsEnabled] = useState(getCanUseCalendarEventDragPointer);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(CALENDAR_EVENT_DRAG_FINE_POINTER_QUERY);
    const handleChange = () => setIsEnabled(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isEnabled;
};
const getDayKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};
const getDayAriaLabel = (date: Date): string => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
const getMonthAnnotation = (date: Date): string | null => {
  if (date.getDate() !== 1) return null;

  return format(date, "M月", { locale: ja });
};
const weekContainsDayKey = (week: CalendarMonthGridWeek, dayKey: string | null) => dayKey !== null && week.days.some((day) => day.key === dayKey);
const isWeekAffectedByDayKeyChange = (week: CalendarMonthGridWeek, previousDayKey: string | null, nextDayKey: string | null) => previousDayKey !== nextDayKey && (weekContainsDayKey(week, previousDayKey) || weekContainsDayKey(week, nextDayKey));
const createMonthWeekRowStyle = (monthRowHeight: number): CSSProperties => ({ ...MONTH_GRID_BORDER_STYLE, minHeight: monthRowHeight });
const getEventDurationMs = (event: GoogleCalendarEvent): number => {
  const startsAt = getCalendarEventDateOrNull(event.startsAt);
  const endsAt = getCalendarEventDateOrNull(event.endsAt);
  const durationMs = startsAt && endsAt ? endsAt.getTime() - startsAt.getTime() : 0;

  if (durationMs > 0) return durationMs;

  return event.isAllDay ? DAY_MS : DEFAULT_MONTH_TIMED_EVENT_DURATION_MS;
};
const getTimedEventStartOnDay = (event: GoogleCalendarEvent, day: Date): Date => new Date(day.getFullYear(), day.getMonth(), day.getDate(), event.startsAt.getHours(), event.startsAt.getMinutes(), event.startsAt.getSeconds(), event.startsAt.getMilliseconds());
const getMovedMonthEventDateRange = (event: GoogleCalendarEvent, targetDay: Date, durationMs: number): MonthEventDragPreview => {
  const targetDayStart = startOfDay(targetDay);

  if (event.isAllDay) {
    const durationDays = Math.max(1, Math.round(durationMs / DAY_MS));
    const previewStartsAt = targetDayStart;
    const previewEndsAt = addDays(previewStartsAt, durationDays);

    return { previewStartsAt, previewEndsAt, previewIsAllDay: true };
  }

  const previewStartsAt = getTimedEventStartOnDay(event, targetDay);
  const previewEndsAt = new Date(previewStartsAt.getTime() + durationMs);

  return { previewStartsAt, previewEndsAt, previewIsAllDay: false };
};
const getDistanceToRect = (clientX: number, clientY: number, rect: DOMRect): number => {
  const nearestX = Math.max(rect.left, Math.min(clientX, rect.right));
  const nearestY = Math.max(rect.top, Math.min(clientY, rect.bottom));

  return Math.hypot(clientX - nearestX, clientY - nearestY);
};
const getMonthEventWrapperClassName = (isDraggable: boolean, isDragging: boolean, isPreview = false): string => cn("shrink-0 transition-opacity duration-150 ease-out", isDraggable ? "touch-none cursor-grab select-none active:cursor-grabbing" : null, isDragging ? "opacity-35" : null, isPreview ? "pointer-events-none transition-none" : null);
const createVisibleMonthEventRenderItem = (event: GoogleCalendarEvent): MonthEventRenderItem => {
  const eventKey = createCalendarEventKey(event);

  return { event, eventKey, renderKey: eventKey, isDragPreview: false };
};
const createMonthDragPreviewRenderItem = (event: GoogleCalendarEvent): MonthEventRenderItem => {
  const eventKey = createCalendarEventKey(event);

  return { event, eventKey, renderKey: `${eventKey}:preview`, isDragPreview: true };
};
const createMonthEventRenderItems = (visibleEvents: GoogleCalendarEvent[], dayKey: string, dragState: MonthEventDragState | null, dragPreviewEvent: GoogleCalendarEvent | null, dragPreviewDayKey: string | null): MonthEventRenderItem[] => {
  const visibleItems = visibleEvents.map(createVisibleMonthEventRenderItem);
  const shouldRenderDragPreview = Boolean(dragState && dragPreviewEvent && dragPreviewDayKey === dayKey);

  if (!shouldRenderDragPreview || !dragState || !dragPreviewEvent) return visibleItems;

  const previewItem = createMonthDragPreviewRenderItem(dragPreviewEvent);

  if (dayKey !== dragState.sourceDayKey) return [...visibleItems, previewItem];

  let didReplaceSource = false;
  const replacedItems = visibleItems.map((item) => {
    if (item.eventKey !== dragState.eventKey) return item;

    didReplaceSource = true;
    return previewItem;
  });

  return didReplaceSource ? replacedItems : visibleItems;
};



const GridCalendarMonthDesktop = ({ today, selectedDate, weekStartDay, visibleEvents, monthWeeks, monthRowHeight, maxVisibleEventCount, topSpacerHeight, bottomSpacerHeight, scrollHoverDayKey, showEventTimeLabel = true, monthScrollContainerRef, onSelectDate, onMoveCalendarEvent }: GridCalendarMonthDesktopProps) => {
  const dayCellRefs = useRef(new Map<string, HTMLDivElement>());
  const dragElementRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<MonthEventDragState | null>(null);
  const [dragState, setDragState] = useState<MonthEventDragState | null>(null);
  const weekdayLabels = useMemo(() => rotateCalendarWeekdayLabels(WEEKDAY_LABELS, weekStartDay), [weekStartDay]);
  const selectedDayKey = useMemo(() => getDayKey(selectedDate), [selectedDate]);
  const todayDayKey = useMemo(() => getDayKey(today), [today]);
  const eventsByDay = useMemo(() => computeMonthEventsByDay({ visibleEvents, monthWeeks, monthRowHeight, maxVisibleEventCount }), [maxVisibleEventCount, monthRowHeight, monthWeeks, visibleEvents]);
  const dragPreviewEvent = useMemo(() => dragState ? createCalendarEventDragPreview(dragState.event, dragState.previewStartsAt, dragState.previewEndsAt, dragState.previewIsAllDay) : null, [dragState]);
  const dragPreviewDayKey = dragState ? getDayKey(dragState.previewStartsAt) : null;
  const isEventDragEnabled = useCalendarEventDragEnabled();
  const effectiveMoveCalendarEvent = isEventDragEnabled ? onMoveCalendarEvent : undefined;

  const setDragStateValue = useCallback((nextDragState: MonthEventDragState | null) => {
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }, []);

  const setDayCellRef = useCallback((dayKey: string) => (element: HTMLDivElement | null) => {
    if (element) {
      dayCellRefs.current.set(dayKey, element);
      return;
    }

    dayCellRefs.current.delete(dayKey);
  }, []);

  const getMonthDayAtClientPoint = useCallback((clientX: number, clientY: number): MonthDayCellHit | null => {
    let nearestHit: MonthDayCellHit | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const week of monthWeeks) {
      for (const day of week.days) {
        const element = dayCellRefs.current.get(day.key);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return { day, element };

        const distance = getDistanceToRect(clientX, clientY, rect);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestHit = { day, element };
        }
      }
    }

    return nearestHit;
  }, [monthWeeks]);

  const getMonthDragPreview = useCallback((calendarEvent: GoogleCalendarEvent, durationMs: number, clientX: number, clientY: number): MonthEventDragPreview | null => {
    const hit = getMonthDayAtClientPoint(clientX, clientY);
    if (!hit) return null;

    return getMovedMonthEventDateRange(calendarEvent, hit.day.date, durationMs);
  }, [getMonthDayAtClientPoint]);

  const updateDragPreviewFromSnapshot = useCallback((snapshot: CalendarEventDragPointerSnapshot) => {
    const state = dragStateRef.current;
    if (!state || snapshot.pointerId !== state.pointerId) return;

    const preview = getMonthDragPreview(state.event, state.durationMs, snapshot.clientX, snapshot.clientY);
    if (!preview) return;

    if (state.previewIsAllDay === preview.previewIsAllDay && areSameCalendarEventTimes(state.previewStartsAt, state.previewEndsAt, preview.previewStartsAt, preview.previewEndsAt)) return;

    setDragStateValue({ ...state, ...preview });
  }, [getMonthDragPreview, setDragStateValue]);

  const { stopDragAutoScroll, updateDragAutoScroll } = useCalendarEventDragAutoScroll<HTMLDivElement>({ scrollContainerRef: monthScrollContainerRef, onScroll: updateDragPreviewFromSnapshot });

  const updateDragPreview = useCallback((event: PointerEvent) => {
    const state = dragStateRef.current;
    if (!state || event.pointerId !== state.pointerId) return;

    const snapshot = createCalendarEventDragPointerSnapshot(event.pointerId, event.buttons, event.clientX, event.clientY);
    updateDragAutoScroll(snapshot, true);
    updateDragPreviewFromSnapshot(snapshot);
    event.preventDefault();
  }, [updateDragAutoScroll, updateDragPreviewFromSnapshot]);

  const commitDragState = useCallback((state: MonthEventDragState) => {
    if (isSameCalendarEventMove(state.event, state.previewStartsAt, state.previewEndsAt, state.previewIsAllDay)) return;

    void Promise.resolve(effectiveMoveCalendarEvent?.({ event: state.event, startsAt: state.previewStartsAt, endsAt: state.previewEndsAt, isAllDay: state.previewIsAllDay })).catch((error: unknown) => {
      console.warn("[GridCalendarMonthDesktop] calendar event move failed", error);
    });
  }, [effectiveMoveCalendarEvent]);

  const finishDrag = useCallback((event: PointerEvent, shouldCommit: boolean) => {
    const state = dragStateRef.current;
    if (!state || event.pointerId !== state.pointerId) return;

    event.preventDefault();

    const dragElement = dragElementRef.current;
    if (dragElement?.hasPointerCapture(event.pointerId)) {
      dragElement.releasePointerCapture(event.pointerId);
    }

    dragElementRef.current = null;
    stopDragAutoScroll();
    setDragStateValue(null);

    if (shouldCommit) commitDragState(state);
  }, [commitDragState, setDragStateValue, stopDragAutoScroll]);

  const handleEventClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleEventPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent) => {
    if (!isEventDragEnabled || event.pointerType !== "mouse" || event.button !== 0 || !isCalendarEventDraggable(calendarEvent, effectiveMoveCalendarEvent)) return;

    const eventKey = createCalendarEventKey(calendarEvent);
    const durationMs = getEventDurationMs(calendarEvent);
    const sourceDayKey = getDayKey(calendarEvent.startsAt);
    const preview = getMonthDragPreview(calendarEvent, durationMs, event.clientX, event.clientY);

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragElementRef.current = event.currentTarget;

    setDragStateValue({ eventKey, event: calendarEvent, pointerId: event.pointerId, durationMs, sourceDayKey, previewStartsAt: preview?.previewStartsAt ?? calendarEvent.startsAt, previewEndsAt: preview?.previewEndsAt ?? calendarEvent.endsAt, previewIsAllDay: preview?.previewIsAllDay ?? calendarEvent.isAllDay });
  }, [effectiveMoveCalendarEvent, getMonthDragPreview, isEventDragEnabled, setDragStateValue]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePointerMove = (event: PointerEvent) => updateDragPreview(event);
    const handlePointerUp = (event: PointerEvent) => finishDrag(event, true);
    const handlePointerCancel = (event: PointerEvent) => finishDrag(event, false);

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp, { passive: false });
    window.addEventListener("pointercancel", handlePointerCancel, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      stopDragAutoScroll();
    };
  }, [finishDrag, stopDragAutoScroll, updateDragPreview]);

  useCalendarEventDragBodyStyle(Boolean(dragState));

  return (
    <>
      <div className={cn("sticky top-0 z-30 grid grid-cols-7 overflow-hidden border-b bg-white shadow-none", GD.MONTH_GRID_WEEKDAY_HEADER_HEIGHT_CLASS)} style={MONTH_GRID_BORDER_STYLE}>
        {weekdayLabels.map((label: string, index: number) => (
          <div key={`${label}-${index}`} className="calendar-month-weekday-cell flex items-center justify-center text-xs leading-none font-semibold tracking-wide text-zinc-500">
            {label}
          </div>
        ))}
      </div>
      <div className="calendar-month-grid bg-white">
        <div aria-hidden="true" className="calendar-month-grid-spacer" style={{ height: topSpacerHeight }} />

        {monthWeeks.map((week) => (
          <CalendarMonthWeekRow key={week.key} week={week} eventsByDay={eventsByDay} selectedDayKey={selectedDayKey} todayDayKey={todayDayKey} scrollHoverDayKey={scrollHoverDayKey} monthRowHeight={monthRowHeight} dragState={dragState} dragPreviewEvent={dragPreviewEvent} dragPreviewDayKey={dragPreviewDayKey} showEventTimeLabel={showEventTimeLabel} setDayCellRef={setDayCellRef} onSelectDate={onSelectDate} onEventClick={handleEventClick} onEventPointerDown={handleEventPointerDown} onMoveCalendarEvent={effectiveMoveCalendarEvent} />
        ))}

        <div aria-hidden="true" className="calendar-month-grid-spacer" style={{ height: bottomSpacerHeight }} />
      </div>
    </>
  );
};



const CalendarMonthDayCell = memo(({ day, dayEvents, isToday, selected, isScrollHovered, hasLeadingBorder, dragState, dragPreviewEvent, dragPreviewDayKey, showEventTimeLabel, setDayCellRef, onSelectDate, onEventClick, onEventPointerDown, onMoveCalendarEvent }: CalendarMonthDayCellProps) => {
  const monthAnnotation = getMonthAnnotation(day.date);
  const { visibleEvents, totalCount } = dayEvents;
  const renderItems = createMonthEventRenderItems(visibleEvents, day.key, dragState, dragPreviewEvent, dragPreviewDayKey);
  const overflowCount = totalCount - visibleEvents.length;

  return (
    <div ref={setDayCellRef(day.key)} data-calendar-month-day-key={day.key} className={cn("calendar-month-day-cell group relative h-[var(--calendar-month-row-height)] min-h-[var(--calendar-month-row-height)] overflow-visible bg-white text-left", hasLeadingBorder && "border-l", isToday && "bg-[#f7fbff]", selected && !isToday && "bg-zinc-50", !selected && !isToday && "calendar-month-day-cell-hoverable", isScrollHovered && !selected && !isToday && "calendar-month-day-cell-scroll-hovered bg-[#fafafa]")} style={MONTH_GRID_BORDER_STYLE}>
      <button type="button" aria-label={getDayAriaLabel(day.date)} aria-pressed={selected} className="relative h-full w-full overflow-hidden text-left outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c7c7cc]" onClick={() => onSelectDate(day.date)}>
        <span className={cn("absolute flex items-center gap-0.5 whitespace-nowrap", GD.MONTH_GRID_DAY_HEADER_POSITION_CLASS)}>
          <CalendarDayNumberCircle isToday={isToday} isSelected={selected} isCurrentMonth={day.isCurrentMonth}>
            {day.dayOfMonth}
          </CalendarDayNumberCircle>

          {monthAnnotation && (
            <span className="shrink-0 text-xs font-semibold text-zinc-500">
              {monthAnnotation}
            </span>
          )}
        </span>

        {renderItems.length > 0 && (
          <div className={cn("absolute flex flex-col", GD.MONTH_GRID_EVENTS_CONTAINER_POSITION_CLASS, GD.MONTH_GRID_EVENTS_GAP_CLASS)}>
            {renderItems.map(({ event, eventKey, renderKey, isDragPreview }) => {
              const isDragging = !isDragPreview && dragState?.eventKey === eventKey;
              const isDraggable = !isDragPreview && isCalendarEventDraggable(event, onMoveCalendarEvent);

              return (
                <div key={renderKey} className={getMonthEventWrapperClassName(isDraggable, isDragging, isDragPreview)} style={isDragPreview ? CALENDAR_EVENT_DRAGGING_STYLE : undefined} onClick={isDraggable ? onEventClick : undefined} onPointerDown={isDraggable ? (pointerEvent) => onEventPointerDown(pointerEvent, event) : undefined}>
                  <CalendarEventChipMonth event={event} showTimeLabel={showEventTimeLabel} tooltipDisabled={isDragPreview || isDragging} />
                </div>
              );
            })}

            {overflowCount > 0 && (
              <div className={cn("shrink-0 font-medium text-slate-500", GD.MONTH_GRID_OVERFLOW_TEXT_CLASS)}>
                +{overflowCount}件
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  );
});
CalendarMonthDayCell.displayName = "CalendarMonthDayCell";
const CalendarMonthWeekRow = memo(({ week, eventsByDay, selectedDayKey, todayDayKey, scrollHoverDayKey, monthRowHeight, dragState, dragPreviewEvent, dragPreviewDayKey, showEventTimeLabel, setDayCellRef, onSelectDate, onEventClick, onEventPointerDown, onMoveCalendarEvent }: CalendarMonthWeekRowProps) => {
  return (
    <div data-calendar-week-key={week.key} className="calendar-month-week-row relative grid grid-cols-7 border-b" style={createMonthWeekRowStyle(monthRowHeight)}>
      {week.days.map((day, dayIndex) => {
        const selected = day.key === selectedDayKey;
        const isToday = day.key === todayDayKey;
        const isScrollHovered = day.key === scrollHoverDayKey;

        return <CalendarMonthDayCell key={day.key} day={day} dayEvents={eventsByDay.get(day.key) ?? EMPTY_MONTH_DAY_EVENTS} isToday={isToday} selected={selected} isScrollHovered={isScrollHovered} hasLeadingBorder={dayIndex > 0} dragState={dragState} dragPreviewEvent={dragPreviewEvent} dragPreviewDayKey={dragPreviewDayKey} showEventTimeLabel={showEventTimeLabel} setDayCellRef={setDayCellRef} onSelectDate={onSelectDate} onEventClick={onEventClick} onEventPointerDown={onEventPointerDown} onMoveCalendarEvent={onMoveCalendarEvent} />;
      })}
    </div>
  );
}, (previous, next) => {
  if (previous.week !== next.week || previous.eventsByDay !== next.eventsByDay || previous.monthRowHeight !== next.monthRowHeight || previous.onSelectDate !== next.onSelectDate || previous.dragState !== next.dragState || previous.dragPreviewEvent !== next.dragPreviewEvent || previous.dragPreviewDayKey !== next.dragPreviewDayKey || previous.showEventTimeLabel !== next.showEventTimeLabel || previous.setDayCellRef !== next.setDayCellRef || previous.onEventClick !== next.onEventClick || previous.onEventPointerDown !== next.onEventPointerDown || previous.onMoveCalendarEvent !== next.onMoveCalendarEvent) return false;
  if (isWeekAffectedByDayKeyChange(previous.week, previous.selectedDayKey, next.selectedDayKey)) return false;
  if (isWeekAffectedByDayKeyChange(previous.week, previous.todayDayKey, next.todayDayKey)) return false;
  if (isWeekAffectedByDayKeyChange(previous.week, previous.scrollHoverDayKey, next.scrollHoverDayKey)) return false;
  return true;
});
CalendarMonthWeekRow.displayName = "CalendarMonthWeekRow";
GridCalendarMonthDesktop.displayName = "GridCalendarMonthDesktop";

export { GridCalendarMonthDesktop };
