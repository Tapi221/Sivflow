import { useEffect, useRef, useState } from "react";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type CalendarEventsSnapshot = {
  scopeKey: string;
  events: GoogleCalendarEvent[];
};



const TRANSIENT_EMPTY_CALENDAR_EVENTS_HOLD_MS = 350;



const createCalendarEventsScopeKey = (rangeStart: Date, rangeEnd: Date): string => `${rangeStart.toISOString()}|${rangeEnd.toISOString()}`;
const useTransientEmptyCalendarEvents = (events: GoogleCalendarEvent[], scopeKey: string, holdMs = TRANSIENT_EMPTY_CALENDAR_EVENTS_HOLD_MS): GoogleCalendarEvent[] => {
  const lastNonEmptySnapshotRef = useRef<CalendarEventsSnapshot | null>(null);
  const expiredEmptyScopeKeyRef = useRef<string | null>(null);
  const [, forceRender] = useState(0);

  if (events.length > 0) {
    lastNonEmptySnapshotRef.current = { scopeKey, events };

    if (expiredEmptyScopeKeyRef.current === scopeKey) {
      expiredEmptyScopeKeyRef.current = null;
    }
  }

  const snapshot = lastNonEmptySnapshotRef.current;
  const canHoldPreviousEvents =
    events.length === 0 &&
    snapshot?.scopeKey === scopeKey &&
    expiredEmptyScopeKeyRef.current !== scopeKey;

  useEffect(() => {
    if (!canHoldPreviousEvents) return undefined;

    const timeoutId = window.setTimeout(() => {
      expiredEmptyScopeKeyRef.current = scopeKey;
      forceRender((value) => value + 1);
    }, holdMs);

    return () => window.clearTimeout(timeoutId);
  }, [canHoldPreviousEvents, holdMs, scopeKey]);

  return canHoldPreviousEvents ? snapshot.events : events;
};



export { TRANSIENT_EMPTY_CALENDAR_EVENTS_HOLD_MS, createCalendarEventsScopeKey, useTransientEmptyCalendarEvents };
