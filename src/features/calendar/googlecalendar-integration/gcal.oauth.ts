import {
  type Auth,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
} from "firebase/auth";

import { readEmail } from "./gcal.storage";

import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_TASKS_SCOPE =
  "https://www.googleapis.com/auth/tasks.readonly";

const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

const DESKTOP_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;

const GOOGLE_SCOPES = [GOOGLE_CALENDAR_SCOPE, GOOGLE_TASKS_SCOPE] as const;
const GOOGLE_SCOPE_PARAM = `openid email profile ${GOOGLE_SCOPES.join(" ")}`;

export const GOOGLE_SERVER_CODE_REDIRECT_URI = "postmessage";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

type GoogleCodeResponse = {
  code?: string;
  error?: string;
  error_description?: string;
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

type GoogleCodeClientOverrideConfig = {
  hint?: string;
  prompt?: string;
  scope?: string;
};

type GoogleCodeClient = {
  requestCode: (overrideConfig?: GoogleCodeClientOverrideConfig) => void;
};

type GoogleCodeClientConfig = GoogleCodeClientOverrideConfig & {
  callback: (response: GoogleCodeResponse) => void;
  client_id: string;
  error_callback?: (error: { type?: string; message?: string }) => void;
  include_granted_scopes?: boolean;
  ux_mode: "popup";
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initCodeClient: (config: GoogleCodeClientConfig) => GoogleCodeClient;
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
  const uri = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI;

  if (!uri) {
    throw new Error("Missing redirect uri");
  }

  return uri;
};

const buildAuthorizeUrl = ({
  clientId,
  redirectUri,
  codeChallenge,
  state,
  silent,
}: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  silent: boolean;
}) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE_PARAM,
    state,
    include_granted_scopes: "true",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    ...(silent
      ? {}
      : {
        prompt: "consent select_account",
      }),
  });

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

const requestDesktopToken = async (silent: boolean) => {
  const clientId = getClientId();

  const redirectUri = getRedirectUri();

  const state = randomBase64Url(16);

  const verifier = randomBase64Url(48);

  const challenge = await createCodeChallenge(verifier);

  const url = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge: challenge,
    state,
    silent,
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
): Promise<{ code: string; redirectUri: string }> => {
  await loadGoogleIdentityServices();

  const clientId = getWebClientId();
  const hint = auth.currentUser?.email ?? readEmail() ?? undefined;

  const response = await new Promise<GoogleCodeResponse>((resolve, reject) => {
    const client = window.google!.accounts!.oauth2!.initCodeClient({
      callback: resolve,
      client_id: clientId,
      hint,
      include_granted_scopes: true,
      prompt: "consent select_account",
      scope: GOOGLE_SCOPE_PARAM,
      ux_mode: "popup",
      error_callback: (error) => {
        reject(new Error(error.message ?? error.type ?? "Google OAuth failed"));
      },
    });

    client.requestCode({
      hint,
      prompt: "consent select_account",
      scope: GOOGLE_SCOPE_PARAM,
    });
  });

  if (response.error) {
    throw new Error(
      response.error_description ?? response.error ?? "Google OAuth failed",
    );
  }

  if (!response.code) {
    throw new Error("No authorization code");
  }

  return {
    code: response.code,
    redirectUri: GOOGLE_SERVER_CODE_REDIRECT_URI,
  };
};

const requestWebGisToken = async (
  auth: Auth,
  silent: boolean,
): Promise<GoogleCalendarAccess> => {
  await loadGoogleIdentityServices();

  const clientId = getWebClientId();
  const loginHint = auth.currentUser?.email ?? readEmail() ?? undefined;
  const prompt = silent ? "none" : "consent select_account";

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
  const clientId = getClientId();

  if (isDesktopLikeRuntime()) {
    const tokens = await oauthBridge.refreshTokens({
      clientId,
      refreshToken,
    });

    if (!tokens.accessToken) {
      throw new Error("Missing refreshed access token");
    }

    const profile = getGoogleProfileFromIdToken(tokens.idToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken,
      ...profile,
    };
  }

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
  };

  if (!json.access_token) {
    throw new Error("Missing refreshed access token");
  }

  const profile = getGoogleProfileFromIdToken(json.id_token);

  return {
    accessToken: json.access_token,
    expiresInSeconds: json.expires_in ?? null,
    refreshToken: json.refresh_token ?? refreshToken,
    ...profile,
  };
};

const requestWebTokenWithFirebase = async (auth: Auth, silent: boolean) => {
  const provider = new GoogleAuthProvider();

  for (const scope of GOOGLE_SCOPES) {
    provider.addScope(scope);
  }

  provider.setCustomParameters({
    include_granted_scopes: "true",
    ...(silent ? {} : { prompt: "consent" }),
  });

  if (silent && !auth.currentUser) {
    throw new Error("No current user for silent reauthentication");
  }

  const result = silent
    ? await reauthenticateWithPopup(auth.currentUser!, provider)
    : await signInWithPopup(auth, provider);

  const cred = GoogleAuthProvider.credentialFromResult(result);

  if (!cred?.accessToken) {
    throw new Error("No access token");
  }

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
    return requestDesktopToken(silent);
  }

  return requestWebToken(auth, silent);
};

export const getStoredEmail = (): string | null => {
  return readEmail();
};