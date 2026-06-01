import type { CSSProperties } from "react";
import { useEffect } from "react";
import type { CalendarEventMoveHandler } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

const CALENDAR_EVENT_DRAGGING_STYLE: CSSProperties = { filter: "drop-shadow(0 14px 22px rgba(15, 23, 42, 0.22))", transform: "scale(1.015)", zIndex: 30 };

const createCalendarEventKey = (event: GoogleCalendarEvent): string => `${event.accountId ?? ""}:${event.calendarId}:${event.id}`;

const getCalendarEventDateOrNull = (value: Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
};

const isCalendarEventDraggable = (event: GoogleCalendarEvent, onMoveCalendarEvent?: CalendarEventMoveHandler): boolean => Boolean(onMoveCalendarEvent && event.accountId);

const areSameCalendarEventTimes = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean => leftStart.getTime() === rightStart.getTime() && leftEnd.getTime() === rightEnd.getTime();

const isSameCalendarEventMove = (event: GoogleCalendarEvent, previewStartsAt: Date, previewEndsAt: Date, previewIsAllDay: boolean): boolean => event.isAllDay === previewIsAllDay && areSameCalendarEventTimes(event.startsAt, event.endsAt, previewStartsAt, previewEndsAt);

const createCalendarEventDragPreview = (event: GoogleCalendarEvent, startsAt: Date, endsAt: Date, isAllDay: boolean): GoogleCalendarEvent => ({ ...event, startsAt, endsAt, isAllDay });

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

export { CALENDAR_EVENT_DRAGGING_STYLE, areSameCalendarEventTimes, createCalendarEventDragPreview, createCalendarEventKey, getCalendarEventDateOrNull, isCalendarEventDraggable, isSameCalendarEventMove, useCalendarEventDragBodyStyle };
