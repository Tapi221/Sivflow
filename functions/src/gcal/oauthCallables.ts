import crypto from "node:crypto";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getAdminAuth, getDb, serverTimestamp } from "#src/firebaseAdmin.js";
import { cacheGoogleProfileImageUrl } from "#src/gcal/profileImageCache.js";
import { classifyGoogleTokenEndpointFailure } from "#src/gcal/tokenErrors.js";
import type { GoogleOAuthServerErrorReason } from "#src/gcal/tokenErrors.js";

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
const exchangeGoogleCalendarCode = connectGoogleCalendarAccount;
const getGoogleCalendarAccessToken = refreshGoogleCalendarAccessToken;
const disconnectGoogleCalendarAccount = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const accountId = typeof request.data?.accountId === "string" ? request.data.accountId : "";
  if (!accountId) throw new HttpsError("invalid-argument", "accountId is required.");
  await (await getDb()).doc(`users/${uid}/googleCalendarAccounts/${accountId}`).delete();
  return { ok: true };
});
const createGoogleCalendarCustomToken = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  return { customToken: await (await getAdminAuth()).createCustomToken(uid) };
});
const listGoogleCalendarAccounts = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const snapshot = await (await getDb()).collection(`users/${uid}/googleCalendarAccounts`).get();
  return {
    accounts: snapshot.docs.map((doc) => {
      const data = doc.data() as Partial<StoredGoogleCalendarAccount>;
      return { accountId: doc.id, email: typeof data.email === "string" ? data.email : null, name: typeof data.name === "string" ? data.name : null, photoUrl: getExistingAccountPhotoUrl(data) };
    })
  };
});
const connectGoogleCalendarAccount = onCall({ region: REGION, secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY] }, async (request) => {
  const uid = requireUid(request);
  const code = typeof request.data?.code === "string" ? request.data.code : "";
  const codeVerifier = typeof request.data?.codeVerifier === "string" ? request.data.codeVerifier : "";
  const redirectUri = typeof request.data?.redirectUri === "string" ? request.data.redirectUri : "";
  if (!code || !redirectUri) throw new HttpsError("invalid-argument", "Google authorization code and redirectUri are required.");
  const params = new URLSearchParams({ code, client_id: safeSecretValue(GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID", "server_oauth_configuration"), client_secret: safeSecretValue(GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET", "server_oauth_configuration"), redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (codeVerifier) params.set("code_verifier", codeVerifier);
  const data = await exchangeToken(params, "authorization_code");
  const accessToken = getTokenString(data, "access_token");
  const refreshToken = getTokenString(data, "refresh_token");
  if (!accessToken || !refreshToken) throw new HttpsError("failed-precondition", "Google OAuth response did not include tokens.", { reason: "google_token_invalid_response", reconnectRequired: true, userAction: "reconnect_google_account" });
  await verifyGoogleScopes(accessToken);
  const profile = await readGoogleProfile(accessToken);
  const account = await storeGoogleAccount(uid, refreshToken, profile);
  await (await getAdminAuth()).updateUser(uid, { email: profile.accountEmail, displayName: profile.accountName ?? undefined, photoURL: account.photoUrl ?? undefined });
  return toAccessResponse(accessToken, account, getTokenNumber(data, "expires_in"));
});
const refreshGoogleCalendarAccessToken = onCall({ region: REGION, secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY] }, async (request) => {
  const uid = requireUid(request);
  const accountId = typeof request.data?.accountId === "string" ? request.data.accountId : typeof request.data?.accountEmail === "string" ? request.data.accountEmail : "";
  return await getStoredAccessToken(uid, accountId);
});

const requireUid = (request: { auth?: { uid?: string; }; }) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
  return uid;
};
const getErrorSummary = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  return { type: typeof error };
};
const isHttpsError = (error: unknown): error is HttpsError => error instanceof HttpsError;
const classifiedPrecondition = (message: string, details: { reason: GoogleOAuthServerErrorReason; reconnectRequired: boolean; userAction?: "reconnect_google_account"; adminAction?: string; }): HttpsError => new HttpsError("failed-precondition", message, details);
const safeSecretValue = (secret: { value: () => string; }, name: string, reason: "server_oauth_configuration" | "token_encryption_key_invalid"): string => {
  try {
    const value = secret.value();
    if (!value) throw new Error(`${name} is empty`);
    return value;
  } catch (error) {
    console.error("[GoogleCalendarOAuth] secret access failed", { secretName: name, reason, error: getErrorSummary(error) });
    throw classifiedPrecondition(`${name} is not configured or cannot be accessed by this function.`, { reason, reconnectRequired: false, adminAction: reason === "server_oauth_configuration" ? "check GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET and redeploy functions" : "check GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY and redeploy functions" });
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

  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const googleError = typeof data.error === "string" ? data.error : "unknown";
    const description = typeof data.error_description === "string" ? data.error_description : "";
    const classified = classifyGoogleTokenEndpointFailure({ context, status: response.status, googleError, description });
    throw new HttpsError(classified.code, classified.message, classified.details);
  }

  return data;
};
const getTokenString = (data: Record<string, unknown>, key: string): string | null => typeof data[key] === "string" ? data[key] : null;
const getTokenNumber = (data: Record<string, unknown>, key: string): number | null => typeof data[key] === "number" && Number.isFinite(data[key]) ? data[key] : null;
const fetchGoogleJson = async (url: string, accessToken: string, context: "tokeninfo" | "userinfo") => {
  const options: RequestInit = context === "tokeninfo" ? {} : { headers: { Authorization: `Bearer ${accessToken}` } };
  const response = await fetch(url, options);
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new HttpsError("failed-precondition", `Google ${context} request failed.`, { reason: context === "tokeninfo" ? "google_token_invalid_response" : "google_userinfo_failed", reconnectRequired: true, userAction: "reconnect_google_account" });
  return data;
};
const readGoogleProfile = async (accessToken: string): Promise<GoogleOAuthProfile> => {
  const userInfo = await fetchGoogleJson(GOOGLE_USERINFO_ENDPOINT, accessToken, "userinfo");
  const email = typeof userInfo.email === "string" ? userInfo.email : "";
  if (!email) throw new HttpsError("failed-precondition", "Google account did not return an email address.", { reason: "google_userinfo_invalid_response", reconnectRequired: true, userAction: "reconnect_google_account" });

  return { accountEmail: email, accountName: typeof userInfo.name === "string" ? userInfo.name : null, accountPhotoUrl: typeof userInfo.picture === "string" ? userInfo.picture : null };
};
const verifyGoogleScopes = async (accessToken: string): Promise<void> => {
  const tokenInfoUrl = `${GOOGLE_TOKENINFO_ENDPOINT}?access_token=${encodeURIComponent(accessToken)}`;
  const tokenInfo = await fetchGoogleJson(tokenInfoUrl, accessToken, "tokeninfo");
  const scopeValue = typeof tokenInfo.scope === "string" ? tokenInfo.scope : "";
  const scopes = new Set(scopeValue.split(" ").filter(Boolean));
  const missingScopes = REQUIRED_GOOGLE_SCOPES.filter((scope) => !scopes.has(scope));
  if (missingScopes.length > 0) throw new HttpsError("failed-precondition", "Google account is missing required Calendar/Tasks/Drive scopes. Reconnect the Google account.", { reason: "insufficient_google_scope", reconnectRequired: true, userAction: "reconnect_google_account" });
};
const isReusableCachedPhotoUrl = (photoUrl: unknown): photoUrl is string => typeof photoUrl === "string" && (photoUrl.startsWith("https://firebasestorage.googleapis.com/") || photoUrl.startsWith("https://storage.googleapis.com/"));
const getExistingAccountPhotoUrl = (account: Partial<StoredGoogleCalendarAccount> | null): string | null => isReusableCachedPhotoUrl(account?.photoUrl) ? account.photoUrl : null;
const storeGoogleAccount = async (uid: string, refreshToken: string, profile: GoogleOAuthProfile) => {
  const db = await getDb();
  const now = await serverTimestamp();
  const accountRef = db.doc(`users/${uid}/googleCalendarAccounts/${profile.accountEmail}`);
  const previousAccountSnap = await accountRef.get();
  const previousAccount = previousAccountSnap.exists ? previousAccountSnap.data() as Partial<StoredGoogleCalendarAccount> : null;
  const encryptedRefreshToken = encryptRefreshToken(refreshToken);
  const cachedPhotoUrl = await cacheGoogleProfileImageUrl(uid, profile.accountPhotoUrl);
  const account: StoredGoogleCalendarAccount = { email: profile.accountEmail, name: profile.accountName, photoUrl: cachedPhotoUrl ?? getExistingAccountPhotoUrl(previousAccount), encryptedRefreshToken, createdAt: previousAccount?.createdAt ?? now, updatedAt: now };
  await accountRef.set(account, { merge: true });
  return account;
};
const toAccessResponse = (accessToken: string, account: StoredGoogleCalendarAccount, expiresInSeconds: number | null) => ({ accessToken, expiresIn: expiresInSeconds, expiresInSeconds, accountEmail: account.email, accountName: account.name, accountPhotoUrl: account.photoUrl, refreshTokenStored: true });
const getStoredAccount = async (uid: string, accountId: string): Promise<StoredGoogleCalendarAccount> => {
  if (!accountId) throw new HttpsError("invalid-argument", "accountId is required.");
  const accountSnap = await (await getDb()).doc(`users/${uid}/googleCalendarAccounts/${accountId}`).get();
  if (!accountSnap.exists) throw new HttpsError("not-found", "Google account is not connected.", { reason: "stored_refresh_token_missing", reconnectRequired: true, userAction: "reconnect_google_account" });
  const data = accountSnap.data() as Partial<StoredGoogleCalendarAccount>;
  if (typeof data.encryptedRefreshToken !== "string") throw new HttpsError("failed-precondition", "Stored Google account is missing a refresh token.", { reason: "stored_refresh_token_missing", reconnectRequired: true, userAction: "reconnect_google_account" });
  return { email: typeof data.email === "string" ? data.email : accountId, name: typeof data.name === "string" ? data.name : null, photoUrl: getExistingAccountPhotoUrl(data), encryptedRefreshToken: data.encryptedRefreshToken, createdAt: data.createdAt ?? null, updatedAt: data.updatedAt ?? null };
};
const getStoredAccessToken = async (uid: string, accountId: string) => {
  const account = await getStoredAccount(uid, accountId);
  const refreshToken = decryptRefreshToken(account.encryptedRefreshToken);
  const data = await exchangeToken(new URLSearchParams({ refresh_token: refreshToken, client_id: safeSecretValue(GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID", "server_oauth_configuration"), client_secret: safeSecretValue(GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET", "server_oauth_configuration"), grant_type: "refresh_token" }), "refresh_token");
  const accessToken = getTokenString(data, "access_token");
  if (!accessToken) throw new HttpsError("failed-precondition", "Google OAuth refresh response did not include an access token.", { reason: "google_token_invalid_response", reconnectRequired: true, userAction: "reconnect_google_account" });
  await verifyGoogleScopes(accessToken);
  return toAccessResponse(accessToken, account, getTokenNumber(data, "expires_in"));
};

export { googleCalendarWebhook } from "#src/gcal/googleCalendarWebhook.js";
export { renewExpiredWatchChannels } from "#src/gcal/renewWatchChannels.js";
export { connectGoogleCalendarAccount, exchangeGoogleCalendarCode, refreshGoogleCalendarAccessToken, getGoogleCalendarAccessToken, listGoogleCalendarAccounts, disconnectGoogleCalendarAccount, createGoogleCalendarCustomToken };
