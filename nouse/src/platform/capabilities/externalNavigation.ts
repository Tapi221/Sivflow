import { platform } from "@platform/index";
import type { ExternalNavigationPort } from "@/application/ports/ExternalNavigationPort";



const externalNavigation: ExternalNavigationPort = { openExternal: (url: string) => platform.shell.openExternal(url) };



export { externalNavigation };
