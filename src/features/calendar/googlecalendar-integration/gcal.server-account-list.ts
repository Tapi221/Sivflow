import { httpsCallable } from "firebase/functions";
import { auth, functionsClient } from "@/services/firebase";

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
