import type { PlatformApi } from "../desktopApi";

const WEB_APP_VERSION = import.meta.env.VITE_BUILD_VERSION ?? import.meta.env.MODE;

const unavailable = async (): Promise<never> => {
  throw new Error("Desktop bridge is not available in web runtime");
};

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
    start: unavailable,
    cancel: async () => {},
    takePendingCallback: async () => null,
    storeRefreshToken: unavailable,
    readRefreshToken: unavailable,
    deleteRefreshToken: async () => {},
    onCallback: () => () => {},
  },
};
