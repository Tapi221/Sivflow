import { fetchCalendarList } from "./gcal.api";
import {
  readStoredAccounts,
  type StoredGoogleAccount,
  updateStoredAccountCalendarIds,
  updateStoredAccountToken,
} from "./gcal.multi-storage";
import { refreshCalendarAccessToken } from "./gcal.oauth";
import type { GoogleCalendarListItem } from "./gcalSync.types";

/**
 * トークン再取得 + カレンダー再同期
 */
export async function silentReconnect(accountId: string): Promise<{
  accessToken: string;
  calendars: GoogleCalendarListItem[];
} | null> {
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

    const list = await fetchCalendarList(result.accessToken);

    updateStoredAccountCalendarIds(
      accountId,
      list
        .filter((c: GoogleCalendarListItem) => c.selected || c.primary)
        .map((c: GoogleCalendarListItem) => c.id),
    );

    return {
      accessToken: result.accessToken,
      calendars: list,
    };
  } catch (e) {
    console.error("[silentReconnect]", e);
    return null;
  }
}
