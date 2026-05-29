import type { OAuthBridgePort } from "@/application/ports/OAuthBridgePort";
import { mirrorDesktopGoogleRefreshTokenToServer } from "@/integration/google-integration/google.desktop-server-mirror";
import platform from "@/platform";

export const oauthBridge: OAuthBridgePort = {
  start: (authorizeUrl: string) => platform.oauth.start(authorizeUrl),
  cancel: () => platform.oauth.cancel(),
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
