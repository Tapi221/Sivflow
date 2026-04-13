import type { AppInfoPort } from "@/application/ports/AppInfoPort";
import platform from "@/platform";

export const appInfo: AppInfoPort = {
  getVersion: () => platform.app.getVersion(),
};
