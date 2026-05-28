import { useEffect } from "react";
import { isServerStoredGoogleOAuthEnabled } from "@/integration/google-integration/google.server-oauth";
import { readStoredAccounts, upsertStoredAccount, type StoredGoogleAccount } from "./gcal.multi-storage";
import { listServerStoredGoogleCalendarAccounts } from "./gcal.server-accounts";

export const useServerStoredGoogleAccountBootstrap = (): void => {
  useEffect(() => {
    if (!isServerStoredGoogleOAuthEnabled()) return;
    if (readStoredAccounts().length > 0) return;

    let cancelled = false;

    void (async () => {
      const remoteAccounts = await listServerStoredGoogleCalendarAccounts();
      if (cancelled || remoteAccounts.length === 0) return;

      let added = false;

      for (const remote of remoteAccounts) {
        if (readStoredAccounts().some((account) => account.id === remote.accountId)) continue;

        const account: StoredGoogleAccount = {
          id: remote.accountId,
          email: remote.email,
          name: remote.name,
          photoUrl: remote.photoUrl,
          accessToken: null,
          accessTokenExpiry: null,
          refreshToken: null,
          selectedCalendarIds: [],
          cachedCalendars: [],
        };

        upsertStoredAccount(account);
        added = true;
      }

      if (!cancelled && added && typeof window !== "undefined") window.location.reload();
    })().catch((error) => {
      console.warn("[GoogleCalendar] stored account bootstrap failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, []);
};
