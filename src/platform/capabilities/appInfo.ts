import type { AppInfoPort } from "@/application/ports/AppInfoPort";
import { platform } from "@platform/index";

const appInfo: AppInfoPort = { getVersion: () => platform.app.getVersion() };

export { appInfo };
