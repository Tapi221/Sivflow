import { platform } from "@platform/index";
import type { AppInfoPort } from "@/application/ports/AppInfoPort";



const appInfo: AppInfoPort = { getVersion: () => platform.app.getVersion() };



export { appInfo };
