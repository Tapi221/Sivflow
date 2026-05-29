import { hasDesktopBridge } from "../runtime";
import type { DesktopBridgeApi } from "../desktopApi";

const hasWindowDesktop = (): boolean => typeof window !== "undefined" && typeof window.desktop !== "undefined";

export const getDesktopBridge = (): DesktopBridgeApi => {
  if (!hasDesktopBridge() || !hasWindowDesktop()) throw new Error("Desktop bridge is not available");

  const bridge = window.desktop;

  if (!bridge) throw new Error("Desktop bridge is not available");

  return bridge;
};