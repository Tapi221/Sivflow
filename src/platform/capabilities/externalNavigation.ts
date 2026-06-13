import type { ExternalNavigationPort } from "@/application/ports/ExternalNavigationPort";
import platform from "@/platform";



const externalNavigation: ExternalNavigationPort = { openExternal: (url: string) => platform.shell.openExternal(url) };



export { externalNavigation };
