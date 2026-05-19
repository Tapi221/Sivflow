import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { refreshCalendarAccessToken } from "./gcal.oauth";
import { fetchCalendarList } from "./gcal.api";
import { GoogleCalendarSyncEngine } from "./GoogleCalendarSyncEngine";
import {
  isStoredTokenValid,
  readStoredAccounts,
  updateStoredAccountCalendarIds,
  updateStoredAccountToken,
  type StoredGoogleAccount,
} from "./gcal.multi-storage";
import type {
  GCalSyncState,
  GoogleCalendarEvent,
  GoogleCalendarListItem,
} from "./gcalSync.types";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Accounts reducer
// ─────────────────────────────────────────────────────────────

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

const reduceAccounts = (
  state: GoogleAccountEntry[],
  action: AccountsAction,
): GoogleAccountEntry[] => {
  switch (action.type) {
    case "ADD":
      if (state.find((a) => a.id === action.account.id)) {
        return state.map((a) =>
          a.id === action.account.id
            ? {
                ...a,
                accessToken: action.account.accessToken,
                refreshToken: action.account.refreshToken ?? a.refreshToken,
                error: null,
              }
            : a,
        );
      }
      return [...state, action.account];

    case "REMOVE":
      return state.filter((a) => a.id !== action.id);

    case "SET_CONNECTING":
      return state.map((a) =>
        a.id === action.id ? { ...a, isConnecting: action.value } : a,
      );

    case "SET_TOKEN":
      return state.map((a) =>
        a.id === action.id
          ? {
              ...a,
              accessToken: action.accessToken,
              ...(action.refreshToken
                ? { refreshToken: action.refreshToken }
                : {}),
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
        if (next.has(action.calendarId)) next.delete(action.calendarId);
        else next.add(action.calendarId);
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

// ─────────────────────────────────────────────────────────────
// Events reducer
// ─────────────────────────────────────────────────────────────

type EventsState = Map<string, Map<string, GoogleCalendarEvent>>;

type EventsAction =
  | { type: "UPSERT"; accountId: string; event: GoogleCalendarEvent }
  | { type: "DELETE"; eventId: string }
  | { type: "CLEAR_ACCOUNT"; accountId: string };

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
      for (const [accountId, bucket] of next) {
        if (bucket.has(action.eventId)) {
          const newBucket = new Map(bucket);
          newBucket.delete(action.eventId);
          next.set(accountId, newBucket);
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

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const storedToEntry = (stored: StoredGoogleAccount): GoogleAccountEntry => ({
  id: stored.id,
  email: stored.email,
  accessToken: isStoredTokenValid(stored) ? stored.accessToken : null,
  refreshToken: stored.refreshToken,
  calendars: [],
  selectedCalendarIds: new Set(stored.selectedCalendarIds),
  syncState: "idle",
  isConnecting: false,
  error: null,
});

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

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

  const enginesRef = useRef(new Map<string, GoogleCalendarSyncEngine>());
  const engineStartStateRef = useRef(
    new Map<string, { token: string; calIds: string }>(),
  );
  const calendarsRef = useRef(new Map<string, GoogleCalendarListItem[]>());

  const accountsRef = useRef(accounts);
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  const events = useMemo(() => {
    const all: GoogleCalendarEvent[] = [];
    for (const bucket of eventsState.values()) {
      for (const event of bucket.values()) {
        all.push(event);
      }
    }
    return all;
  }, [eventsState]);

  // ─────────────────────────────────────────────
  // engine factory
  // ─────────────────────────────────────────────

  const createEngine = useCallback((accountId: string) => {
    const silentReconnect = async (): Promise<boolean> => {
      try {
        const stored = readStoredAccounts().find((a) => a.id === accountId);
        if (!stored?.refreshToken) return false;

        const result = await refreshCalendarAccessToken({
          refreshToken: stored.refreshToken,
        });

        updateStoredAccountToken(
          accountId,
          result.accessToken,
          result.refreshToken,
        );

        dispatchAccounts({
          type: "SET_TOKEN",
          id: accountId,
          accessToken: result.accessToken,
          ...(result.refreshToken ? { refreshToken: result.refreshToken } : {}),
        });

        const list = await fetchCalendarList(result.accessToken);

        calendarsRef.current.set(accountId, list);

        dispatchAccounts({
          type: "SET_CALENDARS",
          id: accountId,
          calendars: list,
        });

        const defaultIds = list
          .filter((c) => c.selected || c.primary)
          .map((c) => c.id);

        updateStoredAccountCalendarIds(accountId, defaultIds);

        dispatchAccounts({
          type: "SET_CALENDAR_IDS",
          id: accountId,
          ids: defaultIds,
        });

        return true;
      } catch {
        return false;
      }
    };

    return new GoogleCalendarSyncEngine({
      onEventAdded: (event) =>
        dispatchEvents({ type: "UPSERT", accountId, event }),

      onEventUpdated: (event) =>
        dispatchEvents({ type: "UPSERT", accountId, event }),

      onEventDeleted: (eventId) => dispatchEvents({ type: "DELETE", eventId }),

      onSyncStateChange: (syncState) =>
        dispatchAccounts({
          type: "SET_SYNC_STATE",
          id: accountId,
          syncState,
        }),

      onLastSyncedAtChange: () => {},

      onError: (err) =>
        dispatchAccounts({
          type: "SET_ERROR",
          id: accountId,
          error: err instanceof Error ? err.message : String(err),
        }),

      getAccessToken: () => {
        const stored = readStoredAccounts().find((a) => a.id === accountId);
        return stored && isStoredTokenValid(stored) ? stored.accessToken : null;
      },

      silentReconnect,
    });
  }, []);

  // ─────────────────────────────────────────────
  // engine lifecycle

  useEffect(() => {
    for (const account of accounts) {
      const { id, accessToken, selectedCalendarIds } = account;

      const calIdsKey = Array.from(selectedCalendarIds).sort().join(",");

      if (!accessToken || selectedCalendarIds.size === 0) {
        enginesRef.current.get(id)?.stop();
        engineStartStateRef.current.delete(id);
        continue;
      }

      const prev = engineStartStateRef.current.get(id);
      const tokenChanged = prev?.token !== accessToken;
      const calChanged = prev?.calIds !== calIdsKey;

      if (!tokenChanged && !calChanged) continue;

      let engine = enginesRef.current.get(id);
      if (!engine) {
        engine = createEngine(id);
        enginesRef.current.set(id, engine);
      }

      const list = calendarsRef.current.get(id) ?? account.calendars;

      engine.start({
        accessToken,
        selectedCalendarIds,
        calendars: list,
      });

      engineStartStateRef.current.set(id, {
        token: accessToken,
        calIds: calIdsKey,
      });
    }

    for (const [id, engine] of enginesRef.current) {
      if (!accounts.find((a) => a.id === id)) {
        engine.stop();
        enginesRef.current.delete(id);
        engineStartStateRef.current.delete(id);
      }
    }
  }, [accounts, createEngine]);

  // ─────────────────────────────────────────────
  // mount cleanup
  // ─────────────────────────────────────────────

  useEffect(() => {
    return () => {
      for (const e of enginesRef.current.values()) e.stop();
    };
  }, []);

  return {
    accounts,
    events,
    selectedCalendarIds: useMemo(() => {
      const all = new Set<string>();
      for (const a of accounts) {
        for (const id of a.selectedCalendarIds) all.add(id);
      }
      return all;
    }, [accounts]),
    addAccount: useCallback(async () => {}, []),
    removeAccount: useCallback(() => {}, []),
    toggleCalendar: useCallback(() => {}, []),
    forceSync: useCallback(async () => {}, []),
    isAnyConnecting: accounts.some((a) => a.isConnecting),
  };
};
