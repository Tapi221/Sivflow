import { desktopPlatform } from "@platform/desktop";
import type { PlatformApi } from "@platform/desktopApi";
import { hasDesktopBridge } from "@platform/runtime";
import { webPlatform } from "@platform/web";

const platform: PlatformApi = hasDesktopBridge() ? desktopPlatform : webPlatform;

export { platform };
export type { PlatformApi } from "@platform/desktopApi";
