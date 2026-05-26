import { type Auth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { DESKTOP_GOOGLE_OAUTH_REDIRECT_URI } from "@constants/electron/app";
import { readEmail } from "@/integration/googlecalendar-integration/gcal.storage";
import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { getRuntimeKind, isDesktopLikeRuntime } from "@/platform/runtimeKind";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

const DESKTOP_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const WEB_SERVER_CODE_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const WEB_SERVER_CODE_POPUP_POLL_INTERVAL_MS = 250;

export const GOOGLE_CONNECTED_SERVICE_SCOPES = [GOOGLE_CALENDAR_SCOPE, GOOGLE_TASKS_SCOPE] as const;
const GOOGLE_SCOPES = GOOGLE_CONNECTED_SERVICE_SCOPES;
const GOOGLE_SCOPE_PARAM = `openid email profile ${GOOGLE_SCOPES.join(" ")}`;

export const GOOGLE_SERVER_CODE_REDIRECT_URI =
  typeof window === "undefined" ? "postmessage" : window.location.origin;

const GOOGLE_CALENDAR_RECONNECT_REQUIRED_CODE = "failed-precondition";
const GOOGLE_SCOPE_RECONNECT_MESSAGE =
  "Google Calendar と Google ToDo をまとめて連携するための権限が必要です。両方の権限を有効にして再連携してください。";

let pendingGoogleCalendarServerCodeVerifier: string | null = null;

export const consumeGoogleCalendarServerCodeVerifier = (): string | null => {
  const verifier = pendingGoogleCalendarServerCodeVerifier;
  pendingGoogleCalendarServerCodeVerifier = null;
  return verifier;
};

export const consumeGoogleConnectedServiceServerCodeVerifier = consumeGoogleCalendarServerCodeVerifier;

const createGoogleCalendarReconnectRequiredError = (): Error => {
  const error = new Error("Google 連携の再認可が必要です");

  (error as Error & { code?: string }).code =
    GOOGLE_CALENDAR_RECONNECT_REQUIRED_CODE;

  return error;
};

const parseGrantedScopes = (scope: string | undefined | null): Set<string> => {
  return new Set(
    (scope ?? "")
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
};

const hasRequiredGoogleScopes = (scope: string | undefined | null): boolean => {
  const scopes = parseGrantedScopes(scope);
  return GOOGLE_SCOPES.every((requiredScope) => scopes.has(requiredScope));
};

const assertRequiredGoogleScopes = (scope: string | undefined | null): void => {
  if (hasRequiredGoogleScopes(scope)) return;
  throw new Error(GOOGLE_SCOPE_RECONNECT_MESSAGE);
};

const fetchGoogleTokenInfoScope = async (accessToken: string): Promise<string | null> => {
  const response = await fetch(`${GOOGLE_OAUTH_TOKENINFO_ENDPOINT}?${new URLSearchParams({ access_token: accessToken })}`);

  if (!response.ok) {
    throw new Error(GOOGLE_SCOPE_RECONNECT_MESSAGE);
  }

  const json = (await response.json()) as { scope?: string };
  return json.scope ?? null;
};

const validateGrantedGoogleScopes = async ({
  accessToken,
  scope,
  allowTokenInfoFallback,
}: {
  accessToken: string;
  scope?: string | null;
  allowTokenInfoFallback: boolean;
}): Promise<void> => {
  if (scope) {
    assertRequiredGoogleScopes(scope);
    return;
  }

  if (!allowTokenInfoFallback) return;

  assertRequiredGoogleScopes(await fetchGoogleTokenInfoScope(accessToken));
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

type GoogleTokenClientOverrideConfig = {
  include_granted_scopes?: boolean;
  login_hint?: string;
  prompt?: string;
  scope?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: GoogleTokenClientOverrideConfig) => void;
};

type GoogleTokenClientConfig = GoogleTokenClientOverrideConfig & {
  callback: (response: GoogleTokenResponse) => void;
  client_id: string;
  error_callback?: (error: { type?: string; message?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
        };
      };
    };
  }
}

let googleIdentityScriptPromise: Promise<void> | null = null;

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (v) => String.fromCharCode(v)).join("");

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const randomBase64Url = (len: number): string => {
  const bytes = new Uint8Array(len);

  crypto.getRandomValues(bytes);

  return toBase64Url(bytes);
};

const createCodeChallenge = async (verifier: string): Promise<string> => {
  const data = new TextEncoder().encode(verifier);

  const digest = await crypto.subtle.digest("SHA-256", data);

  return toBase64Url(new Uint8Array(digest));
};

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  try {
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const getStringFromIdToken = (
  idToken: string | undefined,
  key: "email" | "name" | "picture",
): string | null => {
  if (!idToken) {
    return null;
  }

  const payload = parseJwtPayload(idToken);
  const value = payload?.[key];

  return typeof value === "string" ? value : null;
};

const getGoogleProfileFromIdToken = (idToken?: string) => ({
  accountEmail: getStringFromIdToken(idToken, "email"),
  accountName: getStringFromIdToken(idToken, "name"),
  accountPhotoUrl: getStringFromIdToken(idToken, "picture"),
});

const getClientId = (): string => {
  const clientId = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing Google OAuth client id");
  }

  return clientId;
};

const getWebClientId = (): string => {
  const clientId = import.meta.env.VITE_WEB_GOOGLE_OAUTH_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing Web Google OAuth client id");
  }

  return clientId;
};

const getRedirectUri = (): string => {
  const uri = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI?.trim();

  if (uri && uri !== DESKTOP_GOOGLE_OAUTH_REDIRECT_URI) {
    console.warn(
      "[GoogleCalendar] Ignoring mismatched desktop OAuth redirect URI from env",
      {
        expected: DESKTOP_GOOGLE_OAUTH_REDIRECT_URI,
        actual: uri,
      },
    );
  }

  return DESKTOP_GOOGLE_OAUTH_REDIRECT_URI;
};

const maskClientId = (clientId: string): string => {
  const [prefix, domain] = clientId.split(".", 2);
  const visiblePrefix = prefix.length <= 10
    ? prefix
    : `${prefix.slice(0, 10)}...${prefix.slice(-6)}`;

  return domain ? `${visiblePrefix}.${domain}` : visiblePrefix;
};

const logOAuthConfig = (
  flow: "desktop-code" | "web-code" | "web-token",
  input: {
    clientId: string;
    origin?: string;
    redirectUri?: string;
  },
): void => {
  console.info("[GoogleCalendar] OAuth config", {
    flow,
    runtime: getRuntimeKind(),
    clientId: maskClientId(input.clientId),
    origin: input.origin,
    redirectUri: input.redirectUri,
  });
};

const buildAuthorizeUrl = ({
  clientId,
  redirectUri,
  codeChallenge,
  loginHint,
  prompt = "consent select_account",
  state,
}: {
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  loginHint?: string;
  prompt?: string;
  state: string;
}) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE_PARAM,
    state,
    include_granted_scopes: "true",
    access_type: "offline",
    prompt,
  });

  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }

  if (loginHint) {
    params.set("login_hint", loginHint);
  }

  return `${GOOGLE_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
};

const waitForDesktopCode = (state: string, redirectUri: string) => {
  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      unsubscribe();

      reject(new Error("OAuth timeout"));
    }, DESKTOP_CALLBACK_TIMEOUT_MS);

    const unsubscribe = oauthBridge.onCallback((payload) => {
      const url = new URL(payload.url);

      const expected = new URL(redirectUri);

      if (url.pathname !== expected.pathname) {
        return;
      }

      const returnedState = payload.state ?? url.searchParams.get("state");

      if (returnedState !== state) {
        return;
      }

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
};

const getCenteredPopupFeatures = (width: number, height: number): string => {
  const left = Math.round(window.screenX + Math.max(0, (window.outerWidth - width) / 2));
  const top = Math.round(window.screenY + Math.max(0, (window.outerHeight - height) / 2));

  return [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "noopener=no",
    "noreferrer=no",
  ].join(",");
};

const waitForWebPopupCode = (
  popup: Window,
  state: string,
  redirectUri: string,
): Promise<string> => new Promise((resolve, reject) => {
  const expected = new URL(redirectUri);
  let settled = false;
  let pollTimer: number | undefined;

  const cleanup = (): void => {
    if (pollTimer !== undefined) window.clearInterval(pollTimer);
    window.clearTimeout(timeoutTimer);

    try {
      if (!popup.closed) popup.close();
    } catch {
      // Cross-Origin-Opener-Policy により closed を読めない場合がある。
    }
  };

  const finish = (callback: () => void): void => {
    if (settled) return;
    settled = true;
    cleanup();
    callback();
  };

  const timeoutTimer = window.setTimeout(() => {
    finish(() => reject(new Error("OAuth timeout")));
  }, WEB_SERVER_CODE_CALLBACK_TIMEOUT_MS);

  const poll = (): void => {
    try {
      if (popup.closed) {
        finish(() => reject(new Error("Google OAuth popup was closed")));
        return;
      }
    } catch {
      // OAuth 中の cross-origin popup では closed/location を読めないことがある。
    }

    let url: URL;

    try {
      url = new URL(popup.location.href);
    } catch {
      return;
    }

    if (url.origin !== expected.origin || url.pathname !== expected.pathname) {
      return;
    }

    const returnedState = url.searchParams.get("state");

    if (returnedState !== state) {
      return;
    }

    const error = url.searchParams.get("error");

    if (error) {
      finish(() => reject(new Error(url.searchParams.get("error_description") ?? error)));
      return;
    }

    const code = url.searchParams.get("code");

    if (!code) {
      finish(() => reject(new Error("No authorization code")));
      return;
    }

    finish(() => resolve(code));
  };

  pollTimer = window.setInterval(poll, WEB_SERVER_CODE_POPUP_POLL_INTERVAL_MS);
  poll();
});

const requestDesktopToken = async () => {
  const clientId = getClientId();

  const redirectUri = getRedirectUri();

  logOAuthConfig("desktop-code", {
    clientId,
    redirectUri,
  });

  const state = randomBase64Url(16);

  const verifier = randomBase64Url(48);

  const challenge = await createCodeChallenge(verifier);

  const url = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge: challenge,
    state,
  });

  const codePromise = waitForDesktopCode(state, redirectUri);

  await oauthBridge.start(url);

  const code = await codePromise;

  const tokens = await oauthBridge.exchangeTokens({
    clientId,
    code,
    codeVerifier: verifier,
    redirectUri,
  });

  if (!tokens.accessToken) {
    throw new Error("Google OAuth failed: accessToken is missing");
  }

  await validateGrantedGoogleScopes({
    accessToken: tokens.accessToken,
    scope: tokens.scope,
    allowTokenInfoFallback: true,
  });

  const profile = getGoogleProfileFromIdToken(tokens.idToken);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    ...profile,
  };
};

export type GoogleCalendarAccess = {
  accessToken: string;
  accountEmail: string | null;
  accountName: string | null;
  accountPhotoUrl: string | null;
  expiresInSeconds?: number | null;
  refreshToken?: string;
};

export type GoogleConnectedServiceAccess = GoogleCalendarAccess;

const loadGoogleIdentityServices = async (): Promise<void> => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Google Identity Services is not available");
  }

  if (window.google?.accounts?.oauth2?.initTokenClient) {
    return;
  }

  googleIdentityScriptPromise ??= new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Identity Services")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.append(script);
  });

  await googleIdentityScriptPromise;

  if (!window.google?.accounts?.oauth2?.initTokenClient) {
    throw new Error("Google Identity Services did not initialize");
  }
};

const fetchGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google profile (${response.status})`);
  }

  const json = (await response.json()) as {
    email?: string;
    name?: string;
    picture?: string;
  };

  return {
    accountEmail: json.email ?? null,
    accountName: json.name ?? null,
    accountPhotoUrl: json.picture ?? null,
  };
};

export const requestGoogleCalendarServerCode = async (
  auth: Auth,
): Promise<{ code: string; codeVerifier: string; redirectUri: string }> => {
  if (typeof window === "undefined") {
    throw new Error("Google OAuth popup is not available");
  }

  const clientId = getWebClientId();
  const loginHint = auth.currentUser?.email ?? readEmail() ?? undefined;
  const redirectUri = window.location.origin;
  const state = randomBase64Url(16);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  logOAuthConfig("web-code", {
    clientId,
    origin: window.location.origin,
    redirectUri,
  });

  const url = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge,
    loginHint,
    state,
  });
  const popup = window.open(url, "flashcard-master-google-oauth", getCenteredPopupFeatures(500, 720));

  if (!popup) {
    throw new Error("Google OAuth popup could not be opened");
  }

  try {
    popup.focus();
  } catch {
    // popup focus はブラウザ設定で失敗しても認可フロー自体は続行できる。
  }

  try {
    const code = await waitForWebPopupCode(popup, state, redirectUri);
    pendingGoogleCalendarServerCodeVerifier = codeVerifier;

    return {
      code,
      codeVerifier,
      redirectUri,
    };
  } catch (error) {
    pendingGoogleCalendarServerCodeVerifier = null;
    throw error;
  }
};

export const requestGoogleConnectedServiceServerCode = requestGoogleCalendarServerCode;

const requestWebGisToken = async (
  auth: Auth,
  silent: boolean,
): Promise<GoogleCalendarAccess> => {
  await loadGoogleIdentityServices();

  const clientId = getWebClientId();
  const loginHint = auth.currentUser?.email ?? readEmail() ?? undefined;
  const prompt = silent ? "none" : "consent select_account";

  logOAuthConfig("web-token", {
    clientId,
    origin: window.location.origin,
  });

  const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
    const client = window.google!.accounts!.oauth2!.initTokenClient({
      callback: resolve,
      client_id: clientId,
      include_granted_scopes: true,
      login_hint: loginHint,
      prompt,
      scope: GOOGLE_SCOPE_PARAM,
      error_callback: (error) => {
        reject(new Error(error.message ?? error.type ?? "Google OAuth failed"));
      },
    });

    client.requestAccessToken({
      include_granted_scopes: true,
      login_hint: loginHint,
      prompt,
      scope: GOOGLE_SCOPE_PARAM,
    });
  });

  if (tokenResponse.error) {
    throw new Error(
      tokenResponse.error_description ?? tokenResponse.error ?? "Google OAuth failed",
    );
  }

  if (!tokenResponse.access_token) {
    throw new Error("No access token");
  }

  await validateGrantedGoogleScopes({
    accessToken: tokenResponse.access_token,
    scope: tokenResponse.scope,
    allowTokenInfoFallback: !silent,
  });

  let profile = {
    accountEmail: auth.currentUser?.email ?? null,
    accountName: auth.currentUser?.displayName ?? null,
    accountPhotoUrl: auth.currentUser?.photoURL ?? null,
  };

  try {
    profile = await fetchGoogleUserInfo(tokenResponse.access_token);
  } catch {
    // UserInfo が取れない場合も Google API の access token は利用できるため、
    // Firebase Auth の表示情報をフォールバックとして使う。
  }

  return {
    accessToken: tokenResponse.access_token,
    accountEmail: profile.accountEmail,
    accountName: profile.accountName,
    accountPhotoUrl: profile.accountPhotoUrl,
    expiresInSeconds: tokenResponse.expires_in ?? null,
  };
};

export const refreshCalendarAccessToken = async ({
  refreshToken,
}: {
  refreshToken: string;
}): Promise<GoogleCalendarAccess> => {
  if (isDesktopLikeRuntime()) {
    const clientId = getClientId();

    const tokens = await oauthBridge.refreshTokens({
      clientId,
      refreshToken,
    });

    if (!tokens.accessToken) {
      throw new Error("Missing refreshed access token");
    }

    await validateGrantedGoogleScopes({
      accessToken: tokens.accessToken,
      scope: tokens.scope,
      allowTokenInfoFallback: false,
    });

    const profile = getGoogleProfileFromIdToken(tokens.idToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken,
      ...profile,
    };
  }

  const clientId = getWebClientId();

  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google token");
  }

  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    id_token?: string;
    scope?: string;
  };

  if (!json.access_token) {
    throw new Error("Missing refreshed access token");
  }

  if (json.scope) {
    assertRequiredGoogleScopes(json.scope);
  }

  const profile = getGoogleProfileFromIdToken(json.id_token);

  return {
    accessToken: json.access_token,
    expiresInSeconds: json.expires_in ?? null,
    refreshToken: json.refresh_token ?? refreshToken,
    ...profile,
  };
};

export const refreshGoogleConnectedServiceAccessToken = refreshCalendarAccessToken;

const requestWebTokenWithFirebase = async (auth: Auth, silent: boolean) => {
  if (silent) {
    throw createGoogleCalendarReconnectRequiredError();
  }

  const provider = new GoogleAuthProvider();

  for (const scope of GOOGLE_SCOPES) {
    provider.addScope(scope);
  }

  provider.setCustomParameters({
    include_granted_scopes: "true",
    prompt: "consent",
  });

  const result = await signInWithPopup(auth, provider);

  const cred = GoogleAuthProvider.credentialFromResult(result);

  if (!cred?.accessToken) {
    throw new Error("No access token");
  }

  await validateGrantedGoogleScopes({
    accessToken: cred.accessToken,
    allowTokenInfoFallback: true,
  });

  return {
    accessToken: cred.accessToken,
    accountEmail: result.user.email,
    accountName: result.user.displayName,
    accountPhotoUrl: result.user.photoURL,
  };
};

const requestWebToken = async (
  auth: Auth,
  silent: boolean,
): Promise<GoogleCalendarAccess> => {
  if (import.meta.env.VITE_WEB_GOOGLE_OAUTH_CLIENT_ID) {
    return requestWebGisToken(auth, silent);
  }

  return requestWebTokenWithFirebase(auth, silent);
};

export const requestCalendarAccessToken = async (
  auth: Auth,
  silent = false,
): Promise<GoogleCalendarAccess> => {
  if (isDesktopLikeRuntime()) {
    if (silent) {
      throw createGoogleCalendarReconnectRequiredError();
    }

    return requestDesktopToken();
  }

  return requestWebToken(auth, silent);
};

export const requestGoogleConnectedServiceAccessToken = requestCalendarAccessToken;

export const getStoredEmail = (): string | null => {
  return readEmail();
};
