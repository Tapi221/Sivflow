import { desktopPlatform } from "./desktop";
import { hasDesktopBridge } from "./runtime";
import type { PlatformApi } from "@/shared/platform-api";
import { webPlatform } from "./web";

export const platform: PlatformApi = hasDesktopBridge()
  ? desktopPlatform
  : webPlatform;

export default platform;
export type { PlatformApi } from "@/shared/platform-api";
