import { hasDesktopBridge } from "@/platform/runtime";
import type { DesktopBridgeApi, PlatformApi } from "@/shared/platform-api";

const getDesktopBridge = (): DesktopBridgeApi => {
  if (!hasDesktopBridge()) {
    throw new Error("Desktop bridge is not available");
  }
  return window.desktop;
};

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
};
