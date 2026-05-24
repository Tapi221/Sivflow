import {
  type Auth,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
} from "firebase/auth";

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

const GOOGLE_SCOPES = [GOOGLE_CALENDAR_SCOPE, GOOGLE_TASKS_SCOPE] as const;
const GOOGLE_SCOPE_PARAM = `openid email profile ${GOOGLE_SCOPES.join(" ")}`;

export const GOOGLE_SERVER_CODE_REDIRECT_URI =
  typeof window === "undefined" ? "postmessage" : window.location.origin;

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
  redirect_uri?: string;
  callback: (response: GoogleCodeResponse) => void;
  client_id: string;
  error_callback?: (error: { type?: string; message?: string }) => void;
  include_granted_scopes?: boolean;
  ux_mode: "popup";
};