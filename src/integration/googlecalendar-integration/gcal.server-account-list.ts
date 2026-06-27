import { auth, functionsClient } from "@platform/firebase/client";
import { httpsCallable } from "firebase/functions";
import { getServerStoredGoogleCalendarAccessToken } from "@/integration/google-integration/google.server-oauth";
import type { StoredGoogleAccount } from "./gcal.multi-storage";
import { buildTokenExpiry, readStoredAccounts, writeStoredAccounts } from "./gcal.multi-storage";



type ServerStoredGoogleCalendarAccount = {
  accountId: string;
  email: string | null;
  name: string | null;
  photoUrl: string | null;
};
type ListGoogleCalendarAccountsOutput = {
  accounts: ServerStoredGoogleCalendarAccount[];
};



const listGoogleCalendarAccountsCallable = httpsCallable<undefined, ListGoogleCalendarAccountsOutput>(functionsClient, "listGoogleCalendarAccounts");



const waitForCallableAuth = async (): Promise<void> => {
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error("Firebase 認証が必要です。ログイン状態を確認してください。");
  }
};
const hydrateServerAccount = async (account: ServerStoredGoogleCalendarAccount): Promise<StoredGoogleAccount> => {
  try {
    const token = await getServerStoredGoogleCalendarAccessToken({ accountId: account.accountId });
    return {
      id: account.accountId,
      email: account.email,
      name: token.accountName ?? account.name,
      photoUrl: token.accountPhotoUrl ?? account.photoUrl,
      accessToken: token.accessToken,
      accessTokenExpiry: buildTokenExpiry(token.expiresInSeconds),
      refreshToken: null,
      selectedCalendarIds: [],
      cachedCalendars: [],
    };
  } catch (error) {
    console.warn("[GoogleCalendar] server account access-token hydration failed", error);
    return {
      id: account.accountId,
      email: account.email,
      name: account.name,
      photoUrl: account.photoUrl,
      accessToken: null,
      accessTokenExpiry: null,
      refreshToken: null,
      selectedCalendarIds: [],
      cachedCalendars: [],
    };
  }
};
const listServerStoredGoogleCalendarAccounts = async (): Promise<ServerStoredGoogleCalendarAccount[]> => {
  await waitForCallableAuth();
  const result = await listGoogleCalendarAccountsCallable();
  return result.data.accounts;
};
const hydrateServerStoredGoogleCalendarAccounts = async (): Promise<number> => {
  const localAccounts = readStoredAccounts();
  const knownAccountIds = new Set(localAccounts.map((account) => account.id));
  const remoteAccounts = await listServerStoredGoogleCalendarAccounts();
  const missingAccounts = remoteAccounts.filter((account) => !knownAccountIds.has(account.accountId));

  if (missingAccounts.length === 0) return 0;

  const hydratedAccounts = await Promise.all(missingAccounts.map(hydrateServerAccount));
  writeStoredAccounts([...localAccounts, ...hydratedAccounts]);
  return hydratedAccounts.length;
};



export { listServerStoredGoogleCalendarAccounts, hydrateServerStoredGoogleCalendarAccounts };


export type { ServerStoredGoogleCalendarAccount };
