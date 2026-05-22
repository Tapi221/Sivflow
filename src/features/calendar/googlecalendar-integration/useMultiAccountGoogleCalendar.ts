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
} from "./gcal.oauth";
import type {
  GCalSyncState,
  GCalConnectionStatus,
  GCalForceSyncOptions,
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
  calendars.map(({ id, summary, backgroundColor }) => ({
    id,
    summary,
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
  return storedIds.length > 0 ? storedIds : getDefaultCalendarIds(calendars);
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!(error instanceof Error)) return undefined;
  return (error as Error & { status?: number }).status;
};

const isUnauthorizedError = (error: unknown): boolean =>
  getErrorStatus(error) === 401;

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const requestSilentAccessToken = async () => {
  const { auth } = await import("@/services/firebase");
  return requestCalendarAccessToken(auth, true);
};

const storedToEntry = (stored: StoredGoogleAccount): GoogleAccountEntry => ({
  id: stored.id,
  email: stored.email,
  name: stored.name ?? null,
  photoUrl: stored.photoUrl ?? null,
  accessToken: isStoredTokenValid(stored) ? stored.accessToken : null,
  refreshToken: stored.refreshToken,
  calendars: stored.cachedCalendars ?? [],
  selectedCalendarIds: new Set(stored.selectedCalendarIds),
  syncState:
    isStoredTokenValid(stored) || stored.refreshToken ? "idle" : "needsReconnect",
  connectionStatus:
    isStoredTokenValid(stored) || stored.refreshToken
      ? "connected"
      : "needsReconnect",
  lastSyncedAt: null,
  isConnecting: false,
  error:
    isStoredTokenValid(stored) || stored.refreshToken
      ? null
      : "Google Calendar の再連携が必要です",
});

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

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

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
              result = account.refreshToken
                ? await refreshCalendarAccessToken({
                  refreshToken: account.refreshToken,
                })
                : await requestSilentAccessToken();
            } catch {
              dispatchAccounts({ type: "NEEDS_RECONNECT", id: accountId });
              return false;
            }

            const refreshToken = result.refreshToken ?? account.refreshToken ?? null;

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
              if (isUnauthorizedError(error)) {
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

            accountsRef.current = accountsRef.current.map((current) =>
              current.id === accountId
                ? {
                  ...current,
                  calendars: list,
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
              type: "SET_ERROR",
              id: accountId,
              error: null,
            });

            return true;
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
          result = stored.refreshToken
            ? await refreshCalendarAccessToken({
              refreshToken: stored.refreshToken,
            })
            : await requestSilentAccessToken();
        } catch (error) {
          dispatchAccounts({
            type: "NEEDS_RECONNECT",
            id: accountId,
            error: toErrorMessage(error),
          });
          return;
        }

        try {
          await applyAccessToken(
            result.accessToken,
            result.refreshToken ?? stored.refreshToken,
            buildTokenExpiry(result.expiresInSeconds),
            result.accountName,
            result.accountPhotoUrl,
          );
        } catch (error) {
          if (isUnauthorizedError(error)) {
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
          if (isUnauthorizedError(error)) {
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

    try {
      const result = await requestCalendarAccessToken(auth);
      const list = await fetchCalendarList(result.accessToken);

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

      dispatchAccounts({ type: "REMOVE", id: tempId });

      const defaultIds = resolveSelectedCalendarIds(
        existingAccount
          ? Array.from(existingAccount.selectedCalendarIds)
          : (storedAccount?.selectedCalendarIds ?? []),
        list,
      );

      const refreshToken =
        result.refreshToken ??
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
    } catch {
      dispatchAccounts({ type: "REMOVE", id: tempId });
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