import crypto from "node:crypto";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getDb, serverTimestamp } from "./firebaseAdmin.js";
import { renewExpiredWatchChannels } from "./gcal/renewWatchChannels.js";
import { classifyGoogleTokenEndpointFailure, type GoogleOAuthServerErrorReason } from "./gcal/tokenErrors.js";

const GOOGLE_OAUTH_WEB_CLIENT_ID = defineSecret("GOOGLE_OAUTH_WEB_CLIENT_ID");
const GOOGLE_OAUTH_WEB_CLIENT_SECRET = defineSecret("GOOGLE_OAUTH_WEB_CLIENT_SECRET");
const GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY = defineSecret(
  "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY",
);

const REGION = "asia-northeast1";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const REQUIRED_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.app.created",
  "https://www.googleapis.com/auth/tasks",
] as const;

type StoredGoogleCalendarAccount = {
  email: string;
  name: string | null;
  photoUrl: string | null;
  encryptedRefreshToken: string;
  createdAt: unknown;
  updatedAt: unknown;
};

const requireUid = (request: { auth?: { uid?: string } }) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
  return uid;
};

const maskAccountId = (accountId?: string): string | undefined => {
  if (!accountId) return undefined;
  const [localPart, domain] = accountId.split("@", 2);
  if (!domain) return `${accountId.slice(0, 3)}***`;
  return `${localPart.slice(0, 2)}***@${domain}`;
};

const getErrorSummary = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    type: typeof error,
  };
};

const isHttpsError = (error: unknown): error is HttpsError =>
  error instanceof HttpsError;

const classifiedPrecondition = (
  message: string,
  details: {
    reason: GoogleOAuthServerErrorReason;
    reconnectRequired: boolean;
    userAction?: "reconnect_google_account";
    adminAction?: string;
  },
): HttpsError => new HttpsError("failed-precondition", message, details);

const safeSecretValue = (
  secret: { value: () => string },
  name: string,
  reason: "server_oauth_configuration" | "token_encryption_key_invalid",
): string => {
  try {
    const value = secret.value();
    if (!value) {
      throw new Error(`${name} is empty`);
    }
    return value;
  } catch (error) {
    throw classifiedPrecondition(`Missing or invalid Firebase secret: ${name}`, {
      reason,
      reconnectRequired: false,
      adminAction: "set_firebase_functions_secret",
    });
  }
};
