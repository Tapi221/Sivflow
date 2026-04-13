import { hasDesktopBridge } from "@/platform/runtime";
import type { DesktopBridgeApi } from "@/types/desktop-api";

const hasWindowDesktop = (): boolean =>
  typeof window !== "undefined" && typeof window.desktop !== "undefined";

export const getDesktopBridge = (): DesktopBridgeApi => {
  if (!hasDesktopBridge() || !hasWindowDesktop()) {
    throw new Error("Desktop bridge is not available");
  }
  return window.desktop;
};
