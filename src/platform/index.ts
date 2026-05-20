import { desktopPlatform } from "./desktop";
import { hasDesktopBridge } from "./runtime";
import { webPlatform } from "./web";

import type { PlatformApi } from "@/types/desktop-api";

export const platform: PlatformApi = hasDesktopBridge()
  ? desktopPlatform
  : webPlatform;

export default platform;
export type { PlatformApi } from "@/types/desktop-api";
