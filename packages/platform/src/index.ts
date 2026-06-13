import { desktopPlatform } from "@platform/desktop";
import { webPlatform } from "@platform/web";
import type { PlatformApi } from "@platform/desktopApi";
import { hasDesktopBridge } from "@platform/runtime";

const platform: PlatformApi = hasDesktopBridge() ? desktopPlatform : webPlatform;

export default platform;
export { platform };
export type { PlatformApi } from "@platform/desktopApi";
