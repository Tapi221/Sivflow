import type { WorkspaceTab } from "@/features/tab/Tab";

export const resolveWorkspaceTabRoute = (tab: WorkspaceTab): string => {
  switch (tab.kind) {
    case "route":
      return tab.routePath;
    case "explorer":
    case "document":
    case "card":
      return "/schedule";
  }
};
