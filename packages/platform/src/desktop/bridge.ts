import { hasDesktopBridge } from "@platform/runtime";
import type { DesktopBridgeApi } from "@platform/desktopApi";

const hasWindowDesktop = (): boolean => typeof window !== "undefined" && typeof window.desktop !== "undefined";
const getDesktopBridge = (): DesktopBridgeApi => {
  if (!hasDesktopBridge() || !hasWindowDesktop()) throw new Error("Desktop bridge is not available");

  const bridge = window.desktop;

  if (!bridge) throw new Error("Desktop bridge is not available");

  return bridge;
};

export { getDesktopBridge };
