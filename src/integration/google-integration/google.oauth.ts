import { DESKTOP_GOOGLE_OAUTH_REDIRECT_URI } from "@platform/auth/google/desktopOAuth.constants";
import type { Auth } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { GoogleOAuthCallbackPayload } from "./google.oauth-callback";
import { GOOGLE_OAUTH_CALLBACK_CHANNEL, GOOGLE_OAUTH_CALLBACK_STORAGE_KEY, isGoogleOAuthCallbackPayload } from "./google.oauth-callback";
import { readEmail } from "@/integration/googlecalendar-integration/gcal.storage";
import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";



type GoogleCalendarAccess = {
  accessToken: string;
  accountEmail: string | null;
  accountName: string | null;
  accountPhotoUrl: string | null;
  expiresInSeconds?: number | null;
  refreshToken?: string;
};
type GoogleConnectedServiceAccess = GoogleCalendarAccess;
type GoogleOAuthServerCode = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};
type GoogleOAuthAuthorizeInput = {
  accessType?: "offline";
  clientId: string;
  codeChallenge?: string;
  includeGrantedScopes?: boolean;
  loginHint?: string;
  prompt?: string;
  redirectUri: string;
  scope: string;
  state: string;
};
type GoogleOAuthCallbackLike = {
  url: string;
  state?: string | null;
  code?: string | null;
  error?: string | null;
  errorDescription?: string | null;
};



const GOOGLE_SIGN_IN_SCOPE_PARAM = "openid email profile";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_CALENDAR_APP_CREATED_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const OAUTH_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const DESKTOP_CODE_CALLBACK_POLL_MS = 250;
const WEB_SERVER_CODE_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const WEB_SERVER_CODE_CALLBACK_POLL_MS = 250;
const WEB_AUTH_WINDOW_TARGET = "flashcard-master-google-oauth";
const WEB_AUTH_WINDOW_FEATURES = "popup=yes,width=520,height=720";
const GOOGLE_CALENDAR_RECONNECT_REQUIRED_CODE = "failed-precondition";
const GOOGLE_SCOPE_RECONNECT_MESSAGE = "Google Calendar / Google ToDo / Google Drive をまとめて連携するための権限が必要です。必要な権限を有効にして再連携してください。";
const GOOGLE_CONNECTED_SERVICE_SCOPES = [GOOGLE_CALENDAR_SCOPE, GOOGLE_CALENDAR_READONLY_SCOPE, GOOGLE_CALENDAR_APP_CREATED_SCOPE, GOOGLE_TASKS_SCOPE, GOOGLE_DRIVE_FILE_SCOPE] as const;
const GOOGLE_SCOPES = GOOGLE_CONNECTED_SERVICE_SCOPES;
const GOOGLE_CONNECTED_SERVICE_SCOPE_PARAM = `${GOOGLE_SIGN_IN_SCOPE_PARAM} ${GOOGLE_SCOPES.join(" ")}`;
let pendingGoogleCalendarServerCodeVerifier: string | null = null;



const createGoogleCalendarReconnectRequiredError = (): Error => {
  const error = new Error("Google 連携の再認可が必要です");
  (error as Error & { code?: string; }).code = GOOGLE_CALENDAR_RECONNECT_REQUIRED_CODE;
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
  const json = (await response.json()) as { scope?: string; };
  return json.scope ?? null;
};
const validateGrantedGoogleScopes = async ({ accessToken, scope, allowTokenInfoFallback }: { accessToken: string; scope?: string | null; allowTokenInfoFallback: boolean; }): Promise<void> => {
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
const getGoogleOAuthClientId = (): string => {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("Missing Google OAuth client id");
  return clientId;
};
const getDesktopRedirectUri = (): string => DESKTOP_GOOGLE_OAUTH_REDIRECT_URI;
const buildAuthorizeUrl = ({ accessType, clientId, codeChallenge, includeGrantedScopes = false, loginHint, prompt = "select_account", redirectUri, scope, state }: GoogleOAuthAuthorizeInput): string => {
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope, state, prompt });
  if (accessType) params.set("access_type", accessType);
  if (includeGrantedScopes) params.set("include_granted_scopes", "true");
  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  if (loginHint) params.set("login_hint", loginHint);
  return `${GOOGLE_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
};
const waitForDesktopCode = (state: string, redirectUri: string): Promise<string> => new Promise((resolve, reject) => {
  const expected = new URL(redirectUri);
  let settled = false;
  let timeoutTimer: number | null = null;
  let pollTimer: number | null = null;
  let unsubscribe: () => void = () => {};

  const cleanup = (): void => {
    if (timeoutTimer !== null) window.clearTimeout(timeoutTimer);
    if (pollTimer !== null) window.clearInterval(pollTimer);
    unsubscribe();
  };

  const finish = (callback: () => void): void => {
    if (settled) return;
    settled = true;
    cleanup();
    callback();
  };

  const handleCallbackUrl = ({ rawUrl, callbackState, callbackCode, callbackError, errorDescription }: { rawUrl: string; callbackState?: string | null; callbackCode?: string | null; callbackError?: string | null; errorDescription?: string | null; }): void => {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return;
    }

    if (url.origin !== expected.origin || url.pathname !== expected.pathname) return;
    const returnedState = callbackState ?? url.searchParams.get("state");
    if (returnedState !== state) return;
    const error = callbackError ?? url.searchParams.get("error");

    if (error) {
      finish(() => reject(new Error(errorDescription ?? url.searchParams.get("error_description") ?? error)));
      return;
    }

    const code = callbackCode ?? url.searchParams.get("code");
    if (!code) {
      finish(() => reject(new Error("No auth code")));
      return;
    }

    finish(() => resolve(code));
  };

  const handleCallbackPayload = (payload: GoogleOAuthCallbackLike | null): void => {
    if (!payload) return;
    handleCallbackUrl({ rawUrl: payload.url, callbackState: payload.state, callbackCode: payload.code, callbackError: payload.error, errorDescription: payload.errorDescription });
  };

  const handlePendingCallbackPayload = async (): Promise<void> => {
    handleCallbackPayload(await oauthBridge.takePendingCallback());
  };

  const handlePendingCallback = (): void => {
    void handlePendingCallbackPayload().catch(() => {});
  };

  timeoutTimer = window.setTimeout(() => {
    void handlePendingCallbackPayload().catch(() => undefined).finally(() => finish(() => reject(new Error("OAuth timeout"))));
  }, OAUTH_CALLBACK_TIMEOUT_MS);
  pollTimer = window.setInterval(handlePendingCallback, DESKTOP_CODE_CALLBACK_POLL_MS);
  unsubscribe = oauthBridge.onCallback(handleCallbackPayload);
  handlePendingCallback();
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

  const handleCallbackUrl = ({ rawUrl, callbackState, callbackCode, callbackError, errorDescription }: { rawUrl: string; callbackState?: string | null; callbackCode?: string | null; callbackError?: string | null; errorDescription?: string | null; }): void => {
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
    handleCallbackUrl({ rawUrl: payload.url, callbackState: payload.state, callbackCode: payload.code, callbackError: payload.error, errorDescription: payload.errorDescription });
  };

  const handleMessage = (event: MessageEvent<unknown>): void => {
    if (event.origin !== expected.origin) return;
    handleCallbackPayload(event.data);
  };

  const handleStorage = (event: StorageEvent): void => {
    if (event.key !== GOOGLE_OAUTH_CALLBACK_STORAGE_KEY || !event.newValue) return;
    try {
      handleCallbackPayload(JSON.parse(event.newValue));
    } catch {
      // 他の値は無視する。
    }
  };

  const handleStoredCallbackPayload = (): void => {
    handleCallbackPayload(parseStoredGoogleOAuthCallbackPayload());
  };

  const handleVisibilityChange = (): void => {
    if (document.visibilityState === "visible") handleStoredCallbackPayload();
  };

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
const fetchGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Failed to fetch Google profile (${response.status})`);
  const json = (await response.json()) as { email?: string; name?: string; picture?: string; };
  return { accountEmail: json.email ?? null, accountName: json.name ?? null, accountPhotoUrl: json.picture ?? null };
};
const requestGoogleOAuthServerCode = async ({ accessType, includeGrantedScopes, loginHint, prompt, scope }: { accessType?: "offline"; includeGrantedScopes?: boolean; loginHint?: string; prompt?: string; scope: string; }): Promise<GoogleOAuthServerCode> => {
  if (typeof window === "undefined") throw new Error("Google OAuth is not available");
  const clientId = getGoogleOAuthClientId();
  const redirectUri = isDesktopLikeRuntime() ? getDesktopRedirectUri() : window.location.origin;
  const state = randomBase64Url(16);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  try {
    localStorage.removeItem(GOOGLE_OAUTH_CALLBACK_STORAGE_KEY);
  } catch {
    // storage が使えない環境では BroadcastChannel / postMessage で受け取る。
  }
  const authorizeUrl = buildAuthorizeUrl({ accessType, clientId, codeChallenge, includeGrantedScopes, loginHint, prompt, redirectUri, scope, state });
  const codePromise = isDesktopLikeRuntime() ? waitForDesktopCode(state, redirectUri) : waitForWebCode(state, redirectUri);
  if (isDesktopLikeRuntime()) {
    await oauthBridge.start(authorizeUrl);
  } else {
    const authWindow = window.open(authorizeUrl, WEB_AUTH_WINDOW_TARGET, WEB_AUTH_WINDOW_FEATURES);
    if (!authWindow) throw new Error("Google OAuth window could not be opened");
  }
  const code = await codePromise;
  return { code, codeVerifier, redirectUri };
};
const consumeGoogleCalendarServerCodeVerifier = (): string | null => {
  const verifier = pendingGoogleCalendarServerCodeVerifier;
  pendingGoogleCalendarServerCodeVerifier = null;
  return verifier;
};
const requestGoogleSignInServerCode = async (): Promise<GoogleOAuthServerCode> => requestGoogleOAuthServerCode({ prompt: "select_account", scope: GOOGLE_SIGN_IN_SCOPE_PARAM });
const requestGoogleCalendarServerCode = async (auth: Auth): Promise<GoogleOAuthServerCode> => {
  const result = await requestGoogleOAuthServerCode({ accessType: "offline", includeGrantedScopes: true, loginHint: auth.currentUser?.email ?? readEmail() ?? undefined, prompt: "consent select_account", scope: GOOGLE_CONNECTED_SERVICE_SCOPE_PARAM });
  pendingGoogleCalendarServerCodeVerifier = result.codeVerifier;
  return result;
};
const requestCalendarAccessToken = async (auth: Auth, silent = false): Promise<GoogleCalendarAccess> => {
  if (isDesktopLikeRuntime()) throw new Error("Desktop Google OAuth must use server-side token exchange.");
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
const refreshCalendarAccessToken = async ({ refreshToken }: { refreshToken: string; }): Promise<GoogleCalendarAccess> => {
  const clientId = getGoogleOAuthClientId();
  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, refresh_token: refreshToken, grant_type: "refresh_token" }) });
  const json = (await response.json()) as { access_token?: string; expires_in?: number; refresh_token?: string; scope?: string; id_token?: string; error?: string; error_description?: string; };
  if (!response.ok || !json.access_token) throw new Error(json.error_description ?? json.error ?? "Google token refresh failed");
  await validateGrantedGoogleScopes({ accessToken: json.access_token, scope: json.scope, allowTokenInfoFallback: true });
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresInSeconds: json.expires_in, ...getGoogleProfileFromIdToken(json.id_token) };
};



export { GOOGLE_CONNECTED_SERVICE_SCOPES, consumeGoogleCalendarServerCodeVerifier, consumeGoogleCalendarServerCodeVerifier as consumeGoogleConnectedServiceServerCodeVerifier, requestGoogleSignInServerCode, requestGoogleCalendarServerCode, requestCalendarAccessToken, requestCalendarAccessToken as requestConnectedServiceAccessToken, refreshCalendarAccessToken, refreshCalendarAccessToken as refreshConnectedServiceAccessToken };


export type { GoogleCalendarAccess, GoogleConnectedServiceAccess };
