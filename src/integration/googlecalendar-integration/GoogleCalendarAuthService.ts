import { refreshCalendarAccessToken } from "@/integration/google-integration/google.oauth";
import { fetchCalendarList } from "@/integration/googlecalendar-integration/gcal.api";
import type { StoredGoogleAccount } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import { readStoredAccounts, updateStoredAccountCalendarIds, updateStoredAccountToken } from "@/integration/googlecalendar-integration/gcal.multi-storage";
import type { GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";

const silentReconnect = async (accountId: string): Promise<{ accessToken: string;
  calendars: GoogleCalendarListItem[];
} | null> => {
  try {
    const stored = readStoredAccounts().find(
      (a: StoredGoogleAccount) => a.id === accountId,
    );

    if (!stored?.refreshToken) return null;

    const result = await refreshCalendarAccessToken({
      refreshToken: stored.refreshToken,
    });

    updateStoredAccountToken(
      accountId,
      result.accessToken,
      result.refreshToken,
    );

    const calendars = await fetchCalendarList(result.accessToken);

    const selectedIds = calendars
      .filter((c) => c.selected || c.primary)
      .map((c) => c.id);

    updateStoredAccountCalendarIds(accountId, selectedIds);

    return {
      accessToken: result.accessToken,
      calendars,
    };
  } catch (error) {
    console.error("[silentReconnect]", error);
    return null;
  }
};

export { silentReconnect };
