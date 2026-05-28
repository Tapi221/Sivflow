import type { GoogleCalendarApiCalendarResponse, GoogleCalendarApiEventsResponse, GoogleCalendarApiListResponse, GoogleCalendarEvent, GoogleCalendarListItem } from "./gcalSync.types";
import { createGoogleApiError } from "@/integration/google-integration/googleApiRetry";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

const getJsonOnce = async <T>(accessToken: string, url: string, errorPrefix = "Google API failed"): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw await createGoogleApiError(res, errorPrefix);
  }

  return (await res.json()) as T;
};

const getJson = async <T>(accessToken: string, url: string): Promise<T> => getJsonOnce<T>(accessToken, url);

const postJson = async <T>(accessToken: string, url: string, body: unknown, errorPrefix = "Google API failed"): Promise<T> => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await createGoogleApiError(res, errorPrefix);
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

const toGoogleCalendarListItem = (calendar: GoogleCalendarApiCalendarResponse): GoogleCalendarListItem => ({
  id: calendar.id!,
  summary: calendar.summary!,
  description: calendar.description,
  backgroundColor: "#4f7cff",
  selected: true,
});

export const fetchCalendarList = async (accessToken: string): Promise<GoogleCalendarListItem[]> => {
  const calendars: GoogleCalendarListItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      minAccessRole: "reader",
      showDeleted: "false",
      showHidden: "true",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const data = await getJson<GoogleCalendarApiListResponse>(accessToken, `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?${params}`);

    calendars.push(
      ...(data.items ?? [])
        .filter((i) => i.id && i.summary)
        .map((i) => ({
          id: i.id!,
          summary: i.summary!,
          summaryOverride: i.summaryOverride,
          description: i.description,
          backgroundColor: i.backgroundColor ?? "#4f7cff",
          foregroundColor: i.foregroundColor,
          primary: i.primary ?? false,
          selected: i.selected ?? true,
        })),
    );

    pageToken = data.nextPageToken;
  } while (pageToken);

  return calendars;
};

export const createGoogleCalendar = async ({ accessToken, summary, description }: { accessToken: string; summary: string; description?: string }): Promise<GoogleCalendarListItem> => {
  const trimmedSummary = summary.trim();
  if (!trimmedSummary) throw new Error("Google Calendar name is required");

  const calendar = await postJson<GoogleCalendarApiCalendarResponse>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}/calendars`,
    {
      summary: trimmedSummary,
      ...(description ? { description } : {}),
    },
    "Google Calendar creation failed",
  );

  if (!calendar.id || !calendar.summary) {
    throw new Error("Google Calendar creation response was invalid");
  }

  return toGoogleCalendarListItem(calendar);
};

export const fetchEventsForCalendar = async ({
  accessToken,
  accountId,
  calendarId,
  accentColor,
  rangeStart,
  rangeEnd,
}: {
  accessToken: string;
  accountId?: string;
  calendarId: string;
  accentColor: string;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<GoogleCalendarEvent[]> => {
  const rawEvents: NonNullable<GoogleCalendarApiEventsResponse["items"]> = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: rangeStart.toISOString(),
      timeMax: rangeEnd.toISOString(),
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const data = await getJson<GoogleCalendarApiEventsResponse>(accessToken, `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`);

    rawEvents.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return rawEvents
    .map((event) => {
      if (!event.id) return null;
      if (event.status === "cancelled") return null;

      const startsAt = parseEventDate(event.start);
      const endsAt = parseEventDate(event.end);

      if (!startsAt || !endsAt) return null;

      return {
        id: accountId ? `${accountId}:${calendarId}:${event.id}` : `${calendarId}:${event.id}`,
        accountId,
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
