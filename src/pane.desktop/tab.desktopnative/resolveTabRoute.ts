import type { WorkspaceTab } from "./Tab";

const encodeRouteSegment = (value: string): string => encodeURIComponent(value);

export const resolveWorkspaceTabRoute = (tab: WorkspaceTab): string => {
  switch (tab.kind) {
    case "route":
      return tab.routePath;
    case "explorer":
      return `/library/explorer/${encodeRouteSegment(tab.id.replace(/^explorer:/, ""))}`;
    case "document":
      return `/library/documents