import type { DesktopBridgeApi } from "@/platform/types";

declare global {
  interface Window {
    desktop?: DesktopBridgeApi;
  }
}

export {};
