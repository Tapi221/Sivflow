import { getDesktopBridge } from "./bridge";

import type { PlatformApi } from "@/types/desktop-api";

const canUseDesktopShell = (url: string): boolean =>
  /^(https?:|mailto:)/i.test(url);

export const desktopPlatform: PlatformApi = {
  app: {
    getVersion: () => getDesktopBridge().app.getVersion(),
  },
  shell: {
    openExternal: async (url: string) => {
      if (canUseDesktopShell(url)) {
        await getDesktopBridge().shell.openExternal(url);
        return;
      }

      if (typeof window === "undefined") {
        throw new Error("window is not available");
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
  },
  oauth: {
    start: (authorizeUrl: string) =>
      getDesktopBridge().oauth.start(authorizeUrl),
    cancel: () => getDesktopBridge().oauth.cancel(),
    exchangeIdToken: (input) => getDesktopBridge().oauth.exchangeIdToken(input),
    exchangeTokens: (input) => getDesktopBridge().oauth.exchangeTokens(input),
    // refresh_token を使った silent なトークン更新
    refreshTokens: (input) => getDesktopBridge().oauth.refreshTokens(input),
    onCallback: (handler) => getDesktopBridge().oauth.onCallback(handler),
  },
};
