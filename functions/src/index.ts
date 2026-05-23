import crypto from "node:crypto";

import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { getDb, serverTimestamp } from "./firebaseAdmin.js";
import { renewExpiredWatchChannels } from "./gcal/renewWatchChannels.js";

const GOOGLE_OAUTH_WEB_CLIENT_ID = defineSecret("GOOGLE_OAUTH_WEB_CLIENT_ID");
const GOOGLE_OAUTH_WEB_CLIENT_SECRET = defineSecret("GOOGLE_OAUTH_WEB_CLIENT_SECRET");
const GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY = defineSecret(
  "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY",
);

const REGION = "asia-northeast1";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

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

const getKey = (): Buffer => {
  const key = Buffer.from(GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY.value(), "base64");
  if (key.length !== 32) {
    throw new HttpsError(
      "internal",
      "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must be base64 encoded 32 bytes.",
    );
  }
  return key;
};

const encryptRefreshToken = (refreshToken: string): string => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

const decryptRefreshToken = (payload: string): string => {
  const raw = Buffer.from(payload, "base64");
  if (raw.length < 29) throw new HttpsError("internal", "Invalid encrypted refresh token.");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};

const exchangeToken = async (
  params: URLSearchParams,
  context: "authorization_code" | "refresh_token",
) => {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const googleError = typeof data.error === "string" ? data.error : "unknown";
    const description =
      typeof data.error_description === "string" ? data.error_description : "";
    const message = `Google token ${context} failed (${response.status}): ${googleError}${
      description ? ` - ${description}` : ""
    }`;

    console.error("[GoogleCalendarOAuth] token endpoint failed", {
      context,
      status: response.status,
      googleError,
      description,
    });

    if (
      googleError === "invalid_grant" ||
      googleError === "invalid_client" ||
      googleError === "unauthorized_client"
    ) {
      throw new HttpsError("failed-precondition", message);
    }

    throw new HttpsError("internal", message);
  }
  return data;
};

const fetchUserInfo = async (accessToken: string) => {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as { email?: string; name?: string; picture?: string };
  if (!response.ok || !data.email) {
    throw new HttpsError("failed-precondition", "Google account email is required but was not returned.");
  }
  return {
    accountEmail: data.email,
    accountName: data.name ?? null,
    accountPhotoUrl: data.picture ?? null,
  };
};

const accountDoc = async (uid: string, accountId: string) =>
  (await getDb()).doc(`users/${uid}/googleCalendarAccounts/${accountId}`);

export const exchangeGoogleCalendarCode = onCall(
  {
    region: REGION,
    secrets: [
      GOOGLE_OAUTH_WEB_CLIENT_ID,
      GOOGLE_OAUTH_WEB_CLIENT_SECRET,
      GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY,
    ],
  },
  async (request) => {
    const uid = requireUid(request);
    const { code, redirectUri } = request.data as { code?: string; redirectUri?: string };
    if (!code || !redirectUri) throw new HttpsError("invalid-argument", "code and redirectUri are required.");

    const token = await exchangeToken(
      new URLSearchParams({
        client_id: GOOGLE_OAUTH_WEB_CLIENT_ID.value(),
        client_secret: GOOGLE_OAUTH_WEB_CLIENT_SECRET.value(),
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      "authorization_code",
    );

    const accessToken = typeof token.access_token === "string" ? token.access_token : null;
    const refreshToken = typeof token.refresh_token === "string" ? token.refresh_token : null;
    const expiresInSeconds = typeof token.expires_in === "number" ? token.expires_in : null;

    if (!accessToken) throw new HttpsError("internal", "Google token response missing access_token.");

    const profile = await fetchUserInfo(accessToken);
    const accountId = profile.accountEmail;
    const ref = await accountDoc(uid, accountId);
    const existingSnap = await ref.get();
    const existingData = existingSnap.data() as
      | { encryptedRefreshToken?: string; createdAt?: unknown }
      | undefined;

    if (!refreshToken && !existingData?.encryptedRefreshToken) {
      console.error("[GoogleCalendarOAuth] refresh token missing with no stored fallback", {
        uid,
        accountId,
      });
      throw new HttpsError(
        "failed-precondition",
        "Google did not return a refresh token and no stored refresh token exists. Reconnect using consent/select_account and remove the prior Google grant if needed.",
      );
    }

    const now = await serverTimestamp();

    const payload: Partial<StoredGoogleCalendarAccount> = {
      email: profile.accountEmail,
      name: profile.accountName,
      photoUrl: profile.accountPhotoUrl,
      createdAt: existingData?.createdAt ?? now,
      updatedAt: now,
    };

    if (refreshToken) {
      payload.encryptedRefreshToken = encryptRefreshToken(refreshToken);
    }

    await ref.set(payload, { merge: true });

    return {
      accessToken,
      expiresInSeconds,
      ...profile,
      refreshTokenStored: Boolean(refreshToken || existingData?.encryptedRefreshToken),
    };
  },
);

export const getGoogleCalendarAccessToken = onCall(
  {
    region: REGION,
    secrets: [
      GOOGLE_OAUTH_WEB_CLIENT_ID,
      GOOGLE_OAUTH_WEB_CLIENT_SECRET,
      GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY,
    ],
  },
  async (request) => {
    const uid = requireUid(request);
    const { accountId } = request.data as { accountId?: string };
    if (!accountId) throw new HttpsError("invalid-argument", "accountId is required.");

    const ref = await accountDoc(uid, accountId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Google Calendar account not found.");
    const data = snap.data() as { encryptedRefreshToken?: string; email?: string; name?: string | null; photoUrl?: string | null };
    if (!data.encryptedRefreshToken) throw new HttpsError("failed-precondition", "Stored refresh token is missing.");

    const token = await exchangeToken(
      new URLSearchParams({
        client_id: GOOGLE_OAUTH_WEB_CLIENT_ID.value(),
        client_secret: GOOGLE_OAUTH_WEB_CLIENT_SECRET.value(),
        grant_type: "refresh_token",
        refresh_token: decryptRefreshToken(data.encryptedRefreshToken),
      }),
      "refresh_token",
    );

    const accessToken = typeof token.access_token === "string" ? token.access_token : null;
    const expiresInSeconds = typeof token.expires_in === "number" ? token.expires_in : null;
    const rotatedRefreshToken = typeof token.refresh_token === "string" ? token.refresh_token : null;

    if (!accessToken) throw new HttpsError("internal", "Google token response missing access_token.");

    const updates: Record<string, unknown> = { updatedAt: await serverTimestamp() };
    if (rotatedRefreshToken) updates.encryptedRefreshToken = encryptRefreshToken(rotatedRefreshToken);
    await ref.set(updates, { merge: true });

    return {
      accessToken,
      expiresInSeconds,
      accountEmail: data.email ?? accountId,
      accountName: data.name ?? null,
      accountPhotoUrl: data.photoUrl ?? null,
      refreshTokenStored: true,
    };
  },
);

export const disconnectGoogleCalendarAccount = onCall(
  { region: REGION },
  async (request) => {
    const uid = requireUid(request);
    const { accountId } = request.data as { accountId?: string };
    if (!accountId) throw new HttpsError("invalid-argument", "accountId is required.");
    const ref = await accountDoc(uid, accountId);
    await ref.delete();
    return { ok: true };
  },
);

export { renewExpiredWatchChannels };
