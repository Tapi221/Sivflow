import { useEffect } from "react";
import { isServerStoredGoogleOAuthEnabled } from "@/integration/google-integration/google.server-oauth";
import type { StoredGoogleAccount } from "./gcal.multi-storage";
import { readStoredAccounts, upsertStoredAccount } from "./gcal.multi-storage";
import { listServerStoredGoogleCalendarAccounts } from "./gcal.server-accounts";



type ServerStoredGoogleCalendarAccount = Awaited<ReturnType<typeof listServerStoredGoogleCalendarAccounts>>[number];



const createStoredAccountFromRemote = (remote: ServerStoredGoogleCalendarAccount): StoredGoogleAccount => ({
  id: remote.accountId,
  email: remote.email,
  name: remote.name,
  photoUrl: remote.photoUrl,
  accessToken: null,
  accessTokenExpiry: null,
  refreshToken: null,
  selectedCalendarIds: [],
});
const serializeStoredAccounts = (): string => JSON.stringify(readStoredAccounts());
const syncServerStoredGoogleAccounts = async (): Promise<boolean> => {
  const remoteAccounts = await listServerStoredGoogleCalendarAccounts();
  if (remoteAccounts.length === 0) return false;

  const before = serializeStoredAccounts();

  for (const remote of remoteAccounts) {
    upsertStoredAccount(createStoredAccountFromRemote(remote));
  }

  return serializeStoredAccounts() !== before;
};
const useServerStoredGoogleAccountBootstrap = (): void => {
  useEffect(() => {
    if (!isServerStoredGoogleOAuthEnabled()) return;

    let cancelled = false;

    void syncServerStoredGoogleAccounts().then((changed) => {
      if (!cancelled && changed && typeof window !== "undefined") window.location.reload();
    }).catch((error) => {
      console.warn("[GoogleCalendar] stored account bootstrap failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, []);
};



export { useServerStoredGoogleAccountBootstrap };
