import type {
  GoogleCalendarApiEventsResponse,
  GoogleCalendarApiListResponse,
  GoogleCalendarEvent,
  GoogleCalendarListItem,
} from "./gcalSync.types";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

const getJson = async <T>(accessToken: string, url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const error = new Error(`Google Calendar API failed (${res.status})`);

    (error as Error & { status: number }).status = res.status;

    throw error;
  }

  return (await res.json()) as T;
};

const parseGoogleDate = (raw: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);

  if (!match) return new Date(raw);

  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

const parseEventDate = (value?: {
  date?: string;
  dateTime?: string;
}): Date | null => {
  const raw = value?.dateTime ?? value?.date;
  if (!raw) return null;

  const date = parseGoogleDate(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

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
      description: i.description,
      backgroundColor: i.backgroundColor ?? "#4f7cff",
      foregroundColor: i.foregroundColor,
      primary: i.primary ?? false,
      selected: i.selected ?? true,
    }));
};

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
      if (event.status === "cancelled") return null;

      const startsAt = parseEventDate(event.start);
      const endsAt = parseEventDate(event.end);

      if (!startsAt || !endsAt) return null;

      return {
        id: `${calendarId}:${event.id}`,
        calendarId,
        accentColor,
        title: event.summary || "(No title)",
        description: event.description,
        location: event.location,
        startsAt,
        endsAt,
        isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
      } satisfies GoogleCalendarEvent;
    })
    .filter(Boolean) as GoogleCalendarEvent[];
};