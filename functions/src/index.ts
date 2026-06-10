import crypto from "node:crypto";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getAdminAuth, getDb, serverTimestamp } from "#src/firebaseAdmin.js";
import { googleCalendarWebhook } from "#src/gcal/googleCalendarWebhook.js";
import { renewExpiredWatchChannels } from "#src/gcal/renewWatchChannels.js";
import { cacheGoogleProfileImageDataUrl } from "#src/gcal/profileImageCache.js";
import { classifyGoogleTokenEndpointFailure, type GoogleOAuthServerErrorReason } from "#src/gcal/tokenErrors.js";

type StoredGoogleCalendarAccount = {
  email: string;
  name: string | null;
  photoUrl: string | null;
  encryptedRefreshToken: string;
  createdAt: unknown;
  updatedAt: unknown;
};

type GoogleOAuthProfile = {
  accountEmail: string;
  accountName: string | null;
  accountPhotoUrl: string | null;
};

const GOOGLE_OAUTH_CLIENT_ID = defineSecret("GOOGLE_OAUTH_CLIENT_ID");
const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret("GOOGLE_OAUTH_CLIENT_SECRET");
const GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY = defineSecret("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY");

const REGION = "asia-northeast1";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const REQUIRED_GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.app.created", "https://www.googleapis.com/auth/tasks", "https://www.googleapis.com/auth/drive.file"] as const;

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
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  return { type: typeof error };
};

const isHttpsError = (error: unknown): error is HttpsError => error instanceof HttpsError;

const classifiedPrecondition = (message: string, details: { reason: GoogleOAuthServerErrorReason; reconnectRequired: boolean; userAction?: "reconnect_google_account"; adminAction?: string }): HttpsError => new HttpsError("failed-precondition", message, details);

const safeSecretValue = (secret: { value: () => string }, name: string, reason: "server_oauth_configuration" | "token_encryption_key_invalid"): string => {
  try {
    const value = secret.value();
    if (!value) throw new Error(`${name} is empty`);
    return value;
  } catch (error) {
    console.error("[GoogleCalendarOAuth] secret access failed", { secretName: name, reason, error: getErrorSummary(error) });
    throw classifiedPrecondition(`${name} is not configured or cannot be accessed by this function.`, {
      reason,
      reconnectRequired: false,
      adminAction: reason === "server_oauth_configuration" ? "check GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET and redeploy functions" : "check GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY and redeploy functions",
    });
  }
};

const getKey = (): Buffer => {
  let key: Buffer;
  try {
    key = Buffer.from(safeSecretValue(GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY, "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY", "token_encryption_key_invalid"), "base64");
  } catch (error) {
    console.error("[GoogleCalendarOAuth] token encryption key decode failed", { error: getErrorSummary(error) });
    throw classifiedPrecondition("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must be base64 encoded 32 bytes.", { reason: "token_encryption_key_invalid", reconnectRequired: false, adminAction: "check GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY and redeploy functions" });
  }
  if (key.length !== 32) {
    throw classifiedPrecondition("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must be base64 encoded 32 bytes.", { reason: "token_encryption_key_invalid", reconnectRequired: false, adminAction: "check GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY and redeploy functions" });
  }
  return key;
};

const encryptRefreshToken = (refreshToken: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

const decryptRefreshToken = (payload: string): string => {
  try {
    const raw = Buffer.from(payload, "base64");
    if (raw.length < 29) throw new Error("Stored refresh token payload is invalid.");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch (error) {
    if (isHttpsError(error)) throw error;
    console.error("[GoogleCalendarOAuth] stored refresh token decrypt failed", { errorName: error instanceof Error ? error.name : typeof error });
    throw classifiedPrecondition("Stored refresh token is not readable by the current server key.", { reason: "stored_refresh_token_decrypt_failed", reconnectRequired: false });
  }
};

const exchangeToken = async (params: URLSearchParams, context: "authorization_code" | "refresh_token") => {
  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  } catch (error) {
    console.error("[GoogleCalendarOAuth] token endpoint fetch failed", { context, error: getErrorSummary(error) });
    throw new HttpsError("unavailable", "Google OAuth token endpoint could not be reached.", { reason: "google_token_fetch_failed", reconnectRequired: false });
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("[GoogleCalendarOAuth] token endpoint returned invalid JSON", { context, status: response.status, error: getErrorSummary(error) });
    throw new HttpsError("unavailable", "Google OAuth token endpoint returned an unreadable response.", { reason: "google_token_invalid_response", reconnectRequired: false });
  }

  if (!response.ok) {
    const googleError = typeof data.error === "string" ? data.error : "unknown";
    const description = typeof data.error_description === "string" ? data.error_description : "";
    const classified = classifyGoogleTokenEndpointFailure({ context, status: response.status, googleError, description });
    console.warn("[GoogleCalendarOAuth] token endpoint rejected request", { context, status: response.status, googleError, description, classifiedReason: classified.details.reason });
    throw new HttpsError(classified.code, classified.message, classified.details);
  }

  return data;
};

const getTokenString = (data: Record<string, unknown>, key: string): string | null => typeof data[key] === "string" ? data[key] : null;

const fetchGoogleJson = async (url: string, accessToken: string, context: "tokeninfo" | "userinfo") => {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch (error) {
    console.error(`[GoogleCalendarOAuth] ${context} fetch failed`, { error: getErrorSummary(error) });
    throw new HttpsError("unavailable", `Google ${context} endpoint could not be reached.`, { reason: context === "tokeninfo" ? "google_token_fetch_failed" : "google_userinfo_fetch_failed", reconnectRequired: false });
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.error(`[GoogleCalendarOAuth] ${context} returned invalid JSON`, { status: response.status, error: getErrorSummary(error) });
    throw new HttpsError("unavailable", `Google ${context} endpoint returned an unreadable response.`, { reason: context === "tokeninfo" ? "google_token_invalid_response" : "google_userinfo_invalid_response", reconnectRequired: false });
  }

  if (!response.ok) {
    console.warn(`[GoogleCalendarOAuth] ${context} rejected request`, { status: response.status, error: data.error });
    throw new HttpsError("failed-precondition", `Google ${context} request failed.`, { reason: context === "tokeninfo" ? "google_token_invalid_response" : "google_userinfo_failed", reconnectRequired: true, userAction: "reconnect_google_account" });
  }

  return data;
};

const readGoogleProfile = async (accessToken: string): Promise<GoogleOAuthProfile> => {
  const userInfo = await fetchGoogleJson(GOOGLE_USERINFO_ENDPOINT, accessToken, "userinfo");
  const email = typeof userInfo.email === "string" ? userInfo.email : "";
  if (!email) {
    throw new HttpsError("failed-precondition", "Google account did not return an email address.", { reason: "google_userinfo_invalid_response", reconnectRequired: true, userAction: "reconnect_google_account" });
  }
  return {
    accountEmail: email,
    accountName: typeof userInfo.name === "string" ? userInfo.name : null,
    accountPhotoUrl: typeof userInfo.picture === "string" ? userInfo.picture : null,
  };
};

const verifyGoogleScopes = async (accessToken: string): Promise<void> => {
  const tokenInfo = await fetchGoogleJson(GOOGLE_TOKENINFO_ENDPOINT, accessToken, "tokeninfo");
  const scopeValue = typeof tokenInfo.scope === "string" ? tokenInfo.scope : "";
  const scopes = new Set(scopeValue.split(" ").filter(Boolean));
  const missingScopes = REQUIRED_GOOGLE_SCOPES.filter((scope) => !scopes.has(scope));
  if (missingScopes.length > 0) {
    console.warn("[GoogleCalendarOAuth] missing required scopes", { missingScopes });
    throw new HttpsError("failed-precondition", "Google account is missing required Calendar/Tasks/Drive scopes. Reconnect the Google account.", { reason: "insufficient_google_scope", reconnectRequired: true, userAction: "reconnect_google_account" });
  }
};

const storeGoogleAccount = async (uid: string, refreshToken: string, profile: GoogleOAuthProfile) => {
  const now = await serverTimestamp();
  const encryptedRefreshToken = encryptRefreshToken(refreshToken);
  const cachedPhotoUrl = await cacheGoogleProfileImageDataUrl(profile.accountPhotoUrl);
  const account: StoredGoogleCalendarAccount = { email: profile.accountEmail, name: profile.accountName, photoUrl: cachedPhotoUrl, encryptedRefreshToken, createdAt: now, updatedAt: now };
  const accountRef = (await getDb()).doc(`users/${uid}/googleCalendarAccounts/${profile.accountEmail}`);
  await accountRef.set(account, { merge: true });
  return account;
};

export const connectGoogleCalendarAccount = onCall(
  { region: REGION, secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY] },
  async (request) => {
    const uid = requireUid(request);
    const code = typeof request.data?.code === "string" ? request.data.code : "";
    const redirectUri = typeof request.data?.redirectUri === "string" ? request.data.redirectUri : "";
    if (!code || !redirectUri) throw new HttpsError("invalid-argument", "Google authorization code and redirectUri are required.");

    const data = await exchangeToken(new URLSearchParams({ code, client_id: safeSecretValue(GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID", "server_oauth_configuration"), client_secret: safeSecretValue(GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET", "server_oauth_configuration"), redirect_uri: redirectUri, grant_type: "authorization_code" }), "authorization_code");
    const accessToken = getTokenString(data, "access_token");
    const refreshToken = getTokenString(data, "refresh_token");
    if (!accessToken || !refreshToken) throw new HttpsError("failed-precondition", "Google OAuth response did not include tokens.", { reason: "google_token_invalid_response", reconnectRequired: true, userAction: "reconnect_google_account" });

    await verifyGoogleScopes(accessToken);
    const profile = await readGoogleProfile(accessToken);
    const account = await storeGoogleAccount(uid, refreshToken, profile);

    try {
      await getAdminAuth().updateUser(uid, { email: profile.accountEmail, displayName: profile.accountName ?? undefined, photoURL: account.photoUrl ?? undefined });
    } catch (error) {
      console.error("[GoogleCalendarOAuth] failed to sync Firebase Auth profile", { uid, account: maskAccountId(profile.accountEmail), error: getErrorSummary(error) });
      throw new HttpsError("unavailable", "Google account was stored but Firebase Auth profile could not be updated.", { reason: "firebase_auth_user_sync_failed", reconnectRequired: false });
    }

    return { accountEmail: account.email, accountName: account.name, accountPhotoUrl: account.photoUrl };
  },
);

export const refreshGoogleCalendarAccessToken = onCall(
  { region: REGION, secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY] },
  async (request) => {
    const uid = requireUid(request);
    const accountEmail = typeof request.data?.accountEmail === "string" ? request.data.accountEmail : "";
    if (!accountEmail) throw new HttpsError("invalid-argument", "accountEmail is required.");

    const accountSnap = await (await getDb()).doc(`users/${uid}/googleCalendarAccounts/${accountEmail}`).get();
    if (!accountSnap.exists) throw new HttpsError("failed-precondition", "Google account is not connected.", { reason: "stored_refresh_token_missing", reconnectRequired: true, userAction: "reconnect_google_account" });

    const account = accountSnap.data() as StoredGoogleCalendarAccount;
    const refreshToken = decryptRefreshToken(account.encryptedRefreshToken);
    const data = await exchangeToken(new URLSearchParams({ refresh_token: refreshToken, client_id: safeSecretValue(GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID", "server_oauth_configuration"), client_secret: safeSecretValue(GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET", "server_oauth_configuration"), grant_type: "refresh_token" }), "refresh_token");
    const accessToken = getTokenString(data, "access_token");
    if (!accessToken) throw new HttpsError("failed-precondition", "Google OAuth refresh response did not include an access token.", { reason: "google_token_invalid_response", reconnectRequired: true, userAction: "reconnect_google_account" });

    await verifyGoogleScopes(accessToken);
    return { accessToken, expiresIn: data.expires_in ?? null, accountEmail, accountName: account.name, accountPhotoUrl: account.photoUrl };
  },
);

export const createGoogleCalendarCustomToken = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireUid(request);
    try {
      return { customToken: await getAdminAuth().createCustomToken(uid) };
    } catch (error) {
      console.error("[GoogleCalendarOAuth] create custom token failed", { uid, error: getErrorSummary(error) });
      throw new HttpsError("unavailable", "Firebase custom token could not be created.", { reason: "firebase_custom_token_failed", reconnectRequired: false });
    }
  },
);

export { googleCalendarWebhook, renewExpiredWatchChannels };
