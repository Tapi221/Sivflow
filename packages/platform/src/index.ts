import { desktopPlatform } from "./desktop";
import { hasDesktopBridge } from "./runtime";
import { webPlatform } from "./web";
import type { PlatformApi } from "./desktopApi";

export const platform: PlatformApi = hasDesktopBridge() ? desktopPlatform : webPlatform;

export default platform;
export type { PlatformApi } from "./desktopApi";