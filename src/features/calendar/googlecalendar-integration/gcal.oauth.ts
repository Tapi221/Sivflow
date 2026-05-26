import { type Auth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { DESKTOP_GOOGLE_OAUTH_REDIRECT_URI } from "@constants/electron/app";
import { readEmail } from "./gcal.storage";
import { oauthBridge } from "@/platform/capabilities/oauthBridge";
import { getRuntimeKind, isDesktopLikeRuntime } from "@/platform/runtimeKind";

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_TASKS_SCOPE =
  "https://www.googleapis.com/auth/tasks";

const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

const DESKTOP_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const WEB_SERVER_CODE_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;
const WEB_SERVER_CODE_POPUP_POLL_INTERVAL_MS = 250;

const GOOGLE_SCOPES = [GOOGLE_CALENDAR_SCOPE, GOOGLE_TASKS_SCOPE] as const;
const GOOGLE_SCOPE_PARAM = `openid email profile ${GOOGLE_SCOPES.join(" ")}`;

export const GOOGLE_SERVER_CODE_REDIRECT_URI =
  typeof window === "undefined" ? "postmessage" : window.location.origin;

const GOOGLE_CALENDAR_RECONNECT_REQUIRED_CODE = "failed-precondition";

const createGoogleCalendarReconnectRequiredError = (): Error => {
  const error = new Error("Google Calendar の再連携が必要です");

  (error as Error & { code?: string }).code =
    GOOGLE_CALENDAR_RECONNECT_REQUIRED_CODE;

  return error;
};
