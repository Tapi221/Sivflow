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
};





