import {
  type Auth,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
} from "firebase/auth";

import { readEmail } from "./gcal.storage";

import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";

// ─────────────────────────────────────
// constants
// ─────────────────────────────────────

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const DESKTOP_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;

// ─────────────────────────────────────
// PKCE utils
// ─────────────────────────────────────

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (v) => String.fromCharCode(v)).join("");

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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

// ─────────────────────────────────────
// JWT util
// ─────────────────────────────────────

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

const getEmailFromIdToken = (idToken?: string): string | null => {
  if (!idToken) {
    return null;
  }

  const payload = parseJwtPayload(idToken);

  return typeof payload?.email === "string" ? payload.email : null;
};

// ─────────────────────────────────────
// desktop OAuth
// ─────────────────────────────────────

const getClientId = (): string => {
  const clientId = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing Google OAuth client id");
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
    scope: `openid email profile ${GOOGLE_CALENDAR_SCOPE}`,
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

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accountEmail: getEmailFromIdToken(tokens.idToken),
  };
};

// ─────────────────────────────────────
// refresh token
// ─────────────────────────────────────

export const refreshCalendarAccessToken = async ({
  refreshToken,
}: {
  refreshToken: string;
}): Promise<GoogleCalendarAccess> => {
  const clientId = getClientId();

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
    refresh_token?: string;
    id_token?: string;
  };

  if (!json.access_token) {
    throw new Error("Missing refreshed access token");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    accountEmail: getEmailFromIdToken(json.id_token),
  };
};

// ─────────────────────────────────────
// firebase OAuth (web)
// ─────────────────────────────────────

const requestWebToken = async (auth: Auth, silent: boolean) => {
  const provider = new GoogleAuthProvider();

  provider.addScope(GOOGLE_CALENDAR_SCOPE);

  provider.setCustomParameters({
    include_granted_scopes: "true",
    ...(silent ? {} : { prompt: "consent" }),
  });

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
  };
};

// ─────────────────────────────────────
// public API
// ─────────────────────────────────────

export type GoogleCalendarAccess = {
  accessToken: string;
  accountEmail: string | null;
  refreshToken?: string;
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
