import type { OAuthBridgePort } from "@/application/ports/OAuthBridgePort";
import { mirrorDesktopGoogleRefreshTokenToServer } from "@/integration/google-integration/google.desktop-server-mirror";
import platform from "@/platform";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";

type StoredGoogleAccountSummary = {
  id?: unknown;
};

const GOOGLE_CALENDAR_ACCOUNTS_STORAGE_KEY = "flashcard-master.gcal.accounts.v2";

const readStoredGoogleCalendarAccountIds = (): string[] => {
  if (!isDesktopLikeRuntime() || typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(GOOGLE_CALENDAR_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return Array.from(new Set(parsed.flatMap((account: StoredGoogleAccountSummary) => typeof account.id === "string" ? [account.id] : [])));
  } catch {
    return [];
  }
};

const mirrorDesktopGoogleRefreshTokenFromSecureStore = async (accountId: string): Promise<void> => {
  const refreshToken = await platform.oauth.readRefreshToken(accountId);
  if (!refreshToken) return;

  await mirrorDesktopGoogleRefreshTokenToServer(refreshToken);
};

const retryStoredDesktopGoogleRefreshTokenMirrors = async (): Promise<void> => {
  const accountIds = readStoredGoogleCalendarAccountIds();
  if (accountIds.length === 0) return;

  const results = await Promise.allSettled(accountIds.map(mirrorDesktopGoogleRefreshTokenFromSecureStore));
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");

  if (rejected) {
    console.warn("[GoogleCalendarOAuth] stored desktop refresh token server mirror retry failed", rejected.reason);
  }
};

if (typeof window !== "undefined") {
  window.setTimeout(() => {
    void retryStoredDesktopGoogleRefreshTokenMirrors();
  }, 0);
}

export const oauthBridge: OAuthBridgePort = {
  start: (authorizeUrl: string) => platform.oauth.start(authorizeUrl),
  cancel: () => platform.oauth.cancel(),
  takePendingCallback: () => platform.oauth.takePendingCallback(),
  exchangeIdToken: (input) => platform.oauth.exchangeIdToken(input),
  exchangeTokens: (input) => platform.oauth.exchangeTokens(input),
  // refresh_token を使った silent なトークン更新
  refreshTokens: (input) => platform.oauth.refreshTokens(input),
  storeRefreshToken: async (input) => {
    await platform.oauth.storeRefreshToken(input);
    await mirrorDesktopGoogleRefreshTokenToServer(input.refreshToken).catch((error) => {
      console.warn("[GoogleCalendarOAuth] desktop refresh token server mirror failed", error);
    });
  },
  readRefreshToken: (accountId) => platform.oauth.readRefreshToken(accountId),
  deleteRefreshToken: (accountId) => platform.oauth.deleteRefreshToken(accountId),
  onCallback: (handler) => platform.oauth.onCallback(handler),
};