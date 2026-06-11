import { useEffect, useMemo, useState } from "react";
import type { GoogleCalendarEvent } from "./gcalSync.types";
import { useMultiAccountGoogleCalendar } from "./useMultiAccountGoogleCalendar";



type CachedGoogleCalendarEvent = Omit<GoogleCalendarEvent, "startsAt" | "endsAt"> & {
  startsAt: string;
  endsAt: string;
};



const GOOGLE_CALENDAR_EVENTS_CACHE_KEY = "flashcard-master.gcal.events";



const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const parseCachedDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const deserializeCachedEvent = (value: unknown): GoogleCalendarEvent | null => {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : null;
  const calendarId = typeof value.calendarId === "string" ? value.calendarId : null;
  const accentColor = typeof value.accentColor === "string" ? value.accentColor : null;
  const title = typeof value.title === "string" ? value.title : null;
  const startsAt = parseCachedDate(value.startsAt);
  const endsAt = parseCachedDate(value.endsAt);

  if (!id || !calendarId || !accentColor || !title || !startsAt || !endsAt) return null;

  return {
    id,
    calendarId,
    accentColor,
    title,
    startsAt,
    endsAt,
    isAllDay: value.isAllDay === true,
    ...(typeof value.accountId === "string" ? { accountId: value.accountId } : {}),
    ...(typeof value.projectId === "string" ? { projectId: value.projectId } : {}),
  };
};
const serializeCachedEvent = (event: GoogleCalendarEvent): CachedGoogleCalendarEvent => ({
  ...event,
  startsAt: event.startsAt.toISOString(),
  endsAt: event.endsAt.toISOString(),
});
const readCachedGoogleCalendarEvents = (): GoogleCalendarEvent[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(GOOGLE_CALENDAR_EVENTS_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((value): GoogleCalendarEvent[] => {
      const event = deserializeCachedEvent(value);
      return event ? [event] : [];
    });
  } catch {
    return [];
  }
};
const writeCachedGoogleCalendarEvents = (events: GoogleCalendarEvent[]): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      GOOGLE_CALENDAR_EVENTS_CACHE_KEY,
      JSON.stringify(events.map(serializeCachedEvent)),
    );
  } catch {
    // キャッシュ書き込みに失敗しても、同期済み state の表示は維持する。
  }
};
const filterEventsBySelectedCalendarIds = (
  events: GoogleCalendarEvent[],
  selectedCalendarIds: Set<string>,
): GoogleCalendarEvent[] => {
  if (selectedCalendarIds.size === 0) return [];

  return events.filter((event) => selectedCalendarIds.has(event.calendarId));
};
const mergeGoogleCalendarEvents = (
  cachedEvents: GoogleCalendarEvent[],
  liveEvents: GoogleCalendarEvent[],
): GoogleCalendarEvent[] => {
  if (cachedEvents.length === 0) return liveEvents;
  if (liveEvents.length === 0) return cachedEvents;

  const merged = new Map<string, GoogleCalendarEvent>();

  for (const event of cachedEvents) {
    merged.set(event.id, event);
  }

  for (const event of liveEvents) {
    merged.set(event.id, event);
  }

  return Array.from(merged.values());
};
const usePersistentMultiAccountGoogleCalendar = () => {
  const google = useMultiAccountGoogleCalendar();
  const [cachedEvents, setCachedEvents] = useState<GoogleCalendarEvent[]>(readCachedGoogleCalendarEvents);

  const hasCompletedSync = useMemo(
    () => google.accounts.some((account) => account.lastSyncedAt !== null),
    [google.accounts],
  );

  const selectedCachedEvents = useMemo(
    () => filterEventsBySelectedCalendarIds(cachedEvents, google.selectedCalendarIds),
    [cachedEvents, google.selectedCalendarIds],
  );

  const events = useMemo(
    () => mergeGoogleCalendarEvents(selectedCachedEvents, google.events),
    [google.events, selectedCachedEvents],
  );

  useEffect(() => {
    if (google.accounts.length === 0) {
      setCachedEvents([]);
      writeCachedGoogleCalendarEvents([]);
      return;
    }

    if (!hasCompletedSync) return;

    setCachedEvents(google.events);
    writeCachedGoogleCalendarEvents(google.events);
  }, [google.accounts.length, google.events, hasCompletedSync]);

  return {
    ...google,
    events,
  };
};



export { usePersistentMultiAccountGoogleCalendar };
