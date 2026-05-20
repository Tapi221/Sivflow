import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import {
  requestCalendarAccessToken,
  refreshCalendarAccessToken,
} from "./gcal.oauth";
import { fetchCalendarList } from "./gcal.api";
import { GoogleCalendarSyncEngine } from "../googlecalendar-sync/GoogleCalendarSyncEngine";

import {
  isStoredTokenValid,
  readStoredAccounts,
  updateStoredAccountCalendarIds,
  updateStoredAccountToken,
  upsertStoredAccount,
  removeStoredAccount,
  buildTokenExpiry,
  type StoredGoogleAccount,
} from "./gcal.multi-storage";

import type {
  GCalSyncState,
  GoogleCalendarEvent,
  GoogleCalendarListItem,
} from "./gcalSync.types";

import { GoogleCalendarEngineManager } from "./GoogleCalendarEngineManager";

// ─────────────────────────────
// Types
// ─────────────────────────────

export type GoogleAccountEntry = {
  id: string;
  email: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  calendars: GoogleCalendarListItem[];
  selectedCalendarIds: Set<string>;
  syncState: GCalSyncState;
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
      refreshToken?: string;
    }
  | { type: "SET_CALENDARS"; id: string; calendars: GoogleCalendarListItem[] }
  | { type: "SET_CALENDAR_IDS"; id: string; ids: string[] }
  | { type: "TOGGLE_CALENDAR"; id: string; calendarId: string }
  | { type: "SET_SYNC_STATE"; id: string; syncState: GCalSyncState }
  | { type: "SET_ERROR"; id: string; error: string | null };

type EventsState = Map<string, Map<string, GoogleCalendarEvent>>;

type EventsAction =
  | { type: "UPSERT"; accountId: string; event: GoogleCalendarEvent }
  | { type: "DELETE"; eventId: string }
  | { type: "CLEAR_ACCOUNT"; accountId: string };

// ─────────────────────────────
// Reducers
// ─────────────────────────────

const reduceAccounts = (
  state: GoogleAccountEntry[],
  action: AccountsAction,
): GoogleAccountEntry[] => {
  switch (action.type) {
    case "ADD": {
      const exists = state.find((a) => a.id === action.account.id);
      if (exists) {
        return state.map((a) =>
          a.id === action.account.id
            ? { ...a, ...action.account, error: null }
            : a,
        );
      }
      return [...state, action.account];
    }

    case "REMOVE":
      return state.filter((a) => a.id !== action.id);

    case "SET_TOKEN":
      return state.map((a) =>
        a.id === action.id
          ? {
              ...a,
              accessToken: action.accessToken,
              refreshToken: action.refreshToken ?? a.refreshToken,
            }
          : a,
      );

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
        a.id === action.id ? { ...a, syncState: action.syncState } : a,
      );

    case "SET_ERROR":
      return state.map((a) =>
        a.id === action.id ? { ...a, error: action.error } : a,
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
      const bucket = new Map(next.get(action.accountId) ?? new Map());
      bucket.set(action.event.id, action.event);
      next.set(action.accountId, bucket);
      return next;
    }

    case "DELETE": {
      const next = new Map(state);
      for (const [, bucket] of next) {
        if (bucket.has(action.eventId)) {
          const copy = new Map(bucket);
          copy.delete(action.eventId);
          next.set(action.eventId, copy);
          break;
        }
      }
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

// ─────────────────────────────
// helpers
// ─────────────────────────────

const storedToEntry = (stored: StoredGoogleAccount): GoogleAccountEntry => ({
  id: stored.id,
  email: stored.email,
  accessToken: isStoredTokenValid(stored) ? stored.accessToken : null,
  refreshToken: stored.refreshToken,
  calendars: stored.cachedCalendars ?? [],
  selectedCalendarIds: new Set(stored.selectedCalendarIds),
  syncState: "idle",
  isConnecting: false,
  error: null,
});

// ─────────────────────────────
// Hook
// ─────────────────────────────

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

  // ★ state参照を安定化
  const accountsRef = useRef(accounts);
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  // ─────────────────────────────
  // engine init
  // ─────────────────────────────

  useEffect(() => {
    if (managerRef.current) return;

    managerRef.current = new GoogleCalendarEngineManager({
      createEngine: (accountId: string) =>
        new GoogleCalendarSyncEngine({
          onEventAdded: (event) =>
            dispatchEvents({ type: "UPSERT", accountId, event }),

          onEventUpdated: (event) =>
            dispatchEvents({ type: "UPSERT", accountId, event }),

          onEventDeleted: (eventId) =>
            dispatchEvents({ type: "DELETE", eventId }),

          onSyncStateChange: (syncState) =>
            dispatchAccounts({
              type: "SET_SYNC_STATE",
              id: accountId,
              syncState,
            }),
          onLastSyncedAtChange: (_at: Date) => {
            // マルチアカウントでは最終同期時刻をアカウント単位で管理しないため無視
          },

          onError: (err) =>
            dispatchAccounts({
              type: "SET_ERROR",
              id: accountId,
              error: err instanceof Error ? err.message : String(err),
            }),

          getAccessToken: () => {
            const a = accountsRef.current.find((x) => x.id === accountId);
            return a?.accessToken ?? null;
          },

          silentReconnect: async () => {
            const a = accountsRef.current.find((x) => x.id === accountId);
            if (!a?.refreshToken) return false;

            try {
              const result = await refreshCalendarAccessToken({
                refreshToken: a.refreshToken,
              });

              updateStoredAccountToken(
                accountId,
                result.accessToken,
                result.refreshToken,
              );

              const list = await fetchCalendarList(result.accessToken);

              dispatchAccounts({
                type: "SET_TOKEN",
                id: accountId,
                accessToken: result.accessToken,
              });

              dispatchAccounts({
                type: "SET_CALENDARS",
                id: accountId,
                calendars: list,
              });

              managerRef.current?.getEngine(accountId)?.forceSync?.();

              return true;
            } catch {
              return false;
            }
          },
        }),
    });
  }, []);

  // ─────────────────────────────
  // hydration
  // ─────────────────────────────

  useEffect(() => {
    const storedAccounts = readStoredAccounts();

    for (const stored of storedAccounts) {
      const accountId = stored.id;

      if (isStoredTokenValid(stored) && stored.accessToken) {
        fetchCalendarList(stored.accessToken)
          .then((list) => {
            dispatchAccounts({
              type: "SET_CALENDARS",
              id: accountId,
              calendars: list,
            });

            const defaultIds = list
              .filter((c) => c.primary || c.selected)
              .map((c) => c.id);

            updateStoredAccountCalendarIds(accountId, defaultIds);

            dispatchAccounts({
              type: "SET_CALENDAR_IDS",
              id: accountId,
              ids: defaultIds,
            });
          })
          .catch(() => {});
      }
    }
  }, []);

  // ─────────────────────────────
  // engine sync
  // ─────────────────────────────

  useEffect(() => {
    for (const a of accounts) {
      managerRef.current?.upsert(a.id, {
        accessToken: a.accessToken!,
        selectedCalendarIds: a.selectedCalendarIds,
        calendars: a.calendars,
      });
    }
  }, [accounts]);

  useEffect(() => {
    return () => managerRef.current?.stopAll();
  }, []);

  // ─────────────────────────────
  // derived
  // ─────────────────────────────

  const events = useMemo(() => {
    const all: GoogleCalendarEvent[] = [];
    for (const bucket of eventsState.values()) {
      for (const e of bucket.values()) all.push(e);
    }
    return all;
  }, [eventsState]);

  const selectedCalendarIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts) {
      for (const id of a.selectedCalendarIds) set.add(id);
    }
    return set;
  }, [accounts]);

  // ─────────────────────────────
  // actions
  // ─────────────────────────────

  const addAccount = useCallback(async () => {
    const { auth } = await import("@/services/firebase");

    const tempId = `connecting-${Date.now()}`;

    dispatchAccounts({
      type: "ADD",
      account: {
        id: tempId,
        email: null,
        accessToken: null,
        refreshToken: null,
        calendars: [],
        selectedCalendarIds: new Set(),
        syncState: "idle",
        isConnecting: true,
        error: null,
      },
    });

    try {
      const result = await requestCalendarAccessToken(auth);
      const list = await fetchCalendarList(result.accessToken);

      const accountId = result.accountEmail ?? `account-${Date.now()}`;

      dispatchAccounts({ type: "REMOVE", id: tempId });

      const defaultIds = list
        .filter((c) => c.primary || c.selected)
        .map((c) => c.id);

      const entry: GoogleAccountEntry = {
        id: accountId,
        email: result.accountEmail,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? null,
        calendars: list,
        selectedCalendarIds: new Set(defaultIds),
        syncState: "idle",
        isConnecting: false,
        error: null,
      };

      dispatchAccounts({ type: "ADD", account: entry });

      upsertStoredAccount({
        id: accountId,
        email: result.accountEmail,
        accessToken: result.accessToken,
        accessTokenExpiry: buildTokenExpiry(),
        refreshToken: result.refreshToken ?? null,
        selectedCalendarIds: defaultIds,
        cachedCalendars: list.map(({ id, summary, backgroundColor }) => ({
          id,
          summary,
          backgroundColor,
        })),
      });
    } catch {
      dispatchAccounts({ type: "REMOVE", id: tempId });
    }
  }, []);

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

  return {
    accounts,
    events,
    selectedCalendarIds,
    addAccount,
    removeAccount,
    toggleCalendar,
  };
};
