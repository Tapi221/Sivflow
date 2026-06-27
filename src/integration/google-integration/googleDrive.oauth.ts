import type { Auth } from "firebase/auth";
import { requestConnectedServiceAccessToken, requestGoogleCalendarServerCode } from "./google.oauth";
import { exchangeGoogleConnectedServiceCode, getServerStoredGoogleConnectedServiceAccessToken, isServerStoredGoogleOAuthEnabled } from "./google.server-oauth";
import { listServerStoredGoogleCalendarAccounts } from "@/integration/googlecalendar-integration/gcal.server-account-list";



const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_DRIVE_RECONNECT_REQUIRED_CODE = "failed-precondition";
const GOOGLE_OAUTH_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";



const createGoogleDriveReconnectRequiredError = (): Error => {
  const error = new Error("Google Drive の再認可が必要です");
  (error as Error & { code?: string; }).code = GOOGLE_DRIVE_RECONNECT_REQUIRED_CODE;
  return error;
};
const readGrantedScopes = async (accessToken: string): Promise<Set<string>> => {
  const response = await fetch(`${GOOGLE_OAUTH_TOKENINFO_ENDPOINT}?${new URLSearchParams({ access_token: accessToken })}`);
  if (!response.ok) return new Set();
  const payload = (await response.json()) as { scope?: string; };
  return new Set((payload.scope ?? "").split(/\s+/).filter(Boolean));
};
const assertGoogleDriveFileScope = async (accessToken: string): Promise<void> => {
  const scopes = await readGrantedScopes(accessToken);
  if (scopes.has(GOOGLE_DRIVE_FILE_SCOPE)) return;
  throw createGoogleDriveReconnectRequiredError();
};
const readServerStoredGoogleDriveFileAccessToken = async (): Promise<string | null> => {
  const accounts = await listServerStoredGoogleCalendarAccounts().catch(() => []);

  for (const account of accounts) {
    try {
      const result = await getServerStoredGoogleConnectedServiceAccessToken({ accountId: account.accountId });
      await assertGoogleDriveFileScope(result.accessToken);
      return result.accessToken;
    } catch (error) {
      console.warn("[GoogleDrive] stored Google connected service token cannot access Drive", error);
    }
  }

  return null;
};
const requestServerStoredGoogleDriveFileAccessToken = async (auth: Auth): Promise<string> => {
  const storedAccessToken = await readServerStoredGoogleDriveFileAccessToken();
  if (storedAccessToken) return storedAccessToken;

  const { code, codeVerifier, redirectUri } = await requestGoogleCalendarServerCode(auth);
  const result = await exchangeGoogleConnectedServiceCode({
    code,
    codeVerifier,
    forceRefreshToken: true,
    redirectUri,
  });
  await assertGoogleDriveFileScope(result.accessToken);
  return result.accessToken;
};
const requestLocalGoogleDriveFileAccessToken = async (auth: Auth): Promise<string> => {
  const result = await requestConnectedServiceAccessToken(auth);
  await assertGoogleDriveFileScope(result.accessToken);
  return result.accessToken;
};
const requestGoogleDriveFileAccessToken = async (auth: Auth): Promise<string> => {
  if (isServerStoredGoogleOAuthEnabled()) {
    return requestServerStoredGoogleDriveFileAccessToken(auth);
  }

  return requestLocalGoogleDriveFileAccessToken(auth);
};



export { requestGoogleDriveFileAccessToken };
