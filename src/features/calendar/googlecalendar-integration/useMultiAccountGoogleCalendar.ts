import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { GoogleCalendarSyncEngine } from "../googlecalendar-sync/GoogleCalendarSyncEngine";
import { fetchCalendarList } from "./gcal.api";
import {
  buildTokenExpiry,
  isStoredTokenValid,
  readStoredAccounts,
  removeStoredAccount,
  type StoredGoogleAccount,
  updateStoredAccountCalendarIds,
  updateStoredAccountToken,
  upsertStoredAccount,
} from "./gcal.multi-storage";
import {
  refreshCalendarAccessToken,
  requestCalendarAccessToken,
  requestGoogleCalendarServerCode,
} from "./gcal.oauth";
import {
  disconnectServerStoredGoogleCalendarAccount,
  exchangeGoogleCalendarCode,
  getServerStoredGoogleCalendarAccessToken,
  isServerStoredGoogleOAuthEnabled,
} from "./gcal.server-oauth";
import type {
  GCalConnectionStatus,
  GCalForceSyncOptions,
  GCalSyncState,
  GoogleCalendarEvent,
  GoogleCalendarListItem,
} from "./gcalSync.types";
import { GoogleCalendarEngineManager } from "./GoogleCalendarEngineManager";

export type GoogleAccountEntry = {
  id: string;
  email: string | null;
  name: string | null;
  photoUrl: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  calendars: GoogleCalendarListItem[];
  selectedCalendarIds: Set<string>;
  syncState: GCalSyncState;
  connectionStatus: GCalConnectionStatus;
  lastSyncedAt: Date | null;
  isConnecting: boolean;
  error: string | null;
};

type AccountsAction =
  | { type: "ADD"; account: GoogleAccountEntry }
  | { type: "REMOVE"; id: string }
  | { type: "SET_CONNECTING"; id: string; value: boolean }
  | {
    type: "SET_TOKEN";
    id: string;
    accessToken: string;
    refreshToken?: string | null;
    accountName?: string | null;
    accountPhotoUrl?: string | null;
  }
  | { type: "SET_CALENDARS"; id: string; calendars: GoogleCalendarListItem[] }
  | { type: "SET_CALENDAR_IDS"; id: string; ids: string[] }
  | { type: "TOGGLE_CALENDAR"; id: string; calendarId: string }
  | { type: "SET_SYNC_STATE"; id: string; syncState: GCalSyncState }
  | { type: "SET_LAST_SYNCED_AT"; id: string; at: Date }
  | { type: "NEEDS_RECONNECT"; id: string; error?: string | null }
  | { type: "SET_ERROR"; id: string; error: string | null };

type EventsState = Map<string, Map<string, GoogleCalendarEvent>>;

type EventsAction =
  | { type: "UPSERT"; accountId: string; event: GoogleCalendarEvent }
  | { type: "DELETE"; accountId: string; eventId: string }
  | {
    type: "REPLACE_RANGE";
    accountId: string;
    calendarId: string;
    rangeStart: Date;
    rangeEnd: Date;
    events: GoogleCalendarEvent[];
  }
  | {
    type: "APPLY_CALENDAR_COLORS";
    accountId: string;
    calendars: GoogleCalendarListItem[];
  }
  | { type: "CLEAR_ACCOUNT"; accountId: string };

const overlapsRange = (
  event: GoogleCalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
) => event.startsAt < rangeEnd && event.endsAt > rangeStart;

const reduceAccounts = (
  state: GoogleAccountEntry[],
  action: AccountsAction,
): GoogleAccountEntry[] => {
  switch (action.type) {
    case "ADD": {
      const exists = state.some((a) => a.id === action.account.id);

      return exists
        ? state.map((a) => (a.id === action.account.id ? action.account : a))
        : [...state, action.account];
    }

    case "REMOVE":
      return state.filter((a) => a.id !== action.id);

    case "SET_CONNECTING":
      return state.map((a) =>
        a.id === action.id ? { ...a, isConnecting: action.value } : a,
      );

    case "SET_TOKEN":
      return state.map((a) => {
        if (a.id !== action.id) return a;

        return {
          ...a,
          accessToken: action.accessToken,
          name: action.accountName ?? a.name,
          photoUrl: action.accountPhotoUrl ?? a.photoUrl,
          connectionStatus: "connected",
          syncState: a.syncState === "needsReconnect" ? "idle" : a.syncState,
          error: null,
          ...(action.refreshToken !== undefined
            ? { refreshToken: action.refreshToken }
            : {}),
        };
      });

    case "SET_CALENDARS":
      return state.map((a) =>
        a.id === action.id ? { ...a, calendars: action.calendars } : a,
      );

    case "SET_CALENDAR_IDS":
      return state.map((a) =>
        a.id === action.id
          ? { ...a, selectedCalendarIds: new Set(action.ids) }
          : a,
      );

    case "TOGGLE_CALENDAR":
      return state.map((a) => {
        if (a.id !== action.id) return a;

        const next = new Set(a.selectedCalendarIds);

        if (next.has(action.calendarId)) {
          next.delete(action.calendarId);
        } else {
          next.add(action.calendarId);
        }

        return { ...a, selectedCalendarIds: next };
      });

    case "SET_SYNC_STATE":
      return state.map((a) =>
        a.id === action.id
          ? {
            ...a,
            syncState: action.syncState,
            connectionStatus:
                action.syncState === "needsReconnect"
                  ? "needsReconnect"
                  : action.syncState === "error"
                    ? "error"
                    : a.accessToken
                      ? "connected"
                      : a.connectionStatus,
            error:
                action.syncState === "idle" && a.connectionStatus === "error"
                  ? null
                  : a.error,
          }
          : a,
      );

    case "SET_LAST_SYNCED_AT":
      return state.map((a) =>
        a.id === action.id ? { ...a, lastSyncedAt: action.at } : a,
      );

    case "NEEDS_RECONNECT":
      return state.map((a) =>
        a.id === action.id
          ? {
            ...a,
            accessToken: null,
            connectionStatus: "needsReconnect",
            syncState: "needsReconnect",
            error: action.error ?? "Google Calendar の再連携が必要です",
          }
          : a,
      );

    case "SET_ERROR":
      return state.map((a) =>
        a.id === action.id
          ? {
            ...a,
            error: action.error,
            connectionStatus:
                action.error && a.syncState !== "needsReconnect"
                  ? "error"
                  : a.connectionStatus,
          }
          : a,
      );

    default:
      return state;
  }
};

const reduceEvents = (
  state: EventsState,
  action: EventsAction,
): EventsState => {
  switch (action.type) {
    case "UPSERT": {
      const next = new Map(state);
      const bucket = new Map(next.get(action.accountId) ?? []);

      bucket.set(action.event.id, action.event);
      next.set(action.accountId, bucket);

      return next;
    }

    case "DELETE": {
      const next = new Map(state);
      const bucket = next.get(action.accountId);

      if (!bucket?.has(action.eventId)) return next;

      const newBucket = new Map(bucket);

      newBucket.delete(action.eventId);
      next.set(action.accountId, newBucket);

      return next;
    }

    case "REPLACE_RANGE": {
      const next = new Map(state);
      const bucket = new Map(next.get(action.accountId) ?? []);

      for (const [eventId, event] of bucket) {
        if (
          event.calendarId === action.calendarId &&
          overlapsRange(event, action.rangeStart, action.rangeEnd)
        ) {
          bucket.delete(eventId);
        }
      }

      for (const event of action.events) {
        bucket.set(event.id, event);
      }

      next.set(action.accountId, bucket);

      return next;
    }

    case "APPLY_CALENDAR_COLORS": {
      const bucket = state.get(action.accountId);
      if (!bucket) return state;

      const colorByCalendarId = new Map(
        action.calendars
          .filter((calendar) => Boolean(calendar.backgroundColor))
          .map((calendar) => [calendar.id, calendar.backgroundColor!]),
      );

      if (colorByCalendarId.size === 0) return state;

      const newBucket = new Map<string, GoogleCalendarEvent>();
      let hasChanged = false;

      for (const [eventId, event] of bucket) {
        const color = colorByCalendarId.get(event.calendarId);

        if (color && color !== event.accentColor) {
          newBucket.set(eventId, { ...event, accentColor: color });
          hasChanged = true;
          continue;
        }

        newBucket.set(eventId, event);
      }

      if (!hasChanged) return state;

      const next = new Map(state);
      next.set(action.accountId, newBucket);
      return next;
    }

    case "CLEAR_ACCOUNT": {
      const next = new Map(state);

      next.delete(action.accountId);

      return next;
    }

    default:
      return state;
  }
};

const toCachedCalendars = (calendars: GoogleCalendarListItem[]) =>
  calendars.map(({ id, summary, summaryOverride, backgroundColor }) => ({
    id,
    summary,
    summaryOverride,
    backgroundColor,
  }));

const getDefaultCalendarIds = (
  calendars: GoogleCalendarListItem[],
): string[] => {
  return calendars
    .filter((calendar) => calendar.primary || calendar.selected)
    .map((calendar) => calendar.id);
};

const resolveSelectedCalendarIds = (
  storedIds: string[],
  calendars: GoogleCalendarListItem[],
): string[] => {
  const availableIds = new Set(calendars.map((calendar) => calendar.id));
  const availableStoredIds = storedIds.filter((id) => availableIds.has(id));

  return availableStoredIds.length > 0
    ? availableStoredIds
    : getDefaultCalendarIds(calendars);
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!(error instanceof Error)) return undefined;
  return (error as Error & { status?: number }).status;
};

const isUnauthorizedError = (error: unknown): boolean =>
  getErrorStatus(error) === 401;

const getGoogleReason = (error: unknown): string | undefined => {
  if (!(error instanceof Error)) return undefined;
  return (error as Error & { googleReason?: string }).googleReason;
};

const isGooglePermissionError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  const reason = getGoogleReason(error);

  return (
    status === 403 &&
    (reason === "authError" || reason === "insufficientPermissions")
  );
};

const getErrorCode = (error: unknown): string | undefined => {
  if (!(error instanceof Error)) return undefined;
  return (error as Error & { code?: string }).code;
};

const normalizeErrorCode = (code: string | undefined): string | undefined =>
  code?.replace(/^functions\//, "");

const isReconnectRequiredError = (error: unknown): boolean => {
  const code = normalizeErrorCode(getErrorCode(error));

  return (
    isUnauthorizedError(error) ||
    isGooglePermissionError(error) ||
    code === "not-found" ||
    code === "failed-precondition" ||
    code === "permission-denied" ||
    code === "unauthenticated"
  );
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toGoogleCalendarAuthErrorMessage = (error: unknown): string =>
  `Google Calendar token refresh failed: ${toErrorMessage(error)}`;

const logGoogleCalendarConnectionError = (
  context: string,
  error: unknown,
): void => {
  console.error(`[GoogleCalendar] ${context}`, error);
};

const useServerStoredTokens = isServerStoredGoogleOAuthEnabled();
const CALENDAR_LIST_REFRESH_INTERVAL_MS = 30_000;

const requestSilentAccessToken = async () => {
  const { auth } = await import("@/services/firebase");
  return requestCalendarAccessToken(auth, true);
};

const storedToEntry = (stored: StoredGoogleAccount): GoogleAccountEntry => {
  const calendars = stored.cachedCalendars ?? [];
  const selectedCalendarIds = resolveSelectedCalendarIds(
    stored.selectedCalendarIds,
    calendars,
  );

  return {
    id: stored.id,
    email: stored.email,
    name: stored.name ?? null,
    photoUrl: stored.photoUrl ?? null,
    accessToken: isStoredTokenValid(stored) ? stored.accessToken : null,
    refreshToken: stored.refreshToken,
    calendars,
    selectedCalendarIds: new Set(selectedCalendarIds),
    syncState:
      isStoredTokenValid(stored) || stored.refreshToken || useServerStoredTokens
        ? "idle"
        : "needsReconnect",
    connectionStatus:
      isStoredTokenValid(stored) || stored.refreshToken || useServerStoredTokens
        ? "connected"
        : "needsReconnect",
    lastSyncedAt: null,
    isConnecting: false,
    error:
      isStoredTokenValid(stored) || stored.refreshToken || useServerStoredTokens
        ? null
        : "Google Calendar の再連携が必要です",
  };
};

export const useMultiAccountGoogleCalendar = () => {
  const [accounts, dispatchAccounts] = useReducer(
    reduceAccounts,
    undefined,
    () => readStoredAccounts().map(storedToEntry),
  );

  const [eventsState, dispatchEvents] = useReducer(
    reduceEvents,
    new Map() as EventsState,
  );

  const managerRef = useRef<GoogleCalendarEngineManager | null>(null);
  const accountsRef = useRef(accounts);
  const refreshingCalendarListIdsRef = useRef(new Set<string>());

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  const refreshAccountCalendarList = useCallback(async (accountId: string) => {
    if (refreshingCalendarListIdsRef.current.has(accountId)) return;

    const account = accountsRef.current.find((x) => x.id === accountId);

    if (!account || account.connectionStatus !== "connected") return;

    refreshingCalendarListIdsRef.current.add(accountId);

    const applyTokenResult = (
      result: Awaited<ReturnType<typeof requestCalendarAccessToken>>,
    ) => {
      const refreshToken = useServerStoredTokens
        ? null
        : result.refreshToken ?? account.refreshToken ?? null;

      updateStoredAccountToken(
        accountId,
        result.accessToken,
        refreshToken,
        {
          name: result.accountName,
          photoUrl: result.accountPhotoUrl,
        },
        result.expiresInSeconds,
      );

      accountsRef.current = accountsRef.current.map((current) =>
        current.id === accountId
          ? {
            ...current,
            accessToken: result.accessToken,
            refreshToken,
            name: result.accountName ?? current.name,
            photoUrl: result.accountPhotoUrl ?? current.photoUrl,
            connectionStatus: "connected",
            syncState:
                current.syncState === "needsReconnect" ? "idle" : current.syncState,
            error: null,
          }
          : current,
      );

      dispatchAccounts({
        type: "SET_TOKEN",
        id: accountId,
        accessToken: result.accessToken,
        refreshToken,
        accountName: result.accountName,
        accountPhotoUrl: result.accountPhotoUrl,
      });

      return result.accessToken;
    };

    const recoverAccessToken = async (): Promise<string> => {
      const latestAccount = accountsRef.current.find((x) => x.id === accountId) ?? account;
      const result = useServerStoredTokens
        ? await getServerStoredGoogleCalendarAccessToken({ accountId })
        : latestAccount.refreshToken
          ? await refreshCalendarAccessToken({
            refreshToken: latestAccount.refreshToken,
          })
          : await requestSilentAccessToken();

      return applyTokenResult(result);
    };

    try {
      let accessToken = account.accessToken;
      let list: GoogleCalendarListItem[];

      if (!accessToken) {
        accessToken = await recoverAccessToken();
        list = await fetchCalendarList(accessToken);
      } else {
        try {
          list = await fetchCalendarList(accessToken);
        } catch (error) {
          if (!isReconnectRequiredError(error)) throw error;
          accessToken = await recoverAccessToken();
          list = await fetchCalendarList(accessToken);
        }
      }

      const latestAccount = accountsRef.current.find((x) => x.id === accountId) ?? account;
      const ids = resolveSelectedCalendarIds(
        Array.from(latestAccount.selectedCalendarIds),
        list,
      );
      const stored = readStoredAccounts().find((storedAccount) => storedAccount.id === accountId);

      if (stored) {
        upsertStoredAccount({
          ...stored,
          accessToken,
          refreshToken: latestAccount.refreshToken,
          selectedCalendarIds: ids,
          cachedCalendars: toCachedCalendars(list),
        });
      }

      accountsRef.current = accountsRef.current.map((current) =>
        current.id === accountId
          ? {
            ...current,
            accessToken,
            calendars: list,
            selectedCalendarIds: new Set(ids),
            error: null,
          }
          : current,
      );

      dispatchAccounts({
        type: "SET_CALENDARS",
        id: accountId,
        calendars: list,
      });

      dispatchAccounts({
        type: "SET_CALENDAR_IDS",
        id: accountId,
        ids,
      });

      dispatchAccounts({
        type: "SET_ERROR",
        id: accountId,
        error: null,
      });
    } catch (error) {
      console.warn("[GoogleCalendar] calendar list refresh failed", error);

      if (isReconnectRequiredError(error)) {
        dispatchAccounts({
          type: "NEEDS_RECONNECT",
          id: accountId,
          error: toErrorMessage(error),
        });
      }
    } finally {
      refreshingCalendarListIdsRef.current.delete(accountId);
    }
  }, []);

  useEffect(() => {
    if (managerRef.current) return;

    managerRef.current = new GoogleCalendarEngineManager({
      createEngine: (accountId: string) =>
        new GoogleCalendarSyncEngine({
          accountId,
          onEventAdded: (event) =>
            dispatchEvents({ type: "UPSERT", accountId, event }),

          onEventUpdated: (event) =>
            dispatchEvents({ type: "UPSERT", accountId, event }),

          onEventDeleted: (eventId) =>
            dispatchEvents({ type: "DELETE", accountId, eventId }),

          onEventsRangeReplaced: ({
            calendarId,
            rangeStart,
            rangeEnd,
            events,
          }) =>
            dispatchEvents({
              type: "REPLACE_RANGE",
              accountId,
              calendarId,
              rangeStart,
              rangeEnd,
              events,
            }),

          onSyncStateChange: (syncState) =>
            dispatchAccounts({
              type: "SET_SYNC_STATE",
              id: accountId,
              syncState,
            }),

          onLastSyncedAtChange: (at) =>
            dispatchAccounts({ type: "SET_LAST_SYNCED_AT", id: accountId, at }),

          onError: (err) =>
            dispatchAccounts({
              type: "SET_ERROR",
              id: accountId,
              error: err instanceof Error ? err.message : String(err),
            }),

          getAccessToken: () => {
            const account = accountsRef.current.find(
              (x) => x.id === accountId,
            );

            return account?.accessToken ?? null;
          },

          silentReconnect: async () => {
            const account = accountsRef.current.find(
              (x) => x.id === accountId,
            );

            if (!account) {
              dispatchAccounts({ type: "NEEDS_RECONNECT", id: accountId });
              return false;
            }

            let result: Awaited<ReturnType<typeof requestCalendarAccessToken>>;

            try {
              result = useServerStoredTokens
                ? await getServerStoredGoogleCalendarAccessToken({ accountId })
                : account.refreshToken
                  ? await refreshCalendarAccessToken({
                    refreshToken: account.refreshToken,
                  })
                  : await requestSilentAccessToken();
            } catch (error) {
              console.warn(
                "[GoogleCalendar] silent token refresh failed",
                error,
              );

              if (isReconnectRequiredError(error)) {
                dispatchAccounts({
                  type: "NEEDS_RECONNECT",
                  id: accountId,
                  error: toGoogleCalendarAuthErrorMessage(error),
                });
                return "needsReconnect";
              }

              dispatchAccounts({
                type: "SET_ERROR",
                id: accountId,
                error: toGoogleCalendarAuthErrorMessage(error),
              });
              return "retryLater";
            }

            const refreshToken = useServerStoredTokens
              ? null
              : result.refreshToken ?? account.refreshToken ?? null;

            updateStoredAccountToken(
              accountId,
              result.accessToken,
              refreshToken,
              {
                name: result.accountName,
                photoUrl: result.accountPhotoUrl,
              },
              result.expiresInSeconds,
            );

            accountsRef.current = accountsRef.current.map((current) =>
              current.id === accountId
                ? {
                  ...current,
                  accessToken: result.accessToken,
                  refreshToken,
                  name: result.accountName ?? current.name,
                  photoUrl: result.accountPhotoUrl ?? current.photoUrl,
                  connectionStatus: "connected",
                  syncState:
                      current.syncState === "needsReconnect"
                        ? "idle"
                        : current.syncState,
                  error: null,
                }
                : current,
            );

            dispatchAccounts({
              type: "SET_TOKEN",
              id: accountId,
              accessToken: result.accessToken,
              refreshToken,
              accountName: result.accountName,
              accountPhotoUrl: result.accountPhotoUrl,
            });

            let list: GoogleCalendarListItem[];

            try {
              list = await fetchCalendarList(result.accessToken);
            } catch (error) {
              if (isReconnectRequiredError(error)) {
                dispatchAccounts({
                  type: "NEEDS_RECONNECT",
                  id: accountId,
                  error: toErrorMessage(error),
                });
                return false;
              }

              dispatchAccounts({
                type: "SET_ERROR",
                id: accountId,
                error: toErrorMessage(error),
              });
              return true;
            }

            const ids = resolveSelectedCalendarIds(
              Array.from(account.selectedCalendarIds),
              list,
            );

            updateStoredAccountCalendarIds(accountId, ids);

            accountsRef.current = accountsRef.current.map((current) =>
              current.id === accountId
                ? {
                  ...current,
                  calendars: list,
                  selectedCalendarIds: new Set(ids),
                  error: null,
                }
                : current,
            );

            dispatchAccounts({
              type: "SET_CALENDARS",
              id: accountId,
              calendars: list,
            });

            dispatchAccounts({
              type: "SET_CALENDAR_IDS",
              id: accountId,
              ids,
            });

            dispatchAccounts({
              type: "SET_ERROR",
              id: accountId,
              error: null,
            });

            return "reconnected";
          },
        }),
    });
  }, []);

  useEffect(() => {
    const storedAccounts = readStoredAccounts();

    for (const stored of storedAccounts) {
      const accountId = stored.id;

      const applyAccessToken = async (
        accessToken: string,
        refreshToken: string | null,
        accessTokenExpiry: number | null,
        accountName?: string | null,
        accountPhotoUrl?: string | null,
      ) => {
        const resolvedRefreshToken = refreshToken ?? stored.refreshToken;

        upsertStoredAccount({
          ...stored,
          name: accountName ?? stored.name ?? null,
          photoUrl: accountPhotoUrl ?? stored.photoUrl ?? null,
          accessToken,
          accessTokenExpiry,
          refreshToken: resolvedRefreshToken,
        });

        dispatchAccounts({
          type: "SET_TOKEN",
          id: accountId,
          accessToken,
          refreshToken: resolvedRefreshToken,
          accountName,
          accountPhotoUrl,
        });

        const list = await fetchCalendarList(accessToken);
        const ids = resolveSelectedCalendarIds(stored.selectedCalendarIds, list);

        upsertStoredAccount({
          ...stored,
          name: accountName ?? stored.name ?? null,
          photoUrl: accountPhotoUrl ?? stored.photoUrl ?? null,
          accessToken,
          accessTokenExpiry,
          refreshToken: resolvedRefreshToken,
          selectedCalendarIds: ids,
          cachedCalendars: toCachedCalendars(list),
        });

        dispatchAccounts({
          type: "SET_CALENDARS",
          id: accountId,
          calendars: list,
        });

        dispatchAccounts({
          type: "SET_CALENDAR_IDS",
          id: accountId,
          ids,
        });

        dispatchAccounts({
          type: "SET_ERROR",
          id: accountId,
          error: null,
        });
      };

      const refreshStoredAccount = async () => {
        let result: Awaited<ReturnType<typeof requestCalendarAccessToken>>;

        try {
          result = useServerStoredTokens
            ? await getServerStoredGoogleCalendarAccessToken({ accountId })
            : stored.refreshToken
              ? await refreshCalendarAccessToken({
                refreshToken: stored.refreshToken,
              })
              : await requestSilentAccessToken();
        } catch (error) {
          console.warn(
            "[GoogleCalendar] stored account token refresh failed",
            error,
          );

          if (isReconnectRequiredError(error)) {
            dispatchAccounts({
              type: "NEEDS_RECONNECT",
              id: accountId,
              error: toGoogleCalendarAuthErrorMessage(error),
            });
            return;
          }

          dispatchAccounts({
            type: "SET_ERROR",
            id: accountId,
            error: toGoogleCalendarAuthErrorMessage(error),
          });
          return;
        }

        try {
          await applyAccessToken(
            result.accessToken,
            useServerStoredTokens ? null : (result.refreshToken ?? stored.refreshToken),
            buildTokenExpiry(result.expiresInSeconds),
            result.accountName,
            result.accountPhotoUrl,
          );
        } catch (error) {
          if (isReconnectRequiredError(error)) {
            dispatchAccounts({
              type: "NEEDS_RECONNECT",
              id: accountId,
              error: toErrorMessage(error),
            });
            return;
          }

          dispatchAccounts({
            type: "SET_ERROR",
            id: accountId,
            error: toErrorMessage(error),
          });
        }
      };

      if (isStoredTokenValid(stored) && stored.accessToken) {
        void applyAccessToken(
          stored.accessToken,
          stored.refreshToken,
          stored.accessTokenExpiry,
          stored.name,
          stored.photoUrl,
        ).catch((error) => {
          if (isReconnectRequiredError(error)) {
            void refreshStoredAccount();
            return;
          }

          dispatchAccounts({
            type: "SET_ERROR",
            id: accountId,
            error: toErrorMessage(error),
          });
        });

        continue;
      }

      void refreshStoredAccount();
    }
  }, []);

  useEffect(() => {
    for (const account of accounts) {
      dispatchEvents({
        type: "APPLY_CALENDAR_COLORS",
        accountId: account.id,
        calendars: account.calendars,
      });

      if (!account.accessToken || account.selectedCalendarIds.size === 0) {
        managerRef.current?.stop(account.id);
        continue;
      }

      managerRef.current?.upsert(account.id, {
        accessToken: account.accessToken,
        selectedCalendarIds: account.selectedCalendarIds,
        calendars: account.calendars,
      });
    }
  }, [accounts]);

  const refreshableAccountKey = useMemo(
    () =>
      accounts
        .map((account) =>
          [
            account.id,
            account.accessToken ?? "",
            account.refreshToken ?? "",
            account.connectionStatus,
          ].join("\t"),
        )
        .join("\n"),
    [accounts],
  );

  const refreshableAccountIds = useMemo(
    () =>
      accounts
        .filter((account) => account.connectionStatus === "connected")
        .map((account) => account.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshableAccountKey],
  );

  useEffect(() => {
    if (refreshableAccountIds.length === 0) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const refreshAllCalendarLists = () => {
      if (document.visibilityState !== "visible") return;

      for (const accountId of refreshableAccountIds) {
        void refreshAccountCalendarList(accountId);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAllCalendarLists();
      }
    };

    const intervalId = window.setInterval(
      refreshAllCalendarLists,
      CALENDAR_LIST_REFRESH_INTERVAL_MS,
    );

    window.addEventListener("focus", refreshAllCalendarLists);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    refreshAllCalendarLists();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshAllCalendarLists);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshAccountCalendarList, refreshableAccountIds]);

  useEffect(() => {
    return () => managerRef.current?.stopAll();
  }, []);

  const events = useMemo(() => {
    const selectedByAccount = new Map(
      accounts.map((account) => [account.id, account.selectedCalendarIds]),
    );

    const all: GoogleCalendarEvent[] = [];

    for (const [accountId, bucket] of eventsState) {
      const selectedCalendarIds = selectedByAccount.get(accountId);

      if (!selectedCalendarIds) continue;

      for (const event of bucket.values()) {
        if (selectedCalendarIds.has(event.calendarId)) {
          all.push(event);
        }
      }
    }

    return all;
  }, [accounts, eventsState]);

  const selectedCalendarIds = useMemo(() => {
    const set = new Set<string>();

    for (const account of accounts) {
      for (const id of account.selectedCalendarIds) {
        set.add(id);
      }
    }

    return set;
  }, [accounts]);

  const connectAccount = useCallback(async (replaceAccountId?: string) => {
    const { auth } = await import("@/services/firebase");

    const tempId = `connecting-${Date.now()}`;
    const replacingAccount = replaceAccountId
      ? accountsRef.current.find((account) => account.id === replaceAccountId)
      : null;

    if (replaceAccountId) {
      dispatchAccounts({
        type: "SET_CONNECTING",
        id: replaceAccountId,
        value: true,
      });
    } else {
      dispatchAccounts({
        type: "ADD",
        account: {
          id: tempId,
          email: null,
          name: null,
          photoUrl: null,
          accessToken: null,
          refreshToken: null,
          calendars: [],
          selectedCalendarIds: new Set(),
          syncState: "idle",
          connectionStatus: "connected",
          lastSyncedAt: null,
          isConnecting: true,
          error: null,
        },
      });
    }

    try {
      const result = useServerStoredTokens
        ? await (async () => {
          const { code, redirectUri } = await requestGoogleCalendarServerCode(auth);
          return exchangeGoogleCalendarCode({ code, redirectUri });
        })()
        : await requestCalendarAccessToken(auth);
      const list = await fetchCalendarList(result.accessToken);

      if (list.length === 0) {
        console.warn("[GoogleCalendar] connected account has no visible calendars", {
          accountEmail: result.accountEmail,
        });
      }

      const accountId =
        result.accountEmail ??
        replacingAccount?.email ??
        replaceAccountId ??
        `account-${Date.now()}`;

      const matchesResolvedAccount = (account: {
        id: string;
        email: string | null;
      }): boolean =>
        account.id === accountId ||
        (result.accountEmail !== null && account.email === result.accountEmail);

      const storedAccount = readStoredAccounts().find(matchesResolvedAccount);
      const existingAccount =
        replacingAccount ?? accountsRef.current.find(matchesResolvedAccount);

      if (!replaceAccountId) {
        dispatchAccounts({ type: "REMOVE", id: tempId });
      }

      const defaultIds = resolveSelectedCalendarIds(
        existingAccount
          ? Array.from(existingAccount.selectedCalendarIds)
          : (storedAccount?.selectedCalendarIds ?? []),
        list,
      );

      const refreshToken = useServerStoredTokens
        ? null
        : result.refreshToken ??
          existingAccount?.refreshToken ??
          storedAccount?.refreshToken ??
          null;

      const entry: GoogleAccountEntry = {
        id: accountId,
        email: result.accountEmail ?? existingAccount?.email ?? null,
        name: result.accountName ?? existingAccount?.name ?? null,
        photoUrl: result.accountPhotoUrl ?? existingAccount?.photoUrl ?? null,
        accessToken: result.accessToken,
        refreshToken,
        calendars: list,
        selectedCalendarIds: new Set(defaultIds),
        syncState: "idle",
        connectionStatus: "connected",
        lastSyncedAt: null,
        isConnecting: false,
        error: null,
      };

      dispatchAccounts({ type: "ADD", account: entry });

      if (replaceAccountId && replaceAccountId !== accountId) {
        managerRef.current?.stop(replaceAccountId);
        dispatchAccounts({ type: "REMOVE", id: replaceAccountId });
        dispatchEvents({ type: "CLEAR_ACCOUNT", accountId: replaceAccountId });
        removeStoredAccount(replaceAccountId);
      }

      upsertStoredAccount({
        id: accountId,
        email: result.accountEmail ?? existingAccount?.email ?? null,
        name: result.accountName ?? existingAccount?.name ?? null,
        photoUrl: result.accountPhotoUrl ?? existingAccount?.photoUrl ?? null,
        accessToken: result.accessToken,
        accessTokenExpiry: buildTokenExpiry(result.expiresInSeconds),
        refreshToken,
        selectedCalendarIds: defaultIds,
        cachedCalendars: toCachedCalendars(list),
      });
    } catch (error) {
      logGoogleCalendarConnectionError(
        replaceAccountId ? "reconnect failed" : "connect failed",
        error,
      );

      if (replaceAccountId) {
        dispatchAccounts({
          type: "SET_CONNECTING",
          id: replaceAccountId,
          value: false,
        });
        dispatchAccounts({
          type: "SET_ERROR",
          id: replaceAccountId,
          error: toErrorMessage(error),
        });
      } else {
        dispatchAccounts({ type: "REMOVE", id: tempId });
      }
    }
  }, []);

  const addAccount = useCallback(async () => {
    await connectAccount();
  }, [connectAccount]);

  const removeAccount = useCallback((accountId: string) => {
    managerRef.current?.stop(accountId);
    dispatchAccounts({ type: "REMOVE", id: accountId });
    dispatchEvents({ type: "CLEAR_ACCOUNT", accountId });
    removeStoredAccount(accountId);

    if (useServerStoredTokens) {
      void disconnectServerStoredGoogleCalendarAccount({ accountId }).catch(() => undefined);
    }
  }, []);

  const toggleCalendar = useCallback(
    (accountId: string, calendarId: string) => {
      dispatchAccounts({
        type: "TOGGLE_CALENDAR",
        id: accountId,
        calendarId,
      });

      const stored = readStoredAccounts().find((a) => a.id === accountId);
      if (!stored) return;

      const next = new Set(stored.selectedCalendarIds);

      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }

      updateStoredAccountCalendarIds(accountId, Array.from(next));
    },
    [],
  );

  const forceSync = useCallback(async (options: GCalForceSyncOptions = {}) => {
    await managerRef.current?.forceSyncAll(options);
  }, []);

  const forceSyncRange = useCallback(async (options: GCalForceSyncOptions) => {
    await managerRef.current?.forceSyncAll(options);
  }, []);

  const retrySync = useCallback(async (accountId: string) => {
    await managerRef.current?.forceSync(accountId);
  }, []);

  const reconnectAccount = useCallback(
    async (accountId: string) => {
      await connectAccount(accountId);
    },
    [connectAccount],
  );

  const isAnyConnecting = accounts.some((account) => account.isConnecting);

  return {
    accounts,
    events,
    selectedCalendarIds,
    addAccount,
    removeAccount,
    toggleCalendar,
    forceSync,
    forceSyncRange,
    retrySync,
    reconnectAccount,
    isAnyConnecting,
  };
};
