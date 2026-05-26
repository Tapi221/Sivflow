import { httpsCallable } from "firebase/functions";
import { auth, functionsClient } from "@/services/firebase";
import { readStoredAccounts, type StoredGoogleAccount, writeStoredAccounts } from "./gcal.multi-storage";
import { isServerStoredGoogleOAuthEnabled } from "./gcal.server-oauth";

export type ServerStoredGoogleCalendarAccount = {
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

export const listServerStoredGoogleCalendarAccounts = async (): Promise<ServerStoredGoogleCalendarAccount[]> => {
  await waitForCallableAuth();
  const result = await listGoogleCalendarAccountsCallable();
  return result.data.accounts;
};

export const hydrateServerStoredGoogleCalendarAccounts = async (): Promise<number> => {
  if (!isServerStoredGoogleOAuthEnabled()) return 0;

  const localAccounts = readStoredAccounts();
  const knownAccountIds = new Set(localAccounts.map((account) => account.id));
  const remoteAccounts = await listServerStoredGoogleCalendarAccounts();
  const hydratedAccounts: StoredGoogleAccount[] = remoteAccounts
    .filter((account) => !knownAccountIds.has(account.accountId))
    .map((account) => ({
      id: account.accountId,
      email: account.email,
      name: account.name,
      photoUrl: account.photoUrl,
      accessToken: null,
      accessTokenExpiry: null,
      refreshToken: null,
      selectedCalendarIds: [],
      cachedCalendars: [],
    }));

  if (hydratedAccounts.length === 0) return 0;

  writeStoredAccounts([...localAccounts, ...hydratedAccounts]);
  return hydratedAccounts.length;
};
