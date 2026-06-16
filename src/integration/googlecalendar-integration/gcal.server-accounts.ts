import { auth, functionsClient } from "@platform/firebase/client";
import { httpsCallable } from "firebase/functions";



type ListGoogleCalendarAccountsOutput = {
  accounts: Array<{
    accountId: string;
    email: string | null;
    name: string | null;
    photoUrl: string | null;
  }>;
};



const listGoogleCalendarAccountsCallable = httpsCallable<undefined, ListGoogleCalendarAccountsOutput>(functionsClient, "listGoogleCalendarAccounts");



const waitForCallableAuth = async (): Promise<void> => {
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error("Firebase 認証が必要です。ログイン状態を確認してください。");
  }
};
const listServerStoredGoogleCalendarAccounts = async (): Promise<ListGoogleCalendarAccountsOutput["accounts"]> => {
  await waitForCallableAuth();
  const result = await listGoogleCalendarAccountsCallable();
  return result.data.accounts;
};



export { listServerStoredGoogleCalendarAccounts };
