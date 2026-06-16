import { desktopPlatform } from "@platform/desktop";
import type { PlatformApi } from "./desktopApi";
import { hasDesktopBridge } from "./runtime";
import { webPlatform } from "@platform/web";



const platform: PlatformApi = hasDesktopBridge() ? desktopPlatform : webPlatform;



export { platform };


export type { PlatformApi } from "./desktopApi";
