import type { OAuthBridgePort } from "@/application/ports/OAuthBridgePort";
import platform from "@/platform";

export const oauthBridge: OAuthBridgePort = {
  start: (authorizeUrl: string) => platform.oauth.start(authorizeUrl),
  cancel: () => platform.oauth.cancel(),
  exchangeIdToken: (input) => platform.oauth.exchangeIdToken(input),
  exchangeTokens: (input) => platform.oauth.exchangeTokens(input),
  onCallback: (handler) => platform.oauth.onCallback(handler),
};
