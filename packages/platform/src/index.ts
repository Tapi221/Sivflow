import type { PlatformApi } from "./desktopApi";
import { desktopPlatform } from "./desktop";
import { hasDesktopBridge } from "./runtime";
import { webPlatform } from "./web";





export const platform: PlatformApi = hasDesktopBridge() ? desktopPlatform : webPlatform;





export type { PlatformApi } from "./desktopApi";





export default platform;
