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
 * OAuth再接続 + 状態更新
 * ただし「同期処理は呼ばない」
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

    const calendars = await fetchCalendarList(result.accessToken);

    const selectedIds = calendars
      .filter((c) => c.selected || c.primary)
      .map((c) => c.id);

    updateStoredAccountCalendarIds(accountId, selectedIds);

    return {
      accessToken: result.accessToken,
      calendars,
    };
  } catch (e) {
    console.error("[silentReconnect]", e);
    return null;
  }
}