import type {
  GoogleCalendarApiEventsResponse,
  GoogleCalendarApiListResponse,
  GoogleCalendarEvent,
  GoogleCalendarListItem,
} from "./gcalSync.types";

// ─────────────────────────────────────
// constants
// ─────────────────────────────────────

const GOOGLE_CALENDAR_API_BASE =
  "https://www.googleapis.com/calendar/v3";

// ─────────────────────────────────────
// core fetch
// ─────────────────────────────────────

const getJson = async <T>(
  accessToken: string,
  url: string,
): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Google Calendar API failed (${res.status})`);
  }

  return (await res.json()) as T;
};

// ─────────────────────────────────────
// date parsing
// ─────────────────────────────────────

const parseGoogleDate = (raw: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);

  if (!match) return new Date(raw);

  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

const parseEventStart = (
  start?: { date?: string; dateTime?: string },
): Date | null => {
  const raw = start?.dateTime ?? start?.date;
  if (!raw) return null;

  const date = parseGoogleDate(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseEventMinutes = (
  start: Date,
  end?: { date?: string; dateTime?: string },
): number => {
  if (end?.date && !end.dateTime) return 60;

  const raw = end?.dateTime ?? end?.date;
  if (!raw) return 30;

  const endDate = parseGoogleDate(raw);
  if (Number.isNaN(endDate.getTime())) return 30;

  return Math.max(
    15,
    Math.round((endDate.getTime() - start.getTime()) / 60000),
  );
};

// ─────────────────────────────────────
// calendar list
// ─────────────────────────────────────

export const fetchCalendarList = async (
  accessToken: string,
): Promise<GoogleCalendarListItem[]> => {
  const params = new URLSearchParams({
    minAccessRole: "reader",
    showDeleted: "false",
    showHidden: "false",
  });

  const data = await getJson<GoogleCalendarApiListResponse>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?${params}`,
  );

  return (data.items ?? [])
    .filter((i) => i.id && i.summary)
    .map((i) => ({
      id: i.id!,
      summary: i.summary!,
      backgroundColor: i.backgroundColor ?? "#4f7cff",
      primary: i.primary ?? false,
      selected: i.selected ?? true,
    }));
};

// ─────────────────────────────────────
// events
// ─────────────────────────────────────

export const fetchEventsForCalendar = async ({
  accessToken,
  calendarId,
  accentColor,
  rangeStart,
  rangeEnd,
}: {
  accessToken: string;
  calendarId: string;
  accentColor: string;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<GoogleCalendarEvent[]> => {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
  });

  const data = await getJson<GoogleCalendarApiEventsResponse>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events?${params}`,
  );

  return (data.items ?? [])
    .map((event) => {
      if (!event.id) return null;

      const startsAt = parseEventStart(event.start);
      if (!startsAt) return null;

      const isAllDay =
        Boolean(event.start?.date && !event.start?.dateTime);

      return {
        id: `${calendarId}:${event.id}`,
        calendarId,
        accentColor,
        title: event.summary || "(No title)",
        startsAt,
        minutes: parseEventMinutes(startsAt, event.end),
        isAllDay,
      } satisfies GoogleCalendarEvent;
    })
    .filter(Boolean) as GoogleCalendarEvent[];
};