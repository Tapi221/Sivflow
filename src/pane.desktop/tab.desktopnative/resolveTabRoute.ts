import type { WorkspaceTab } from "./Tab";

const encodeRouteSegment = (value: string): string => encodeURIComponent(value);
const getExplorerRouteId = (tabId: string): string => tabId.startsWith("explorer:") ? tabId.slice("explorer:".length) : tabId;

export const resolveWorkspaceTabRoute = (tab: WorkspaceTab): string => tab.kind === "route" ? tab.route