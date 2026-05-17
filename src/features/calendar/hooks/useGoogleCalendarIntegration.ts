import { addDays } from "date-fns";
import { GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DESKTOP_GOOGLE_OAUTH_REDIRECT_URI } from "@constants/electron/app";
import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";
import { auth } from "@/services/firebase";

// ─────────────────────────────────────────────────────────────
// 永続化ユーティリティ
//
// ■ accessToken の保存戦略
//   - Web       : sessionStorage（タブを閉じると消える。XSS耐性はlocalStorageより高い）
//   - Electron  : 将来的に oauthBridge 経由で OS Keychain へ（今はsessionStorageと同じ）
//   - iOS/Android: ネイティブ実装側で Keychain / EncryptedSharedPreferences を使う
//
// ■ accountEmail / selectedCalendarIds の保存戦略
//   - localStorage に保存（Zustand persist 相当の手動実装）
//   - アプリ再起動後も「どのアカウントで・何を選んでいたか」を復元するため
// ─────────────────────────────────────────────────────────────

const SESSION_TOKEN_KEY = "flashcard-master.gcal.access_token";
const PERSIST_EMAIL_KEY = "flashcard-master.gcal.account_email";
const PERSIST_CALENDAR_IDS_KEY = "flashcard-master.gcal.selected_calendar_ids";
const PERSIST_WAS_CONNECTED_KEY = "flashcard-master.gcal.was_connected";

/** モジュールスコープのメモリキャッシュ（同一セッション内の重複読み取りを防ぐ） */
let _cachedToken: string | null = null;

const readSessionToken = (): string | null => {
  if (_cachedToken) return _cachedToken;
  try {
    const raw = sessionStorage.getItem(SESSION_TOKEN_KEY);
    _cachedToken = raw;
    return raw;
  } catch {
    return null;
  }
};

const writeSessionToken = (token: string | null): void => {
  _cachedToken = token;
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
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
  } catch {
    // 続行
  }
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
  } catch {
    // 続行
  }
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
  } catch {
    // 続行
  }
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
}: {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  state: string;
}): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `openid email profile ${GOOGLE_CALENDAR_READONLY_SCOPE}`,
    state,
    prompt: "consent select_account",
    include_granted_scopes: "true",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
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

const requestDesktopCalendarAccessToken =
  async (): Promise<GoogleCalendarAccess> => {
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
      };
    } catch (error) {
      await oauthBridge.cancel().catch(() => undefined);
      throw error;
    }
  };

const requestCalendarAccessToken = async (
  authInstance: Auth,
): Promise<GoogleCalendarAccess> => {
  if (isDesktopLikeRuntime()) {
    return requestDesktopCalendarAccessToken();
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_CALENDAR_READONLY_SCOPE);
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

    return [
      {
        id: `${calendarId}:${event.id}`,
        calendarId,
        accentColor,
        title: event.summary || "(No title)",
        startsAt,
        minutes: parseEventMinutes(startsAt, event.end),
      },
    ];
  });
};

// ─────────────────────────────────────────────────────────────
// メインフック
// ─────────────────────────────────────────────────────────────

export const useGoogleCalendarIntegration = ({
  authInstance = auth,
}: UseGoogleCalendarIntegrationOptions = {}) => {
  // ── 起動時に永続化ストレージから状態を復元
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    readSessionToken(),
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

  // トークン期限切れを UI に伝えるフラグ
  // CalendarSidebar で「再接続してください」バナーの表示に使う
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  // ── アプリ起動時の自動復元
  // 「前回接続済み + セッションにトークンあり」の場合、
  // OAuth ポップアップを出さずにカレンダー一覧だけ静かに取得する
  const hasAutoRestored = useRef(false);

  useEffect(() => {
    if (hasAutoRestored.current) return;

    const token = readSessionToken();
    const wasConnected = readWasConnected();

    // トークンもない、または前回未接続なら何もしない
    if (!token || !wasConnected) return;

    hasAutoRestored.current = true;

    void fetchCalendarList(token)
      .then((nextCalendars) => {
        setCalendars(nextCalendars);
        setIsTokenExpired(false);
      })
      .catch(() => {
        // 401 等でトークンが無効になっていた場合
        // → セッションを破棄してユーザーに再接続を促す
        writeSessionToken(null);
        setAccessToken(null);
        setIsTokenExpired(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // マウント時に1回だけ実行

  // ── 接続（OAuth フロー実行）
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setIsTokenExpired(false);

    try {
      const { accessToken: nextToken, accountEmail: nextEmail } =
        await requestCalendarAccessToken(authInstance);

      const nextCalendars = await fetchCalendarList(nextToken);

      // 前回と同じアカウントなら選択状態を引き継ぐ。
      // 別アカウントに切り替えた場合はデフォルト選択（primary / selected）に戻す。
      const previousEmail = readPersistedEmail();
      const isNewAccount = nextEmail !== previousEmail;
      const defaultIds = nextCalendars
        .filter((c) => c.selected || c.primary)
        .map((c) => c.id);
      const restoredIds = isNewAccount
        ? defaultIds
        : readPersistedCalendarIds();
      const nextSelectedIds = new Set(restoredIds);

      // ── メモリ状態を更新
      setAccessToken(nextToken);
      setAccountEmail(nextEmail);
      setCalendars(nextCalendars);
      setSelectedCalendarIds(nextSelectedIds);

      // ── 永続化ストレージを更新
      writeSessionToken(nextToken);
      writePersistedEmail(nextEmail);
      writePersistedCalendarIds(restoredIds);
      writeWasConnected(true);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Google Calendar connection failed",
      );
    } finally {
      setIsConnecting(false);
    }
  }, [authInstance]);

  // ── カレンダーのトグル選択（選択状態を永続化）
  const toggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds((previous) => {
      const next = new Set(previous);

      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }

      // 選択状態を即座に永続化
      writePersistedCalendarIds(Array.from(next));
      return next;
    });
  }, []);

  // ── イベント読み込み
  const loadEvents = useCallback(
    async (rangeStart: Date, rangeEnd: Date) => {
      if (!accessToken || selectedCalendarIds.size === 0) {
        setEvents([]);
        return;
      }

      setIsLoadingEvents(true);
      setError(null);

      try {
        const colorsByCalendarId = new Map(
          calendars.map((calendar) => [calendar.id, calendar.backgroundColor]),
        );

        const eventGroups = await Promise.all(
          Array.from(selectedCalendarIds).map((calendarId) =>
            fetchEventsForCalendar({
              accessToken,
              calendarId,
              accentColor: colorsByCalendarId.get(calendarId) ?? "#185FA5",
              rangeStart,
              rangeEnd: addDays(rangeEnd, 1),
            }),
          ),
        );

        setEvents(
          eventGroups.flat().sort((left, right) => {
            return left.startsAt.getTime() - right.startsAt.getTime();
          }),
        );
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "";

        // 401 Unauthorized = アクセストークンの期限切れ
        if (message.includes("401")) {
          writeSessionToken(null);
          setAccessToken(null);
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
    [accessToken, calendars, selectedCalendarIds],
  );

  // ── 切断（全永続化データをクリア）
  const disconnect = useCallback(() => {
    writeSessionToken(null);
    writePersistedEmail(null);
    writePersistedCalendarIds([]);
    writeWasConnected(false);

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
