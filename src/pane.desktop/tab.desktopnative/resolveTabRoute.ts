import type { WorkspaceTab } from "./Tab";

export const resolveWorkspaceTabRoute = (tab: WorkspaceTab): string => {
  if (tab.kind === "route") return tab.routePath;
  if (tab.kind === "explorer") return "/library/explorer/" + encodeURIComponent(tab.id.replace("explorer:", ""));
  if (tab.kind === "document") return "/library/documents/" + encodeURIComponent(tab.documentId);
 