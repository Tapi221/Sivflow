import type { PlatformApi } from "@/types/desktop-api";

const WEB_APP_VERSION =
  import.meta.env.VITE_BUILD_VERSION ?? import.meta.env.MODE;

export const webPlatform: PlatformApi = {
  app: {
    getVersion: async () => WEB_APP_VERSION,
  },
  shell: {
    openExternal: async (url: string) => {
      if (typeof window === "undefined") {
        throw new Error("window is not available");
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
  },
  oauth: {
    start: async () => {
      throw new Error("OAuth desktop bridge is not available in web runtime");
    },
    cancel: async () => {},
    exchangeIdToken: async () => {
      throw new Error("OAuth desktop bridge is not available in web runtime");
    },
    exchangeTokens: async () => {
      throw new Error("OAuth desktop bridge is not available in web runtime");
    },
    // Web 版は refresh_token フロー非対応
    refreshTokens: async () => {
      throw new Error("OAuth desktop bridge is not available in web runtime");
    },
    onCallback: () => () => {},
  },
};
