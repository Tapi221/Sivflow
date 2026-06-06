import type { WorkspaceTab } from "./Tab";

const EXPLORER_TAB_ID_PREFIX = "explorer:";

const encodeRouteSegment = (value: string): string => encodeURIComponent(value);

const getExplorerRouteId = (tabId: string): string => tabId.startsWith(EXPLORER_TAB_ID_PREFIX) ? tabId.slice(EXPLORER_TAB_ID_PREFIX.length) : tabId;

export const resolveWorkspaceTabRoute = (tab: WorkspaceTab): string => {
  switch (tab.kind) {
    case "route":
