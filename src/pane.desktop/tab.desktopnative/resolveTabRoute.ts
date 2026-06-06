import type { WorkspaceExplorerTab, WorkspaceTab } from "./Tab";

const EXPLORER_TAB_ID_PREFIX = "explorer:";
const WORKSPACE_ENTITY_ROUTE_PREFIX = {
  explorer: "/library/explorer",
  document: "/library/documents",
  card: "/library/cards",
} as const;

const encodeRouteSegment = (value: string): string => encodeURIComponent(value);

const resolveExplorerRouteSegment = (tab: WorkspaceExplorerTab): string => {
  const explorerId =