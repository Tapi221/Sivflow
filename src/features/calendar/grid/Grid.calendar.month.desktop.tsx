import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipMonth } from "@/chip/eventchip/EventChip.month";
import { computeMonthEventsByDay, createMonthEventIndex, EMPTY_MONTH_DAY_EVENTS } from "@/chip/eventchip/EventChip.month.placement";
import type { CalendarMonthDayEvents } from "@/chip/eventchip/EventChip.month.placement";
import { CalendarDayNumberCircle } from "@/chip/icons/CalendarDayNumberCircle";
import * as T from "@/features/calendar/calendar.text";
import type { CalendarEventMoveHandler } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import * as COLOR from "./grid.color.constants.desktop";
import * as GD from "./grid.layout.constants.desktop";

type CalendarMonthGridDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};

type CalendarMonthGridWeek = {
  key: string;
  days: CalendarMonthGridDay[];
};

type MonthEventDragState = {
  eventKey: string;
  event: GoogleCalendarEvent;
  pointerId: number;
  durationMs: number;
  sourceDayKey: string;
  previewStartsAt: Date;
  previewEndsAt: Date;
  previewIsAllDay: boolean;
};

type MonthDayCellHit = {
  day: CalendarMonthGridDay;
  element: HTMLDivElement;
};

type MonthEventDragPreview = {
  previewStartsAt: Date;
  previewEndsAt: Date;
  previewIsAllDay: boolean;
};

type MonthEventRenderItem = {
  event: GoogleCalendarEvent;
  eventKey: string;
  renderKey: string;
  isDragPreview: boolean;
};

type GridCalendarMonthDesktopProps = {
  today: Date;
  selectedDate: Date;
  visibleEvents: GoogleCalendarEvent[];
  monthWeeks: CalendarMonthGridWeek[];
  monthRowHeight: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  scrollHoverDayKey: string | null;
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
  setDayCellRef: (dayKey: string) => (element: HTMLDivElement | null) => void;
  onSelectDate: (date: Date) => void;
  onEventClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onEventPointerDown: (event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent) => void;
  onMoveCalendarEvent?: CalendarEventMoveHandler;
};

const MONTH_GRID_BORDER_STYLE: CSSProperties = { borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB };
const MONTH_EVENT_DRAGGING_STYLE: CSSProperties = { filter: "drop-shadow(0 14px 22px rgba(15, 23, 42, 0.22))", transform: "scale(1.015)", zIndex: 30 };
const DEFAULT_MONTH_TIMED_EVENT_DURATION_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const getDayKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

const createEventKey = (event: GoogleCalendarEvent): string => `${event.accountId ?? ""}:${event.calendarId}:${event.id}`;

const getDayAriaLabel = (date: Date): string => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

const getMonthAnnotation = (date: Date): string | null => {
  if (date.getDate() !== 1) return null;

  return format(date, "M月", { locale: ja });
};

const weekContainsDayKey = (week: CalendarMonthGridWeek, dayKey: string | null) => dayKey !== null && week.days.some((day) => day.key === dayKey);

const isWeekAffectedByDayKeyChange = (week: CalendarMonthGridWeek, previousDayKey: string | null, nextDayKey: string | null) => previousDayKey !== nextDayKey && (weekContainsDayKey(week, previousDayKey) || weekContainsDayKey(week, nextDayKey));

const createMonthWeekRowStyle = (monthRowHeight: number): CSSProperties => ({
  ...MONTH_GRID_BORDER_STYLE,
  minHeight: monthRowHeight,
});

const toEventDate = (value: Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
};

const getEventDurationMs = (event: GoogleCalendarEvent): number => {
  const startsAt = toEventDate(event.startsAt);
  const endsAt = toEventDate(event.endsAt);
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

const createPreviewEvent = (event: GoogleCalendarEvent, startsAt: Date, endsAt: Date, isAllDay: boolean): GoogleCalendarEvent => ({ ...event, startsAt, endsAt, isAllDay });

const isCalendarEventDraggable = (event: GoogleCalendarEvent, onMoveCalendarEvent?: CalendarEventMoveHandler): boolean => Boolean(onMoveCalendarEvent && event.accountId);

const areSameEventTimes = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean => leftStart.getTime() === rightStart.getTime() && leftEnd.getTime() === rightEnd.getTime();

const isSameEventMove = (event: GoogleCalendarEvent, previewStartsAt: Date, previewEndsAt: Date, previewIsAllDay: boolean): boolean => event.isAllDay === previewIsAllDay && areSameEventTimes(event.startsAt, event.endsAt, previewStartsAt, previewEndsAt);

const getDistanceToRect = (clientX: number, clientY: number, rect: DOMRect): number => {
  const nearestX = Math.max(rect.left, Math.min(clientX, rect.right));
  const nearestY = Math.max(rect.top, Math.min(clientY, rect.bottom));

  return Math.hypot(clientX - nearestX, clientY - nearestY);
};

const getMonthEventWrapperClassName = (isDraggable: boolean, isDragging: boolean, isPreview = false): string => cn("shrink-0 transition-opacity duration-150 ease-out", isDraggable ? "touch-none cursor-grab select-none active:cursor-grabbing" : null, isDragging ? "opacity-35" : null, isPreview ? "pointer-events-none transition-none" : null);

const createVisibleMonthEventRenderItem = (event: GoogleCalendarEvent): MonthEventRenderItem => {
  const eventKey = createEventKey(event);

  return { event, eventKey, renderKey: eventKey, isDragPreview: false };
};

const createMonthDragPreviewRenderItem = (event: GoogleCalendarEvent): MonthEventRenderItem => {
  const eventKey = createEventKey(event);

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

const CalendarMonthDayCell = memo(({ day, dayEvents, isToday, selected, isScrollHovered, hasLeadingBorder, dragState, dragPreviewEvent, dragPreviewDayKey, setDayCellRef, onSelectDate, onEventClick, onEventPointerDown, onMoveCalendarEvent }: CalendarMonthDayCellProps) => {
  const monthAnnotation = getMonthAnnotation(day.date);
  const { visibleEvents, totalCount } = dayEvents;
  const renderItems = createMonthEventRenderItems(visibleEvents, day.key, dragState, dragPreviewEvent, dragPreviewDayKey);
  const overflowCount = totalCount - visibleEvents.length;

  return (
    <div ref={setDayCellRef(day.key)} data-calendar-month-day-key={day.key} className={cn("calendar-month-day-cell group relative h-[var(--calendar-month-row-height)] min-h-[var(--calendar-month-row-height)] overflow-visible bg-white text-left", hasLeadingBorder && "border-l", isToday && "bg-[#f7fbff]", selected && !isToday && "bg-[#f7f7f8]", !selected && !isToday && "calendar-month-day-cell-hoverable", isScrollHovered && !selected && !isToday && "calendar-month-day-cell-scroll-hovered bg-[#fafafa]")} style={MONTH_GRID_BORDER_STYLE}>
      <button type="button" aria-label={getDayAriaLabel(day.date)} aria-pressed={selected} className="relative h-full w-full overflow-hidden text-left outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c7c7cc]" onClick={() => onSelectDate(day.date)}>
        <CalendarDayNumberCircle isToday={isToday} isSelected={selected} isCurrentMonth={day.isCurrentMonth} className={cn("absolute", GD.MONTH_GRID_DAY_NUMBER_POSITION_CLASS)}>
          {day.dayOfMonth}
        </CalendarDayNumberCircle>

        {monthAnnotation && (
          <span className={cn("absolute text-[12px] font-semibold text-[#8e8e93]", GD.MONTH_GRID_MONTH_ANNOTATION_POSITION_CLASS)}>
            {monthAnnotation}
          </span>
        )}

        {renderItems.length > 0 && (
          <div className={cn("absolute flex flex-col", GD.MONTH_GRID_EVENTS_CONTAINER_POSITION_CLASS, GD.MONTH_GRID_EVENTS_GAP_CLASS)}>
            {renderItems.map(({ event, eventKey, renderKey, isDragPreview }) => {
              const isDragging = !isDragPreview && dragState?.eventKey === eventKey;
              const isDraggable = !isDragPreview && isCalendarEventDraggable(event, onMoveCalendarEvent);

              return (
                <div key={renderKey} className={getMonthEventWrapperClassName(isDraggable, isDragging, isDragPreview)} style={isDragPreview ? MONTH_EVENT_DRAGGING_STYLE : undefined} onClick={isDraggable ? onEventClick : undefined} onPointerDown={isDraggable ? (pointerEvent) => onEventPointerDown(pointerEvent, event) : undefined}>
                  <CalendarEventChipMonth event={event} />
                </div>
              );
            })}

            {overflowCount > 0 && (
              <div className={cn("shrink-0 font-medium text-[#8f929c]", GD.MONTH_GRID_OVERFLOW_TEXT_CLASS)}>
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

const CalendarMonthWeekRow = memo(({ week, eventsByDay, selectedDayKey, todayDayKey, scrollHoverDayKey, monthRowHeight, dragState, dragPreviewEvent, dragPreviewDayKey, setDayCellRef, onSelectDate, onEventClick, onEventPointerDown, onMoveCalendarEvent }: CalendarMonthWeekRowProps) => {
  return (
    <div data-calendar-week-key={week.key} className="calendar-month-week-row relative grid grid-cols-7 border-b" style={createMonthWeekRowStyle(monthRowHeight)}>
      {week.days.map((day, dayIndex) => {
        const selected = day.key === selectedDayKey;
        const isToday = day.key === todayDayKey;
        const isScrollHovered = day.key === scrollHoverDayKey;

        return <CalendarMonthDayCell key={day.key} day={day} dayEvents={eventsByDay.get(day.key) ?? EMPTY_MONTH_DAY_EVENTS} isToday={isToday} selected={selected} isScrollHovered={isScrollHovered} hasLeadingBorder={dayIndex > 0} dragState={dragState} dragPreviewEvent={dragPreviewEvent} dragPreviewDayKey={dragPreviewDayKey} setDayCellRef={setDayCellRef} onSelectDate={onSelectDate} onEventClick={onEventClick} onEventPointerDown={onEventPointerDown} onMoveCalendarEvent={onMoveCalendarEvent} />;
      })}
    </div>
  );
}, (previous, next) => {
  if (previous.week !== next.week || previous.eventsByDay !== next.eventsByDay || previous.monthRowHeight !== next.monthRowHeight || previous.onSelectDate !== next.onSelectDate || previous.dragState !== next.dragState || previous.dragPreviewEvent !== next.dragPreviewEvent || previous.dragPreviewDayKey !== next.dragPreviewDayKey || previous.setDayCellRef !== next.setDayCellRef || previous.onEventClick !== next.onEventClick || previous.onEventPointerDown !== next.onEventPointerDown || previous.onMoveCalendarEvent !== next.onMoveCalendarEvent) return false;
  if (isWeekAffectedByDayKeyChange(previous.week, previous.selectedDayKey, next.selectedDayKey)) return false;
  if (isWeekAffectedByDayKeyChange(previous.week, previous.todayDayKey, next.todayDayKey)) return false;
  if (isWeekAffectedByDayKeyChange(previous.week, previous.scrollHoverDayKey, next.scrollHoverDayKey)) return false;
  return true;
});

CalendarMonthWeekRow.displayName = "CalendarMonthWeekRow";

const GridCalendarMonthDesktop = ({ today, selectedDate, visibleEvents, monthWeeks, monthRowHeight, topSpacerHeight, bottomSpacerHeight, scrollHoverDayKey, onSelectDate, onMoveCalendarEvent }: GridCalendarMonthDesktopProps) => {
  const dayCellRefs = useRef(new Map<string, HTMLDivElement>());
  const dragElementRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<MonthEventDragState | null>(null);
  const [dragState, setDragState] = useState<MonthEventDragState | null>(null);
  const selectedDayKey = useMemo(() => getDayKey(selectedDate), [selectedDate]);
  const todayDayKey = useMemo(() => getDayKey(today), [today]);
  const eventIndex = useMemo(() => createMonthEventIndex(visibleEvents), [visibleEvents]);
  const eventsByDay = useMemo(() => computeMonthEventsByDay({ eventIndex, monthWeeks, monthRowHeight }), [eventIndex, monthRowHeight, monthWeeks]);
  const dragPreviewEvent = useMemo(() => dragState ? createPreviewEvent(dragState.event, dragState.previewStartsAt, dragState.previewEndsAt, dragState.previewIsAllDay) : null, [dragState]);
  const dragPreviewDayKey = dragState ? getDayKey(dragState.previewStartsAt) : null;

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

  const updateDragPreview = useCallback((event: PointerEvent) => {
    const state = dragStateRef.current;
    if (!state || event.pointerId !== state.pointerId) return;

    const preview = getMonthDragPreview(state.event, state.durationMs, event.clientX, event.clientY);
    if (!preview) return;

    event.preventDefault();

    if (state.previewIsAllDay === preview.previewIsAllDay && areSameEventTimes(state.previewStartsAt, state.previewEndsAt, preview.previewStartsAt, preview.previewEndsAt)) return;

    setDragStateValue({ ...state, ...preview });
  }, [getMonthDragPreview, setDragStateValue]);

  const commitDragState = useCallback((state: MonthEventDragState) => {
    if (isSameEventMove(state.event, state.previewStartsAt, state.previewEndsAt, state.previewIsAllDay)) return;

    void Promise.resolve(onMoveCalendarEvent?.({ event: state.event, startsAt: state.previewStartsAt, endsAt: state.previewEndsAt, isAllDay: state.previewIsAllDay })).catch((error: unknown) => {
      console.warn("[GridCalendarMonthDesktop] calendar event move failed", error);
    });
  }, [onMoveCalendarEvent]);

  const finishDrag = useCallback((event: PointerEvent, shouldCommit: boolean) => {
    const state = dragStateRef.current;
    if (!state || event.pointerId !== state.pointerId) return;

    event.preventDefault();

    const dragElement = dragElementRef.current;
    if (dragElement?.hasPointerCapture(event.pointerId)) {
      dragElement.releasePointerCapture(event.pointerId);
    }

    dragElementRef.current = null;
    setDragStateValue(null);

    if (shouldCommit) commitDragState(state);
  }, [commitDragState, setDragStateValue]);

  const handleEventClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleEventPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent) => {
    if (event.button !== 0 || !isCalendarEventDraggable(calendarEvent, onMoveCalendarEvent)) return;

    const eventKey = createEventKey(calendarEvent);
    const durationMs = getEventDurationMs(calendarEvent);
    const sourceDayKey = getDayKey(calendarEvent.startsAt);
    const preview = getMonthDragPreview(calendarEvent, durationMs, event.clientX, event.clientY);

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragElementRef.current = event.currentTarget;

    setDragStateValue({
      eventKey,
      event: calendarEvent,
      pointerId: event.pointerId,
      durationMs,
      sourceDayKey,
      previewStartsAt: preview?.previewStartsAt ?? calendarEvent.startsAt,
      previewEndsAt: preview?.previewEndsAt ?? calendarEvent.endsAt,
      previewIsAllDay: preview?.previewIsAllDay ?? calendarEvent.isAllDay,
    });
  }, [getMonthDragPreview, onMoveCalendarEvent, setDragStateValue]);

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
    };
  }, [finishDrag, updateDragPreview]);

  useEffect(() => {
    if (!dragState || typeof document === "undefined") return undefined;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [dragState]);

  return (
    <>
      <div className={cn("sticky top-0 z-30 grid grid-cols-7 overflow-hidden border-b bg-white shadow-none", GD.MONTH_GRID_WEEKDAY_HEADER_HEIGHT_CLASS)} style={MONTH_GRID_BORDER_STYLE}>
        {T.WEEKDAY_LABELS.map((label: string) => (
          <div key={label} className="calendar-month-weekday-cell flex items-center justify-center text-[11px] leading-none font-semibold tracking-[0.03em] text-[#8e8e93]">
            {label}
          </div>
        ))}
      </div>

      <div className="calendar-month-grid bg-white">
        <div aria-hidden="true" className="calendar-month-grid-spacer" style={{ height: topSpacerHeight }} />

        {monthWeeks.map((week) => (
          <CalendarMonthWeekRow key={week.key} week={week} eventsByDay={eventsByDay} selectedDayKey={selectedDayKey} todayDayKey={todayDayKey} scrollHoverDayKey={scrollHoverDayKey} monthRowHeight={monthRowHeight} dragState={dragState} dragPreviewEvent={dragPreviewEvent} dragPreviewDayKey={dragPreviewDayKey} setDayCellRef={setDayCellRef} onSelectDate={onSelectDate} onEventClick={handleEventClick} onEventPointerDown={handleEventPointerDown} onMoveCalendarEvent={onMoveCalendarEvent} />
        ))}

        <div aria-hidden="true" className="calendar-month-grid-spacer" style={{ height: bottomSpacerHeight }} />
      </div>
    </>
  );
};

GridCalendarMonthDesktop.displayName = "GridCalendarMonthDesktop";

export { GridCalendarMonthDesktop };
