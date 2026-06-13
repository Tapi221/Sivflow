import { desktopPlatform } from "@platform/desktop";
import { webPlatform } from "@platform/web";
import type { PlatformApi } from "./desktopApi";
import { hasDesktopBridge } from "./runtime";

const platform: PlatformApi = hasDesktopBridge() ? desktopPlatform : webPlatform;

export default platform;
export { platform };

export type { PlatformApi } from "./desktopApi";
