import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";
import type { CalendarEventMoveHandler } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type CalendarEventDragAutoScrollDirection = "up" | "down";
type CalendarEventDragPointerSnapshot = {
  pointerId: number;
  buttons: number;
  clientX: number;
  clientY: number;
};
type CalendarEventDragAutoScrollOptions<TElement extends HTMLElement> = {
  scrollContainerRef?: RefObject<TElement | null>;
  onScroll: (snapshot: CalendarEventDragPointerSnapshot) => void;
};



const CALENDAR_EVENT_DRAGGING_STYLE: CSSProperties = { filter: "drop-shadow(0 14px 22px rgba(15, 23, 42, 0.22))", transform: "scale(1.015)", zIndex: 30 };
const CALENDAR_EVENT_DRAG_SCROLL_EDGE_PX = 88;
const CALENDAR_EVENT_DRAG_SCROLL_STEP_PX = 28;
const CALENDAR_EVENT_DRAG_SCROLL_INTERVAL_MS = 16;



const createCalendarEventKey = (event: GoogleCalendarEvent): string => `${event.accountId ?? ""}:${event.calendarId}:${event.id}`;
const createCalendarEventDragPointerSnapshot = (pointerId: number, buttons: number, clientX: number, clientY: number): CalendarEventDragPointerSnapshot => ({ pointerId, buttons, clientX, clientY });
const getCalendarEventDateOrNull = (value: Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
};
const isCalendarEventDraggable = (event: GoogleCalendarEvent, onMoveCalendarEvent?: CalendarEventMoveHandler): boolean => Boolean(onMoveCalendarEvent && event.accountId);
const areSameCalendarEventTimes = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean => leftStart.getTime() === rightStart.getTime() && leftEnd.getTime() === rightEnd.getTime();
const isSameCalendarEventMove = (event: GoogleCalendarEvent, previewStartsAt: Date, previewEndsAt: Date, previewIsAllDay: boolean): boolean => event.isAllDay === previewIsAllDay && areSameCalendarEventTimes(event.startsAt, event.endsAt, previewStartsAt, previewEndsAt);
const createCalendarEventDragPreview = (event: GoogleCalendarEvent, startsAt: Date, endsAt: Date, isAllDay: boolean): GoogleCalendarEvent => ({ ...event, startsAt, endsAt, isAllDay });
const getCalendarEventDragAutoScrollDirection = (element: HTMLElement, clientY: number): CalendarEventDragAutoScrollDirection | null => {
  const rect = element.getBoundingClientRect();
  const canScrollUp = element.scrollTop > 0;
  const canScrollDown = element.scrollTop + element.clientHeight < element.scrollHeight;

  if (canScrollUp && clientY <= rect.top + CALENDAR_EVENT_DRAG_SCROLL_EDGE_PX) return "up";
  if (canScrollDown && clientY >= rect.bottom - CALENDAR_EVENT_DRAG_SCROLL_EDGE_PX) return "down";

  return null;
};
const getCalendarEventDragAutoScrollDelta = (direction: CalendarEventDragAutoScrollDirection): number => direction === "up" ? -CALENDAR_EVENT_DRAG_SCROLL_STEP_PX : CALENDAR_EVENT_DRAG_SCROLL_STEP_PX;
const useCalendarEventDragBodyStyle = (isDragging: boolean) => {
  useEffect(() => {
    if (!isDragging || typeof document === "undefined") return undefined;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isDragging]);
};
const useCalendarEventDragAutoScroll = <TElement extends HTMLElement>({ scrollContainerRef, onScroll }: CalendarEventDragAutoScrollOptions<TElement>) => {
  const dragPointerSnapshotRef = useRef<CalendarEventDragPointerSnapshot | null>(null);
  const dragAutoScrollDirectionRef = useRef<CalendarEventDragAutoScrollDirection | null>(null);
  const dragAutoScrollIntervalRef = useRef<number | null>(null);

  const clearDragAutoScrollInterval = useCallback(() => {
    if (dragAutoScrollIntervalRef.current === null) return;

    window.clearInterval(dragAutoScrollIntervalRef.current);
    dragAutoScrollIntervalRef.current = null;
  }, []);

  const stopDragAutoScroll = useCallback(() => {
    dragPointerSnapshotRef.current = null;
    dragAutoScrollDirectionRef.current = null;
    clearDragAutoScrollInterval();
  }, [clearDragAutoScrollInterval]);

  const pauseDragAutoScroll = useCallback(() => {
    dragAutoScrollDirectionRef.current = null;
    clearDragAutoScrollInterval();
  }, [clearDragAutoScrollInterval]);

  const scrollDragPreviewOnce = useCallback((direction: CalendarEventDragAutoScrollDirection) => {
    const element = scrollContainerRef?.current;
    const snapshot = dragPointerSnapshotRef.current;
    if (!element || !snapshot) return;

    const previousScrollTop = element.scrollTop;
    element.scrollBy({ top: getCalendarEventDragAutoScrollDelta(direction) });

    if (element.scrollTop === previousScrollTop) {
      pauseDragAutoScroll();
      return;
    }

    onScroll(snapshot);
  }, [onScroll, pauseDragAutoScroll, scrollContainerRef]);

  const startDragAutoScroll = useCallback((direction: CalendarEventDragAutoScrollDirection) => {
    if (dragAutoScrollDirectionRef.current === direction && dragAutoScrollIntervalRef.current !== null) return;

    clearDragAutoScrollInterval();
    dragAutoScrollDirectionRef.current = direction;
    scrollDragPreviewOnce(direction);
    dragAutoScrollIntervalRef.current = window.setInterval(() => {
      const currentDirection = dragAutoScrollDirectionRef.current;
      if (!currentDirection || !dragPointerSnapshotRef.current) {
        clearDragAutoScrollInterval();
        return;
      }

      scrollDragPreviewOnce(currentDirection);
    }, CALENDAR_EVENT_DRAG_SCROLL_INTERVAL_MS);
  }, [clearDragAutoScrollInterval, scrollDragPreviewOnce]);

  const updateDragAutoScroll = useCallback((snapshot: CalendarEventDragPointerSnapshot, canAutoScroll: boolean) => {
    const element = scrollContainerRef?.current;
    if (!canAutoScroll || !element) {
      stopDragAutoScroll();
      return;
    }

    dragPointerSnapshotRef.current = snapshot;

    if (snapshot.buttons !== 1) {
      stopDragAutoScroll();
      return;
    }

    const direction = getCalendarEventDragAutoScrollDirection(element, snapshot.clientY);
    if (!direction) {
      pauseDragAutoScroll();
      return;
    }

    startDragAutoScroll(direction);
  }, [pauseDragAutoScroll, scrollContainerRef, startDragAutoScroll, stopDragAutoScroll]);

  useEffect(() => stopDragAutoScroll, [stopDragAutoScroll]);

  return { stopDragAutoScroll, updateDragAutoScroll };
};



export { CALENDAR_EVENT_DRAGGING_STYLE, areSameCalendarEventTimes, createCalendarEventDragPointerSnapshot, createCalendarEventDragPreview, createCalendarEventKey, getCalendarEventDateOrNull, isCalendarEventDraggable, isSameCalendarEventMove, useCalendarEventDragAutoScroll, useCalendarEventDragBodyStyle };


export type { CalendarEventDragPointerSnapshot };
