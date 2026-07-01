import { HttpsError } from "firebase-functions/v2/https";
import { postgresQuery } from "#src/postgres.js";
const isReusableCachedPhotoUrl = (photoUrl) => typeof photoUrl === "string" &&
    (photoUrl.startsWith("https://firebasestorage.googleapis.com/") || photoUrl.startsWith("https://storage.googleapis.com/"));
const normalizePhotoUrl = (photoUrl) => (isReusableCachedPhotoUrl(photoUrl) ? photoUrl : null);
const toStoredGoogleCalendarAccount = (row) => {
    if (!row.encrypted_refresh_token) {
        throw new HttpsError("failed-precondition", "Stored Google account is missing a refresh token.", {
            reason: "stored_refresh_token_missing",
            reconnectRequired: true,
            userAction: "reconnect_google_account",
        });
    }
    return {
        email: row.account_email,
        name: row.name,
        photoUrl: normalizePhotoUrl(row.photo_url),
        encryptedRefreshToken: row.encrypted_refresh_token,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};
const selectGoogleCalendarAccount = async (uid, accountEmail) => {
    const result = await postgresQuery(`
      select account_email, name, photo_url, encrypted_refresh_token, created_at, updated_at
      from google_calendar_accounts
      where uid = $1 and account_email = $2
      limit 1
    `, [uid, accountEmail]);
    return result.rows[0] ? toStoredGoogleCalendarAccount(result.rows[0]) : null;
};
const requireGoogleCalendarAccount = async (uid, accountEmail) => {
    if (!accountEmail)
        throw new HttpsError("invalid-argument", "accountId is required.");
    const account = await selectGoogleCalendarAccount(uid, accountEmail);
    if (!account) {
        throw new HttpsError("not-found", "Google account is not connected.", {
            reason: "stored_refresh_token_missing",
            reconnectRequired: true,
            userAction: "reconnect_google_account",
        });
    }
    return account;
};
const listGoogleCalendarAccountsByUid = async (uid) => {
    const result = await postgresQuery(`
      select account_email, name, photo_url, encrypted_refresh_token, created_at, updated_at
      from google_calendar_accounts
      where uid = $1
      order by updated_at desc
    `, [uid]);
    return result.rows.map(toStoredGoogleCalendarAccount);
};
const upsertGoogleCalendarAccount = async (input) => {
    const result = await postgresQuery(`
      insert into google_calendar_accounts (
        uid,
        account_email,
        name,
        photo_url,
        encrypted_refresh_token
      )
      values ($1, $2, $3, $4, $5)
      on conflict (uid, account_email) do update set
        name = excluded.name,
        photo_url = excluded.photo_url,
        encrypted_refresh_token = excluded.encrypted_refresh_token,
        updated_at = now()
      returning account_email, name, photo_url, encrypted_refresh_token, created_at, updated_at
    `, [input.uid, input.email, input.name, input.photoUrl, input.encryptedRefreshToken]);
    return toStoredGoogleCalendarAccount(result.rows[0]);
};
const deleteGoogleCalendarAccount = async (uid, accountEmail) => {
    await postgresQuery("delete from google_calendar_accounts where uid = $1 and account_email = $2", [uid, accountEmail]);
};
export { deleteGoogleCalendarAccount, listGoogleCalendarAccountsByUid, normalizePhotoUrl, requireGoogleCalendarAccount, selectGoogleCalendarAccount, upsertGoogleCalendarAccount };
