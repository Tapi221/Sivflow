import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { auth } from "@/services/firebase";

import {
  requestCalendarAccessToken,
  refreshCalendarAccessToken,
} from "./gcal.oauth";

import {
  readToken,
  writeToken,
  readEmail,
  writeEmail,
  readCalendarIds,
  writeCalendarIds,
  readRefreshToken,
  writeRefreshToken,
  readWasConnected,
  writeWasConnected,
} from "./gcal.storage";

import { fetchCalendarList } from "./gcal.api";

import type {
  GCalSyncState,
  GoogleCalendarEvent,
  GoogleCalendarListItem,
  UseGoogleCalendarIntegrationOptions,
} from "./gcalSync.types";

import { GoogleCalendarSyncEngine } from "./GoogleCalendarSyncEngine";

// ─────────────────────────────────────
// Events reducer
// ─────────────────────────────────────

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

    case "clear":
      return [];

    default:
      return state;
  }
};

// ─────────────────────────────────────
// Hook
// ─────────────────────────────────────

export const useGoogleCalendarIntegration = ({
  authInstance = auth,
}: UseGoogleCalendarIntegrationOptions = {}) => {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    readToken(),
  );

  const [accountEmail, setAccountEmail] = useState<string | null>(() =>
    readEmail(),
  );

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

  // ─────────────────────────────────────
  // Stable refs
  // ─────────────────────────────────────

  const calendarsRef = useRef(calendars);

  const selectedCalendarIdsRef = useRef(selectedCalendarIds);

  useEffect(() => {
    calendarsRef.current = calendars;
  }, [calendars]);

  useEffect(() => {
    selectedCalendarIdsRef.current = selectedCalendarIds;
  }, [selectedCalendarIds]);

  // ─────────────────────────────────────
  // Silent reconnect
  // ─────────────────────────────────────

  const silentReconnect = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = readRefreshToken();

      if (!refreshToken) {
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

      return true;
    } catch {
      return false;
    }
  }, []);

  // ─────────────────────────────────────
  // Connect
  // ─────────────────────────────────────

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

  // ─────────────────────────────────────
  // Disconnect
  // ─────────────────────────────────────

  const disconnect = useCallback(() => {
    writeToken(null);

    writeRefreshToken(null);

    writeEmail(null);

    writeCalendarIds([]);

    writeWasConnected(false);

    setAccessToken(null);

    setAccountEmail(null);

    setCalendars([]);

    dispatchEvents({
      type: "clear",
    });

    setSelectedCalendarIds(new Set());

    syncEngineRef.current?.stop();

    syncEngineRef.current?.clearAllSyncTokens();
  }, []);

  // ─────────────────────────────────────
  // Toggle calendar
  // ─────────────────────────────────────

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

  // ─────────────────────────────────────
  // Create sync engine (mount once)
  // ─────────────────────────────────────

  useEffect(() => {
    if (syncEngineRef.current) {
      return;
    }

    syncEngineRef.current = new GoogleCalendarSyncEngine({
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
  }, [silentReconnect]);

  // ─────────────────────────────────────
  // Start / stop sync engine
  // ─────────────────────────────────────

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

  // ─────────────────────────────────────
  // Auto reconnect
  // ─────────────────────────────────────

  useEffect(() => {
    if (!readWasConnected()) {
      return;
    }

    if (accessToken) {
      return;
    }

    void silentReconnect();
  }, [accessToken, silentReconnect]);

  // ─────────────────────────────────────
  // Force sync
  // ─────────────────────────────────────

  const forceSync = useCallback(async () => {
    await syncEngineRef.current?.forceSync();
  }, []);

  // ─────────────────────────────────────
  // Return
  // ─────────────────────────────────────

  return {
    accountEmail,
    calendars,
    connect,
    disconnect,
    error,
    events,
    forceSync,

    isConnected: Boolean(accessToken),

    isConnecting,

    isLoadingEvents,

    isTokenExpired,

    lastSyncedAt,

    selectedCalendarIds,

    selectedCalendarIdList: Array.from(selectedCalendarIds),

    syncState,

    toggleCalendar,
  };
};
