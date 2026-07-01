import crypto from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import { postgresQuery } from "#src/postgres.js";
import { cacheGoogleProfileImageUrl } from "#src/gcal/profileImageCache.js";
import { classifyGoogleTokenEndpointFailure } from "#src/gcal/tokenErrors.js";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const REQUIRED_GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.app.created",
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/drive.file",
];
const getStringValue = (value) => (typeof value === "string" ? value.trim() : "");
const getErrorSummary = (error) => {
    if (error instanceof Error)
        return { name: error.name, message: error.message, stack: error.stack };
    return { type: typeof error };
};
const isHttpsError = (error) => error instanceof HttpsError;
const classifiedPrecondition = (message, details) => new HttpsError("failed-precondition", message, details);
const requireConfiguredSecret = (value, name, reason) => {
    if (typeof value === "string" && value.trim())
        return value.trim();
    throw classifiedPrecondition(`${name} is not configured or cannot be accessed by this service.`, {
        reason,
        reconnectRequired: false,
        adminAction: reason === "server_oauth_configuration"
            ? "check GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET and redeploy"
            : "check GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY and redeploy",
    });
};
const getKey = (secrets) => {
    let key;
    try {
        key = Buffer.from(requireConfiguredSecret(secrets.tokenEncryptionKey, "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY", "token_encryption_key_invalid"), "base64");
    }
    catch (error) {
        if (isHttpsError(error))
            throw error;
        console.error("[GoogleCalendarOAuth] token encryption key decode failed", { error: getErrorSummary(error) });
        throw classifiedPrecondition("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must be base64 encoded 32 bytes.", {
            reason: "token_encryption_key_invalid",
            reconnectRequired: false,
            adminAction: "check GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY and redeploy",
        });
    }
    if (key.length !== 32) {
        throw classifiedPrecondition("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must be base64 encoded 32 bytes.", {
            reason: "token_encryption_key_invalid",
            reconnectRequired: false,
            adminAction: "check GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY and redeploy",
        });
    }
    return key;
};
const encryptRefreshToken = (refreshToken, secrets) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getKey(secrets), iv);
    const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};
const decryptRefreshToken = (payload, secrets) => {
    try {
        const raw = Buffer.from(payload, "base64");
        if (raw.length < 29)
            throw new Error("Stored refresh token payload is invalid.");
        const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(secrets), raw.subarray(0, 12));
        decipher.setAuthTag(raw.subarray(12, 28));
        return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    }
    catch (error) {
        if (isHttpsError(error))
            throw error;
        console.error("[GoogleCalendarOAuth] stored refresh token decrypt failed", {
            errorName: error instanceof Error ? error.name : typeof error,
        });
        throw classifiedPrecondition("Stored refresh token is not readable by the current server key.", {
            reason: "stored_refresh_token_decrypt_failed",
            reconnectRequired: false,
        });
    }
};
const exchangeToken = async (params, context) => {
    let response;
    try {
        response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
        });
    }
    catch (error) {
        console.error("[GoogleCalendarOAuth] token endpoint fetch failed", { context, error: getErrorSummary(error) });
        throw new HttpsError("unavailable", "Google OAuth token endpoint could not be reached.", {
            reason: "google_token_fetch_failed",
            reconnectRequired: false,
        });
    }
    const data = (await response.json());
    if (!response.ok) {
        const googleError = typeof data.error === "string" ? data.error : "unknown";
        const description = typeof data.error_description === "string" ? data.error_description : "";
        const classified = classifyGoogleTokenEndpointFailure({ context, status: response.status, googleError, description });
        throw new HttpsError(classified.code, classified.message, classified.details);
    }
    return data;
};
const getTokenString = (data, key) => typeof data[key] === "string" ? data[key] : null;
const getTokenNumber = (data, key) => typeof data[key] === "number" && Number.isFinite(data[key]) ? data[key] : null;
const fetchGoogleJson = async (url, accessToken, context) => {
    const options = context === "tokeninfo" ? {} : { headers: { Authorization: `Bearer ${accessToken}` } };
    const response = await fetch(url, options);
    const data = (await response.json());
    if (!response.ok) {
        throw new HttpsError("failed-precondition", `Google ${context} request failed.`, {
            reason: context === "tokeninfo" ? "google_token_invalid_response" : "google_userinfo_failed",
            reconnectRequired: true,
            userAction: "reconnect_google_account",
        });
    }
    return data;
};
const readGoogleProfile = async (accessToken) => {
    const userInfo = await fetchGoogleJson(GOOGLE_USERINFO_ENDPOINT, accessToken, "userinfo");
    const email = typeof userInfo.email === "string" ? userInfo.email : "";
    if (!email) {
        throw new HttpsError("failed-precondition", "Google account did not return an email address.", {
            reason: "google_userinfo_invalid_response",
            reconnectRequired: true,
            userAction: "reconnect_google_account",
        });
    }
    return {
        accountEmail: email,
        accountName: typeof userInfo.name === "string" ? userInfo.name : null,
        accountPhotoUrl: typeof userInfo.picture === "string" ? userInfo.picture : null,
    };
};
const verifyGoogleScopes = async (accessToken) => {
    const tokenInfoUrl = `${GOOGLE_TOKENINFO_ENDPOINT}?access_token=${encodeURIComponent(accessToken)}`;
    const tokenInfo = await fetchGoogleJson(tokenInfoUrl, accessToken, "tokeninfo");
    const scopeValue = typeof tokenInfo.scope === "string" ? tokenInfo.scope : "";
    const scopes = new Set(scopeValue.split(" ").filter(Boolean));
    const missingScopes = REQUIRED_GOOGLE_SCOPES.filter((scope) => !scopes.has(scope));
    if (missingScopes.length > 0) {
        throw new HttpsError("failed-precondition", "Google account is missing required Calendar/Tasks/Drive scopes. Reconnect the Google account.", {
            reason: "insufficient_google_scope",
            reconnectRequired: true,
            userAction: "reconnect_google_account",
        });
    }
};
const isReusableCachedPhotoUrl = (photoUrl) => typeof photoUrl === "string" &&
    (photoUrl.startsWith("https://firebasestorage.googleapis.com/") || photoUrl.startsWith("https://storage.googleapis.com/"));
const getExistingAccountPhotoUrl = (account) => isReusableCachedPhotoUrl(account?.photoUrl) ? account.photoUrl : null;
const mapAccountRow = (row) => ({
    email: typeof row.account_email === "string" ? row.account_email : "",
    name: typeof row.name === "string" ? row.name : null,
    photoUrl: typeof row.photo_url === "string" ? row.photo_url : null,
    encryptedRefreshToken: typeof row.encrypted_refresh_token === "string" ? row.encrypted_refresh_token : "",
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
});
const loadStoredAccountRow = async (uid, accountId) => {
    const result = await postgresQuery(`select account_email, name, photo_url, encrypted_refresh_token, created_at, updated_at
       from google_calendar_accounts
      where uid = $1 and account_email = $2
      limit 1`, [uid, accountId]);
    if (result.rowCount === 0)
        return null;
    return mapAccountRow(result.rows[0]);
};
const storeGoogleAccount = async (uid, refreshToken, profile, secrets) => {
    const previousAccount = await loadStoredAccountRow(uid, profile.accountEmail);
    const encryptedRefreshToken = encryptRefreshToken(refreshToken, secrets);
    const cachedPhotoUrl = await cacheGoogleProfileImageUrl(uid, profile.accountPhotoUrl);
    const photoUrl = cachedPhotoUrl ?? getExistingAccountPhotoUrl(previousAccount);
    const result = await postgresQuery(`insert into google_calendar_accounts (
        uid,
        account_email,
        name,
        photo_url,
        encrypted_refresh_token,
        created_at,
        updated_at
      ) values ($1, $2, $3, $4, $5, now(), now())
      on conflict (uid, account_email) do update set
        name = excluded.name,
        photo_url = excluded.photo_url,
        encrypted_refresh_token = excluded.encrypted_refresh_token,
        updated_at = now()
      returning account_email, name, photo_url, encrypted_refresh_token, created_at, updated_at`, [uid, profile.accountEmail, profile.accountName, photoUrl, encryptedRefreshToken]);
    return mapAccountRow(result.rows[0]);
};
const toAccessResponse = (accessToken, account, expiresInSeconds) => ({
    accessToken,
    expiresIn: expiresInSeconds,
    expiresInSeconds,
    accountEmail: account.email,
    accountName: account.name,
    accountPhotoUrl: account.photoUrl,
    refreshTokenStored: true,
});
const getStoredAccount = async (uid, accountId) => {
    if (!accountId)
        throw new HttpsError("invalid-argument", "accountId is required.");
    const account = await loadStoredAccountRow(uid, accountId);
    if (!account) {
        throw new HttpsError("not-found", "Google account is not connected.", {
            reason: "stored_refresh_token_missing",
            reconnectRequired: true,
            userAction: "reconnect_google_account",
        });
    }
    if (!account.encryptedRefreshToken) {
        throw new HttpsError("failed-precondition", "Stored Google account is missing a refresh token.", {
            reason: "stored_refresh_token_missing",
            reconnectRequired: true,
            userAction: "reconnect_google_account",
        });
    }
    return account;
};
const loadGoogleOAuthSecrets = (values) => ({
    clientId: requireConfiguredSecret(values.clientId, "GOOGLE_OAUTH_CLIENT_ID", "server_oauth_configuration"),
    clientSecret: requireConfiguredSecret(values.clientSecret, "GOOGLE_OAUTH_CLIENT_SECRET", "server_oauth_configuration"),
    tokenEncryptionKey: requireConfiguredSecret(values.tokenEncryptionKey, "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY", "token_encryption_key_invalid"),
});
const listGoogleCalendarAccountsForUser = async (uid) => {
    const result = await postgresQuery(`select account_email, name, photo_url, encrypted_refresh_token, created_at, updated_at
       from google_calendar_accounts
      where uid = $1
      order by account_email asc`, [uid]);
    return {
        accounts: result.rows.map((row) => {
            const account = mapAccountRow(row);
            return {
                accountId: account.email,
                email: account.email,
                name: account.name,
                photoUrl: getExistingAccountPhotoUrl(account),
            };
        }),
    };
};
const disconnectGoogleCalendarAccountForUser = async (uid, input) => {
    const accountId = getStringValue(input.accountId) || getStringValue(input.accountEmail);
    if (!accountId)
        throw new HttpsError("invalid-argument", "accountId is required.");
    await postgresQuery(`delete from google_calendar_accounts where uid = $1 and account_email = $2`, [uid, accountId]);
    return { ok: true };
};
const connectGoogleCalendarAccountForUser = async (uid, input, secrets) => {
    const code = getStringValue(input.code);
    const codeVerifier = getStringValue(input.codeVerifier);
    const redirectUri = getStringValue(input.redirectUri);
    if (!code || !redirectUri) {
        throw new HttpsError("invalid-argument", "Google authorization code and redirectUri are required.");
    }
    const params = new URLSearchParams({
        code,
        client_id: secrets.clientId,
        client_secret: secrets.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
    });
    if (codeVerifier)
        params.set("code_verifier", codeVerifier);
    const data = await exchangeToken(params, "authorization_code");
    const accessToken = getTokenString(data, "access_token");
    const refreshToken = getTokenString(data, "refresh_token");
    if (!accessToken || !refreshToken) {
        throw new HttpsError("failed-precondition", "Google OAuth response did not include tokens.", {
            reason: "google_token_invalid_response",
            reconnectRequired: true,
            userAction: "reconnect_google_account",
        });
    }
    await verifyGoogleScopes(accessToken);
    const profile = await readGoogleProfile(accessToken);
    const account = await storeGoogleAccount(uid, refreshToken, profile, secrets);
    return toAccessResponse(accessToken, account, getTokenNumber(data, "expires_in"));
};
const refreshGoogleCalendarAccessTokenForUser = async (uid, input, secrets) => {
    const accountId = getStringValue(input.accountId) || getStringValue(input.accountEmail);
    const account = await getStoredAccount(uid, accountId);
    const refreshToken = decryptRefreshToken(account.encryptedRefreshToken, secrets);
    const data = await exchangeToken(new URLSearchParams({
        refresh_token: refreshToken,
        client_id: secrets.clientId,
        client_secret: secrets.clientSecret,
        grant_type: "refresh_token",
    }), "refresh_token");
    const accessToken = getTokenString(data, "access_token");
    if (!accessToken) {
        throw new HttpsError("failed-precondition", "Google OAuth refresh response did not include an access token.", {
            reason: "google_token_invalid_response",
            reconnectRequired: true,
            userAction: "reconnect_google_account",
        });
    }
    await verifyGoogleScopes(accessToken);
    return toAccessResponse(accessToken, account, getTokenNumber(data, "expires_in"));
};
export { connectGoogleCalendarAccountForUser, disconnectGoogleCalendarAccountForUser, listGoogleCalendarAccountsForUser, loadGoogleOAuthSecrets, refreshGoogleCalendarAccessTokenForUser };
