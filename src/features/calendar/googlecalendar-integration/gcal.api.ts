import type {
  GoogleCalendarApiEventsResponse,
  GoogleCalendarApiListResponse,
  GoogleCalendarEvent,
  GoogleCalendarListItem,
  GoogleTaskListItem,
  GoogleTasksApiTaskListsResponse,
} from "./gcalSync.types";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";

const getJson = async <T>(accessToken: string, url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const error = new Error(`Google API failed (${res.status})`);

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
  const calendars: GoogleCalendarListItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      minAccessRole: "reader",
      showDeleted: "false",
      showHidden: "false",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const data = await getJson<GoogleCalendarApiListResponse>(
      accessToken,
      `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?${params}`,
    );

    calendars.push(
      ...(data.items ?? [])
        .filter((i) => i.id && i.summary)
        .map((i) => ({
          id: i.id!,
          summary: i.summary!,
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

export const fetchGoogleTaskLists = async (
  accessToken: string,
): Promise<GoogleTaskListItem[]> => {
  const taskLists: GoogleTaskListItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ maxResults: "100" });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const data = await getJson<GoogleTasksApiTaskListsResponse>(
      accessToken,
      `${GOOGLE_TASKS_API_BASE}/users/@me/lists?${params}`,
    );

    taskLists.push(
      ...(data.items ?? [])
        .filter((item) => item.id && item.title)
        .map((item) => ({
          id: item.id!,
          title: item.title!,
          updated: item.updated,
        })),
    );

    pageToken = data.nextPageToken;
  } while (pageToken);

  return taskLists;
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

    const data = await getJson<GoogleCalendarApiEventsResponse>(
      accessToken,
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
        calendarId,
      )}/events?${params}`,
    );

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