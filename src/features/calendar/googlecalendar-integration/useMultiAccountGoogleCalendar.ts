import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { requestCalendarAccessToken, refreshCalendarAccessToken } from "./gcal.oauth";
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
  | { type: "SET_TOKEN"; id: string; accessToken: string; refreshToken?: string }
  | { type: "SET_CALENDARS"; id: string; calendars: GoogleCalendarListItem[] }
  | { type: "SET_CALENDAR_IDS"; id: string; ids: string[] }
  | { type: "TOGGLE_CALENDAR"; id: string; calendarId: string }
  | { type: "SET_SYNC_STATE"; id: string; syncState: GCalSyncState }
  | { type: "SET_ERROR"; id: string; error: string | null };

const reduceAccounts = (
  state: GoogleAccountEntry[],
  action: AccountsAction,
) => {
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
              ...(action.refreshToken ? { refreshToken: action.refreshToken } : {}),
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

const reduceEvents = (state: EventsState, action: EventsAction) => {
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
          const copy = new Map(bucket);
          copy.delete(action.eventId);
          next.set(accountId, copy);
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
// helpers
// ─────────────────────────────────────────────────────────────

const storedToEntry = (stored: StoredGoogleAccount): GoogleAccountEntry => ({
  id: stored.id,
  email: stored.email,
  accessToken: isStoredTokenValid(stored) ? stored.accessToken : null,
  refreshToken: stored.refreshToken,
  calendars: [],                                    // カレンダーは後で fetch する
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

  const managerRef = useRef<GoogleCalendarEngineManager | null>(null);

  if (!managerRef.current) {
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
            dispatchAccounts({ type: "SET_SYNC_STATE", id: accountId, syncState }),
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
          silentReconnect: async () => {
            const stored = readStoredAccounts().find((a) => a.id === accountId);
            if (!stored?.refreshToken) return false;

            try {
              const result = await refreshCalendarAccessToken({
                refreshToken: stored.refreshToken,
              });

              updateStoredAccountToken(accountId, result.accessToken, result.refreshToken);

              const list = await fetchCalendarList(result.accessToken);

              dispatchAccounts({ type: "SET_TOKEN", id: accountId, accessToken: result.accessToken });
              dispatchAccounts({ type: "SET_CALENDARS", id: accountId, calendars: list });

              const defaultIds = list
                .filter((c) => c.selected || c.primary)
                .map((c) => c.id);

              updateStoredAccountCalendarIds(accountId, defaultIds);
              dispatchAccounts({ type: "SET_CALENDAR_IDS", id: accountId, ids: defaultIds });

              return true;
            } catch {
              return false;
            }
          },
        }),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ★ BUGFIX: マウント時にカレンダー一覧を取得する
  //
  // storedToEntry は calendars: [] で初期化するため、
  // アプリ再起動後にカレンダー一覧が「カレンダーなし」になっていた。
  // トークンが有効なアカウントは直接 fetchCalendarList、
  // 期限切れのアカウントは silentReconnect 経由で取得する。
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedAccounts = readStoredAccounts();

    for (const stored of storedAccounts) {
      const accountId = stored.id;

      if (isStoredTokenValid(stored) && stored.accessToken) {
        // トークンが有効 → カレンダー一覧を直接取得
        fetchCalendarList(stored.accessToken)
          .then((list) => {
            dispatchAccounts({ type: "SET_CALENDARS", id: accountId, calendars: list });

            // selectedCalendarIds が空の場合はデフォルトを設定
            if (stored.selectedCalendarIds.length === 0) {
              const defaultIds = list
                .filter((c) => c.selected || c.primary)
                .map((c) => c.id);
              updateStoredAccountCalendarIds(accountId, defaultIds);
              dispatchAccounts({ type: "SET_CALENDAR_IDS", id: accountId, ids: defaultIds });
            }
          })
          .catch(() => {
            // fetch 失敗時は silentReconnect を試みる
            if (stored.refreshToken) {
              refreshCalendarAccessToken({ refreshToken: stored.refreshToken })
                .then(async (result) => {
                  updateStoredAccountToken(accountId, result.accessToken, result.refreshToken);
                  const list = await fetchCalendarList(result.accessToken);

                  dispatchAccounts({ type: "SET_TOKEN", id: accountId, accessToken: result.accessToken });
                  dispatchAccounts({ type: "SET_CALENDARS", id: accountId, calendars: list });

                  const defaultIds = list.filter((c) => c.selected || c.primary).map((c) => c.id);
                  updateStoredAccountCalendarIds(accountId, defaultIds);
                  dispatchAccounts({ type: "SET_CALENDAR_IDS", id: accountId, ids: defaultIds });
                })
                .catch((err) => {
                  dispatchAccounts({
                    type: "SET_ERROR",
                    id: accountId,
                    error: err instanceof Error ? err.message : "Token refresh failed",
                  });
                });
            }
          });
      } else if (stored.refreshToken) {
        // トークン期限切れ → リフレッシュ
        refreshCalendarAccessToken({ refreshToken: stored.refreshToken })
          .then(async (result) => {
            updateStoredAccountToken(accountId, result.accessToken, result.refreshToken);
            const list = await fetchCalendarList(result.accessToken);

            dispatchAccounts({ type: "SET_TOKEN", id: accountId, accessToken: result.accessToken });
            dispatchAccounts({ type: "SET_CALENDARS", id: accountId, calendars: list });

            const defaultIds = list.filter((c) => c.selected || c.primary).map((c) => c.id);
            updateStoredAccountCalendarIds(accountId, defaultIds);
            dispatchAccounts({ type: "SET_CALENDAR_IDS", id: accountId, ids: defaultIds });
          })
          .catch((err) => {
            dispatchAccounts({
              type: "SET_ERROR",
              id: accountId,
              error: err instanceof Error ? err.message : "Token refresh failed",
            });
          });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // マウント時に1回だけ実行

  // ─────────────────────────────────────────────────────────────
  // engine sync
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    for (const a of accounts) {
      managerRef.current!.upsert(a.id, {
        accessToken: a.accessToken!,
        selectedCalendarIds: a.selectedCalendarIds,
        calendars: a.calendars,
      });
    }

    for (const id of managerRef.current!.getActiveIds()) {
      if (!accounts.find((a) => a.id === id)) {
        managerRef.current!.stop(id);
      }
    }
  }, [accounts]);

  useEffect(() => {
    return () => {
      managerRef.current?.stopAll();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // derived state
  // ─────────────────────────────────────────────────────────────

  const events = useMemo(() => {
    const all: GoogleCalendarEvent[] = [];
    for (const bucket of eventsState.values()) {
      for (const e of bucket.values()) {
        all.push(e);
      }
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

  const isAnyConnecting = accounts.some((a) => a.isConnecting);

  // ─────────────────────────────────────────────────────────────
  // ★ BUGFIX: スタブだった各 callback を実装
  // ─────────────────────────────────────────────────────────────

  /** Google アカウントを新規追加して OAuth フローを開始する */
  const addAccount = useCallback(async () => {
    // auth インスタンスが必要な場合は引数で受け取るか、
    // firebase の auth をインポートして使用する
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
      const defaultIds = list.filter((c) => c.selected || c.primary).map((c) => c.id);

      // tempId を削除して正式なアカウントを追加
      dispatchAccounts({ type: "REMOVE", id: tempId });

      const newEntry: GoogleAccountEntry = {
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

      dispatchAccounts({ type: "ADD", account: newEntry });

      // localStorage に永続化
      upsertStoredAccount({
        id: accountId,
        email: result.accountEmail,
        accessToken: result.accessToken,
        accessTokenExpiry: buildTokenExpiry(),
        refreshToken: result.refreshToken ?? null,
        selectedCalendarIds: defaultIds,
      });
    } catch (err) {
      dispatchAccounts({ type: "REMOVE", id: tempId });
      console.error("[addAccount] failed:", err);
    }
  }, []);

  /** アカウントを削除してエンジンを停止する */
  const removeAccount = useCallback((accountId: string) => {
    managerRef.current?.stop(accountId);
    dispatchAccounts({ type: "REMOVE", id: accountId });
    dispatchEvents({ type: "CLEAR_ACCOUNT", accountId });
    removeStoredAccount(accountId);
  }, []);

  /** カレンダーの表示/非表示をトグルする */
  const toggleCalendar = useCallback(
    (accountId: string, calendarId: string) => {
      dispatchAccounts({ type: "TOGGLE_CALENDAR", id: accountId, calendarId });

      // localStorage も更新
      const accounts = readStoredAccounts();
      const stored = accounts.find((a) => a.id === accountId);
      if (stored) {
        const next = new Set(stored.selectedCalendarIds);
        if (next.has(calendarId)) next.delete(calendarId);
        else next.add(calendarId);
        updateStoredAccountCalendarIds(accountId, Array.from(next));
      }
    },
    [],
  );

  /** 全アカウントの同期を強制実行する */
  const forceSync = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    for (const id of manager.getActiveIds()) {
      const engine = (manager as any).engines?.get(id);
      if (engine && typeof engine.forceSync === "function") {
        await engine.forceSync();
      }
    }
  }, []);

  return {
    accounts,
    events,
    selectedCalendarIds,
    isAnyConnecting,
    addAccount,
    removeAccount,
    toggleCalendar,
    forceSync,
  };
};