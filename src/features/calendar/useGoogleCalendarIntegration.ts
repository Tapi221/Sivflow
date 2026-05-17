import { addDays } from "date-fns";
import { GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";
import { useCallback, useMemo, useState } from "react";

import { auth } from "@/services/firebase";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  backgroundColor: string;
  primary: boolean;
  selected: boolean;
};

export type GoogleCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  startsAt: Date;
  minutes: number;
};

type GoogleCalendarApiListResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    backgroundColor?: string;
    primary?: boolean;
    selected?: boolean;
  }>;
};

type GoogleCalendarApiEventsResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    start?: {
      date?: string;
      dateTime?: string;
    };
    end?: {
      date?: string;
      dateTime?: string;
    };
  }>;
};

type GoogleCalendarApiEvent = NonNullable<
  GoogleCalendarApiEventsResponse["items"]
>[number];

type UseGoogleCalendarIntegrationOptions = {
  authInstance?: Auth;
};

const requestCalendarAccessToken = async (
  authInstance: Auth,
): Promise<string> => {
  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_CALENDAR_READONLY_SCOPE);
  provider.setCustomParameters({
    include_granted_scopes: "true",
    prompt: "consent",
  });

  const result = await signInWithPopup(authInstance, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error("Google Calendar access token was not returned");
  }

  return accessToken;
};

const getJson = async <T>(accessToken: string, url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API failed (${response.status})`);
  }

  return (await response.json()) as T;
};

const parseGoogleDate = (rawValue: string): Date => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);

  if (!dateOnlyMatch) {
    return new Date(rawValue);
  }

  const [, year, month, day] = dateOnlyMatch;
  return new Date(Number(year), Number(month) - 1, Number(day));
};

const parseEventStart = (
  start: GoogleCalendarApiEvent["start"],
): Date | null => {
  const rawValue = start?.dateTime ?? start?.date;
  if (!rawValue) return null;

  const date = parseGoogleDate(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseEventMinutes = (
  startsAt: Date,
  end: GoogleCalendarApiEvent["end"],
): number => {
  if (end?.date && !end.dateTime) return 60;

  const rawEnd = end?.dateTime ?? end?.date;
  if (!rawEnd) return 30;

  const endsAt = parseGoogleDate(rawEnd);
  if (Number.isNaN(endsAt.getTime())) return 30;

  return Math.max(
    15,
    Math.round((endsAt.getTime() - startsAt.getTime()) / 60000),
  );
};

const fetchCalendarList = async (
  accessToken: string,
): Promise<GoogleCalendarListItem[]> => {
  const params = new URLSearchParams({
    minAccessRole: "reader",
    showDeleted: "false",
    showHidden: "false",
  });
  const payload = await getJson<GoogleCalendarApiListResponse>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?${params.toString()}`,
  );

  return (payload.items ?? []).flatMap((item) => {
    if (!item.id || !item.summary) return [];

    return [
      {
        id: item.id,
        summary: item.summary,
        backgroundColor: item.backgroundColor ?? "#4f7cff",
        primary: item.primary ?? false,
        selected: item.selected ?? true,
      },
    ];
  });
};

const fetchEventsForCalendar = async ({
  accessToken,
  calendarId,
  rangeStart,
  rangeEnd,
}: {
  accessToken: string;
  calendarId: string;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<GoogleCalendarEvent[]> => {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
  });
  const encodedCalendarId = encodeURIComponent(calendarId);
  const payload = await getJson<GoogleCalendarApiEventsResponse>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events?${params.toString()}`,
  );

  return (payload.items ?? []).flatMap((event) => {
    const startsAt = parseEventStart(event.start);
    if (!event.id || !startsAt) return [];

    return [
      {
        id: `${calendarId}:${event.id}`,
        calendarId,
        title: event.summary || "(No title)",
        startsAt,
        minutes: parseEventMinutes(startsAt, event.end),
      },
    ];
  });
};

export const useGoogleCalendarIntegration = ({
  authInstance = auth,
}: UseGoogleCalendarIntegrationOptions = {}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const nextAccessToken = await requestCalendarAccessToken(authInstance);
      const nextCalendars = await fetchCalendarList(nextAccessToken);
      const initiallySelected = nextCalendars
        .filter((calendar) => calendar.selected || calendar.primary)
        .map((calendar) => calendar.id);

      setAccessToken(nextAccessToken);
      setCalendars(nextCalendars);
      setSelectedCalendarIds(new Set(initiallySelected));
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Google Calendar connection failed",
      );
    } finally {
      setIsConnecting(false);
    }
  }, [authInstance]);

  const toggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds((previous) => {
      const next = new Set(previous);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      return next;
    });
  }, []);

  const loadEvents = useCallback(
    async (rangeStart: Date, rangeEnd: Date) => {
      if (!accessToken || selectedCalendarIds.size === 0) {
        setEvents([]);
        return;
      }

      setIsLoadingEvents(true);
      setError(null);

      try {
        const eventGroups = await Promise.all(
          Array.from(selectedCalendarIds).map((calendarId) =>
            fetchEventsForCalendar({
              accessToken,
              calendarId,
              rangeStart,
              rangeEnd: addDays(rangeEnd, 1),
            }),
          ),
        );

        setEvents(
          eventGroups.flat().sort((left, right) => {
            return left.startsAt.getTime() - right.startsAt.getTime();
          }),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Google Calendar events could not be loaded",
        );
      } finally {
        setIsLoadingEvents(false);
      }
    },
    [accessToken, selectedCalendarIds],
  );

  const selectedCalendarIdList = useMemo(
    () => Array.from(selectedCalendarIds),
    [selectedCalendarIds],
  );

  return {
    calendars,
    connect,
    error,
    events,
    isConnected: Boolean(accessToken),
    isConnecting,
    isLoadingEvents,
    loadEvents,
    selectedCalendarIds,
    selectedCalendarIdList,
    toggleCalendar,
  };
};
