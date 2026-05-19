/**
 * useMultiAccountGoogleCalendar.ts
 *
 * 複数の Google アカウントを管理するフック。
 * 各アカウントごとに同期エンジンを持ち、イベントを統合して返す。
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { auth } from "@/services/firebase";
import {
  requestCalendarAccessToken,
  refreshCalendarAccessToken,
} from "./gcal.oauth";
import { fetchCalendarList } from "./gcal.api";
import { GoogleCalendarSyncEngine } from "./GoogleCalendarSyncEngine";
import {
  buildTokenExpiry,
  isStoredTokenValid,
  readStoredAccounts,
  removeStoredAccount,
  updateStoredAccountCalendarIds,
  updateStoredAccountToken,
  upsertStoredAccount,
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
  | { type: "TOGGLE_CALENDAR"; id: string; calendarId: string }
  | { type: "SET_SYNC_STATE"; id: string; syncState: GCalSyncState }
  | { type: "SET_ERROR"; id: string; error: string | null };

const reduceAccounts = (
  state: GoogleAccountEntry[],
  action: AccountsAction,
): GoogleAccountEntry[] => {
  switch (action.type) {
    case "ADD":
      // 同一IDが既に存在する場合はトークン更新
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

    case "TOGGLE_CALENDAR": {
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
    }

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
// Events reducer（アカウントごとに分けて管理）
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

  // エンジン: accountId → engine
  const enginesRef = useRef<Map<string, GoogleCalendarSyncEngine>>(new Map());
  // エンジンが最後に start() された状態を追跡（不要な再起動を防ぐ）
  const engineStartStateRef = useRef<
    Map<string, { token: string; calIds: string }>
  >(new Map());
  // カレンダー一覧キャッシュ: accountId → calendars
  const calendarsRef = useRef<Map<string, GoogleCalendarListItem[]>>(new Map());
  // 最新の accounts を各コールバックから参照するため
  const accountsRef = useRef(accounts);
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  // ── 統合イベント ──────────────────────────────────────────

  const events = useMemo(() => {
    const all: GoogleCalendarEvent[] = [];
    for (const bucket of eventsState.values()) {
      for (const event of bucket.values()) {
        all.push(event);
      }
    }
    return all;
  }, [eventsState]);

  // ── エンジン生成ファクトリ ──────────────────────────────────

  const createEngine = useCallback(
    (accountId: string): GoogleCalendarSyncEngine => {
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
            ...(result.refreshToken
              ? { refreshToken: result.refreshToken }
              : {}),
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
        onEventDeleted: (eventId) =>
          dispatchEvents({ type: "DELETE", eventId }),
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
            error: err.message,
          }),
        getAccessToken: () => {
          const stored = readStoredAccounts().find((a) => a.id === accountId);
          return stored && isStoredTokenValid(stored)
            ? stored.accessToken
            : null;
        },
        silentReconnect,
      });
    },
    [],
  );

  // ── エンジンのライフサイクル管理 ───────────────────────────
  // accounts が変わるたびに実行するが、token/calendarIds が変わった場合のみ
  // engine を再起動する（syncState 変更などでは起動しない）

  useEffect(() => {
    for (const account of accounts) {
      const { id, accessToken, selectedCalendarIds } = account;
      const calIdsKey = Array.from(selectedCalendarIds).sort().join(",");

      // token なし / カレンダー未選択 → 停止
      if (!accessToken || selectedCalendarIds.size === 0) {
        enginesRef.current.get(id)?.stop();
        engineStartStateRef.current.delete(id);
        continue;
      }

      const prev = engineStartStateRef.current.get(id);
      const tokenChanged = prev?.token !== accessToken;
      const calIdsChanged = prev?.calIds !== calIdsKey;

      if (!tokenChanged && !calIdsChanged) continue;

      // エンジン取得 or 新規作成
      let engine = enginesRef.current.get(id);
      if (!engine) {
        engine = createEngine(id);
        enginesRef.current.set(id, engine);
      }

      const calendarList = calendarsRef.current.get(id) ?? account.calendars;

      engine.start({
        accessToken,
        selectedCalendarIds,
        calendars: calendarList,
      });

      engineStartStateRef.current.set(id, {
        token: accessToken,
        calIds: calIdsKey,
      });
    }

    // 削除されたアカウントのエンジンを停止・破棄
    for (const [id, engine] of enginesRef.current) {
      if (!accounts.find((a) => a.id === id)) {
        engine.stop();
        enginesRef.current.delete(id);
        engineStartStateRef.current.delete(id);
      }
    }
  }, [accounts, createEngine]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      for (const engine of enginesRef.current.values()) {
        engine.stop();
      }
    };
  }, []);

  // ── マウント時: カレンダー一覧の自動取得 ──────────────────

  useEffect(() => {
    for (const account of accountsRef.current) {
      if (account.accessToken && account.calendars.length === 0) {
        void fetchCalendarList(account.accessToken).then((list) => {
          calendarsRef.current.set(account.id, list);
          dispatchAccounts({
            type: "SET_CALENDARS",
            id: account.id,
            calendars: list,
          });
        });
      }
    }
    // マウント時のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── マウント時: サイレント再接続 ──────────────────────────

  useEffect(() => {
    for (const account of accountsRef.current) {
      if (!account.accessToken && account.refreshToken) {
        const stored = readStoredAccounts().find((a) => a.id === account.id);
        if (!stored?.refreshToken) continue;

        void refreshCalendarAccessToken({
          refreshToken: stored.refreshToken,
        })
          .then((result) => {
            updateStoredAccountToken(
              account.id,
              result.accessToken,
              result.refreshToken,
            );
            dispatchAccounts({
              type: "SET_TOKEN",
              id: account.id,
              accessToken: result.accessToken,
              ...(result.refreshToken
                ? { refreshToken: result.refreshToken }
                : {}),
            });
          })
          .catch(() => {
            // サイレント失敗は無視
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── アカウント追加 ────────────────────────────────────────

  const addAccount = useCallback(async () => {
    try {
      // force=false で Google アカウント選択画面を表示
      const result = await requestCalendarAccessToken(auth, false);
      const accountId = result.accountEmail ?? `account-${Date.now()}`;

      const calendarList = await fetchCalendarList(result.accessToken);
      const defaultIds = calendarList
        .filter((c) => c.selected || c.primary)
        .map((c) => c.id);

      const stored: StoredGoogleAccount = {
        id: accountId,
        email: result.accountEmail,
        accessToken: result.accessToken,
        accessTokenExpiry: buildTokenExpiry(),
        refreshToken: result.refreshToken ?? null,
        selectedCalendarIds: defaultIds,
      };

      upsertStoredAccount(stored);
      calendarsRef.current.set(accountId, calendarList);

      const entry: GoogleAccountEntry = {
        id: accountId,
        email: result.accountEmail,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? null,
        calendars: calendarList,
        selectedCalendarIds: new Set(defaultIds),
        syncState: "idle",
        isConnecting: false,
        error: null,
      };

      dispatchAccounts({ type: "ADD", account: entry });
    } catch (error) {
      console.error("[MultiAccount] addAccount failed:", error);
    }
  }, []);

  // ── アカウント削除 ────────────────────────────────────────

  const removeAccount = useCallback((accountId: string) => {
    const engine = enginesRef.current.get(accountId);
    if (engine) {
      engine.stop();
      engine.clearAllSyncTokens();
      enginesRef.current.delete(accountId);
    }
    engineStartStateRef.current.delete(accountId);
    calendarsRef.current.delete(accountId);

    dispatchEvents({ type: "CLEAR_ACCOUNT", accountId });
    dispatchAccounts({ type: "REMOVE", id: accountId });
    removeStoredAccount(accountId);
  }, []);

  // ── カレンダーのオン/オフ ─────────────────────────────────

  const toggleCalendar = useCallback(
    (accountId: string, calendarId: string) => {
      // 最新状態から新しい selectedCalendarIds を計算してストレージに即時反映
      const account = accountsRef.current.find((a) => a.id === accountId);
      if (!account) return;

      const next = new Set(account.selectedCalendarIds);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }

      updateStoredAccountCalendarIds(accountId, Array.from(next));
      dispatchAccounts({ type: "TOGGLE_CALENDAR", id: accountId, calendarId });
    },
    [],
  );

  // ── 強制同期 ──────────────────────────────────────────────

  const forceSync = useCallback(async () => {
    await Promise.allSettled(
      Array.from(enginesRef.current.values()).map((e) => e.forceSync()),
    );
  }, []);

  // ── 派生値 ───────────────────────────────────────────────

  const selectedCalendarIds = useMemo(() => {
    const all = new Set<string>();
    for (const account of accounts) {
      for (const id of account.selectedCalendarIds) {
        all.add(id);
      }
    }
    return all;
  }, [accounts]);

  return {
    accounts,
    events,
    selectedCalendarIds,
    addAccount,
    removeAccount,
    toggleCalendar,
    forceSync,
    isAnyConnecting: accounts.some((a) => a.isConnecting),
  };
};
