import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { auth } from "@platform/firebase/client";
import { refreshCalendarAccessToken, requestCalendarAccessToken } from "@/integration/google-integration/google.oauth";
import { fetchCalendarList } from "./gcal.api";
import { readCalendarIds, readEmail, readRefreshToken, readToken, readWasConnected, writeCalendarIds, writeEmail, writeRefreshToken, writeToken, writeWasConnected } from "./gcal.storage";
import type { GCalForceSyncOptions, GCalSyncState, GoogleCalendarEvent, GoogleCalendarListItem, UseGoogleCalendarIntegrationOptions } from "./gcalSync.types";
import { GoogleCalendarSyncEngine } from "@/sync/googlecalendar-sync/GoogleCalendarSyncEngine";



type EventsAction =
  | {
    type: "upsert";
    event: GoogleCalendarEvent;
  }
  | {
    type: "delete";
    id: string;
  }
  | {
    type: "replaceRange";
    calendarId: string;
    rangeStart: Date;
    rangeEnd: Date;
    events: GoogleCalendarEvent[];
  }
  | {
    type: "clear";
  };



const reduceEvents = (
  state: GoogleCalendarEvent[],
  action: EventsAction,
): GoogleCalendarEvent[] => {
  switch (action.type) {
    case "upsert": {
      const index = state.findIndex((e) => e.id === action.event.id);

      if (index === -1) {
        return [...state, action.event];
      }

      const next = [...state];

      next[index] = action.event;

      return next;
    }

    case "delete":
      return state.filter((e) => e.id !== action.id);

    case "replaceRange":
      return [
        ...state.filter(
          (event) =>
            event.calendarId !== action.calendarId ||
            event.startsAt >= action.rangeEnd ||
            event.endsAt <= action.rangeStart,
        ),
        ...action.events,
      ];

    case "clear":
      return [];

    default:
      return state;
  }
};
const useGoogleCalendarIntegration = ({ authInstance = auth }: UseGoogleCalendarIntegrationOptions = {}) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => readToken());

  const [accountEmail, setAccountEmail] = useState<string | null>(() =>
    readEmail(),
  );

  const [accountPhotoUrl, setAccountPhotoUrl] = useState<string | null>(null);

  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    () => new Set(readCalendarIds()),
  );

  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);

  const [events, dispatchEvents] = useReducer(reduceEvents, []);

  const [isConnecting, setIsConnecting] = useState(false);

  const [isLoadingEvents] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isTokenExpired] = useState(false);

  const [syncState, setSyncState] = useState<GCalSyncState>("idle");

  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const syncEngineRef = useRef<GoogleCalendarSyncEngine | null>(null);

  const calendarsRef = useRef(calendars);

  const selectedCalendarIdsRef = useRef(selectedCalendarIds);

  useEffect(() => {
    calendarsRef.current = calendars;
  }, [calendars]);

  useEffect(() => {
    selectedCalendarIdsRef.current = selectedCalendarIds;
  }, [selectedCalendarIds]);

  const silentReconnect = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = readRefreshToken();

      if (!refreshToken) {
        setSyncState("needsReconnect");
        setError("Google Calendar の再連携が必要です");
        return false;
      }

      const result = await refreshCalendarAccessToken({
        refreshToken,
      });

      writeToken(result.accessToken);

      if (result.refreshToken) {
        writeRefreshToken(result.refreshToken);
      }

      setAccessToken(result.accessToken);

      setAccountPhotoUrl(result.accountPhotoUrl ?? null);

      return true;
    } catch {
      setSyncState("needsReconnect");
      setError("Google Calendar の再連携が必要です");
      return false;
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);

    setError(null);

    try {
      const result = await requestCalendarAccessToken(authInstance);

      writeToken(result.accessToken);

      if (result.refreshToken) {
        writeRefreshToken(result.refreshToken);
      }

      writeEmail(result.accountEmail);

      writeWasConnected(true);

      setAccessToken(result.accessToken);

      setAccountEmail(result.accountEmail);

      setAccountPhotoUrl(result.accountPhotoUrl ?? null);

      const nextCalendars = await fetchCalendarList(result.accessToken);

      setCalendars(nextCalendars);

      const restoredIds = readCalendarIds();

      const ids =
        restoredIds.length > 0
          ? restoredIds
          : nextCalendars
            .filter((c: GoogleCalendarListItem) => c.selected || c.primary)
            .map((c: GoogleCalendarListItem) => c.id);

      setSelectedCalendarIds(new Set(ids));

      writeCalendarIds(ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, [authInstance]);

  const disconnect = useCallback(() => {
    writeToken(null);

    writeRefreshToken(null);

    writeEmail(null);

    writeCalendarIds([]);

    writeWasConnected(false);

    setAccessToken(null);

    setAccountEmail(null);

    setAccountPhotoUrl(null);

    setCalendars([]);

    dispatchEvents({
      type: "clear",
    });

    setSelectedCalendarIds(new Set());

    syncEngineRef.current?.stop();

    syncEngineRef.current?.clearAllSyncTokens();
  }, []);

  const toggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds((prev) => {
      const next = new Set(prev);

      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }

      writeCalendarIds(Array.from(next));

      return next;
    });
  }, []);

  useEffect(() => {
    if (syncEngineRef.current) {
      return;
    }

    syncEngineRef.current = new GoogleCalendarSyncEngine({
      accountId: accountEmail ?? "legacy",
      onEventAdded: (event: GoogleCalendarEvent) => {
        dispatchEvents({
          type: "upsert",
          event,
        });
      },

      onEventUpdated: (event: GoogleCalendarEvent) => {
        dispatchEvents({
          type: "upsert",
          event,
        });
      },

      onEventDeleted: (id: string) => {
        dispatchEvents({
          type: "delete",
          id,
        });
      },

      onEventsRangeReplaced: ({ calendarId, rangeStart, rangeEnd, events }) => {
        dispatchEvents({
          type: "replaceRange",
          calendarId,
          rangeStart,
          rangeEnd,
          events,
        });
      },

      onSyncStateChange: (state: GCalSyncState) => {
        setSyncState(state);
      },

      onLastSyncedAtChange: (date: Date) => {
        setLastSyncedAt(date);
      },

      onError: (err: Error) => {
        setError(err.message);
      },

      getAccessToken: () => readToken(),

      silentReconnect,
    });
  }, [accountEmail, silentReconnect]);

  useEffect(() => {
    if (!accessToken) {
      syncEngineRef.current?.stop();

      return;
    }

    if (selectedCalendarIdsRef.current.size === 0) {
      syncEngineRef.current?.stop();

      dispatchEvents({
        type: "clear",
      });

      return;
    }

    syncEngineRef.current?.start({
      accessToken,

      selectedCalendarIds: selectedCalendarIdsRef.current,

      calendars: calendarsRef.current,
    });

    return () => {
      syncEngineRef.current?.stop();
    };
  }, [accessToken]);

  useEffect(() => {
    if (!readWasConnected()) {
      return;
    }

    if (accessToken) {
      return;
    }

    void silentReconnect();
  }, [accessToken, silentReconnect]);

  const forceSync = useCallback(async (options: GCalForceSyncOptions = {}) => {
    if (options.rangeStart && options.rangeEnd) {
      await syncEngineRef.current?.forceSyncRange(options);
      return;
    }

    await syncEngineRef.current?.forceSync();
  }, []);

  return {
    accountEmail,
    accountPhotoUrl,
    calendars,
    connect,
    disconnect,
    error,
    events,
    forceSync,

    connectionStatus:
      syncState === "needsReconnect"
        ? "needsReconnect"
        : error
          ? "error"
          : accessToken
            ? "connected"
            : "needsReconnect",

    isConnected: Boolean(accessToken) && syncState !== "needsReconnect" && !error,

    isConnecting,

    isLoadingEvents,

    isTokenExpired,

    lastSyncedAt,

    selectedCalendarIds,
    toggleCalendar,
  };
};



export { useGoogleCalendarIntegration };
