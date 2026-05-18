import { addDays } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";

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

import {
  fetchCalendarList,
  fetchEventsForCalendar,
} from "./gcal.api";

import type {
  GCalSyncState,
  GoogleCalendarEvent,
  GoogleCalendarListItem,
  UseGoogleCalendarIntegrationOptions,
} from "./gcalSync.types";

import { GoogleCalendarSyncEngine } from "./GoogleCalendarSyncEngine";

// ─────────────────────────────────────
// Hook
// ─────────────────────────────────────

export const useGoogleCalendarIntegration = ({
  authInstance = auth,
}: UseGoogleCalendarIntegrationOptions = {}) => {
  const [accessToken, setAccessToken] =
    useState<string | null>(() => readToken());

  const [accountEmail, setAccountEmail] =
    useState<string | null>(() => readEmail());

  const [selectedCalendarIds, setSelectedCalendarIds] =
    useState<Set<string>>(
      () => new Set(readCalendarIds()),
    );

  const [calendars, setCalendars] =
    useState<GoogleCalendarListItem[]>([]);

  const [events, setEvents] =
    useState<GoogleCalendarEvent[]>([]);

  const [isConnecting, setIsConnecting] =
    useState(false);

  const [isLoadingEvents, setIsLoadingEvents] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [isTokenExpired] =
    useState(false);

  const [syncState, setSyncState] =
    useState<GCalSyncState>("idle");

  const [lastSyncedAt, setLastSyncedAt] =
    useState<Date | null>(null);

  const syncEngineRef =
    useRef<GoogleCalendarSyncEngine | null>(
      null,
    );

  // ─────────────────────────────────────
  // Silent reconnect
  // ─────────────────────────────────────

  const silentReconnect = useCallback(
    async (): Promise<boolean> => {
      try {
        const refreshToken =
          readRefreshToken();

        if (!refreshToken) {
          return false;
        }

        const result =
          await refreshCalendarAccessToken({
            refreshToken,
          });

        writeToken(result.accessToken);

        if (result.refreshToken) {
          writeRefreshToken(
            result.refreshToken,
          );
        }

        setAccessToken(
          result.accessToken,
        );

        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  // ─────────────────────────────────────
  // Connect
  // ─────────────────────────────────────

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const result =
        await requestCalendarAccessToken(
          authInstance,
        );

      writeToken(result.accessToken);

      if (result.refreshToken) {
        writeRefreshToken(
          result.refreshToken,
        );
      }

      writeEmail(result.accountEmail);

      writeWasConnected(true);

      setAccessToken(
        result.accessToken,
      );

      setAccountEmail(
        result.accountEmail,
      );

      const nextCalendars =
        await fetchCalendarList(
          result.accessToken,
        );

      setCalendars(nextCalendars);

      const restoredIds =
        readCalendarIds();

      const ids =
        restoredIds.length > 0
          ? restoredIds
          : nextCalendars
              .filter(
                (
                  c: GoogleCalendarListItem,
                ) =>
                  c.selected ||
                  c.primary,
              )
              .map(
                (
                  c: GoogleCalendarListItem,
                ) => c.id,
              );

      setSelectedCalendarIds(
        new Set(ids),
      );

      writeCalendarIds(ids);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Connection failed",
      );
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

    setEvents([]);

    setSelectedCalendarIds(
      new Set(),
    );

    syncEngineRef.current?.stop();
  }, []);

  // ─────────────────────────────────────
  // Toggle calendar
  // ─────────────────────────────────────

  const toggleCalendar = useCallback(
    (calendarId: string) => {
      setSelectedCalendarIds(
        (prev) => {
          const next = new Set(prev);

          if (
            next.has(calendarId)
          ) {
            next.delete(calendarId);
          } else {
            next.add(calendarId);
          }

          writeCalendarIds(
            Array.from(next),
          );

          return next;
        },
      );
    },
    [],
  );

  // ─────────────────────────────────────
  // Load events
  // ─────────────────────────────────────

  const loadEvents = useCallback(
    async (
      rangeStart: Date,
      rangeEnd: Date,
    ) => {
      if (!accessToken) {
        return;
      }

      if (
        selectedCalendarIds.size === 0
      ) {
        setEvents([]);
        return;
      }

      setIsLoadingEvents(true);

      try {
        const groups =
          await Promise.all(
            Array.from(
              selectedCalendarIds,
            ).map(
              async (
                calendarId: string,
              ) => {
                const calendar =
                  calendars.find(
                    (
                      c: GoogleCalendarListItem,
                    ) =>
                      c.id ===
                      calendarId,
                  );

                return fetchEventsForCalendar(
                  {
                    accessToken,
                    calendarId,

                    accentColor:
                      calendar?.backgroundColor ??
                      "#4f7cff",

                    rangeStart,

                    rangeEnd:
                      addDays(
                        rangeEnd,
                        1,
                      ),
                  },
                );
              },
            ),
          );

        const merged =
          groups.flat();

        merged.sort(
          (a, b) =>
            a.startsAt.getTime() -
            b.startsAt.getTime(),
        );

        setEvents(merged);
      } catch (err) {
        const success =
          await silentReconnect();

        if (!success) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load events",
          );
        }
      } finally {
        setIsLoadingEvents(false);
      }
    },
    [
      accessToken,
      calendars,
      selectedCalendarIds,
      silentReconnect,
    ],
  );

  // ─────────────────────────────────────
  // Sync engine
  // ─────────────────────────────────────

  useEffect(() => {
    if (!accessToken) {
      syncEngineRef.current?.stop();
      return;
    }

    if (
      selectedCalendarIds.size === 0
    ) {
      syncEngineRef.current?.stop();
      return;
    }

    if (!syncEngineRef.current) {
      syncEngineRef.current =
        new GoogleCalendarSyncEngine({
          onEventAdded: (
            event: GoogleCalendarEvent,
          ) => {
            setEvents((prev) => [
              ...prev,
              event,
            ]);
          },

          onEventUpdated: (
            event: GoogleCalendarEvent,
          ) => {
            setEvents((prev) =>
              prev.map((e) =>
                e.id === event.id
                  ? event
                  : e,
              ),
            );
          },

          onEventDeleted: (
            id: string,
          ) => {
            setEvents((prev) =>
              prev.filter(
                (e) => e.id !== id,
              ),
            );
          },

          onSyncStateChange: (
            state: GCalSyncState,
          ) => {
            setSyncState(state);
          },

          onLastSyncedAtChange: (
            date: Date,
          ) => {
            setLastSyncedAt(date);
          },

          onError: (
            err: Error,
          ) => {
            setError(err.message);
          },

          getAccessToken: () =>
            readToken(),

          silentReconnect,
        });
    }

    syncEngineRef.current.start({
      accessToken,
      selectedCalendarIds,
      calendars,
    });

    return () => {
      syncEngineRef.current?.stop();
    };
  }, [
    accessToken,
    calendars,
    selectedCalendarIds,
    silentReconnect,
  ]);

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
  }, [
    accessToken,
    silentReconnect,
  ]);

  // ─────────────────────────────────────
  // Force sync
  // ─────────────────────────────────────

  const forceSync =
    useCallback(async () => {
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
    isConnected:
      Boolean(accessToken),
    isConnecting,
    isLoadingEvents,
    isTokenExpired,
    lastSyncedAt,
    loadEvents,
    selectedCalendarIds,
    selectedCalendarIdList:
      Array.from(
        selectedCalendarIds,
      ),
    syncState,
    toggleCalendar,
  };
};