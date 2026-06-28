import { defineSecret } from "firebase-functions/params";

import { HttpsError, onCall } from "firebase-functions/v2/https";

import { getAdminAuth } from "#src/firebaseAdmin.js";

import { connectGoogleCalendarAccountForUser, disconnectGoogleCalendarAccountForUser, listGoogleCalendarAccountsForUser, loadGoogleOAuthSecrets, refreshGoogleCalendarAccessTokenForUser, } from "#src/gcal/oauthPostgresService.js";

import type { GoogleOAuthSecrets } from "#src/gcal/oauthPostgresService.js";

const GOOGLE_OAUTH_CLIENT_ID = defineSecret("GOOGLE_OAUTH_CLIENT_ID");

const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret("GOOGLE_OAUTH_CLIENT_SECRET");

const GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY = defineSecret("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY");

const REGION = "asia-northeast1";

const requireUid = (request: { auth?: { uid?: string } }) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
  return uid;
};

const readSecretValue = (secret: { value: () => string }, name: string): string => {
  try {
    return secret.value();
  } catch (error) {
    console.error("[GoogleCalendarOAuth] secret access failed", {
      secretName: name,
      error: error instanceof Error ? { name: error.name, message: error.message } : { type: typeof error },
    });
    throw new HttpsError("failed-precondition", `${name} is not configured or cannot be accessed by this function.`, {
      reason: name === "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY" ? "token_encryption_key_invalid" : "server_oauth_configuration",
      reconnectRequired: false,
      adminAction: "check Google OAuth secrets and redeploy functions",
    });
  }
};

const readCallableSecrets = (): GoogleOAuthSecrets =>
  loadGoogleOAuthSecrets({
    clientId: readSecretValue(GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: readSecretValue(GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET"),
    tokenEncryptionKey: readSecretValue(GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY, "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY"),
  });

const disconnectGoogleCalendarAccount = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  return await disconnectGoogleCalendarAccountForUser(uid, request.data ?? {});
});

const createGoogleCalendarCustomToken = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  return { customToken: await (await getAdminAuth()).createCustomToken(uid) };
});

const listGoogleCalendarAccounts = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  return await listGoogleCalendarAccountsForUser(uid);
});

const connectGoogleCalendarAccount = onCall(
  { region: REGION, secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY] },
  async (request) => {
    const uid = requireUid(request);
    const response = await connectGoogleCalendarAccountForUser(uid, request.data ?? {}, readCallableSecrets());
    await (await getAdminAuth()).updateUser(uid, {
      email: response.accountEmail,
      displayName: response.accountName ?? undefined,
      photoURL: response.accountPhotoUrl ?? undefined,
    });
    return response;
  },
);

const refreshGoogleCalendarAccessToken = onCall(
  { region: REGION, secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY] },
  async (request) => {
    const uid = requireUid(request);
    return await refreshGoogleCalendarAccessTokenForUser(uid, request.data ?? {}, readCallableSecrets());
  },
);

const exchangeGoogleCalendarCode = connectGoogleCalendarAccount;

const getGoogleCalendarAccessToken = refreshGoogleCalendarAccessToken;

export { googleCalendarWebhook } from "#src/gcal/googleCalendarWebhook.js";

export { renewExpiredWatchChannels } from "#src/gcal/renewWatchChannels.js";

export { connectGoogleCalendarAccount, createGoogleCalendarCustomToken, disconnectGoogleCalendarAccount, exchangeGoogleCalendarCode, getGoogleCalendarAccessToken, listGoogleCalendarAccounts, refreshGoogleCalendarAccessToken };
