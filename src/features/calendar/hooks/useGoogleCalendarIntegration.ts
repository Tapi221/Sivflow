import { addDays } from "date-fns";
import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
  type Auth,
} from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DESKTOP_GOOGLE_OAUTH_REDIRECT_URI } from "@constants/electron/app";
import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";
import { auth } from "@/services/firebase";

// ─────────────────────────────────────────────────────────────
// 永続化ユーティリティ（すべて localStorage に統一）
// ─────────────────────────────────────────────────────────────

const LOCAL_TOKEN_KEY = "flashcard-master.gcal.access_token";
const LOCAL_TOKEN_EXPIRY_KEY = "flashcard-master.gcal.access_token_expiry";
const LOCAL_REFRESH_TOKEN_KEY = "flashcard-master.gcal.refresh_token";
const PERSIST_EMAIL_KEY = "flashcard-master.gcal.account_email";
const PERSIST_CALENDAR_IDS_KEY = "flashcard-master.gcal.selected_calendar_ids";
const PERSIST_WAS_CONNECTED_KEY = "flashcard-master.gcal.was_connected";

const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55分

let _cachedToken: string | null = null;

const readLocalToken = (): string | null => {
  if (_cachedToken) return _cachedToken;
  try {
    const expiry = localStorage.getItem(LOCAL_TOKEN_EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      localStorage.removeItem(LOCAL_TOKEN_KEY);
      localStorage.removeItem(LOCAL_TOKEN_EXPIRY_KEY);
      _cachedToken = null;
      return null;
    }
    const raw = localStorage.getItem(LOCAL_TOKEN_KEY);
    _cachedToken = raw;
    return raw;
  } catch {
    return null;
  }
};

const readLocalTokenExpiry = (): number | null => {
  try {
    const raw = localStorage.getItem(LOCAL_TOKEN_EXPIRY_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

const writeLocalToken = (token: string | null): void => {
  _cachedToken = token;
  try {
    if (token) {
      localStorage.setItem(LOCAL_TOKEN_KEY, token);
      localStorage.setItem(
        LOCAL_TOKEN_EXPIRY_KEY,
        String(Date.now() + TOKEN_LIFETIME_MS),
      );
    } else {
      localStorage.removeItem(LOCAL_TOKEN_KEY);
      localStorage.removeItem(LOCAL_TOKEN_EXPIRY_KEY);
    }
  } catch {
    // プライベートブラウジング等で失敗しても続行
  }
};

const readPersistedEmail = (): string | null => {
  try {
    return localStorage.getItem(PERSIST_EMAIL_KEY);
  } catch {
    return null;
  }
};

const writePersistedEmail = (email: string | null): void => {
  try {
    if (email) {
      localStorage.setItem(PERSIST_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(PERSIST_EMAIL_KEY);
    }
  } catch {}
};

const readPersistedCalendarIds = (): string[] => {
  try {
    const raw = localStorage.getItem(PERSIST_CALENDAR_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

const writePersistedCalendarIds = (ids: string[]): void => {
  try {
    localStorage.setItem(PERSIST_CALENDAR_IDS_KEY, JSON.stringify(ids));
  } catch {}
};

const readWasConnected = (): boolean => {
  try {
    return localStorage.getItem(PERSIST_WAS_CONNECTED_KEY) === "true";
  } catch {
    return false;
  }
};

const writeWasConnected = (value: boolean): void => {
  try {
    if (value) {
      localStorage.setItem(PERSIST_WAS_CONNECTED_KEY, "true");
    } else {
      localStorage.removeItem(PERSIST_WAS_CONNECTED_KEY);
    }
  } catch {}
};

const readLocalRefreshToken = (): string | null => {
  try {
    return localStorage.getItem(LOCAL_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const writeLocalRefreshToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(LOCAL_REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(LOCAL_REFRESH_TOKEN_KEY);
    }
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  backgroundColor: string;
  primary: boolean;
  selected: boolean;
};

export type GoogleCalendarEvent = {
  id: string;
  calendarId: string;
  accentColor: string;
  title: string;
  startsAt: Date;
  minutes: number;
  isAllDay: boolean; // ← 追加
};

type GoogleCalendarApiListResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    backgroundColor?: string;
    primary?: boolean;
    selected?: boolean;
  }>;
};

type GoogleCalendarApiEventsResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    start?: {
      date?: string;
      dateTime?: string;
    };
    end?: {
      date?: string;
      dateTime?: string;
    };
  }>;
};

type GoogleCalendarApiEvent = NonNullable<
  GoogleCalendarApiEventsResponse["items"]
>[number];

type UseGoogleCalendarIntegrationOptions = {
  authInstance?: Auth;
};

type GoogleCalendarAccess = {
  accessToken: string;
  accountEmail: string | null;
  refreshToken?: string;
};

// ─────────────────────────────────────────────────────────────
// 読み込み済み範囲の型
// ─────────────────────────────────────────────────────────────

type LoadedRange = {
  start: number; // Date.getTime()
  end: number;
};

// ─────────────────────────────────────────────────────────────
// OAuth / PKCE ユーティリティ
// ─────────────────────────────────────────────────────────────

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";
const DESKTOP_OAUTH_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join(
    "",
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const randomBase64Url = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

const createCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoded = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(new Uint8Array(digest));
};

const getDesktopOauthClientId = (): string => {
  const clientId = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("Desktop Google OAuth client ID is not configured");
  }
  return clientId;
};

const getDesktopRedirectUri = (): string => {
  const configuredUri =
    import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI?.trim();

  if (configuredUri && configuredUri !== DESKTOP_GOOGLE_OAUTH_REDIRECT_URI) {
    throw new Error(
      `Desktop OAuth redirect URI mismatch. expected=${DESKTOP_GOOGLE_OAUTH_REDIRECT_URI}, actual=${configuredUri}`,
    );
  }

  return DESKTOP_GOOGLE_OAUTH_REDIRECT_URI;
};

const buildDesktopAuthorizeUrl = ({
  clientId,
  codeChallenge,
  redirectUri,
  state,
  silent = false,
}: {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  state: string;
  silent?: boolean;
}): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `openid email profile ${GOOGLE_CALENDAR_READONLY_SCOPE}`,
    state,
    include_granted_scopes: "true",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    ...(silent ? {} : { prompt: "consent select_account" }),
  });

  return `${GOOGLE_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
};

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  const [, payload] = token.split(".");
  if (!payload) return null;

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  try {
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const getEmailFromIdToken = (idToken?: string): string | null => {
  if (!idToken) return null;
  const payload = parseJwtPayload(idToken);
  return typeof payload?.email === "string" ? payload.email : null;
};

const waitForDesktopOAuthCode = (
  expectedState: string,
  redirectUri: string,
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Timed out waiting for desktop OAuth callback"));
    }, DESKTOP_OAUTH_CALLBACK_TIMEOUT_MS);

    const unsubscribe = oauthBridge.onCallback((payload) => {
      const parsed = new URL(payload.url);
      const expected = new URL(redirectUri);

      if (
        parsed.protocol !== expected.protocol ||
        parsed.host !== expected.host ||
        parsed.pathname !== expected.pathname
      ) {
        return;
      }

      const state = payload.state ?? parsed.searchParams.get("state");
      if (state !== expectedState) return;

      window.clearTimeout(timeoutId);
      unsubscribe();

      const error = payload.error ?? parsed.searchParams.get("error");
      if (error) {
        reject(
          new Error(
            payload.errorDescription ??
              parsed.searchParams.get("error_description") ??
              `Google OAuth failed: ${error}`,
          ),
        );
        return;
      }

      const code = payload.code ?? parsed.searchParams.get("code");
      if (!code) {
        reject(new Error("Google OAuth callback does not include auth code"));
        return;
      }

      resolve(code);
    });
  });
};

const requestDesktopCalendarAccessToken = async (
  silent = false,
): Promise<GoogleCalendarAccess> => {
  const clientId = getDesktopOauthClientId();
  const redirectUri = getDesktopRedirectUri();
  const state = randomBase64Url(16);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const authorizeUrl = buildDesktopAuthorizeUrl({
    clientId,
    codeChallenge,
    redirectUri,
    state,
    silent,
  });
  const codePromise = waitForDesktopOAuthCode(state, redirectUri);

  try {
    await oauthBridge.start(authorizeUrl);
    const code = await codePromise;
    const tokens = await oauthBridge.exchangeTokens({
      clientId,
      code,
      codeVerifier,
      redirectUri,
    });

    if (!tokens.accessToken) {
      throw new Error("Google Calendar access token was not returned");
    }

    return {
      accessToken: tokens.accessToken,
      accountEmail: getEmailFromIdToken(tokens.idToken),
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    await oauthBridge.cancel().catch(() => undefined);
    throw error;
  }
};

const requestCalendarAccessToken = async (
  authInstance: Auth,
  silent = false,
): Promise<GoogleCalendarAccess> => {
  if (isDesktopLikeRuntime()) {
    return requestDesktopCalendarAccessToken(silent);
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_CALENDAR_READONLY_SCOPE);
  provider.setCustomParameters({ include_granted_scopes: "true" });

  if (silent) {
    const user = authInstance.currentUser;
    if (!user) {
      throw new Error("No current user for silent reconnect");
    }
    try {
      const result = await reauthenticateWithPopup(user, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error("Google Calendar access token was not returned");
      }
      return {
        accessToken: credential.accessToken,
        accountEmail: result.user.email,
      };
    } catch (error) {
      throw error;
    }
  }

  provider.setCustomParameters({
    include_granted_scopes: "true",
    prompt: "consent",
  });
  const result = await signInWithPopup(authInstance, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error("Google Calendar access token was not returned");
  }

  return {
    accessToken,
    accountEmail: result.user.email,
  };
};

// ─────────────────────────────────────────────────────────────
// Google Calendar API ラッパー
// ─────────────────────────────────────────────────────────────

const getJson = async <T>(accessToken: string, url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API failed (${response.status})`);
  }

  return (await response.json()) as T;
};

const parseGoogleDate = (rawValue: string): Date => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);

  if (!dateOnlyMatch) {
    return new Date(rawValue);
  }

  const [, year, month, day] = dateOnlyMatch;
  return new Date(Number(year), Number(month) - 1, Number(day));
};

const parseEventStart = (
  start: GoogleCalendarApiEvent["start"],
): Date | null => {
  const rawValue = start?.dateTime ?? start?.date;
  if (!rawValue) return null;

  const date = parseGoogleDate(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseEventMinutes = (
  startsAt: Date,
  end: GoogleCalendarApiEvent["end"],
): number => {
  if (end?.date && !end.dateTime) return 60;

  const rawEnd = end?.dateTime ?? end?.date;
  if (!rawEnd) return 30;

  const endsAt = parseGoogleDate(rawEnd);
  if (Number.isNaN(endsAt.getTime())) return 30;

  return Math.max(
    15,
    Math.round((endsAt.getTime() - startsAt.getTime()) / 60000),
  );
};

const fetchCalendarList = async (
  accessToken: string,
): Promise<GoogleCalendarListItem[]> => {
  const params = new URLSearchParams({
    minAccessRole: "reader",
    showDeleted: "false",
    showHidden: "false",
  });

  const payload = await getJson<GoogleCalendarApiListResponse>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?${params.toString()}`,
  );

  return (payload.items ?? []).flatMap((item) => {
    if (!item.id || !item.summary) return [];

    return [
      {
        id: item.id,
        summary: item.summary,
        backgroundColor: item.backgroundColor ?? "#4f7cff",
        primary: item.primary ?? false,
        selected: item.selected ?? true,
      },
    ];
  });
};

const fetchEventsForCalendar = async ({
  accessToken,
  calendarId,
  accentColor,
  rangeStart,
  rangeEnd,
}: {
  accessToken: string;
  calendarId: string;
  accentColor: string;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<GoogleCalendarEvent[]> => {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
  });

  const encodedCalendarId = encodeURIComponent(calendarId);
  const payload = await getJson<GoogleCalendarApiEventsResponse>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events?${params.toString()}`,
  );

  return (payload.items ?? []).flatMap((event) => {
    const startsAt = parseEventStart(event.start);
    if (!event.id || !startsAt) return [];

    // start.date のみ存在し start.dateTime がない場合は終日イベント
    const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);

    return [
      {
        id: `${calendarId}:${event.id}`,
        calendarId,
        accentColor,
        title: event.summary || "(No title)",
        startsAt,
        minutes: parseEventMinutes(startsAt, event.end),
        isAllDay, // ← 追加
      },
    ];
  });
};

// ─────────────────────────────────────────────────────────────
// 読み込み済み範囲のユーティリティ
// ─────────────────────────────────────────────────────────────

/**
 * 指定した範囲が既存の読み込み済み範囲に完全に含まれるか判定する。
 */
const isRangeAlreadyLoaded = (
  loadedRanges: LoadedRange[],
  startMs: number,
  endMs: number,
): boolean => {
  return loadedRanges.some((r) => r.start <= startMs && r.end >= endMs);
};

/**
 * 既存の読み込み済み範囲リストに新しい範囲を追加し、重複を統合して返す。
 */
const mergeLoadedRange = (
  loadedRanges: LoadedRange[],
  startMs: number,
  endMs: number,
): LoadedRange[] => {
  const next = [...loadedRanges, { start: startMs, end: endMs }];
  next.sort((a, b) => a.start - b.start);

  const merged: LoadedRange[] = [];
  for (const range of next) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
};

// ─────────────────────────────────────────────────────────────
// メインフック
// ─────────────────────────────────────────────────────────────

export const useGoogleCalendarIntegration = ({
  authInstance = auth,
}: UseGoogleCalendarIntegrationOptions = {}) => {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    readLocalToken(),
  );
  const [accountEmail, setAccountEmail] = useState<string | null>(() =>
    readPersistedEmail(),
  );
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    () => new Set(readPersistedCalendarIds()),
  );
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  const hasAutoRestored = useRef(false);
  const isSilentReconnectingRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 読み込み済み範囲のキャッシュ（カレンダーIDが変わったらリセット）
  const loadedRangesRef = useRef<LoadedRange[]>([]);
  const loadedCalendarIdsKeyRef = useRef<string>("");

  // ── サイレント再接続
  const silentReconnect = useCallback(async (): Promise<boolean> => {
    if (isSilentReconnectingRef.current) return false;
    if (!readWasConnected()) return false;

    isSilentReconnectingRef.current = true;

    try {
      let nextToken: string;
      let nextEmail: string | null;

      if (isDesktopLikeRuntime()) {
        const storedRefreshToken = readLocalRefreshToken();
        if (!storedRefreshToken) {
          return false;
        }

        const clientId = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID;
        if (!clientId) return false;

        const result = await oauthBridge.refreshTokens({
          clientId,
          refreshToken: storedRefreshToken,
        });

        if (!result.accessToken) {
          writeLocalRefreshToken(null);
          return false;
        }

        nextToken = result.accessToken;
        nextEmail = readPersistedEmail();
      } else {
        const { accessToken: webToken, accountEmail: webEmail } =
          await requestCalendarAccessToken(authInstance, /* silent= */ true);
        nextToken = webToken;
        nextEmail = webEmail;
      }

      const nextCalendars = await fetchCalendarList(nextToken);

      writeLocalToken(nextToken);
      writePersistedEmail(nextEmail);
      writeWasConnected(true);

      setAccessToken(nextToken);
      setAccountEmail(nextEmail);
      setCalendars(nextCalendars);
      setIsTokenExpired(false);
      setError(null);

      return true;
    } catch {
      return false;
    } finally {
      isSilentReconnectingRef.current = false;
    }
  }, [authInstance]);

  // ── 自動リフレッシュタイマー
  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const expiry = readLocalTokenExpiry();
    if (!expiry) return;

    const msUntilRefresh = Math.max(
      10_000,
      expiry - Date.now() - 5 * 60 * 1000,
    );

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void silentReconnect().then((success) => {
        if (success) scheduleTokenRefresh();
      });
    }, msUntilRefresh);
  }, [silentReconnect]);

  useEffect(() => {
    if (!accessToken) return;
    scheduleTokenRefresh();
    return () => {
      if (refreshTimerRef.current !== null)
        clearTimeout(refreshTimerRef.current);
    };
  }, [accessToken, scheduleTokenRefresh]);

  // ── アプリ起動時の自動復元
  useEffect(() => {
    if (hasAutoRestored.current) return;
    if (!readWasConnected()) return;

    hasAutoRestored.current = true;

    const token = readLocalToken();

    if (token) {
      void fetchCalendarList(token)
        .then((nextCalendars) => {
          setCalendars(nextCalendars);
          setIsTokenExpired(false);
          scheduleTokenRefresh();
        })
        .catch(async () => {
          writeLocalToken(null);
          setAccessToken(null);
          const success = await silentReconnect();
          if (!success) setIsTokenExpired(true);
        });
    } else {
      void silentReconnect().then((success) => {
        if (!success) setIsTokenExpired(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 明示的な接続（OAuth フロー）
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setIsTokenExpired(false);

    try {
      const {
        accessToken: nextToken,
        accountEmail: nextEmail,
        refreshToken: nextRefreshToken,
      } = await requestCalendarAccessToken(authInstance, /* silent= */ false);

      const nextCalendars = await fetchCalendarList(nextToken);

      const previousEmail = readPersistedEmail();
      const isNewAccount = nextEmail !== previousEmail;
      const defaultIds = nextCalendars
        .filter((c) => c.selected || c.primary)
        .map((c) => c.id);
      const restoredIds = isNewAccount
        ? defaultIds
        : readPersistedCalendarIds();
      const nextSelectedIds = new Set(restoredIds);

      // 再接続時はキャッシュをリセット
      loadedRangesRef.current = [];
      loadedCalendarIdsKeyRef.current = "";

      setAccessToken(nextToken);
      setAccountEmail(nextEmail);
      setCalendars(nextCalendars);
      setSelectedCalendarIds(nextSelectedIds);
      setEvents([]);

      writeLocalToken(nextToken);
      writePersistedEmail(nextEmail);
      writePersistedCalendarIds(restoredIds);
      writeWasConnected(true);
      if (nextRefreshToken) {
        writeLocalRefreshToken(nextRefreshToken);
      }

      scheduleTokenRefresh();
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Google Calendar connection failed",
      );
    } finally {
      setIsConnecting(false);
    }
  }, [authInstance, scheduleTokenRefresh]);

  // ── カレンダーのトグル選択
  const toggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds((previous) => {
      const next = new Set(previous);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      writePersistedCalendarIds(Array.from(next));
      return next;
    });
  }, []);

  // ── イベント読み込み
  const loadEvents = useCallback(
    async (rangeStart: Date, rangeEnd: Date) => {
      if (!accessToken || selectedCalendarIds.size === 0) {
        setEvents([]);
        loadedRangesRef.current = [];
        loadedCalendarIdsKeyRef.current = "";
        return;
      }

      // 選択カレンダーが変わった場合はキャッシュをリセット
      const currentCalendarIdsKey = Array.from(selectedCalendarIds)
        .sort()
        .join(",");
      if (currentCalendarIdsKey !== loadedCalendarIdsKeyRef.current) {
        loadedRangesRef.current = [];
        loadedCalendarIdsKeyRef.current = currentCalendarIdsKey;
        setEvents([]);
      }

      const startMs = rangeStart.getTime();
      const endMs = rangeEnd.getTime();

      // 既に読み込み済みの範囲はスキップ
      if (isRangeAlreadyLoaded(loadedRangesRef.current, startMs, endMs)) {
        return;
      }

      setIsLoadingEvents(true);
      setError(null);

      const doFetch = async (token: string) => {
        const colorsByCalendarId = new Map(
          calendars.map((calendar) => [calendar.id, calendar.backgroundColor]),
        );

        const eventGroups = await Promise.all(
          Array.from(selectedCalendarIds).map((calendarId) =>
            fetchEventsForCalendar({
              accessToken: token,
              calendarId,
              accentColor: colorsByCalendarId.get(calendarId) ?? "#185FA5",
              rangeStart,
              rangeEnd: addDays(rangeEnd, 1),
            }),
          ),
        );

        return eventGroups.flat();
      };

      try {
        const newEvents = await doFetch(accessToken);

        // 既存イベントとマージ（id で重複排除）
        setEvents((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          for (const e of newEvents) {
            map.set(e.id, e);
          }
          return Array.from(map.values()).sort(
            (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
          );
        });

        // 読み込み済み範囲を記録（重複統合）
        loadedRangesRef.current = mergeLoadedRange(
          loadedRangesRef.current,
          startMs,
          endMs,
        );
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "";

        if (message.includes("401")) {
          writeLocalToken(null);
          setAccessToken(null);

          const success = await silentReconnect();

          if (success) {
            const freshToken = readLocalToken();
            if (freshToken) {
              try {
                const retryEvents = await doFetch(freshToken);
                setEvents((prev) => {
                  const map = new Map(prev.map((e) => [e.id, e]));
                  for (const e of retryEvents) {
                    map.set(e.id, e);
                  }
                  return Array.from(map.values()).sort(
                    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
                  );
                });
                loadedRangesRef.current = mergeLoadedRange(
                  loadedRangesRef.current,
                  startMs,
                  endMs,
                );
                setIsLoadingEvents(false);
                return;
              } catch {
                // リトライも失敗
              }
            }
          }

          setIsTokenExpired(true);
          setError("Google Calendar の接続が切れました。再接続してください。");
        } else {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Google Calendar events could not be loaded",
          );
        }
      } finally {
        setIsLoadingEvents(false);
      }
    },
    [accessToken, calendars, selectedCalendarIds, silentReconnect],
  );

  // ── 切断（全永続化データをクリア）
  const disconnect = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    writeLocalToken(null);
    writeLocalRefreshToken(null);
    writePersistedEmail(null);
    writePersistedCalendarIds([]);
    writeWasConnected(false);

    _cachedToken = null;
    loadedRangesRef.current = [];
    loadedCalendarIdsKeyRef.current = "";

    setAccessToken(null);
    setAccountEmail(null);
    setCalendars([]);
    setEvents([]);
    setSelectedCalendarIds(new Set());
    setIsTokenExpired(false);
  }, []);

  const selectedCalendarIdList = useMemo(
    () => Array.from(selectedCalendarIds),
    [selectedCalendarIds],
  );

  return {
    accountEmail,
    calendars,
    connect,
    disconnect,
    error,
    events,
    isConnected: Boolean(accessToken),
    isConnecting,
    isLoadingEvents,
    isTokenExpired,
    loadEvents,
    selectedCalendarIds,
    selectedCalendarIdList,
    toggleCalendar,
  };
};