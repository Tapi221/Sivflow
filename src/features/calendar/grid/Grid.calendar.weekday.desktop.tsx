import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMinutes, differenceInMinutes, format, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { layoutCalendarTimeGridEvents } from "@core/calendar";
import type { CalendarTimeGridLayoutEntry } from "@core/calendar";
import { CalendarEventChipMonth } from "@/chip/eventchip/EventChip.month";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import { eventChipDesign } from "@/chip/eventchip/eventChipDesign.generated";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarAllDayEventOrderMap, CalendarGridStyle, CalendarWeekDayGridProps } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { CALENDAR_EVENT_DRAGGING_STYLE, areSameCalendarEventTimes, createCalendarEventDragPointerSnapshot, createCalendarEventDragPreview, createCalendarEventKey, getCalendarEventDateOrNull, isCalendarEventDraggable, isSameCalendarEventMove, useCalendarEventDragAutoScroll, useCalendarEventDragBodyStyle } from "./calendarEventDrag.shared";
import type { CalendarEventDragPointerSnapshot } from "./calendarEventDrag.shared";
import * as COLOR from "./grid.color.constants.desktop";
import * as GRID from "./grid.layout.constants.desktop";
import { WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX, getWeekdayTimedEventFrame, getWeekdayTimedEventPositionStyle } from "./weekdayTimeGridGeometry";

export type CalendarWeekDayGridRef = { scrollToHour: (hour: number) => void };

type WeekdayEventsByDay = { allDayEvents: Map<string, GoogleCalendarEvent[]> };

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
  previewColumnDayKey: string | null;
};

type WeekdayDayColumnHit = { day: Date; element: HTMLDivElement };

type WeekdayEventDragPreview = {
  previewStartsAt: Date;
  previewEndsAt: Date;
  previewIsAllDay: boolean;
  previewAllDayIndex: number | null;
  previewColumnDayKey: string | null;
};

type WeekdayAllDayRenderItem = { event: GoogleCalendarEvent; eventKey: string; isDragPreview: boolean };

const WEEKDAY_HOURS = Array.from({ length: GRID.WEEKDAY_HOURS }, (_, hour) => hour);
const CURRENT_TIME_TICK_MS = GRID.WEEKDAY_CURRENT_TIME_UPDATE_INTERVAL_MS;
const NEXT_DAY_PREVIEW_MINUTES = 30;
const NEXT_DAY_PREVIEW_HOURS = NEXT_DAY_PREVIEW_MINUTES / GRID.WEEKDAY_MINUTES_PER_HOUR;
const WEEKDAY_TIMELINE_RANGE_HOURS = GRID.WEEKDAY_HOURS + NEXT_DAY_PREVIEW_HOURS;
const WEEKDAY_TIMELINE_RANGE_MINUTES = GRID.WEEKDAY_HOURS * GRID.WEEKDAY_MINUTES_PER_HOUR + NEXT_DAY_PREVIEW_MINUTES;
const WEEKDAY_HEADER_DATE_NUMBER_CLASS_NAME = "flex h-[25px] w-[25px] items-center justify-center rounded-full text-[16px] font-bold leading-none tracking-[-0.03em] tabular-nums transition-colors duration-150";
const WEEKDAY_HEADER_WEEKDAY_CLASS_NAME = "text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]";
const WEEKDAY_TIME_LABEL_CLASS_NAME = "text-[11px] font-medium tabular-nums text-[var(--calendar-time-label-color)]";
const WEEKDAY_ALL_DAY_EVENT_WRAPPER_CLASS_NAME = "shrink-0 transition-opacity duration-150 ease-out";
const WEEKDAY_COLUMN_BORDER_STYLE: CSSProperties = { borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB };
const WEEKDAY_BOTTOM_SPACER_STYLE: CSSProperties = { height: `calc(${NEXT_DAY_PREVIEW_HOURS} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))` };
const WEEKDAY_BOTTOM_TIME_SPACER_CLASS_NAME = "relative";
const WEEKDAY_BOTTOM_PREVIEW_SPACER_CLASS_NAME = "relative overflow-hidden";
const WEEKDAY_TIMED_EVENT_DRAG_SNAP_MINUTES = 15;
const WEEKDAY_TIMED_EVENT_DRAG_FALLBACK_MINUTES = 30;
const MINUTE_MS = 60 * 1000;

const getAllDayColumnStyle = (): CSSProperties => ({
  padding: eventChipDesign.weekdayGrid.allDayColumnInsetPx,
  ...WEEKDAY_COLUMN_BORDER_STYLE,
});

const getAllDayStackStyle = (): CSSProperties => ({
  gap: eventChipDesign.weekdayGrid.allDayEventGapPx,
});

const isUnshiftedHourLabel = (hour: number): boolean => hour === 0;

const isSameCalendarDate = (left: Date, right: Date): boolean => getCalendarDateKey(left) === getCalendarDateKey(right);

const shouldSuppressEntryMinHeight = (entry: CalendarTimeGridLayoutEntry): boolean => entry.endsAfterRange;

const formatHourLabel = (hour: number): string => GRID.WEEKDAY_HOUR_LABEL_MODE === "integer" ? String(hour) : `${String(hour).padStart(2, "0")}:00`;

const getCurrentTimeTopStyle = (now: Date): CSSProperties => ({
  top: `calc(${(now.getHours() * GRID.WEEKDAY_MINUTES_PER_HOUR + now.getMinutes()) / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
});

const getCurrentTimeGridLineStyle = (now: Date): CSSProperties => ({
  ...getCurrentTimeTopStyle(now),
  left: `${C.TIME_COLUMN_WIDTH}px`,
  right: 0,
});

const getCurrentTimeTodayLineStyle = (todayIndex: number, dayCount: number): CSSProperties => ({
  left: `calc((100% / ${dayCount}) * ${todayIndex})`,
  width: `calc(100% / ${dayCount})`,
});

const getHourLabelClassName = (hour: number): string => cn("absolute right-2 top-0 z-10 bg-white px-1", isUnshiftedHourLabel(hour) ? null : "-translate-y-1/2", WEEKDAY_TIME_LABEL_CLASS_NAME);

const getHeaderDateNumberClassName = (isSelected: boolean, isToday: boolean): string => cn(WEEKDAY_HEADER_DATE_NUMBER_CLASS_NAME, isSelected ? "border-0 bg-[var(--ds-color-tag-sky-bg)] text-[var(--ds-color-tag-sky-fg)] shadow-none ring-0" : isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]");

const getViewportGridTemplateColumns = (dayCount: number): string => `${C.TIME_COLUMN_WIDTH}px repeat(${dayCount}, minmax(0, 1fr))`;

const doEntriesOverlapHorizontally = (entry: CalendarTimeGridLayoutEntry, nextEntry: CalendarTimeGridLayoutEntry): boolean => {
  const entryLeft = entry.style.xOffset;
  const entryRight = entry.style.xOffset + entry.style.width;
  const nextEntryLeft = nextEntry.style.xOffset;
  const nextEntryRight = nextEntry.style.xOffset + nextEntry.style.width;

  return entryLeft < nextEntryRight && nextEntryLeft < entryRight;
};

const getTimedEntryMaxMinHeightHours = (entry: CalendarTimeGridLayoutEntry, entries: readonly CalendarTimeGridLayoutEntry[], rangeHours: number): number | undefined => {
  const frame = getWeekdayTimedEventFrame(entry, rangeHours);
  const nextEntry = entries
    .filter((candidate) => candidate !== entry && doEntriesOverlapHorizontally(entry, candidate))
    .map((candidate) => getWeekdayTimedEventFrame(candidate, rangeHours))
    .filter((candidateFrame) => candidateFrame.topHours > frame.topHours)
    .sort((a, b) => a.topHours - b.topHours)[0];

  return nextEntry ? Math.max(0, nextEntry.topHours - frame.topHours) : undefined;
};

const getTimedEntryPositionStyle = (entry: CalendarTimeGridLayoutEntry, entries: readonly CalendarTimeGridLayoutEntry[], rangeHours: number): CSSProperties => getWeekdayTimedEventPositionStyle(entry, rangeHours, { maxMinHeightHours: getTimedEntryMaxMinHeightHours(entry, entries, rangeHours), suppressMinHeight: shouldSuppressEntryMinHeight(entry) });

const getAllDayEventWrapperClassName = (isDraggable: boolean, isDragging: boolean, isPreview = false): string => cn(WEEKDAY_ALL_DAY_EVENT_WRAPPER_CLASS_NAME, isDraggable ? "touch-none cursor-grab select-none active:cursor-grabbing" : null, isDragging ? "opacity-35" : null, isPreview ? "pointer-events-none transition-none" : null);

const getTimedEventWrapperClassName = (isDraggable: boolean, isDragging: boolean): string => cn("absolute z-10 min-w-0 transition-opacity duration-150 ease-out", isDraggable ? "touch-none cursor-grab select-none active:cursor-grabbing" : null, isDragging ? "opacity-35" : null);

const getEventDurationMs = (event: GoogleCalendarEvent): number => {
  const startsAt = getCalendarEventDateOrNull(event.startsAt);
  const endsAt = getCalendarEventDateOrNull(event.endsAt);
  const durationMs = startsAt && endsAt ? endsAt.getTime() - startsAt.getTime() : 0;

  return durationMs > 0 ? durationMs : WEEKDAY_TIMED_EVENT_DRAG_FALLBACK_MINUTES * MINUTE_MS;
};

const getEventTimedDragDurationMs = (event: GoogleCalendarEvent): number => event.isAllDay ? WEEKDAY_TIMED_EVENT_DRAG_FALLBACK_MINUTES * MINUTE_MS : getEventDurationMs(event);

const getEventInRange = (event: GoogleCalendarEvent, rangeStart: Date, rangeEnd: Date): GoogleCalendarEvent | null => {
  const startsAt = getCalendarEventDateOrNull(event.startsAt);
  const endsAt = getCalendarEventDateOrNull(event.endsAt);

  if (!startsAt || !endsAt) return null;

  const startTime = startsAt.getTime();
  const endTime = endsAt.getTime();
  const rangeStartTime = rangeStart.getTime();
  const rangeEndTime = rangeEnd.getTime();

  if (endTime <= rangeStartTime || startTime >= rangeEndTime) return null;

  if (startTime >= rangeStartTime && endTime <= rangeEndTime) return event;

  return {
    ...event,
    startsAt: new Date(Math.max(startTime, rangeStartTime)),
    endsAt: new Date(Math.min(endTime, rangeEndTime)),
  };
};

const getMinimumVisibleHeightPercent = (hourRowHeightPx: number, rangeHours: number): number => {
  if (hourRowHeightPx <= 0 || rangeHours <= 0) return 0;

  return (WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX / (hourRowHeightPx * rangeHours)) * 100;
};

const createTimedLayoutEvents = (events: GoogleCalendarEvent[], day: Date, minimumVisibleHeightPercent: number): CalendarTimeGridLayoutEntry[] => {
  const dayStart = startOfDay(day);
  const dayEnd = addMinutes(dayStart, WEEKDAY_TIMELINE_RANGE_MINUTES);
  const timedEvents = events
    .filter((event) => !event.isAllDay)
    .map((event) => getEventInRange(event, dayStart, dayEnd))
    .filter((event): event is GoogleCalendarEvent => Boolean(event));

  return layoutCalendarTimeGridEvents(timedEvents, { minimumVisibleHeightPercent, rangeEnd: dayEnd, rangeStart: dayStart });
};

const groupEventsByDay = (events: GoogleCalendarEvent[], days: Date[]): WeekdayEventsByDay => {
  const allDayEvents = new Map<string, GoogleCalendarEvent[]>();

  days.forEach((day) => allDayEvents.set(getCalendarDateKey(day), []));

  events.forEach((event) => {
    if (!event.isAllDay) return;

    getEventDateKeys(event).forEach((dayKey) => {
      const dayEvents = allDayEvents.get(dayKey);
      if (!dayEvents) return;

      dayEvents.push(event);
    });
  });

  allDayEvents.forEach((dayEvents) => dayEvents.sort(compareCalendarEvents));

  return { allDayEvents };
};

const areSameEventKeyOrder = (left: readonly string[], right: readonly string[]): boolean => {
  if (left.length !== right.length) return false;

  return left.every((eventKey, index) => eventKey === right[index]);
};

const getOrderedAllDayEvents = (events: GoogleCalendarEvent[], dayKey: string, orderMap: CalendarAllDayEventOrderMap | undefined): GoogleCalendarEvent[] => {
  if (!orderMap) return events;

  const orderedEventKeys = orderMap[dayKey];
  if (!orderedEventKeys?.length) return events;

  const eventIndexByKey = new Map(events.map((event) => [createCalendarEventKey(event), event]));
  const seenKeys = new Set<string>();
  const orderedEvents: GoogleCalendarEvent[] = [];

  orderedEventKeys.forEach((eventKey) => {
    const event = eventIndexByKey.get(eventKey);
    if (!event) return;

    orderedEvents.push(event);
    seenKeys.add(eventKey);
  });

  events.forEach((event) => {
    if (seenKeys.has(createCalendarEventKey(event))) return;

    orderedEvents.push(event);
  });

  return orderedEvents;
};

const getAllDayDropIndex = (column: HTMLDivElement, clientY: number): number => {
  const eventItems = Array.from(column.querySelectorAll<HTMLElement>('[data-calendar-all-day-event-item="true"]'));
  if (eventItems.length === 0) return 0;

  const targetIndex = eventItems.findIndex((element) => clientY < element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2);

  return targetIndex === -1 ? eventItems.length : targetIndex;
};

const snapMinutes = (minutes: number): number => Math.round(minutes / WEEKDAY_TIMED_EVENT_DRAG_SNAP_MINUTES) * WEEKDAY_TIMED_EVENT_DRAG_SNAP_MINUTES;

const clampMinutes = (minutes: number, maxMinutes: number): number => Math.max(0, Math.min(minutes, maxMinutes));

const getHourRowHeightPx = (element: HTMLElement): number => {
  const raw = window.getComputedStyle(element).getPropertyValue(GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT).trim();
  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : GRID.WEEKDAY_HOUR_ROW_HEIGHT;
};

const getCalendarGridHourRowHeightPx = (calendarGridStyle: CalendarGridStyle): number => {
  const value = calendarGridStyle[GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT];
  if (typeof value === "number") return value;

  const parsed = Number.parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : GRID.WEEKDAY_HOUR_ROW_HEIGHT;
};

const useCurrentTime = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), CURRENT_TIME_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  return now;
};

const CalendarWeekDayGridComponent = ({ headerScrollRef, allDayScrollRef, scrollContainerRef, visibleDays, visibleEvents, calendarGridStyle, allDayEventOrder, onScroll, selectedDate, onSelectDate, onMoveCalendarEvent, onReorderAllDayEvents }: CalendarWeekDayGridProps) => {
  const now = useCurrentTime();
  const allDayColumnRefs = useRef(new Map<string, HTMLDivElement>());
  const dayColumnRefs = useRef(new Map<string, HTMLDivElement>());
  const dragElementRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<WeekdayEventDragState | null>(null);
  const [dragState, setDragState] = useState<WeekdayEventDragState | null>(null);
  const { allDayEvents } = useMemo(() => groupEventsByDay(visibleEvents, visibleDays), [visibleEvents, visibleDays]);
  const dragPreviewEvent = useMemo(() => dragState ? createCalendarEventDragPreview(dragState.event, dragState.previewStartsAt, dragState.previewEndsAt, dragState.previewIsAllDay) : null, [dragState]);
  const dragPreviewDayKey = dragState ? getDragPreviewDayKey(dragState) : null;
  const gridTemplateColumns = getViewportGridTemplateColumns(visibleDays.length);
  const timelineGridStyle = { [GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT]: calendarGridStyle[GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT], gridTemplateColumns } as CSSProperties;
  const minimumVisibleHeightPercent = getMinimumVisibleHeightPercent(getCalendarGridHourRowHeightPx(calendarGridStyle), WEEKDAY_TIMELINE_RANGE_HOURS);
  const currentDayKey = getCalendarDateKey(now);
  const currentDayIndex = visibleDays.findIndex((day) => getCalendarDateKey(day) === currentDayKey);
  const shouldRenderCurrentTime = currentDayIndex !== -1;

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

    return { previewStartsAt, previewEndsAt, previewIsAllDay: true, previewAllDayIndex, previewColumnDayKey: null };
  }, [allDayScrollRef, getAllDayColumnAtClientX]);

  const getTimedDragPreview = useCallback((state: WeekdayEventDragState, clientX: number, clientY: number): WeekdayEventDragPreview | null => {
    const hit = getDayColumnAtClientX(clientX);
    if (!hit) return null;

    const rect = hit.element.getBoundingClientRect();
    const rowHeight = getHourRowHeightPx(hit.element);
    const rawStartMinutes = ((clientY - rect.top) / rowHeight) * GRID.WEEKDAY_MINUTES_PER_HOUR - state.pointerOffsetMinutes;
    const maxStartMinutes = Math.max(0, WEEKDAY_TIMELINE_RANGE_MINUTES - WEEKDAY_TIMED_EVENT_DRAG_SNAP_MINUTES);
    const startMinutes = clampMinutes(snapMinutes(rawStartMinutes), maxStartMinutes);
    const previewStartsAt = addMinutes(startOfDay(hit.day), startMinutes);
    const previewEndsAt = new Date(previewStartsAt.getTime() + state.durationMs);
    const previewColumnDayKey = getCalendarDateKey(hit.day);

    return { previewStartsAt, previewEndsAt, previewIsAllDay: false, previewAllDayIndex: null, previewColumnDayKey };
  }, [getDayColumnAtClientX]);

  const getDragPreviewTimes = useCallback((state: WeekdayEventDragState, clientX: number, clientY: number) => getAllDayDragPreview(clientX, clientY) ?? getTimedDragPreview(state, clientX, clientY), [getAllDayDragPreview, getTimedDragPreview]);

  const updateDragPreviewFromSnapshot = useCallback((snapshot: CalendarEventDragPointerSnapshot) => {
    const state = dragStateRef.current;
    if (!state || snapshot.pointerId !== state.pointerId) return;

    const preview = getDragPreviewTimes(state, snapshot.clientX, snapshot.clientY);
    if (!preview) return;

    if (state.previewIsAllDay === preview.previewIsAllDay && state.previewAllDayIndex === preview.previewAllDayIndex && state.previewColumnDayKey === preview.previewColumnDayKey && areSameCalendarEventTimes(state.previewStartsAt, state.previewEndsAt, preview.previewStartsAt, preview.previewEndsAt)) return;

    setDragStateValue({ ...state, ...preview });
  }, [getDragPreviewTimes, setDragStateValue]);

  const { stopDragAutoScroll, updateDragAutoScroll } = useCalendarEventDragAutoScroll<HTMLDivElement>({ scrollContainerRef, onScroll: updateDragPreviewFromSnapshot });

  const updateDragPreview = useCallback((event: PointerEvent) => {
    const state = dragStateRef.current;
    if (!state || event.pointerId !== state.pointerId) return;

    const snapshot = createCalendarEventDragPointerSnapshot(event.pointerId, event.buttons, event.clientX, event.clientY);
    updateDragAutoScroll(snapshot, !state.previewIsAllDay);
    updateDragPreviewFromSnapshot(snapshot);
    event.preventDefault();
  }, [updateDragAutoScroll, updateDragPreviewFromSnapshot]);

  const commitAllDayOrder = useCallback((state: WeekdayEventDragState) => {
    if (!state.previewIsAllDay || state.previewAllDayIndex === null) return;

    const targetDayKey = getCalendarDateKey(state.previewStartsAt);
    const targetEvents = getOrderedAllDayEvents(allDayEvents.get(targetDayKey) ?? [], targetDayKey, allDayEventOrder);
    const currentEventKeys = targetEvents.map(createCalendarEventKey);
    const orderedEventKeys = insertEventKeyAtIndex(currentEventKeys, state.eventKey, state.previewAllDayIndex);

    if (targetDayKey === state.sourceDayKey && areSameEventKeyOrder(currentEventKeys, orderedEventKeys)) return;

    onReorderAllDayEvents?.({ eventKey: state.eventKey, sourceDayKey: state.sourceDayKey, targetDayKey, orderedEventKeys });
  }, [allDayEventOrder, allDayEvents, onReorderAllDayEvents]);

  const commitDragState = useCallback((state: WeekdayEventDragState) => {
    commitAllDayOrder(state);

    if (isSameCalendarEventMove(state.event, state.previewStartsAt, state.previewEndsAt, state.previewIsAllDay)) return;

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
    stopDragAutoScroll();
    setDragStateValue(null);

    if (shouldCommit) commitDragState(state);
  }, [commitDragState, setDragStateValue, stopDragAutoScroll]);

  const startEventDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent, pointerOffsetMinutes: number, durationMs: number, sourceColumnDayKey: string | null) => {
    if (event.button !== 0 || !isCalendarEventDraggable(calendarEvent, onMoveCalendarEvent)) return;

    const eventKey = createCalendarEventKey(calendarEvent);
    const sourceDayKey = getCalendarDateKey(calendarEvent.startsAt);
    const preview = getDragPreviewTimes({ eventKey, event: calendarEvent, pointerId: event.pointerId, pointerOffsetMinutes, durationMs, sourceDayKey, previewStartsAt: calendarEvent.startsAt, previewEndsAt: calendarEvent.endsAt, previewIsAllDay: calendarEvent.isAllDay, previewAllDayIndex: null, previewColumnDayKey: sourceColumnDayKey }, event.clientX, event.clientY);

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragElementRef.current = event.currentTarget;

    setDragStateValue({ eventKey, event: calendarEvent, pointerId: event.pointerId, pointerOffsetMinutes, durationMs, sourceDayKey, previewStartsAt: preview?.previewStartsAt ?? calendarEvent.startsAt, previewEndsAt: preview?.previewEndsAt ?? calendarEvent.endsAt, previewIsAllDay: preview?.previewIsAllDay ?? calendarEvent.isAllDay, previewAllDayIndex: preview?.previewAllDayIndex ?? null, previewColumnDayKey: preview?.previewColumnDayKey ?? sourceColumnDayKey });
  }, [getDragPreviewTimes, onMoveCalendarEvent, setDragStateValue]);

  const handleAllDayEventPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent) => {
    startEventDrag(event, calendarEvent, 0, getEventTimedDragDurationMs(calendarEvent), null);
  }, [startEventDrag]);

  const handleTimedEventPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>, calendarEvent: GoogleCalendarEvent, day: Date) => {
    const dayKey = getCalendarDateKey(day);
    const dayColumn = dayColumnRefs.current.get(dayKey);
    if (!dayColumn) return;

    const rowHeight = getHourRowHeightPx(dayColumn);
    const eventRect = event.currentTarget.getBoundingClientRect();
    const pointerOffsetMinutes = Math.max(0, ((event.clientY - eventRect.top) / rowHeight) * GRID.WEEKDAY_MINUTES_PER_HOUR);

    startEventDrag(event, calendarEvent, pointerOffsetMinutes, getEventTimedDragDurationMs(calendarEvent), dayKey);
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
      stopDragAutoScroll();
    };
  }, [finishDrag, stopDragAutoScroll, updateDragPreview]);

  useCalendarEventDragBodyStyle(Boolean(dragState));

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

      <div ref={allDayScrollRef} className="relative z-20 shrink-0 overflow-hidden border-b bg-white" style={WEEKDAY_COLUMN_BORDER_STYLE}>
        <div className="grid min-w-0" style={{ gridTemplateColumns }}>
          <div className={cn("flex min-h-10 min-w-0 items-start justify-end py-2 pl-2 pr-3", WEEKDAY_TIME_LABEL_CLASS_NAME)}>終日</div>
          {visibleDays.map((day, dayIndex) => {
            const dayKey = getCalendarDateKey(day);
            const events = createAllDayRenderItems(allDayEvents.get(dayKey) ?? [], dayKey, allDayEventOrder, dragState, dragPreviewEvent, dragPreviewDayKey);

            return (
              <div key={dayKey} ref={setAllDayColumnRef(dayKey)} className={cn("min-h-10 min-w-0", dayIndex === 0 ? null : "border-l")} style={getAllDayColumnStyle()}>
                <div className="flex min-w-0 flex-col" style={getAllDayStackStyle()}>
                  {events.map(({ event, eventKey, isDragPreview }) => {
                    const isDragging = dragState?.eventKey === eventKey;
                    const isDraggable = isCalendarEventDraggable(event, onMoveCalendarEvent);

                    return (
                      <div key={isDragPreview ? `${eventKey}:preview` : eventKey} data-calendar-all-day-event-item="true" className={getAllDayEventWrapperClassName(isDraggable, isDragging, isDragPreview)} style={isDragPreview ? CALENDAR_EVENT_DRAGGING_STYLE : undefined} onPointerDown={!isDragPreview && isDraggable ? (pointerEvent) => handleAllDayEventPointerDown(pointerEvent, event) : undefined}>
                        <CalendarEventChipMonth event={event} showTimeLabel={false} tooltipDisabled={isDragPreview || isDragging} />
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
        <div className="relative grid min-w-0" style={timelineGridStyle}>
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
            const events = createTimedLayoutEvents(visibleEvents, day, minimumVisibleHeightPercent);
            const shouldRenderDragPreview = dragState && dragPreviewEvent && !dragState.previewIsAllDay && dragState.previewColumnDayKey === dayKey;

            return (
              <div key={dayKey} ref={setDayColumnRef(dayKey)} className={cn("relative min-w-0 bg-white", dayIndex === 0 ? null : "border-l")} style={WEEKDAY_COLUMN_BORDER_STYLE}>
                {WEEKDAY_HOURS.map((hour) => (
                  <div key={hour} className="border-b" style={{ height: `var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT})`, borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }} />
                ))}
                <div className={WEEKDAY_BOTTOM_PREVIEW_SPACER_CLASS_NAME} data-testid="weekday-preview-bottom-spacer" style={WEEKDAY_BOTTOM_SPACER_STYLE} />

                {events.map((entry) => {
                  const eventKey = createCalendarEventKey(entry.event);
                  const isDragging = dragState?.eventKey === eventKey;
                  const isDraggable = isCalendarEventDraggable(entry.event, onMoveCalendarEvent);

                  return (
                    <div key={eventKey} className={getTimedEventWrapperClassName(isDraggable, isDragging)} style={getTimedEntryPositionStyle(entry, events, WEEKDAY_TIMELINE_RANGE_HOURS)} onPointerDown={isDraggable ? (event) => handleTimedEventPointerDown(event, entry.event, day) : undefined}>
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

          {shouldRenderCurrentTime ? (
            <div className="pointer-events-none absolute z-20" style={getCurrentTimeGridLineStyle(now)}>
              <div className="h-px" style={{ backgroundImage: "repeating-linear-gradient(to right, rgb(59 130 246 / 0.45) 0 7px, transparent 7px 16px)" }} />
              <div className="absolute top-0 h-px bg-blue-500" style={getCurrentTimeTodayLineStyle(currentDayIndex, visibleDays.length)} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const CalendarWeekDayGrid = memo(CalendarWeekDayGridComponent);

CalendarWeekDayGrid.displayName = "CalendarWeekDayGrid";

export { CalendarWeekDayGrid };
