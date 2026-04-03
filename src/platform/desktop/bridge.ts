import { hasDesktopBridge } from "@/platform/runtime";
import type { DesktopBridgeApi, DesktopOauthApi } from "@/types/desktop-api";

const hasWindowDesktop = (): boolean =>
  typeof window !== "undefined" && typeof window.desktop !== "undefined";

export const getDesktopBridge = (): DesktopBridgeApi => {
  if (!hasDesktopBridge() || !hasWindowDesktop()) {
    throw new Error("Desktop bridge is not available");
  }
  return window.desktop;
};

const isDesktopOauthApi = (api: unknown): api is DesktopOauthApi => {
  if (!api || typeof api !== "object") {
    return false;
  }

  const candidate = api as DesktopOauthApi;
  return (
    typeof candidate.start === "function" &&
    typeof candidate.cancel === "function" &&
    typeof candidate.onCallback === "function"
  );
};

export const getDesktopOauthApi = (): DesktopOauthApi => {
  if (
    typeof window === "undefined" ||
    !isDesktopOauthApi(window.desktop?.oauth)
  ) {
    throw new Error(
      "Desktop OAuth callback API is not available. Please fully restart the Electron app to load the updated desktop bridge.",
    );
  }
  return window.desktop.oauth;
};
