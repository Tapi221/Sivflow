import crypto from "node:crypto";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getAdminAuth, getDb, serverTimestamp } from "./firebaseAdmin.js";
import { renewExpiredWatchChannels } from "./gcal/renewWatchChannels.js";
import { classifyGoogleTokenEndpointFailure, type GoogleOAuthServerErrorReason } from "./gcal/tokenErrors.js";

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
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
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
    throw new HttpsError(response.ok ? "internal" : "unavailable", "Google OAuth token endpoint returned an unreadable response.", { reason: "google_token_invalid_response", reconnectRequired: false, status: response.status });
  }

  if (!response.ok) {
    const googleError = typeof data.error === "string" ? data.error : "unknown";
    const description = typeof data.error_description === "string" ? data.error_description : "";
    const classified = classifyGoogleTokenEndpointFailure({ context, status: response.status, googleError, description });
    console.error("[GoogleCalendarOAuth] token endpoint failed", { context, status: response.status, googleError, reason: classified.details.reason });
    throw new HttpsError(classified.code, classified.message, classified.details);
  }
  return data;
};

const parseGrantedScopes = (scope: string | undefined | null): Set<string> => new Set((scope ?? "").split(/\s+/).map((value) => value.trim()).filter(Boolean));

const assertRequiredGoogleScopes = (scope: string | undefined | null): void => {
  const grantedScopes = parseGrantedScopes(scope);
  const missingScopes = REQUIRED_GOOGLE_SCOPES.filter((requiredScope) => !grantedScopes.has(requiredScope));
  if (missingScopes.length === 0) return;
  console.error("[GoogleCalendarOAuth] required Google scopes are missing", { missingScopes });
  throw classifiedPrecondition("Google Calendar, Google Tasks, and Google Drive scopes are required.", { reason: "insufficient_google_scope", reconnectRequired: true, userAction: "reconnect_google_account" });
};

const fetchGoogleTokenInfoScope = async (accessToken: string): Promise<string | null> => {
  let response: Response;
  try {
    response = await fetch(`${GOOGLE_TOKENINFO_ENDPOINT}?${new URLSearchParams({ access_token: accessToken })}`);
  } catch (error) {
    console.error("[GoogleCalendarOAuth] tokeninfo fetch failed", { error: getErrorSummary(error) });
    throw new HttpsError("unavailable", "Google OAuth tokeninfo endpoint could not be reached.", { reason: "google_token_fetch_failed", reconnectRequired: false });
  }
  const data = (await response.json()) as { scope?: string };
  if (!response.ok) throw new HttpsError("unavailable", "Google OAuth tokeninfo endpoint rejected the access token.", { reason: "google_token_invalid_response", reconnectRequired: false, status: response.status });
  return data.scope ?? null;
};

const validateGrantedGoogleScopes = async (accessToken: string, scope: string | undefined | null): Promise<void> => {
  if (scope) {
    assertRequiredGoogleScopes(scope);
    return;
  }
  assertRequiredGoogleScopes(await fetchGoogleTokenInfoScope(accessToken));
};

const fetchUserInfo = async (accessToken: string): Promise<GoogleOAuthProfile> => {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = (await response.json()) as { email?: string; name?: string; picture?: string };
  if (!response.ok || !data.email) {
    throw classifiedPrecondition("Google account email is required but was not returned.", { reason: "google_userinfo_failed", reconnectRequired: false });
  }
  return { accountEmail: data.email, accountName: data.name ?? null, accountPhotoUrl: data.picture ?? null };
};

const accountDoc = async (uid: string, accountId: string) => {
  try {
    return (await getDb()).doc(`users/${uid}/googleCalendarAccounts/${accountId}`);
  } catch (error) {
    console.error("[GoogleCalendarOAuth] Firestore account doc access failed", { accountId: maskAccountId(accountId), error: getErrorSummary(error) });
    throw new HttpsError("unavailable", "Google Calendar account storage is temporarily unavailable.", { reason: "firestore_access_failed", reconnectRequired: false });
  }
};

const runFirestoreOperation = async <T>(operation: string, accountId: string | undefined, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error("[GoogleCalendarOAuth] Firestore operation failed", { operation, accountId: maskAccountId(accountId), error: getErrorSummary(error) });
    throw new HttpsError("unavailable", "Google Calendar account storage is temporarily unavailable.", { reason: "firestore_access_failed", reconnectRequired: false });
  }
};

const runGoogleCallable = async <T>(context: "exchangeGoogleCalendarCode" | "exchangeGoogleSignInCode" | "getGoogleCalendarAccessToken" | "listGoogleCalendarAccounts", accountId: string | undefined, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (isHttpsError(error)) {
      console.error("[GoogleOAuth] callable failed", { context, accountId: maskAccountId(accountId), code: error.code, details: error.details, message: error.message });
      throw error;
    }
    console.error("[GoogleOAuth] unclassified callable failure", { context, accountId: maskAccountId(accountId), error: getErrorSummary(error) });
    throw new HttpsError("internal", "Google OAuth server operation failed.", { reason: "unclassified_server_error", reconnectRequired: false });
  }
};

const buildAuthorizationCodeTokenParams = ({ code, codeVerifier, redirectUri }: { code: string; codeVerifier?: string; redirectUri: string }): URLSearchParams => {
  const params = new URLSearchParams({ client_id: safeSecretValue(GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID", "server_oauth_configuration"), client_secret: safeSecretValue(GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET", "server_oauth_configuration"), code, grant_type: "authorization_code", redirect_uri: redirectUri });
  if (codeVerifier) params.set("code_verifier", codeVerifier);
  return params;
};

const buildStoredRefreshTokenParams = (refreshToken: string): URLSearchParams => new URLSearchParams({ client_id: safeSecretValue(GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID", "server_oauth_configuration"), client_secret: safeSecretValue(GOOGLE_OAUTH_CLIENT_SECRET, "server_oauth_configuration", "server_oauth_configuration"), grant_type: "refresh_token", refresh_token: refreshToken });

const buildGoogleAuthUid = (email: string): string => `google-${crypto.createHash("sha256").update(email.toLowerCase()).digest("hex")}`;

const upsertGoogleAuthUser = async (profile: GoogleOAuthProfile): Promise<string> => {
  const auth = await getAdminAuth();
  const uid = buildGoogleAuthUid(profile.accountEmail);
  const userUpdate = { email: profile.accountEmail, displayName: profile.accountName ?? undefined, photoURL: profile.accountPhotoUrl ?? undefined, emailVerified: true };
  try {
    await auth.updateUser(uid, userUpdate);
    return uid;
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }
  try {
    const existingUser = await auth.getUserByEmail(profile.accountEmail);
    await auth.updateUser(existingUser.uid, userUpdate);
    return existingUser.uid;
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }
  await auth.createUser({ uid, ...userUpdate });
  return uid;
};

export const exchangeGoogleSignInCode = onCall({ region: REGION, secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET] }, async (request) => {
  const { code, codeVerifier, redirectUri } = request.data as { code?: string; codeVerifier?: string; redirectUri?: string };
  return runGoogleCallable("exchangeGoogleSignInCode", undefined, async () => {
    if (!code || !redirectUri) throw new HttpsError("invalid-argument", "code and redirectUri are required.");
    const token = await exchangeToken(buildAuthorizationCodeTokenParams({ code, codeVerifier, redirectUri }), "authorization_code");
    const accessToken = typeof token.access_token === "string" ? token.access_token : null;
    if (!accessToken) throw new HttpsError("internal", "Google token response missing access_token.");
    const profile = await fetchUserInfo(accessToken);
    const uid = await upsertGoogleAuthUser(profile);
    const firebaseToken = await (await getAdminAuth()).createCustomToken(uid, { provider: "google", email: profile.accountEmail });
    return { firebaseToken, ...profile };
  });
});

export const exchangeGoogleCalendarCode = onCall({ region: REGION, secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY] }, async (request) => {
  const { code, codeVerifier, forceRefreshToken, redirectUri } = request.data as { code?: string; codeVerifier?: string; forceRefreshToken?: boolean; redirectUri?: string };
  return runGoogleCallable("exchangeGoogleCalendarCode", undefined, async () => {
    const uid = requireUid(request);
    if (!code || !redirectUri) throw new HttpsError("invalid-argument", "code and redirectUri are required.");
    const token = await exchangeToken(buildAuthorizationCodeTokenParams({ code, codeVerifier, redirectUri }), "authorization_code");
    const accessToken = typeof token.access_token === "string" ? token.access_token : null;
    const refreshToken = typeof token.refresh_token === "string" ? token.refresh_token : null;
    const expiresInSeconds = typeof token.expires_in === "number" ? token.expires_in : null;
    const scope = typeof token.scope === "string" ? token.scope : null;
    if (!accessToken) throw new HttpsError("internal", "Google token response missing access_token.");
    await validateGrantedGoogleScopes(accessToken, scope);
    const profile = await fetchUserInfo(accessToken);
    const accountId = profile.accountEmail;
    const ref = await accountDoc(uid, accountId);
    const existingSnap = await runFirestoreOperation("get account", accountId, () => ref.get());
    const existingData = existingSnap.data() as { encryptedRefreshToken?: string; createdAt?: unknown } | undefined;
    if (!refreshToken && (forceRefreshToken || !existingData?.encryptedRefreshToken)) {
      throw classifiedPrecondition(forceRefreshToken ? "Google did not return a new refresh token. Revoke this app in Google Account permissions, then reconnect." : "Google did not return a refresh token and no stored refresh token exists.", { reason: "stored_refresh_token_missing", reconnectRequired: true, userAction: "reconnect_google_account" });
    }
    const now = await serverTimestamp();
    const payload: Partial<StoredGoogleCalendarAccount> = { email: profile.accountEmail, name: profile.accountName, photoUrl: profile.accountPhotoUrl, createdAt: existingData?.createdAt ?? now, updatedAt: now };
    if (refreshToken) payload.encryptedRefreshToken = encryptRefreshToken(refreshToken);
    await runFirestoreOperation("set account", accountId, () => ref.set(payload, { merge: true }));
    return { accessToken, expiresInSeconds, ...profile, refreshTokenStored: Boolean(refreshToken || existingData?.encryptedRefreshToken) };
  });
});

export const listGoogleCalendarAccounts = onCall({ region: REGION }, async (request) => runGoogleCallable("listGoogleCalendarAccounts", undefined, async () => {
  const uid = requireUid(request);
  const db = await runFirestoreOperation("get db for account list", undefined, () => getDb());
  const snap = await runFirestoreOperation("list accounts", undefined, () => db.collection(`users/${uid}/googleCalendarAccounts`).get());
  return { accounts: snap.docs.flatMap((doc) => {
    const data = doc.data() as Partial<StoredGoogleCalendarAccount>;
    if (typeof data.encryptedRefreshToken !== "string" || data.encryptedRefreshToken.length === 0) return [];
    return [{ accountId: doc.id, email: data.email ?? doc.id, name: data.name ?? null, photoUrl: data.photoUrl ?? null }];
  }) };
}));

export const getGoogleCalendarAccessToken = onCall({ region: REGION, secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY] }, async (request) => {
  const { accountId } = request.data as { accountId?: string };
  return runGoogleCallable("getGoogleCalendarAccessToken", accountId, async () => {
    const uid = requireUid(request);
    if (!accountId) throw new HttpsError("invalid-argument", "accountId is required.");
    const ref = await accountDoc(uid, accountId);
    const snap = await runFirestoreOperation("get account", accountId, () => ref.get());
    if (!snap.exists) throw new HttpsError("not-found", "Google Calendar account not found.");
    const data = snap.data() as { encryptedRefreshToken?: string; email?: string; name?: string | null; photoUrl?: string | null };
    if (!data.encryptedRefreshToken) throw classifiedPrecondition("Stored refresh token is missing.", { reason: "stored_refresh_token_missing", reconnectRequired: true, userAction: "reconnect_google_account" });
    const token = await exchangeToken(buildStoredRefreshTokenParams(decryptRefreshToken(data.encryptedRefreshToken)), "refresh_token");
    const accessToken = typeof token.access_token === "string" ? token.access_token : null;
    const expiresInSeconds = typeof token.expires_in === "number" ? token.expires_in : null;
    const rotatedRefreshToken = typeof token.refresh_token === "string" ? token.refresh_token : null;
    const scope = typeof token.scope === "string" ? token.scope : null;
    if (!accessToken) throw new HttpsError("internal", "Google token response missing access_token.");
    await validateGrantedGoogleScopes(accessToken, scope);
    const updates: Record<string, unknown> = { updatedAt: await serverTimestamp() };
    if (rotatedRefreshToken) updates.encryptedRefreshToken = encryptRefreshToken(rotatedRefreshToken);
    await runFirestoreOperation("set account token update", accountId, () => ref.set(updates, { merge: true }));
    return { accessToken, expiresInSeconds, accountEmail: data.email ?? accountId, accountName: data.name ?? null, accountPhotoUrl: data.photoUrl ?? null, refreshTokenStored: true };
  });
});

export const disconnectGoogleCalendarAccount = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const { accountId } = request.data as { accountId?: string };
  if (!accountId) throw new HttpsError("invalid-argument", "accountId is required.");
  const ref = await accountDoc(uid, accountId);
  await ref.delete();
  return { ok: true };
});

export { renewExpiredWatchChannels };
