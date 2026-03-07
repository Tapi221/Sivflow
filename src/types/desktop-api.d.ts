import type { DesktopBridgeApi } from "@/shared/platform-api";

declare global {
  interface Window {
    desktop?: DesktopBridgeApi;
  }
}

export {};
