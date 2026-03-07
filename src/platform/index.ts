import { desktopPlatform } from "./desktop";
import type { PlatformApi } from "./types";
import { webPlatform } from "./web";

const hasDesktopBridge = (): boolean =>
  typeof window !== "undefined" && typeof window.desktop !== "undefined";

export const platform: PlatformApi = hasDesktopBridge()
  ? desktopPlatform
  : webPlatform;

export default platform;
export type { PlatformApi } from "./types";
