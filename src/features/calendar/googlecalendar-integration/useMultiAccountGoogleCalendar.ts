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
  GCalSilentReconnectResult,
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

const useServerStoredTokens = isServerStoredGoogleOAuthEnabled();
const CALENDAR_LIST_FOCUS_REFRESH_THROTTLE_MS = 10_000;

const overlapsRange = (
  event: GoogleCalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
) => event.startsAt < rangeEnd && event.endsAt > rangeStart;

const toCachedCalendars = (calendars: GoogleCalendarListItem[]) =>
  calendars.map(({ id, summary, summaryOverride, backgroundColor }) => ({
    id,
    summary,
    summaryOverride,
    backgroundColor,
  }));

const getDefaultCalendarIds = (calendars: GoogleCalendarListItem[]): string[] =>
  calendars
    .filter((calendar) => calendar.primary || calendar.selected)
    .map((calendar) => calendar.id);

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

const isUnauthorizedError = (error: unknown): boolean => getErrorStatus(error) === 401;

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

const requestSilentAccessToken = async () => {
  const { auth } = await import("@/services/firebase");
  return requestCalendarAccessToken(auth, true);
};

const logGoogleCalendarConnectionError = (
  context: string,
  error: unknown,
): void => {
  console.error(`[GoogleCalendar] ${context}`, error);
};

const reduceAccounts = (
  state: GoogleAccountEntry[],
  action: AccountsAction,
): GoogleAccountEntry[] => {
  switch (action.type) {
    case "ADD":
      return state.some((account) => account.id === action.account.id)
        ? state.map((account) =>
          account.id === action.account.id ? action.account : account,
        )
        : [...state, action.account];

    case "REMOVE":
      return state.filter((account) => account.id !== action.id);

    case "SET_CONNECTING":
      return state.map((account) =>
        account.id === action.id
          ? { ...account, isConnecting: action.value }
          : account,
      );

    case "SET_TOKEN":
      return state.map((account) => {
        if (account.id !== action.id) return account;

        return {
          ...account,
          accessToken: action.accessToken,
          name: action.accountName ?? account.name,
          photoUrl: action.accountPhotoUrl ?? account.photoUrl,
          connectionStatus: "connected",
          syncState: account.syncState === "needsReconnect" ? "idle" : account.syncState,
          error: null,
          ...(action.refreshToken !== undefined
            ? { refreshToken: action.refreshToken }
            : {}),
        };
      });

    case "SET_CALENDARS":
      return state.map((account) =>
        account.id === action.id
          ? { ...account, calendars: action.calendars }
          : account,
      );

    case "SET_CALENDAR_IDS":
      return state.map((account) =>
        account.id === action.id
          ? { ...account, selectedCalendarIds: new Set(action.ids) }
          : account,
      );

    case "TOGGLE_CALENDAR":
      return state.map((account) => {
        if (account.id !== action.id) return account;

        const next = new Set(account.selectedCalendarIds);

        if (next.has(action.calendarId)) {
          next.delete(action.calendarId);
        } else {
          next.add(action.calendarId);
        }

        return { ...account, selectedCalendarIds: next };
      });

    case "SET_SYNC_STATE":
      return state.map((account) =>
        account.id === action.id
          ? {
            ...account,
            syncState: action.syncState,
            connectionStatus:
                action.syncState === "needsReconnect"
                  ? "needsReconnect"
                  : action.syncState === "error"
                    ? "error"
                    : account.accessToken
                      ? "connected"
                      : account.connectionStatus,
            error:
                action.syncState === "idle" && account.connectionStatus === "error"
                  ? null
                  : account.error,
          }
          : account,
      );

    case "SET_LAST_SYNCED_AT":
      return state.map((account) =>
        account.id === action.id ? { ...account, lastSyncedAt: action.at } : account,
      );

    case "NEEDS_RECONNECT":
      return state.map((account) =>
        account.id === action.id
          ? {
            ...account,
            accessToken: null,
            connectionStatus: "needsReconnect",
            syncState: "needsReconnect",
            error: action.error ?? "Google Calendar の再連携が必要です",
          }
          : account,
      );

    case "SET_ERROR":
      return state.map((account) =>
        account.id === action.id
          ? {
            ...account,
            error: action.error,
            connectionStatus:
                action.error && account.syncState !== "needsReconnect"
                  ? "error"
                  : account.connectionStatus,
          }
          : account,
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

const storedToEntry = (stored: StoredGoogleAccount): GoogleAccountEntry => {
  const calendars = stored.cachedCalendars ?? [];
  const selectedCalendarIds = resolveSelectedCalendarIds(
    stored.selectedCalendarIds,
    calendars,
  );
  const canReconnect = isStoredTokenValid(stored) || stored.refreshToken || useServerStoredTokens;

  return {
    id: stored.id,
    email: stored.email,
    name: stored.name ?? null,
    photoUrl: stored.photoUrl ?? null,
    accessToken: isStoredTokenValid(stored) ? stored.accessToken : null,
    refreshToken: stored.refreshToken,
    calendars,
    selectedCalendarIds: new Set(selectedCalendarIds),
    syncState: canReconnect ? "idle" : "needsReconnect",
    connectionStatus: canReconnect ? "connected" : "needsReconnect",
    lastSyncedAt: null,
    isConnecting: false,
    error: canReconnect ? null : "Google Calendar の再連携が必要です",
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
  const lastCalendarListRefreshAtRef = useRef(0);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  const applyAccountToken = useCallback(({
    accountId,
    accessToken,
    refreshToken,
    accountName,
    accountPhotoUrl,
    expiresInSeconds,
  }: {
    accountId: string;
    accessToken: string;
    refreshToken?: string | null;
    accountName?: string | null;
    accountPhotoUrl?: string | null;
    expiresInSeconds?: number | null;
  }) => {
    updateStoredAccountToken(
      accountId,
      accessToken,
      refreshToken,
      { name: accountName, photoUrl: accountPhotoUrl },
      expiresInSeconds,
    );

    accountsRef.current = accountsRef.current.map((account) =>
      account.id === accountId
        ? {
          ...account,
          accessToken,
          name: accountName ?? account.name,
          photoUrl: accountPhotoUrl ?? account.photoUrl,
          connectionStatus: "connected",
          syncState: account.syncState === "needsReconnect" ? "idle" : account.syncState,
          error: null,
          ...(refreshToken !== undefined ? { refreshToken } : {}),
        }
        : account,
    );

    dispatchAccounts({
      type: "SET_TOKEN",
      id: accountId,
      accessToken,
      refreshToken,
      accountName,
      accountPhotoUrl,
    });
  }, []);

  const getRecoverableAccessToken = useCallback(async (
    accountId: string,
    account: GoogleAccountEntry,
  ): Promise<string> => {
    const latestAccount = accountsRef.current.find((x) => x.id === accountId) ?? account;
    const result = useServerStoredTokens
      ? await getServerStoredGoogleCalendarAccessToken({ accountId })
      : latestAccount.refreshToken
        ? await refreshCalendarAccessToken({ refreshToken: latestAccount.refreshToken })
        : await requestSilentAccessToken();
    const refreshToken = useServerStoredTokens
      ? null
      : result.refreshToken ?? latestAccount.refreshToken ?? null;

    applyAccountToken({
      accountId,
      accessToken: result.accessToken,
      refreshToken,
      accountName: result.accountName,
      accountPhotoUrl: result.accountPhotoUrl,
      expiresInSeconds: result.expiresInSeconds,
    });

    return result.accessToken;
  }, [applyAccountToken]);

  const applyCalendarList = useCallback(({
    accountId,
    accessToken,
    refreshToken,
    calendars,
    selectedCalendarIds,
  }: {
    accountId: string;
    accessToken: string | null;
    refreshToken: string | null;
    calendars: GoogleCalendarListItem[];
    selectedCalendarIds: string[];
  }) => {
    const stored = readStoredAccounts().find((account) => account.id === accountId);

    if (stored) {
      upsertStoredAccount({
        ...stored,
        accessToken,
        refreshToken,
        selectedCalendarIds,
        cachedCalendars: toCachedCalendars(calendars),
      });
    }

    accountsRef.current = accountsRef.current.map((account) =>
      account.id === accountId
        ? {
          ...account,
          accessToken,
          refreshToken,
          calendars,
          selectedCalendarIds: new Set(selectedCalendarIds),
          error: null,
        }
        : account,
    );

    dispatchAccounts({ type: "SET_CALENDARS", id: accountId, calendars });
    dispatchAccounts({ type: "SET_CALENDAR_IDS", id: accountId, ids: selectedCalendarIds });
    dispatchAccounts({ type: "SET_ERROR", id: accountId, error: null });
  }, []);

  const refreshAccountCalendarList = useCallback(async (accountId: string) => {
    if (refreshingCalendarListIdsRef.current.has(accountId)) return;

    const account = accountsRef.current.find((x) => x.id === accountId);
    if (!account || account.connectionStatus !== "connected") return;

    refreshingCalendarListIdsRef.current.add(accountId);

    try {
      let accessToken = account.accessToken;

      if (!accessToken) {
        accessToken = await getRecoverableAccessToken(accountId, account);
      }

      let list: GoogleCalendarListItem[];

      try {
        list = await fetchCalendarList(accessToken);
      } catch (error) {
        if (!isReconnectRequiredError(error)) throw error;
        accessToken = await getRecoverableAccessToken(accountId, account);
        list = await fetchCalendarList(accessToken);
      }

      const latestAccount = accountsRef.current.find((x) => x.id === accountId) ?? account;
      const ids = resolveSelectedCalendarIds(
        Array.from(latestAccount.selectedCalendarIds),
        list,
      );

      applyCalendarList({
        accountId,
        accessToken,
        refreshToken: latestAccount.refreshToken,
        calendars: list,
        selectedCalendarIds: ids,
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
  }, [applyCalendarList, getRecoverableAccessToken]);

  useEffect(() => {
    if (managerRef.current) return;

    managerRef.current = new GoogleCalendarEngineManager({
      createEngine: (accountId: string) =>
        new GoogleCalendarSyncEngine({
          accountId,
          onEventAdded: (event) => dispatchEvents({ type: "UPSERT", accountId, event }),
          onEventUpdated: (event) => dispatchEvents({ type: "UPSERT", accountId, event }),
          onEventDeleted: (eventId) =>
            dispatchEvents({ type: "DELETE", accountId, eventId }),
          onEventsRangeReplaced: ({ calendarId, rangeStart, rangeEnd, events }) =>
            dispatchEvents({
              type: "REPLACE_RANGE",
              accountId,
              calendarId,
              rangeStart,
              rangeEnd,
              events,
            }),
          onSyncStateChange: (syncState) =>
            dispatchAccounts({ type: "SET_SYNC_STATE", id: accountId, syncState }),
          onLastSyncedAtChange: (at) =>
            dispatchAccounts({ type: "SET_LAST_SYNCED_AT", id: accountId, at }),
          onError: (error) =>
            dispatchAccounts({
              type: "SET_ERROR",
              id: accountId,
              error: error instanceof Error ? error.message : String(error),
            }),
          getAccessToken: () =>
            accountsRef.current.find((account) => account.id === accountId)?.accessToken ?? null,
          silentReconnect: async (): Promise<GCalSilentReconnectResult> => {
            const account = accountsRef.current.find((x) => x.id === accountId);

            if (!account) {
              dispatchAccounts({ type: "NEEDS_RECONNECT", id: accountId });
              return false;
            }

            try {
              const accessToken = await getRecoverableAccessToken(accountId, account);
              const list = await fetchCalendarList(accessToken);
              const latestAccount = accountsRef.current.find((x) => x.id === accountId) ?? account;
              const ids = resolveSelectedCalendarIds(
                Array.from(latestAccount.selectedCalendarIds),
                list,
              );

              applyCalendarList({
                accountId,
                accessToken,
                refreshToken: latestAccount.refreshToken,
                calendars: list,
                selectedCalendarIds: ids,
              });

              return "reconnected";
            } catch (error) {
              console.warn("[GoogleCalendar] silent token refresh failed", error);

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
          },
        }),
    });
  }, [applyCalendarList, getRecoverableAccessToken]);

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

        accountsRef.current = accountsRef.current.map((account) =>
          account.id === accountId
            ? {
              ...account,
              accessToken,
              refreshToken: resolvedRefreshToken,
              name: accountName ?? account.name,
              photoUrl: accountPhotoUrl ?? account.photoUrl,
              calendars: list,
              selectedCalendarIds: new Set(ids),
              connectionStatus: "connected",
              syncState: account.syncState === "needsReconnect" ? "idle" : account.syncState,
              error: null,
            }
            : account,
        );

        dispatchAccounts({ type: "SET_CALENDARS", id: accountId, calendars: list });
        dispatchAccounts({ type: "SET_CALENDAR_IDS", id: accountId, ids });
        dispatchAccounts({ type: "SET_ERROR", id: accountId, error: null });
      };

      const refreshStoredAccount = async () => {
        try {
          const result = useServerStoredTokens
            ? await getServerStoredGoogleCalendarAccessToken({ accountId })
            : stored.refreshToken
              ? await refreshCalendarAccessToken({ refreshToken: stored.refreshToken })
              : await requestSilentAccessToken();

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
              error: toGoogleCalendarAuthErrorMessage(error),
            });
            return;
          }

          dispatchAccounts({
            type: "SET_ERROR",
            id: accountId,
            error: toGoogleCalendarAuthErrorMessage(error),
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

  const refreshableAccountIds = useMemo(
    () =>
      accounts
        .filter((account) => account.connectionStatus === "connected")
        .map((account) => account.id),
    [accounts],
  );
  const refreshableAccountIdsKey = refreshableAccountIds.join("\n");

  useEffect(() => {
    if (refreshableAccountIds.length === 0) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const refreshAllCalendarLists = () => {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();
      if (
        now - lastCalendarListRefreshAtRef.current <
        CALENDAR_LIST_FOCUS_REFRESH_THROTTLE_MS
      ) {
        return;
      }

      lastCalendarListRefreshAtRef.current = now;

      for (const accountId of refreshableAccountIds) {
        void refreshAccountCalendarList(accountId);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAllCalendarLists();
      }
    };

    window.addEventListener("focus", refreshAllCalendarLists);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshAllCalendarLists);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshAccountCalendarList, refreshableAccountIdsKey]);

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
      dispatchAccounts({ type: "SET_CONNECTING", id: replaceAccountId, value: true });
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

      accountsRef.current = accountsRef.current
        .filter((account) => account.id !== tempId)
        .map((account) => (account.id === accountId ? entry : account));

      if (!accountsRef.current.some((account) => account.id === accountId)) {
        accountsRef.current = [...accountsRef.current, entry];
      }

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
        dispatchAccounts({ type: "SET_CONNECTING", id: replaceAccountId, value: false });
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

  const toggleCalendar = useCallback((accountId: string, calendarId: string) => {
    dispatchAccounts({ type: "TOGGLE_CALENDAR", id: accountId, calendarId });

    const account = accountsRef.current.find((a) => a.id === accountId);
    if (!account) return;

    const next = new Set(account.selectedCalendarIds);

    if (next.has(calendarId)) {
      next.delete(calendarId);
    } else {
      next.add(calendarId);
    }

    accountsRef.current = accountsRef.current.map((current) =>
      current.id === accountId
        ? { ...current, selectedCalendarIds: next }
        : current,
    );

    updateStoredAccountCalendarIds(accountId, Array.from(next));
  }, []);

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
