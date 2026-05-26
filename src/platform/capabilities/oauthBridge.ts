import type { OAuthBridgePort } from "@/application/ports/OAuthBridgePort";
import platform from "@/platform";

export const oauthBridge: OAuthBridgePort = {
  start: (authorizeUrl: string) => platform.oauth.start(authorizeUrl),
  cancel: () => platform.oauth.cancel(),
  exchangeIdToken: (input) => platform.oauth.exchangeIdToken(input),
  exchangeTokens: (input) => platform.oauth.exchangeTokens(input),
  // refresh_token を使った silent なトークン更新
  refreshTokens: (input) => platform.oauth.refreshTokens(input),
  storeRefreshToken: (input) => platform.oauth.storeRefreshToken(input),
  readRefreshToken: (accountId) => platform.oauth.readRefreshToken(accountId),
  deleteRefreshToken: (accountId) => platform.oauth.deleteRefreshToken(accountId),
  onCallback: (handler) => platform.oauth.onCallback(handler),
};
