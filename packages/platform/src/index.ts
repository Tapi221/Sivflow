import { desktopPlatform } from "./desktop";
import type { PlatformApi } from "./desktopApi";
import { hasDesktopBridge } from "./runtime";
import { webPlatform } from "./web";



const platform: PlatformApi = hasDesktopBridge() ? desktopPlatform : webPlatform;



export default platform;
export { platform };



export type { PlatformApi } from "./desktopApi";
