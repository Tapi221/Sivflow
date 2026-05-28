import { type Auth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { DESKTOP_GOOGLE_OAUTH_REDIRECT_URI } from "@constants/electron/app";
import { readEmail } from "@/integration/googlecalendar-integration/gcal.storage";
import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { getRuntimeKind, isDesktopLikeRuntime } from "@/platform/runtimeKind";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_CALENDAR_APP_CREATED_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

const DESKTOP_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const WEB_SERVER_CODE_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const WEB_SERVER_CODE_POPUP_POLL_INTERVAL_MS = 250;

export const GOOGLE_CONNECTED_SERVICE_SCOPES = [GOOGLE_CALENDAR_SCOPE, GOOGLE_CALENDAR_APP_CREATED_SCOPE, GOOGLE_TASKS_SCOPE] as const;
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
