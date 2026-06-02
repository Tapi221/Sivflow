import { type Auth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { listServerStoredGoogleCalendarAccounts } from "@/integration/googlecalendar-integration/gcal.server-account-list";
import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";
import { exchangeGoogleCalendarCode, getServerStoredGoogleCalendarAccessToken } from "./google.server-oauth";

const GOOGLE_SIGN_IN_SCOPE_PARAM = "openid email profile";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_CALENDAR_APP_CREATED_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const OAUTH_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const DESKTOP_CODE_CALLBACK_POLL_MS = 250;
const GOOGLE_DRIVE_RECONNECT_REQUIRED_CODE = "failed-precondition";
const GOOGLE_DRIVE_DESKTOP_SCOPE_PARAM = `${GOOGLE_SIGN_IN_SCOPE_PARAM} ${GOOGLE_CALENDAR_SCOPE} ${GOOGLE_CALENDAR_READONLY_SCOPE} ${GOOGLE_CALENDAR_APP_CREATED_SCOPE} ${GOOGLE_TASKS_SCOPE} ${GOOGLE_DRIVE_FILE_SCOPE}`;
const DEFAULT_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI = "http://127.0.0.1:42813";

type GoogleDriveOAuthServerCode = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

type GoogleOAuthCallbackLike = {
  url: string;
  state?: string | null;
  code?: string | null;
  error?: string | null;
  errorDescription?: string | null;
};

const createGoogleDriveReconnectRequiredError = (): Error => {
  const error = new Error("Google Drive の再認可が必要です");
  (error as Error & { code?: string }).code = GOOGLE_DRIVE_RECONNECT_REQUIRED_CODE;
  return error;
};

const getGoogleOAuthClientId = (): string => {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("Missing Google OAuth client id");
  return clientId;
};

const getDesktopRedirectUri = (): string => import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI?.trim() || DEFAULT_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI;

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const randomBase64Url = (length: number): string => toBase64Url(crypto.getRandomValues(new Uint8Array(length)));

const createCodeChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
};

const buildAuthorizeUrl = ({
  clientId,
  codeChallenge,
  loginHint,
  redirectUri,
  state,
}: {
  clientId: string;
  codeChallenge: string;
  loginHint?: string;
  redirectUri: string;
  state: string;
}): string => {
  const params = new URLSearchParams({
    access_type: "offline",
    client_id: clientId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    include_granted_scopes: "true",
    prompt: "consent select_account",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_DRIVE_DESKTOP_SCOPE_PARAM,
    state,
  });
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

  const handleCallbackUrl = ({ rawUrl, callbackState, callbackCode, callbackError, errorDescription }: { rawUrl: string; callbackState?: string | null; callbackCode?: string | null; callbackError?: string | null; errorDescription?: string | null }): void => {
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
    handleCallbackUrl({
      rawUrl: payload.url,
      callbackState: payload.state,
      callbackCode: payload.code,
      callbackError: payload.error,
      errorDescription: payload.errorDescription,
    });
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

const hasGoogleDriveFileScope = async (accessToken: string): Promise<boolean> => {
  const response = await fetch(`${GOOGLE_OAUTH_TOKENINFO_ENDPOINT}?${new URLSearchParams({ access_token: accessToken })}`);
  if (!response.ok) return false;
  const json = (await response.json()) as { scope?: string };
  return new Set((json.scope ?? "").split(/\s+/).filter(Boolean)).has(GOOGLE_DRIVE_FILE_SCOPE);
};

const assertGoogleDriveFileScope = async (accessToken: string): Promise<void> => {
  if (await hasGoogleDriveFileScope(accessToken)) return;
  throw createGoogleDriveReconnectRequiredError();
};

const requestGoogleDriveServerCode = async (auth: Auth): Promise<GoogleDriveOAuthServerCode> => {
  if (typeof window === "undefined") throw new Error("Google Drive OAuth is not available");
  const clientId = getGoogleOAuthClientId();
  const redirectUri = getDesktopRedirectUri();
  const state = randomBase64Url(16);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    codeChallenge,
    loginHint: auth.currentUser?.email ?? undefined,
    redirectUri,
    state,
  });
  const codePromise = waitForDesktopCode(state, redirectUri);
  await oauthBridge.start(authorizeUrl);
  const code = await codePromise;
  return { code, codeVerifier, redirectUri };
};

const requestWebGoogleDriveFileAccessToken = async (auth: Auth): Promise<string> => {
  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_DRIVE_FILE_SCOPE);
  provider.setCustomParameters({ prompt: "consent select_account" });
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) throw createGoogleDriveReconnectRequiredError();
  return credential.accessToken;
};

const readDesktopGoogleDriveFileAccessToken = async (): Promise<string | null> => {
  const accounts = await listServerStoredGoogleCalendarAccounts().catch(() => []);
  for (const account of accounts) {
    try {
      const result = await getServerStoredGoogleCalendarAccessToken({ accountId: account.accountId });
      await assertGoogleDriveFileScope(result.accessToken);
      return result.accessToken;
    } catch (error) {
      console.warn("[GoogleDrive] stored server token cannot access Drive", error);
    }
  }
  return null;
};

const requestDesktopGoogleDriveFileAccessToken = async (auth: Auth): Promise<string> => {
  const storedAccessToken = await readDesktopGoogleDriveFileAccessToken();
  if (storedAccessToken) return storedAccessToken;

  const { code, codeVerifier, redirectUri } = await requestGoogleDriveServerCode(auth);
  const result = await exchangeGoogleCalendarCode({
    code,
    codeVerifier,
    forceRefreshToken: true,
    redirectUri,
  });
  await assertGoogleDriveFileScope(result.accessToken);
  return result.accessToken;
};

export const requestGoogleDriveFileAccessToken = async (auth: Auth): Promise<string> => {
  if (isDesktopLikeRuntime()) {
    return requestDesktopGoogleDriveFileAccessToken(auth);
  }

  return requestWebGoogleDriveFileAccessToken(auth);
};
