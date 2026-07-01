import { createGoogleApiError } from "@/integration/google-integration/googleApiRetry";
import { parseGoogleRecurrenceRule, serializeGoogleRecurrenceRule } from "./gcalRecurrence";
import type { GCalRawIncrementalEvent, GCalWritableEventDeleteInput, GCalWritableEventInput, GCalWritableEventUpdateInput, GoogleCalendarApiCalendarResponse, GoogleCalendarApiEventsResponse, GoogleCalendarApiListResponse, GoogleCalendarEvent, GoogleCalendarListItem } from "./gcalSync.types";



const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const calendarListRequestByAccessToken = new Map<string, Promise<GoogleCalendarListItem[]>>();



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
const patchJson = async <T>(accessToken: string, url: string, body: unknown, errorPrefix = "Google API failed"): Promise<T> => {
  const res = await fetch(url, {
    method: "PATCH",
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
const deleteJson = async (accessToken: string, url: string, errorPrefix = "Google API failed"): Promise<void> => {
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok && res.status !== 410) {
    throw await createGoogleApiError(res, errorPrefix);
  }
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
const formatGoogleDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const buildCompositeEventId = (accountId: string | undefined, calendarId: string, eventId: string): string => accountId ? `${accountId}:${calendarId}:${eventId}` : `${calendarId}:${eventId}`;
const toGoogleCalendarListItem = (calendar: GoogleCalendarApiCalendarResponse): GoogleCalendarListItem => ({
  id: calendar.id!,
  summary: calendar.summary!,
  description: calendar.description,
  backgroundColor: "#4f7cff",
  selected: true,
});
const toGoogleCalendarEvent = ({ raw, accountId, calendarId, accentColor, projectId }: { raw: GCalRawIncrementalEvent; accountId?: string; calendarId: string; accentColor: string; projectId?: string; }): GoogleCalendarEvent | null => {
  if (!raw.id) return null;
  if (raw.status === "cancelled") return null;
  const startsAt = parseEventDate(raw.start);
  const endsAt = parseEventDate(raw.end);
  if (!startsAt || !endsAt) return null;
  return {
    id: buildCompositeEventId(accountId, calendarId, raw.id),
    externalId: raw.id,
    accountId,
    calendarId,
    ...(projectId ? { projectId } : {}),
    accentColor,
    title: raw.summary ?? "(No title)",
    description: raw.description,
    location: raw.location,
    startsAt,
    endsAt,
    isAllDay: Boolean(raw.start?.date && !raw.start?.dateTime),
    recurrenceRule: parseGoogleRecurrenceRule(raw.recurrence),
  };
};
const toGoogleEventPayload = (event: Partial<GCalWritableEventInput>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (event.title !== undefined) payload.summary = event.title.trim() ?? "(No title)";
  if (event.description !== undefined) payload.description = event.description;
  if (event.location !== undefined) payload.location = event.location;
  if (event.startsAt && event.isAllDay !== true) {
    payload.start = { dateTime: event.startsAt.toISOString() };
  } else if (event.startsAt) {
    payload.start = { date: formatGoogleDateOnly(event.startsAt) };
  }
  if (event.endsAt && event.isAllDay !== true) {
    payload.end = { dateTime: event.endsAt.toISOString() };
  } else if (event.endsAt) {
    payload.end = { date: formatGoogleDateOnly(event.endsAt) };
  }
  if ("recurrenceRule" in event) {
    const recurrenceRule = serializeGoogleRecurrenceRule(event.recurrenceRule);
    payload.recurrence = recurrenceRule ? [recurrenceRule] : [];
  }
  return payload;
};
const fetchCalendarListUncached = async (accessToken: string): Promise<GoogleCalendarListItem[]> => {
  console.info("[GoogleCalendarAPI] カレンダー一覧の取得を開始しました");
  try {
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
    console.info("[GoogleCalendarAPI] カレンダー一覧の取得が完了しました", {
      カレンダー数: calendars.length,
      カレンダーID一覧: calendars.map((calendar) => calendar.id),
      初期選択カレンダーID一覧: calendars.filter((calendar) => calendar.primary || calendar.selected).map((calendar) => calendar.id),
      メインカレンダーID一覧: calendars.filter((calendar) => calendar.primary).map((calendar) => calendar.id),
    });
    return calendars;
  } catch (error) {
    console.error("[GoogleCalendarAPI] カレンダー一覧の取得に失敗しました", error);
    throw error;
  }
};
const fetchCalendarList = async (accessToken: string): Promise<GoogleCalendarListItem[]> => {
  const existingRequest = calendarListRequestByAccessToken.get(accessToken);
  if (existingRequest) return existingRequest;
  const request = fetchCalendarListUncached(accessToken).finally(() => {
    if (calendarListRequestByAccessToken.get(accessToken) === request) {
      calendarListRequestByAccessToken.delete(accessToken);
    }
  });
  calendarListRequestByAccessToken.set(accessToken, request);
  return request;
};
const createGoogleCalendar = async ({ accessToken, summary, description }: { accessToken: string; summary: string; description?: string; }): Promise<GoogleCalendarListItem> => {
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
const fetchEventsForCalendar = async ({ accessToken, accountId, calendarId, accentColor, rangeStart, rangeEnd }: { accessToken: string;
  accountId?: string;
  calendarId: string;
  accentColor: string;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<GoogleCalendarEvent[]> => {
  console.info("[GoogleCalendarAPI] 予定の取得を開始しました", {
    アカウントID: accountId,
    カレンダーID: calendarId,
    取得終了日時: rangeEnd.toISOString(),
    取得開始日時: rangeStart.toISOString(),
  });
  try {
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
    const events = rawEvents
      .map((event) => toGoogleCalendarEvent({ raw: event, accountId, calendarId, accentColor }))
      .filter(Boolean) as GoogleCalendarEvent[];
    console.info("[GoogleCalendarAPI] 予定の取得が完了しました", {
      アカウントID: accountId,
      カレンダーID: calendarId,
      解析済み予定数: events.length,
      取得終了日時: rangeEnd.toISOString(),
      取得開始日時: rangeStart.toISOString(),
      取得元予定数: rawEvents.length,
    });
    return events;
  } catch (error) {
    console.error("[GoogleCalendarAPI] 予定の取得に失敗しました", {
      アカウントID: accountId,
      カレンダーID: calendarId,
      error,
      取得終了日時: rangeEnd.toISOString(),
      取得開始日時: rangeStart.toISOString(),
    });
    throw error;
  }
};
const createGoogleCalendarEvent = async ({ accessToken, accountId, accentColor, event }: { accessToken: string; accountId?: string; accentColor: string; event: GCalWritableEventInput; }): Promise<GoogleCalendarEvent> => {
  const raw = await postJson<GCalRawIncrementalEvent>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(event.calendarId)}/events`,
    toGoogleEventPayload(event),
    "Google Calendar event creation failed",
  );
  const created = toGoogleCalendarEvent({ raw, accountId, calendarId: event.calendarId, accentColor, projectId: event.projectId });
  if (!created) throw new Error("Google Calendar event creation response was invalid");
  return created;
};
const updateGoogleCalendarEvent = async ({ accessToken, accountId, accentColor, event }: { accessToken: string; accountId?: string; accentColor: string; event: GCalWritableEventUpdateInput; }): Promise<GoogleCalendarEvent> => {
  const raw = await patchJson<GCalRawIncrementalEvent>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(event.calendarId)}/events/${encodeURIComponent(event.eventId)}`,
    toGoogleEventPayload(event),
    "Google Calendar event update failed",
  );
  const updated = toGoogleCalendarEvent({ raw, accountId, calendarId: event.calendarId, accentColor, projectId: event.projectId });
  if (!updated) throw new Error("Google Calendar event update response was invalid");
  return updated;
};
const deleteGoogleCalendarEvent = async ({ accessToken, event }: { accessToken: string; event: GCalWritableEventDeleteInput; }): Promise<void> => {
  await deleteJson(accessToken, `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(event.calendarId)}/events/${encodeURIComponent(event.eventId)}`, "Google Calendar event deletion failed");
};



export { fetchCalendarList, createGoogleCalendar, fetchEventsForCalendar, createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent };
