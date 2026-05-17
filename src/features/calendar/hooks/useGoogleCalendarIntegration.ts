import { addDays } from "date-fns";
import { GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DESKTOP_GOOGLE_OAUTH_REDIRECT_URI } from "@constants/electron/app";
import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";
import { auth } from "@/services/firebase";

// ─────────────────────────────────────────────────────────────
// 永続化ユーティリティ
// ─────────────────────────────────────────────────────────────

const LOCAL_TOKEN_KEY = "flashcard-master.gcal.access_token";
const LOCAL_TOKEN_EXPIRY_KEY = "flashcard-master.gcal.access_token_expiry";
const PERSIST_EMAIL_KEY = "flashcard-master.gcal.account_email";
const PERSIST_CALENDAR_IDS_KEY = "flashcard-master.gcal.selected_calendar_ids";
const PERSIST_WAS_CONNECTED_KEY = "flashcard-master.gcal.was_connected";

// Google OAuth アクセストークンの有効期間は 3600 秒。
// 期限の 5 分前にリフレッシュを試みる。
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55分

// タブ復帰時：残り 2 分以内ならリフレッシュをトリガーする
const VISIBILITY_REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

// ── モジュールスコープのメモリキャッシュ（同一セッション内の重複読み取りを防ぐ）
let _cachedToken: string | null = null;

const readLocalToken = (): string | null => {
  if (_cachedToken) return _cachedToken;
  try {
    const expiry = localStorage.getItem(LOCAL_TOKEN_EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      // 期限切れ → キャッシュを破棄
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
    };
  } catch (error) {
    await oauthBridge.cancel().catch(() => undefined);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// Firebase Web 向け：サイレント再認証
// ─────────────────────────────────────────────────────────────

const requestCalendarAccessToken = async (
  authInstance: Auth,
  silent = false,
): Promise<GoogleCalendarAccess> => {
  if (isDesktopLikeRuntime()) {
    return requestDesktopCalendarAccessToken(silent);
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_CALENDAR_READONLY_SCOPE);
  provider.setCustomParameters({
    include_granted_scopes: "true",
    ...(silent ? {} : { prompt: "consent" }),
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

  // ── サイレント再接続中は isConnected を true のまま維持するためのフラグ
  const [isSilentReconnecting, setIsSilentReconnecting] = useState(false);

  const hasAutoRestored = useRef(false);
  const isSilentReconnectingRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── サイレント再接続（ユーザー操作なしでトークンを更新）
  //
  // ポイント：setAccessToken(null) を呼ばない。
  // 再接続中も accessToken は古い値のまま保持し、isConnected が false に
  // ならないようにする。成功したら新しいトークンで上書きする。
  const silentReconnect = useCallback(async (): Promise<boolean> => {
    if (isSilentReconnectingRef.current) return false;
    if (!readWasConnected()) return false;

    isSilentReconnectingRef.current = true;
    setIsSilentReconnecting(true);

    try {
      const { accessToken: nextToken, accountEmail: nextEmail } =
        await requestCalendarAccessToken(authInstance, /* silent= */ true);

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
      // サイレント再接続に失敗しても UI にはエラーを出さない
      return false;
    } finally {
      isSilentReconnectingRef.current = false;
      setIsSilentReconnecting(false);
    }
  }, [authInstance]);

  // ── 自動リフレッシュタイマーの設定
  //
  // アクセストークンの有効期限の 5 分前に自動でトークンを更新する。
  // これにより「突然切れる」体験をなくす。
  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const expiry = readLocalTokenExpiry();
    if (!expiry) return;

    // 期限の 5 分前にリフレッシュ（最短でも 10 秒後）
    const msUntilRefresh = Math.max(
      10_000,
      expiry - Date.now() - 5 * 60 * 1000,
    );

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void silentReconnect().then((success) => {
        if (success) {
          scheduleTokenRefresh();
        }
      });
    }, msUntilRefresh);
  }, [silentReconnect]);

  // ── アクセストークンが変わったら自動リフレッシュタイマーをリセット
  useEffect(() => {
    if (!accessToken) return;
    scheduleTokenRefresh();

    return () => {
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [accessToken, scheduleTokenRefresh]);

  // ── Page Visibility API：タブ復帰時にトークン期限を確認してリフレッシュ
  //
  // setTimeout はバックグラウンドタブでスロットリングされるため、
  // タブに戻ってきたタイミングで期限切れ・期限間近なら即リフレッシュする。
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!readWasConnected()) return;

      const expiry = readLocalTokenExpiry();
      const isExpiredOrSoon =
        !expiry || Date.now() > expiry - VISIBILITY_REFRESH_THRESHOLD_MS;

      if (isExpiredOrSoon) {
        void silentReconnect().then((success) => {
          if (success) {
            scheduleTokenRefresh();
          }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [silentReconnect, scheduleTokenRefresh]);

  // ── アプリ起動時の自動復元
  //
  // 「前回接続済み」の場合:
  //   (a) localStorage にトークンがあれば → そのまま使う（カレンダー一覧だけ取得）
  //   (b) トークンが期限切れ or 存在しない → サイレント再接続を試みる
  useEffect(() => {
    if (hasAutoRestored.current) return;
    if (!readWasConnected()) return;

    hasAutoRestored.current = true;

    const token = readLocalToken();

    if (token) {
      // (a) 有効なトークンあり → カレンダー一覧だけ取得
      void fetchCalendarList(token)
        .then((nextCalendars) => {
          setCalendars(nextCalendars);
          setIsTokenExpired(false);
          scheduleTokenRefresh();
        })
        .catch(async () => {
          // 401 等 → accessToken を null にせずサイレント再接続を試みる
          const success = await silentReconnect();
          if (!success) {
            // 本当に失敗した場合のみトークンを破棄
            writeLocalToken(null);
            setAccessToken(null);
            setIsTokenExpired(true);
          }
        });
    } else {
      // (b) トークンなし（期限切れ含む）→ サイレント再接続
      void silentReconnect().then((success) => {
        if (!success) {
          setIsTokenExpired(true);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // マウント時に1回だけ実行

  // ── 明示的な接続（OAuth フロー実行）
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setIsTokenExpired(false);

    try {
      const { accessToken: nextToken, accountEmail: nextEmail } =
        await requestCalendarAccessToken(authInstance, /* silent= */ false);

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

      setAccessToken(nextToken);
      setAccountEmail(nextEmail);
      setCalendars(nextCalendars);
      setSelectedCalendarIds(nextSelectedIds);

      writeLocalToken(nextToken);
      writePersistedEmail(nextEmail);
      writePersistedCalendarIds(restoredIds);
      writeWasConnected(true);

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

  // ── カレンダーのトグル選択（選択状態を永続化）
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
  //
  // 401 が返った場合はサイレント再接続を試み、成功したら同じリクエストを再試行する。
  // accessToken を即 null にしないことで、再接続中に isConnected が false に
  // ならないようにする。本当に再接続不可能な場合のみ null にする。
  const loadEvents = useCallback(
    async (rangeStart: Date, rangeEnd: Date) => {
      if (!accessToken || selectedCalendarIds.size === 0) {
        setEvents([]);
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

        return eventGroups.flat().sort((left, right) => {
          return left.startsAt.getTime() - right.startsAt.getTime();
        });
      };

      try {
        const result = await doFetch(accessToken);
        setEvents(result);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "";

        if (message.includes("401")) {
          // トークン期限切れ → accessToken を null にせずサイレント再接続してリトライ。
          // これにより再接続中も isConnected が true のまま保たれ、
          // タブ切り替えで接続が切れたように見える問題を防ぐ。
          const success = await silentReconnect();

          if (success) {
            const freshToken = readLocalToken();
            if (freshToken) {
              try {
                const retryResult = await doFetch(freshToken);
                setEvents(retryResult);
                setIsLoadingEvents(false);
                return;
              } catch {
                // リトライも失敗した場合はフォールスルー
              }
            }
          }

          // 自動再接続に本当に失敗した場合のみトークンを破棄してユーザーに通知
          writeLocalToken(null);
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
    [accessToken, calendars, selectedCalendarIds, silentReconnect],
  );

  // ── 切断（全永続化データをクリア）
  const disconnect = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    writeLocalToken(null);
    writePersistedEmail(null);
    writePersistedCalendarIds([]);
    writeWasConnected(false);

    _cachedToken = null;

    setAccessToken(null);
    setAccountEmail(null);
    setCalendars([]);
    setEvents([]);
    setSelectedCalendarIds(new Set());
    setIsTokenExpired(false);
    setIsSilentReconnecting(false);
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
    // サイレント再接続中も接続済みとして扱う（タブ切り替えで切断して見える問題の防止）
    isConnected: Boolean(accessToken) || isSilentReconnecting,
    isConnecting,
    isLoadingEvents,
    isTokenExpired,
    loadEvents,
    selectedCalendarIds,
    selectedCalendarIdList,
    toggleCalendar,
  };
};