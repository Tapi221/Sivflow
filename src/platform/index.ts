import { desktopPlatform } from "@/platform/desktop";
import { hasDesktopBridge } from "./runtime";
import { webPlatform } from "@/platform/web";
import type { PlatformApi } from "@/types/externals/desktop-api";

export const platform: PlatformApi = hasDesktopBridge()
  ? desktopPlatform
  : webPlatform;

export default platform;
export type { PlatformApi } from "@/types/externals/desktop-api";
