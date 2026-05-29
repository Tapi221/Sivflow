import { type Auth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { DESKTOP_GOOGLE_OAUTH_REDIRECT_URI } from "@constants/electron/app";
import { readEmail } from "@/integration/googlecalendar-integration/gcal.storage";
import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";
import { GOOGLE_OAUTH_CALLBACK_CHANNEL, GOOGLE_OAUTH_CALLBACK_STORAGE_KEY, isGoogleOAuthCallbackPayload, type GoogleOAuthCallbackPayload } from "./google.oauth-callback";

export type GoogleCalendarAccess = {
  accessToken: string;
  accountEmail: string | null;
  accountName: string | null;
  accountPhotoUrl: string | null;
  expiresInSeconds?: number | null;
  refreshToken?: string;
};

export type GoogleConnectedServiceAccess = GoogleCalendarAccess;

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_CALENDAR_APP_CREATED_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const DESKTOP_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const WEB_SERVER_CODE_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const WEB_SERVER_CODE_CALLBACK_POLL_MS = 250;
const WEB_AUTH_WINDOW_TARGET = "flashcard-master-google-oauth";
const WEB_AUTH_WINDOW_FEATURES = "popup=yes,width=520,height=720";
const GOOGLE_CALENDAR_RECONNECT_REQUIRED_CODE = "failed-precondition";
const GOOGLE_SCOPE_RECONNECT_MESSAGE = "Google Calendar と Google ToDo をまとめて連携するための権限が必要です。両方の権限を有効にして再連携してください。";

export const GOOGLE_CONNECTED_SERVICE_SCOPES = [GOOGLE_CALENDAR_SCOPE, GOOGLE_CALENDAR_READONLY_SCOPE, GOOGLE_CALENDAR_APP_CREATED_SCOPE, GOOGLE_TASKS_SCOPE] as const;

const GOOGLE_SCOPES = GOOGLE_CONNECTED_SERVICE_SCOPES;
const GOOGLE_SCOPE_PARAM = `openid email profile ${GOOGLE_SCOPES.join(" ")}`;

let pendingGoogleCalendarServerCodeVerifier: string | null = null;

const createGoogleCalendarReconnectRequiredError = (): Error => {
  const error = new Error("Google 連携の再認可が必要です");
  (error as Error & { code?: string }).code = GOOGLE_CALENDAR_RECONNECT_REQUIRED_CODE;
  return error;
};

const parseGrantedScopes = (scope: string | undefined | null): Set<string> => new Set((scope ?? "").split(/\s+/).map((value) => value.trim()).filter(Boolean));

const assertRequiredGoogleScopes = (scope: string | undefined | null): void => {
  const scopes = parseGrantedScopes(scope);
  if (GOOGLE_SCOPES.every((requiredScope) => scopes.has(requiredScope))) return;
  throw new Error(GOOGLE_SCOPE_RECONNECT_MESSAGE);
};

const fetchGoogleTokenInfoScope = async (accessToken: string): Promise<string | null> => {
  const response = await fetch(`${GOOGLE_OAUTH_TOKENINFO_ENDPOINT}?${new URLSearchParams({ access_token: accessToken })}`);
  if (!response.ok) throw new Error(GOOGLE_SCOPE_RECONNECT_MESSAGE);
  const json = (await response.json()) as { scope?: string };
  return json.scope ?? null;
};

const validateGrantedGoogleScopes = async ({ accessToken, scope, allowTokenInfoFallback }: { accessToken: string; scope?: string | null; allowTokenInfoFallback: boolean }): Promise<void> => {
  if (scope) {
    assertRequiredGoogleScopes(scope);
    return;
  }
  if (!allowTokenInfoFallback) return;
  assertRequiredGoogleScopes(await fetchGoogleTokenInfoScope(accessToken));
};

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const randomBase64Url = (length: number): string => toBase64Url(crypto.getRandomValues(new Uint8Array(length)));

const createCodeChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
};

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const getStringFromIdToken = (idToken: string | undefined, key: "email" | "name" | "picture"): string | null => {
  if (!idToken) return null;
  const value = parseJwtPayload(idToken)?.[key];
  return typeof value === "string" ? value : null;
};

const getGoogleProfileFromIdToken = (idToken?: string) => ({
  accountEmail: getStringFromIdToken(idToken, "email"),
  accountName: getStringFromIdToken(idToken, "name"),
  accountPhotoUrl: getStringFromIdToken(idToken, "picture"),
});

const getClientId = (): string => {
  const clientId = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("Missing Google OAuth client id");
  return clientId;
};

const getWebClientId = (): string => {
  const clientId = import.meta.env.VITE_WEB_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("Missing Web Google OAuth client id");
  return clientId;
};

const getDesktopRedirectUri = (): string => DESKTOP_GOOGLE_OAUTH_REDIRECT_URI;

const buildAuthorizeUrl = ({ clientId, redirectUri, codeChallenge, loginHint, prompt = "consent select_account", state }: { clientId: string; redirectUri: string; codeChallenge?: string; loginHint?: string; prompt?: string; state: string }) => {
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: GOOGLE_SCOPE_PARAM, state, include_granted_scopes: "true", access_type: "offline", prompt });
  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  if (loginHint) params.set("login_hint", loginHint);
  return `${GOOGLE_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
};

const waitForDesktopCode = (state: string, redirectUri: string): Promise<string> => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => {
    unsubscribe();
    reject(new Error("OAuth timeout"));
  }, DESKTOP_CALLBACK_TIMEOUT_MS);
  const unsubscribe = oauthBridge.onCallback((payload) => {
    const url = new URL(payload.url);
    const expected = new URL(redirectUri);
    if (url.pathname !== expected.pathname) return;
    const returnedState = payload.state ?? url.searchParams.get("state");
    if (returnedState !== state) return;
    window.clearTimeout(timer);
    unsubscribe();
    const error = payload.error ?? url.searchParams.get("error");
    if (error) {
      reject(new Error(error));
      return;
    }
    const code = payload.code ?? url.searchParams.get("code");
    if (!code) {
      reject(new Error("No auth code"));
      return;
    }
    resolve(code);
  });
});

const parseStoredGoogleOAuthCallbackPayload = (): GoogleOAuthCallbackPayload | null => {
  try {
    const raw = localStorage.getItem(GOOGLE_OAUTH_CALLBACK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isGoogleOAuthCallbackPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const waitForWebCode = (state: string, redirectUri: string): Promise<string> => new Promise((resolve, reject) => {
  const expected = new URL(redirectUri);
  let settled = false;
  let timeoutTimer: number | null = null;
  let pollTimer: number | null = null;
  let broadcastChannel: BroadcastChannel | null = null;

  const cleanup = (): void => {
    if (timeoutTimer !== null) window.clearTimeout(timeoutTimer);
    if (pollTimer !== null) window.clearInterval(pollTimer);
    window.removeEventListener("message", handleMessage);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", handleStoredCallbackPayload);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    broadcastChannel?.close();
    try {
      localStorage.removeItem(GOOGLE_OAUTH_CALLBACK_STORAGE_KEY);
    } catch {
      // storage が使えない環境では無視する。
    }
  };

  const finish = (callback: () => void): void => {
    if (settled) return;
    settled = true;
    cleanup();
    callback();
  };

  const handleCallbackUrl = ({ rawUrl, callbackState, callbackCode, callbackError, errorDescription }: { rawUrl: string; callbackState?: string | null; callbackCode?: string | null; callbackError?: string | null; errorDescription?: string | null }): void => {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return;
    }

    if (url.origin !== expected.origin) return;
    const returnedState = callbackState ?? url.searchParams.get("state");
    if (returnedState !== state) return;
    const error = callbackError ?? url.searchParams.get("error");

    if (error) {
      finish(() => reject(new Error(errorDescription ?? url.searchParams.get("error_description") ?? error)));
      return;
    }

    const code = callbackCode ?? url.searchParams.get("code");
    if (!code) {
      finish(() => reject(new Error("No authorization code")));
      return;
    }

    finish(() => resolve(code));
  };

  const handleCallbackPayload = (payload: unknown): void => {
    if (!isGoogleOAuthCallbackPayload(payload)) return;
    handleCallbackUrl({
      rawUrl: payload.url,
      callbackState: payload.state,
      callbackCode: payload.code,
      callbackError: payload.error,
      errorDescription: payload.errorDescription,
    });
  };

  function handleMessage(event: MessageEvent<unknown>): void {
    if (event.origin !== expected.origin) return;
    handleCallbackPayload(event.data);
  }

  function handleStorage(event: StorageEvent): void {
    if (event.key !== GOOGLE_OAUTH_CALLBACK_STORAGE_KEY || !event.newValue) return;
    try {
      handleCallbackPayload(JSON.parse(event.newValue));
    } catch {
      // 他の値は無視する。
    }
  }

  function handleStoredCallbackPayload(): void {
    handleCallbackPayload(parseStoredGoogleOAuthCallbackPayload());
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === "visible") handleStoredCallbackPayload();
  }

  timeoutTimer = window.setTimeout(() => {
    handleStoredCallbackPayload();
    finish(() => reject(new Error("OAuth timeout")));
  }, WEB_SERVER_CODE_CALLBACK_TIMEOUT_MS);
  pollTimer = window.setInterval(handleStoredCallbackPayload, WEB_SERVER_CODE_CALLBACK_POLL_MS);
  window.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", handleStoredCallbackPayload);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  if (typeof BroadcastChannel !== "undefined") {
    broadcastChannel = new BroadcastChannel(GOOGLE_OAUTH_CALLBACK_CHANNEL);
    broadcastChannel.onmessage = (event: MessageEvent<unknown>) => handleCallbackPayload(event.data);
  }
  handleStoredCallbackPayload();
});

const requestDesktopToken = async (): Promise<GoogleCalendarAccess> => {
  const clientId = getClientId();
  const redirectUri = getDesktopRedirectUri();
  const state = randomBase64Url(16);
  const verifier = randomBase64Url(48);
  const codeChallenge = await createCodeChallenge(verifier);
  const codePromise = waitForDesktopCode(state, redirectUri);
  await oauthBridge.start(buildAuthorizeUrl({ clientId, redirectUri, codeChallenge, state }));
  const code = await codePromise;
  const tokens = await oauthBridge.exchangeTokens({ clientId, code, codeVerifier: verifier, redirectUri });
  if (!tokens.accessToken) throw new Error("Google OAuth failed: accessToken is missing");
  await validateGrantedGoogleScopes({ accessToken: tokens.accessToken, scope: tokens.scope, allowTokenInfoFallback: true });
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, ...getGoogleProfileFromIdToken(tokens.idToken) };
};

const fetchGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Failed to fetch Google profile (${response.status})`);
  const json = (await response.json()) as { email?: string; name?: string; picture?: string };
  return { accountEmail: json.email ?? null, accountName: json.name ?? null, accountPhotoUrl: json.picture ?? null };
};

export const consumeGoogleCalendarServerCodeVerifier = (): string | null => {
  const verifier = pendingGoogleCalendarServerCodeVerifier;
  pendingGoogleCalendarServerCodeVerifier = null;
  return verifier;
};

export const consumeGoogleConnectedServiceServerCodeVerifier = consumeGoogleCalendarServerCodeVerifier;

export const requestGoogleCalendarServerCode = async (auth: Auth): Promise<{ code: string; codeVerifier: string; redirectUri: string }> => {
  if (typeof window === "undefined") throw new Error("Google OAuth is not available");
  const clientId = getWebClientId();
  const redirectUri = window.location.origin;
  const loginHint = auth.currentUser?.email ?? readEmail() ?? undefined;
  const state = randomBase64Url(16);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  try {
    localStorage.removeItem(GOOGLE_OAUTH_CALLBACK_STORAGE_KEY);
  } catch {
    // storage が使えない環境では BroadcastChannel / postMessage で受け取る。
  }
  const codePromise = waitForWebCode(state, redirectUri);
  const authWindow = window.open(buildAuthorizeUrl({ clientId, redirectUri, codeChallenge, loginHint, state }), WEB_AUTH_WINDOW_TARGET, WEB_AUTH_WINDOW_FEATURES);
  if (!authWindow) throw new Error("Google OAuth window could not be opened");
  const code = await codePromise;
  pendingGoogleCalendarServerCodeVerifier = codeVerifier;
  return { code, codeVerifier, redirectUri };
};

export const requestCalendarAccessToken = async (auth: Auth, silent = false): Promise<GoogleCalendarAccess> => {
  if (isDesktopLikeRuntime()) return requestDesktopToken();
  const provider = new GoogleAuthProvider();
  GOOGLE_SCOPES.forEach((scope) => provider.addScope(scope));
  if (silent) provider.setCustomParameters({ prompt: "none" });
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) throw createGoogleCalendarReconnectRequiredError();
  await validateGrantedGoogleScopes({ accessToken: credential.accessToken, scope: undefined, allowTokenInfoFallback: true });
  const profile = await fetchGoogleUserInfo(credential.accessToken).catch(() => ({ accountEmail: result.user.email, accountName: result.user.displayName, accountPhotoUrl: result.user.photoURL }));
  return { accessToken: credential.accessToken, ...profile };
};

export const requestConnectedServiceAccessToken = requestCalendarAccessToken;

export const refreshCalendarAccessToken = async ({ refreshToken }: { refreshToken: string }): Promise<GoogleCalendarAccess> => {
  const clientId = getClientId();
  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, refresh_token: refreshToken, grant_type: "refresh_token" }) });
  const json = (await response.json()) as { access_token?: string; expires_in?: number; refresh_token?: string; scope?: string; id_token?: string; error?: string; error_description?: string };
  if (!response.ok || !json.access_token) throw new Error(json.error_description ?? json.error ?? "Google token refresh failed");
  await validateGrantedGoogleScopes({ accessToken: json.access_token, scope: json.scope, allowTokenInfoFallback: true });
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresInSeconds: json.expires_in, ...getGoogleProfileFromIdToken(json.id_token) };
};

export const refreshConnectedServiceAccessToken = refreshCalendarAccessToken;
