import { getDesktopBridge } from "./bridge";
import type { PlatformApi } from "@platform/desktopApi";



const desktopPlatform: PlatformApi = { app: { getVersion: () => getDesktopBridge().app.getVersion() }, shell: { openExternal: (url: string) => getDesktopBridge().shell.openExternal(url) }, oauth: { start: (authorizeUrl: string) => getDesktopBridge().oauth.start(authorizeUrl), cancel: () => getDesktopBridge().oauth.cancel(), takePendingCallback: () => getDesktopBridge().oauth.takePendingCallback(), exchangeIdToken: (value: string) => getDesktopBridge().oauth.exchangeIdToken(value), storeRefreshToken: (input) => getDesktopBridge().oauth.storeRefreshToken(input), readRefreshToken: (accountId) => getDesktopBridge().oauth.readRefreshToken(accountId), deleteRefreshToken: (accountId) => getDesktopBridge().oauth.deleteRefreshToken(accountId), onCallback: (handler) => getDesktopBridge().oauth.onCallback(handler) } };



export { desktopPlatform };
