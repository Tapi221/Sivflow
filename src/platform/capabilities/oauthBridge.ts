import { platform } from "@platform/index";
import type { OAuthBridgePort } from "@/application/ports/OAuthBridgePort";



const oauthBridge: OAuthBridgePort = { start: (authorizeUrl: string) => platform.oauth.start(authorizeUrl), cancel: () => platform.oauth.cancel(), takePendingCallback: () => platform.oauth.takePendingCallback(), storeRefreshToken: (input) => platform.oauth.storeRefreshToken(input), readRefreshToken: (accountId) => platform.oauth.readRefreshToken(accountId), deleteRefreshToken: (accountId) => platform.oauth.deleteRefreshToken(accountId), onCallback: (handler) => platform.oauth.onCallback(handler) };



export { oauthBridge };
