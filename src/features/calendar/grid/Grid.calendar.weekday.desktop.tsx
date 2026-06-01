import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMinutes, differenceInMinutes, format, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { layoutCalendarTimeGridEvents } from "@core/calendar";
import type { CalendarTimeGridLayoutEntry } from "@core/calendar";
import { eventChipAllDayClass } from "@/chip/eventchip/eventchip.allday.styles";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { CalendarAllDayEventOrderMap, CalendarEventMoveHandler, CalendarWeekDayGridProps } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import * as COLOR from "./grid.color.constants.desktop";
import * as GRID from "./grid.layout.constants.desktop";
import { WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX, getWeekdayTimedEventPositionStyle } from "./weekdayTimeGridGeometry";

export type CalendarWeekDayGridRef = {
  scrollToHour: (hour: number) => void;
};

type WeekdayEventsByDay = {
  allDayEvents: Map<string, GoogleCalendarEvent[]>;
  timedEvents: Map<string, GoogleCalendarEvent[]>;
};

type WeekdayEventDragState = {
  eventKey: string;
  event: GoogleCalendarEvent;
  pointerId: number;
  pointerOffsetMinutes: number;
  durationMs: number;
  sourceDayKey: string;
  previewStartsAt: Date;
  previewEndsAt: Date;
  previewIsAllDay: boolean;
  previewAllDayIndex: number | null;
};

type WeekdayDayColumnHit = {
  day: Date;
  element: HTMLDivElement;
};

type WeekdayEventDragPreview = {
  previewStartsAt: Date;
  previewEndsAt: Date;
  previewIsAllDay: boolean;
  previewAllDayIndex: number | null;
};

type WeekdayAllDayRenderItem = {
  event: GoogleCalendarEvent;
  eventKey: string;
  isDragPreview: boolean;
};

const WEEKDAY_HOURS = Array.from({ length: GRID.WEEKDAY_HOURS }, (_, hour) => hour);
const CURRENT_TIME_TICK_MS = GRID.WEEKDAY_CURRENT_TIME_UPDATE_INTERVAL_MS;
const END_OF_DAY_HOUR_LABEL = "24:00";
const NEXT_DAY_PREVIEW_MINUTES = 30;
const NEXT_DAY_PREVIEW_HOURS = NEXT_DAY_PREVIEW_MINUTES / GRID.WEEKDAY_MINUTES_PER_HOUR;
const WEEKDAY_TIMED_EVENT_MIN_LAYOUT_MINUTES = Math.ceil((WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX / C.DEFAULT_HOUR_ROW_HEIGHT) * GRID.WEEKDAY_MINUTES_PER_HOUR);
const WEEKDAY_HEADER_DATE_NUMBER_CLASS_NAME = "flex h-[25px] w-[25px] items-center justify-center rounded-full text-[16px] font-bold leading-none tracking-[-0.03em] tabular-nums transition-colors duration-150";
const WEEKDAY_HEADER_WEEKDAY_CLASS_NAME = "text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]";
const WEEKDAY_TIME_LABEL_CLASS_NAME = "text-[11px] font-medium tabular-nums text-[#b8bcc5]";
const WEEKDAY_COLUMN_BORDER_STYLE: CSSProperties = { borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB };
const WEEKDAY_BOTTOM_SPACER_STYLE: CSSProperties = { height: `calc(${NEXT_DAY_PREVIEW_HOURS} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))` };
const WEEKDAY_BOTTOM_TIME_SPACER_CLASS_NAME = "relative";
const WEEKDAY_BOTTOM_PREVIEW_SPACER_CLASS_NAME = "relative overflow-hidden";
const WEEKDAY_TIMED_EVENT_DRAG_SNAP_MINUTES = 15;
const WEEKDAY_TIMED_EVENT_DRAG_FALLBACK_MINUTES = 30;
const WEEKDAY_TIMED_EVENT_DRAGGING_STYLE: CSSProperties = { filter: "drop-shadow(0 14px 22px rgba(15, 23, 42, 0.22))", transform: "scale(1.015)", zIndex: 30 };
const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = GRID.WEEKDAY_HOURS * GRID.WEEKDAY_MINUTES_PER_HOUR;

const createEventKey = (event: GoogleCalendarEvent): string => `${event.accountId ?? ""}:${event.calendarId}:${event.id}`;

const isUnshiftedHourLabel = (hour: number): boolean => hour === 0;

const isSameCalendarDate = (left: Date, right: Date): boolean => getCalendarDateKey(left) === getCalendarDateKey(right);

const shouldSuppressEntryMinHeight = (entry: CalendarTimeGridLayoutEntry): boolean => entry.endsAfterRange;

const formatHourLabel = (hour: number): string => hour === GRID.WEEKDAY_HOURS ? END_OF_DAY_HOUR_LABEL : format(new Date(2000, 0, 1, hour), GRID.WEEKDAY_HOUR_LABEL_FORMAT);

const getCurrentTimeTopStyle = (now: Date): CSSProperties => ({
  top: `calc(${(now.getHours() * GRID.WEEKDAY_MINUTES_PER_HOUR + now.getMinutes()) / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
});

const getHourLabelClassName = (hour: number): string => cn("absolute right-2 top-0 z-10 bg-white px-1", isUnshiftedHourLabel(hour) ? null : "-translate-y-1/2", WEEKDAY_TIME_LABEL_CLASS_NAME);

const getHeaderDateNumberClassName = (isSelected: boolean, isToday: boolean): string => cn(WEEKDAY_HEADER_DATE_NUMBER_CLASS_NAME, isSelected ? "border-0 bg-[var(--ds-color-tag-sky-bg)] text-[var(--ds-color-tag-sky-fg)] shadow-none ring-0" : isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]");

const getViewportGridTemplateColumns = (dayCount: number): string => `${C.TIME_COLUMN_WIDTH}px repeat(${dayCount}, minmax(0, 1fr))`;

const getTimedEntryPositionStyle = (entry: CalendarTimeGridLayoutEntry, rangeHours: number): CSSProperties => getWeekdayTimedEventPositionStyle(entry, rangeHours, { suppressMinHeight: shouldSuppressEntryMinHeight(entry) });

const getAllDayEventClassName = (isDraggable: boolean, isDragging: boolean): string => cn(eventChipAllDayClass, isDraggable ? "touch-none cursor-grab select-none active:cursor-grabbing" : null, isDragging ? "opacity-35" : null);

const getTimedEventWrapperClassName = (isDraggable: boolean, isDragging: boolean): string => cn("absolute z-10 min-w-0 transition-opacity duration-150 ease-out", isDraggable ? "touch-none cursor-grab select-none active:cursor-grabbing" : null, isDragging ? "opacity-35" : null);

const toEventDate = (value: Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
};

const getEventDurationMs = (event: GoogleCalendarEvent): number => {
  const startsAt = toEventDate(event.startsAt);
  const endsAt = toEventDate(event.endsAt);
  const durationMs = startsAt && endsAt ? endsAt.getTime() - startsAt.getTime() : 0;

  return durationMs > 0 ? durationMs : WEEKDAY_TIMED_EVENT_DRAG_FALLBACK_MINUTES * MINUTE_MS;
};

const getEventTimedDragDurationMs = (event: GoogleCalendarEvent): number => event.isAllDay ? WEEKDAY_TIMED_EVENT_DRAG_FALLBACK_MINUTES * MINUTE_MS : getEventDurationMs(event);

const getEventInRange = (event: GoogleCalendarEvent, rangeStart: Date, rangeEnd: Date): GoogleCalendarEvent | null => {
  const startsAt = toEventDate(event.startsAt);
  const endsAt = toEventDate(event.endsAt);

  if (!startsAt || !endsAt) return null;

  const startTime = startsAt.getTime();
  const endTime = endsAt.getTime();
  const normalizedEndTime = endTime > startTime ? endTime : startTime + 1;

  if (startTime >= rangeEnd.getTime() || normalizedEndTime <= rangeStart.getTime()) return null;

  return event;
};

const isCalendarEventDraggable = (event: GoogleCalendarEvent, onMoveCalendarEvent?: CalendarEventMoveHandler): boolean => Boolean(onMoveCalendarEvent && event.accountId);

const getHourRowHeightPx = (element: HTMLElement): number => {
  const computedValue = window.getComputedStyle(element).getPropertyValue(GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT);
  const parsedValue = Number.parseFloat(computedValue);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : C.DEFAULT_HOUR_ROW_HEIGHT;
};

const snapMinutes = (minutes: number): number => Math.round(minutes / WEEKDAY_TIMED_EVENT_DRAG_SNAP_MINUTES) * WEEKDAY_TIMED_EVENT_DRAG_SNAP_MINUTES;

const clampMinutes = (minutes: number, maxMinutes: number): number => Math.max(0, Math.min(maxMinutes, minutes));

const areSameEventTimes = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean => leftStart.getTime() === rightStart.getTime() && leftEnd.getTime() === rightEnd.getTime();

const isSameEventMove = (event: GoogleCalendarEvent, previewStartsAt: Date, previewEndsAt: Date, previewIsAllDay: boolean): boolean => event.isAllDay === previewIsAllDay && areSameEventTimes(event.startsAt, event.endsAt, previewStartsAt, previewEndsAt);

const areSameEventKeyOrder = (left: string[], right: string[]): boolean => left.length === right.length && left.every((key, index) => key === right[index]);

const createPreviewEvent = (event: GoogleCalendarEvent, startsAt: Date, endsAt: Date, isAllDay: boolean): GoogleCalendarEvent => ({ ...event, startsAt, endsAt, isAllDay });

const getDragPreviewDayKey = (state: WeekdayEventDragState): string => getCalendarDateKey(state.previewStartsAt);

const getDragPreviewStyle = (state: WeekdayEventDragState, day: Date): CSSProperties => {
  const dayStart = startOfDay(day);
  const startMinutes = clampMinutes(differenceInMinutes(state.previewStartsAt, dayStart), DAY_MINUTES);
  const durationMinutes = Math.max(1, state.durationMs / MINUTE_MS);
  const maxVisibleDurationMinutes = Math.max(1, DAY_MINUTES - startMinutes);
  const visibleDurationMinutes = Math.min(durationMinutes, maxVisibleDurationMinutes);

  return {
    left: "3px",
    top: `calc(${startMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
    width: "calc(100% - 7px)",
    height: `calc(${visibleDurationMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
    minHeight: `${WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX}px`,
    pointerEvents: "none",
    ...WEEKDAY_TIMED_EVENT_DRAGGING_STYLE,
  };
};

const getOrderedAllDayEvents = (events: GoogleCalendarEvent[], dayKey: string, order?: CalendarAllDayEventOrderMap): GoogleCalendarEvent[] => {
  const sortedEvents = [...events].sort(compareCalendarEvents);
  const orderedKeys = order?.[dayKey] ?? [];
  if (orderedKeys.length === 0) return sortedEvents;

  const eventByKey = new Map(sortedEvents.map((event) => [createEventKey(event), event]));
  const orderedEvents = orderedKeys.flatMap((key) => {
    const event = eventByKey.get(key);
    return event ? [event] : [];
  });
  const usedKeys = new Set(orderedEvents.map(createEventKey));

  return [...orderedEvents, ...sortedEvents.filter((event) => !usedKeys.has(createEventKey(event)))];
};

const getAllDayDropIndex = (element: HTMLDivElement, clientY: number): number => {
  const itemElements = Array.from(element.querySelectorAll<HTMLElement>("[data-calendar-all-day-event-item='true']"));
  const insertIndex = itemElements.findIndex((itemElement) => {
    const rect = itemElement.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });

  return insertIndex === -1 ? itemElements.length : insertIndex;
};

const insertEventKeyAtIndex = (eventKeys: string[], eventKey: string, index: number): string[] => {
  const withoutEvent = eventKeys.filter((key) => key !== eventKey);
  const insertIndex = Math.max(0, Math.min(index, withoutEvent.length));

  return [...withoutEvent.slice(0, insertIndex), eventKey, ...withoutEvent.slice(insertIndex)];
};

const groupEventsByDay = (events: GoogleCalendarEvent[], days: Date[]): WeekdayEventsByDay => {
  const dayKeys = new Set(days.map(getCalendarDateKey));
  const allDayEvents = new Map<string, GoogleCalendarEvent[]>();
  const timedEvents = new Map<string, GoogleCalendarEvent[]>();

  for (const day of days) {
    const key = getCalendarDateKey(day);
    allDayEvents.set(key, []);
    timedEvents.set(key, []);
  }

  for (const event of events) {
    const keys = getEventDateKeys(event).filter((key) => dayKeys.has(key));

    for (const key of keys) {
      const day = days.find((candidate) => getCalendarDateKey(candidate) === key);
      if (!day) continue;
      const clippedEvent = clipEventToDay(event, day);
      if (!clippedEvent) continue;
      const target = event.isAllDay ? allDayEvents : timedEvents;
      target.set(key, [...(target.get(key) ?? []), clippedEvent]);
    }
  }

  for (const [key, values] of allDayEvents) {
    allDayEvents.set(key, [...values].sort(compareCalendarEvents));
  }

  for (const [key, values] of timedEvents) {
    timedEvents.set(key, [...values].sort(compareCalendarEvents));
  }

  return { allDayEvents, timedEvents };
};

const createTimedLayoutEventsForRange = (events: GoogleCalendarEvent[], rangeStart: Date, rangeEnd: Date): CalendarTimeGridLayoutEntry[] => {
  const rangeEvents = events.flatMap((event) => {
    if (event.isAllDay) return [];
    const eventInRange = getEventInRange(event, rangeStart, rangeEnd);

    return eventInRange ? [eventInRange] : [];
  });

  return layoutCalendarTimeGridEvents({
    events: rangeEvents,
    rangeStart,
    rangeEnd,
    layoutMode: "no-overlap",
    minimumEventDurationMinutes: WEEKDAY_TIMED_EVENT_MIN_LAYOUT_MINUTES,
  });
};

const createTimedLayoutEvents = (events: GoogleCalendarEvent[], day: Date): CalendarTimeGridLayoutEntry[] => {
  const rangeStart = startOfDay(day);
  const rangeEnd = addDays(rangeStart, 1);

  return createTimedLayoutEventsForRange(events, rangeStart, rangeEnd);
};

const createNextDayPreviewLayoutEvents = (events: GoogleCalendarEvent[], day: Date): CalendarTimeGridLayoutEntry[] => {
  const rangeStart = addDays(startOfDay(day), 1);
  const rangeEnd = addMinutes(rangeStart, NEXT_DAY_PREVIEW_MINUTES);

  return createTimedLayoutEventsForRange(events, rangeStart, rangeEnd);
};

const createAllDayRenderItems = (events: GoogleCalendarEvent[], dayKey: string, allDayEventOrder: CalendarAllDayEventOrderMap | undefined, dragState: WeekdayEventDragState | null, dragPreviewEvent: GoogleCalendarEvent | null, dragPreviewDayKey: string | null): WeekdayAllDayRenderItem[] => {
  const shouldInsertPreview = Boolean(dragState && dragPreviewEvent && dragState.previewIsAllDay && dragPreviewDayKey === dayKey);
  const orderedEvents = getOrderedAllDayEvents(events, dayKey, allDayEventOrder);
  const visibleEvents = shouldInsertPreview && dragState && dragPreviewEvent ? insertEventKeyAtIndex(orderedEvents.map(createEventKey), dragState.eventKey, dragState.previewAllDayIndex ?? orderedEvents.length).flatMap((key) => key === dragState.eventKey ? [dragPreviewEvent] : orderedEvents.filter((event) => createEventKey(event) === key)) : orderedEvents;
  const previewEventKey = shouldInsertPreview && dragPreviewEvent ? createEventKey(dragPreviewEvent) : null;

  return visibleEvents.map((event) => {
    const eventKey = createEventKey(event);

    return {
      event,
      eventKey,
      isDragPreview: Boolean(previewEventKey && eventKey === previewEventKey),
    };
  });
};

const useCurrentTime = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), CURRENT_TIME_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  return now;
};

const CalendarWeekDayGridComponent = ({
  headerScrollRef,
  allDayScrollRef,
  scrollContainerRef,
  visibleDays,
  visibleEvents,
  calendarGridStyle,
  allDayEventOrder,
  onScroll,
  selectedDate,
  onSelectDate,
  onMoveCalendarEvent,
  onReorderAllDayEvents,
}: CalendarWeekDayGridProps) => {
  const now = useCurrentTime();
  const allDayColumnRefs = useRef(new Map<string, HTMLDivElement>());
  const dayColumnRefs = useRef(new Map<string, HTMLDivElement>());
  const dragElementRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<WeekdayEventDragState | null>(null);
  const [dragState, setDragState] = useState<WeekdayEventDragState | null>(null);
  const { allDayEvents, timedEvents } = useMemo(() => groupEventsByDay(visibleEvents, visibleDays), [visibleEvents, visibleDays]);
  const dragPreviewEvent = useMemo(() => dragState ? createPreviewEvent(dragState.event, dragState.previewStartsAt, dragState.previewEndsAt, dragState.previewIsAllDay) : null, [dragState]);
  const dragPreviewDayKey = dragState ? getDragPreviewDayKey(dragState) : null;
  const gridTemplateColumns = getViewportGridTemplateColumns(visibleDays.length);
  const timelineGridStyle = {
    [GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT]: calendarGridStyle[GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT],
    gridTemplateColumns,
  } as CSSProperties;
  const currentDayKey = getCalendarDateKey(now);

  const setDragStateValue = useCallback((nextDragState: WeekdayEventDragState | null) => {
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }, []);

  const setAllDayColumnRef = useCallback((dayKey: string) => (element: HTMLDivElement | null) => {
    if (element) {
      allDayColumnRefs.current.set(dayKey, element);
      return;
    }

    allDayColumnRefs.current.delete(dayKey);
  }, []);

  const setDayColumnRef = useCallback((dayKey: string) => (element: HTMLDivElement | null) => {
    if (element) {
      dayColumnRefs.current.set(dayKey, element);
      return;
    }

    dayColumnRefs.current.delete(dayKey);
  }, []);

  const getDayColumnAtClientX = useCallback((clientX: number): WeekdayDayColumnHit | null => {
    let nearestHit: WeekdayDayColumnHit | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const day of visibleDays) {
      const key = getCalendarDateKey(day);
      const element = dayColumnRefs.current.get(key);
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return { day, element };

      const distance = clientX < rect.left ? rect.left - clientX : clientX - rect.right;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestHit = { day, element };
      }
    }

    return nearestHit;
  }, [visibleDays]);

  const getAllDayColumnAtClientX = useCallback((clientX: number): WeekdayDayColumnHit | null => {
    let nearestHit: WeekdayDayColumnHit | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const day of visibleDays) {
      const key = getCalendarDateKey(day);
      const element = allDayColumnRefs.current.get(key);
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return { day, element };

      const distance = clientX < rect.left ? rect.left - clientX : clientX - rect.right;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestHit = { day, element };
      }
    }

    return nearestHit;
  }, [visibleDays]);

  const getAllDayDragPreview = useCallback((clientX: number, clientY: number): WeekdayEventDragPreview | null => {
    const allDayElement = allDayScrollRef?.current;
    if (!allDayElement) return null;

    const rect = allDayElement.getBoundingClientRect();
    if (clientY < rect.top || clientY > rect.bottom) return null;

    const hit = getAllDayColumnAtClientX(clientX);
    if (!hit) return null;

    const previewStartsAt = startOfDay(hit.day);
    const previewEndsAt = addDays(previewStartsAt, 1);
    const previewAllDayIndex = getAllDayDropIndex(hit.element, clientY);

    return { previewStartsAt, previewEndsAt, previewIsAllDay: true, previewAllDayIndex };
  }, [allDayScrollRef, getAllDayColumnAtClientX]);

  const getTimedDragPreview = useCallback((state: WeekdayEventDragState, clientX: number, clientY: number): WeekdayEventDragPreview | null => {
    const hit = getDayColumnAtClientX(clientX);
    if (!hit) return null;

    const rect = hit.element.getBoundingClientRect();
    const rowHeight = getHourRowHeightPx(hit.element);
    const rawStartMinutes = ((clientY - rect.top) / rowHeight) * GRID.WEEKDAY_MINUTES_PER_HOUR - state.pointerOffsetMinutes;
    const maxStartMinutes = Math.max(0, DAY_MINUTES - state.durationMs / MINUTE_MS);
    const startMinutes = clampMinutes(snapMinutes(rawStartMinutes), maxStartMinutes);
    const previewStartsAt = addMinutes(startOfDay(hit.day), startMinutes);
    const previewEndsAt = new Date(previewStartsAt.getTime() + state.durationMs);

    return { previewStartsAt, previewEndsAt, previewIsAllDay: false, previewAllDayIndex: null };
  }, [getDayColumnAtClientX]);

  const getDragPreviewTimes = useCallback((state: WeekdayEventDragState, clientX: number, clientY: number) => getAllDayDragPreview(clientX, clientY) ?? getTimedDragPreview(state, clientX, clientY), [getAllDayDragPreview, getTimedDragPreview]);

  const updateDragPreview = useCallback((event: PointerEvent) => {
    const state = dragStateRef.current;
    if (!state || event.pointerId !== state.pointerId) return;

    const preview = getDragPreviewTimes(state, event.clientX, event.clientY);
    if (!preview) return;

    event.preventDefault();

    if (state.previewIsAllDay === preview.previewIsAllDay && state.previewAllDayIndex === preview.previewAllDayIndex && areSameEventTimes(state.previewStartsAt, state.previewEndsAt, preview.previewStartsAt, preview.previewEndsAt)) return;

    setDragStateValue({ ...state, ...preview });
  }, [getDragPreviewTimes, setDragStateValue]);

  const commitAllDayOrder = useCallback((state: WeekdayEventDragState) => {
    if (!state.previewIsAllDay || state.previewAllDayIndex === null) return;

    const targetDayKey = getCalendarDateKey(state.previewStartsAt);
    const targetEvents = getOrderedAllDayEvents(allDayEvents.get(targetDayKey) ?? [], targetDayKey, allDayEventOrder);
    const currentEventKeys = targetEvents.map(createEventKey);
    const orderedEventKeys = insertEventKeyAtIndex(currentEventKeys, state.eventKey, state.previewAllDayIndex);

    if (targetDayKey === state.sourceDayKey && areSameEventKeyOrder(currentEventKeys, orderedEventKeys)) return;

    onReorderAllDayEvents?.({ eventKey: state.eventKey, sourceDayKey: state.sourceDayKey, targetDayKey, orderedEventKeys });
  }, [allDayEventOrder, allDayEvents, onReorderAllDayEvents]);

  const commitDragState = useCallback((state: WeekdayEventDragState) => {
    commitAllDayOrder(state);

    if (isSameEventMove(state.event, state.previewStartsAt, state.previewEndsAt, state.previewIsAllDay)) return;

    void Promise.resolve(onMoveCalendarEvent?.({ event: state.event, startsAt: state.previewStartsAt, endsAt: state.previewEndsAt, isAllDay: state.previewIsAllDay })).catch((error: unknown) => {
      console.warn("[CalendarWeekDayGrid] calendar event move failed", error);
    });
  }, [commitAllDayOrder, onMoveCalendarEvent]);

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

  const startEventDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent, pointerOffsetMinutes: number, durationMs: number) => {
    if (event.button !== 0 || !isCalendarEventDraggable(calendarEvent, onMoveCalendarEvent)) return;

    const eventKey = createEventKey(calendarEvent);
    const sourceDayKey = getCalendarDateKey(calendarEvent.startsAt);
    const preview = getDragPreviewTimes({
      eventKey,
      event: calendarEvent,
      pointerId: event.pointerId,
      pointerOffsetMinutes,
      durationMs,
      sourceDayKey,
      previewStartsAt: calendarEvent.startsAt,
      previewEndsAt: calendarEvent.endsAt,
      previewIsAllDay: calendarEvent.isAllDay,
      previewAllDayIndex: null,
    }, event.clientX, event.clientY);

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragElementRef.current = event.currentTarget;

    setDragStateValue({
      eventKey,
      event: calendarEvent,
      pointerId: event.pointerId,
      pointerOffsetMinutes,
      durationMs,
      sourceDayKey,
      previewStartsAt: preview?.previewStartsAt ?? calendarEvent.startsAt,
      previewEndsAt: preview?.previewEndsAt ?? calendarEvent.endsAt,
      previewIsAllDay: preview?.previewIsAllDay ?? calendarEvent.isAllDay,
      previewAllDayIndex: preview?.previewAllDayIndex ?? null,
    });
  }, [getDragPreviewTimes, onMoveCalendarEvent, setDragStateValue]);

  const handleAllDayEventPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent) => {
    startEventDrag(event, calendarEvent, 0, getEventTimedDragDurationMs(calendarEvent));
  }, [startEventDrag]);

  const handleTimedEventPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent) => {
    const dayKey = getCalendarDateKey(calendarEvent.startsAt);
    const dayColumn = dayColumnRefs.current.get(dayKey);
    if (!dayColumn) return;

    const rowHeight = getHourRowHeightPx(dayColumn);
    const eventRect = event.currentTarget.getBoundingClientRect();
    const pointerOffsetMinutes = Math.max(0, ((event.clientY - eventRect.top) / rowHeight) * GRID.WEEKDAY_MINUTES_PER_HOUR);

    startEventDrag(event, calendarEvent, pointerOffsetMinutes, getEventTimedDragDurationMs(calendarEvent));
  }, [startEventDrag]);

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div ref={headerScrollRef} className="shrink-0 overflow-hidden border-b" style={{ borderColor: COLOR.WEEKDAY_COLOR_BORDER_MAIN }}>
        <div className="grid min-w-0" style={{ gridTemplateColumns }}>
          <div className="h-12" />
          {visibleDays.map((day) => {
            const dayKey = getCalendarDateKey(day);
            const isSelected = isSameCalendarDate(day, selectedDate);
            const isToday = isSameCalendarDate(day, now);

            return (
              <div key={dayKey} className="flex h-12 min-w-0 items-center justify-center px-2">
                <button type="button" className="flex h-12 w-full min-w-0 items-center justify-center gap-1 bg-transparent p-0 text-center outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25" aria-pressed={isSelected} onClick={() => onSelectDate?.(day)}>
                  <span className={getHeaderDateNumberClassName(isSelected, isToday)}>{format(day, "d", { locale: ja })}</span>
                  <span className={WEEKDAY_HEADER_WEEKDAY_CLASS_NAME}>{format(day, "EEE", { locale: ja })}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={allDayScrollRef} className="shrink-0 overflow-hidden">
        <div className="grid min-w-0" style={{ gridTemplateColumns }}>
          <div className={cn("flex min-h-10 min-w-0 items-start justify-end py-2 pl-2 pr-3", WEEKDAY_TIME_LABEL_CLASS_NAME)}>終日</div>
          {visibleDays.map((day, dayIndex) => {
            const dayKey = getCalendarDateKey(day);
            const events = createAllDayRenderItems(allDayEvents.get(dayKey) ?? [], dayKey, allDayEventOrder, dragState, dragPreviewEvent, dragPreviewDayKey);

            return (
              <div key={dayKey} ref={setAllDayColumnRef(dayKey)} className={cn("min-h-10 min-w-0 border-b px-1 py-1", dayIndex === 0 ? null : "border-l")} style={WEEKDAY_COLUMN_BORDER_STYLE}>
                <div className="flex min-w-0 flex-col gap-1">
                  {events.map(({ event, eventKey, isDragPreview }) => {
                    const isDragging = dragState?.eventKey === eventKey;
                    const isDraggable = isCalendarEventDraggable(event, onMoveCalendarEvent);
                    const tokens = generateColorTokens(event.accentColor);

                    if (isDragPreview) {
                      return (
                        <div key={`${eventKey}:preview`} data-calendar-all-day-event-item="true" className={cn(eventChipAllDayClass, "pointer-events-none transition-none")} style={{ background: tokens.bg, color: tokens.text, ...WEEKDAY_TIMED_EVENT_DRAGGING_STYLE }} title={event.title}>
                          {event.title || "Untitled"}
                        </div>
                      );
                    }

                    return (
                      <div key={eventKey} data-calendar-all-day-event-item="true" className={getAllDayEventClassName(isDraggable, isDragging)} style={{ background: tokens.bg, color: tokens.text }} title={event.title} onPointerDown={isDraggable ? (pointerEvent) => handleAllDayEventPointerDown(pointerEvent, event) : undefined}>
                        {event.title || "Untitled"}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={scrollContainerRef} className="calendar-timeline-scroll scrollbar-hidden -mt-2 min-h-0 flex-1 overflow-auto pt-2" onScroll={onScroll}>
        <div className="grid min-w-0" style={timelineGridStyle}>
          <div className="relative min-w-0 bg-white" style={{ zIndex: GRID.WEEKDAY_GRID_TIME_COLUMN_Z_INDEX }}>
            {WEEKDAY_HOURS.map((hour) => (
              <div key={hour} className="relative" style={{ height: `var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT})` }}>
                <span className={getHourLabelClassName(hour)}>{formatHourLabel(hour)}</span>
              </div>
            ))}
            <div className={WEEKDAY_BOTTOM_TIME_SPACER_CLASS_NAME} data-testid="weekday-time-bottom-spacer" style={WEEKDAY_BOTTOM_SPACER_STYLE}>
              <span className={getHourLabelClassName(GRID.WEEKDAY_HOURS)}>{formatHourLabel(GRID.WEEKDAY_HOURS)}</span>
            </div>
          </div>

          {visibleDays.map((day, dayIndex) => {
            const dayKey = getCalendarDateKey(day);
            const events = createTimedLayoutEvents(timedEvents.get(dayKey) ?? [], day);
            const nextDayPreviewEvents = createNextDayPreviewLayoutEvents(visibleEvents, day);
            const isToday = dayKey === currentDayKey;
            const shouldRenderDragPreview = dragState && dragPreviewEvent && !dragState.previewIsAllDay && dragPreviewDayKey === dayKey;
            return (
              <div key={dayKey} ref={setDayColumnRef(dayKey)} className={cn("relative min-w-0 bg-white", dayIndex === 0 ? null : "border-l")} style={WEEKDAY_COLUMN_BORDER_STYLE}>
                {WEEKDAY_HOURS.map((hour) => (
                  <div key={hour} className="border-b" style={{ height: `var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT})`, borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }} />
                ))}
                <div className={WEEKDAY_BOTTOM_PREVIEW_SPACER_CLASS_NAME} data-testid="weekday-preview-bottom-spacer" style={WEEKDAY_BOTTOM_SPACER_STYLE}>
                  {nextDayPreviewEvents.map((entry) => (
                    <div key={createEventKey(entry.event)} className="absolute z-10 min-w-0" style={getTimedEntryPositionStyle(entry, NEXT_DAY_PREVIEW_HOURS)}>
                      <CalendarEventChipWeekday event={entry.event} />
                    </div>
                  ))}
                </div>

                {isToday ? (
                  <div className="pointer-events-none absolute left-0 right-0 z-20" style={getCurrentTimeTopStyle(now)}>
                    <div className="h-px bg-blue-500" />
                  </div>
                ) : null}

                {events.map((entry) => {
                  const eventKey = createEventKey(entry.event);
                  const isDragging = dragState?.eventKey === eventKey;
                  const isDraggable = isCalendarEventDraggable(entry.event, onMoveCalendarEvent);

                  return (
                    <div key={eventKey} className={getTimedEventWrapperClassName(isDraggable, isDragging)} style={getTimedEntryPositionStyle(entry, GRID.WEEKDAY_HOURS)} onPointerDown={isDraggable ? (event) => handleTimedEventPointerDown(event, entry.event) : undefined}>
                      <CalendarEventChipWeekday event={entry.event} tooltipDisabled={isDragging} />
                    </div>
                  );
                })}

                {shouldRenderDragPreview ? (
                  <div className="absolute min-w-0 transition-none" style={getDragPreviewStyle(dragState, day)}>
                    <CalendarEventChipWeekday event={dragPreviewEvent} tooltipDisabled />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CalendarWeekDayGrid = memo(CalendarWeekDayGridComponent);

CalendarWeekDayGrid.displayName = "CalendarWeekDayGrid";

export { CalendarWeekDayGrid };
