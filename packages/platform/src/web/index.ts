import type { PlatformApi } from "@platform/desktopApi";



const WEB_APP_VERSION = import.meta.env.VITE_BUILD_VERSION ?? import.meta.env.MODE;



const unavailable = async (): Promise<never> => {
  throw new Error("Desktop bridge is not available in web runtime");
};
const openExternal = async (url: string): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("window is not available");
  }
  window.open(url, "_blank", "noopener,noreferrer");
};



const webPlatform: PlatformApi = {
  app: {
    getVersion: async () => WEB_APP_VERSION,
  },
  shell: {
    openExternal,
  },
  oauth: {
    start: unavailable,
    cancel: async () => {},
    takePendingCallback: async () => null,
    exchangeIdToken: unavailable,
    storeRefreshToken: unavailable,
    readRefreshToken: unavailable,
    deleteRefreshToken: async () => {},
    onCallback: () => () => {},
  },
};



export { webPlatform };
