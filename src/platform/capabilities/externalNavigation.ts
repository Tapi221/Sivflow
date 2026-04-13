import type { ExternalNavigationPort } from "@/application/ports/ExternalNavigationPort";
import platform from "@/platform";

export const externalNavigation: ExternalNavigationPort = {
  openExternal: (url: string) => platform.shell.openExternal(url),
};
