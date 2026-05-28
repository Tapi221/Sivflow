import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";

export const WORKSPACE_DEFAULT_EXPLORER_TAB_ID = "explorer:default" as const;

export type WorkspaceSidebarSection =
  | "home"
  | "review"
  | "library"
  | "schedule"
  | "settings";

export type WorkspaceRouteSection = Exclude<WorkspaceSidebarSection, "library">;

export type WorkspaceRouteTabId =
  | "route:home"
  | "route:review"
  | "route:schedule"
  | "route:settings";

export type WorkspaceTabKind = "route" | "explorer" | "document" | "card";

type WorkspaceTabBase = {
  title: string;
  isClosable: boolean;
  sectionKey: WorkspaceSidebarSection;
};

export type WorkspaceRouteTab = Omit<WorkspaceTabBase, "sectionKey"> & {
  id: WorkspaceRouteTabId;
  kind: "route";
  routePath: string;
  sectionKey: WorkspaceRouteSection;
};

export type WorkspaceExplorerTab = WorkspaceTabBase & {
  id: `explorer:${string}`;
  kind: "explorer";
  explorerState: ExplorerRouteState;
};

export type WorkspaceDocumentTab = WorkspaceTabBase & {
  id: `document:${string}`;
  kind: "document";
  documentId: string;
  folderId: string | null;
};

export type WorkspaceCardTab = WorkspaceTabBase & {
  id: `card:${string}`;
  kind: "card";
  cardId: string;
  folderId: string | null;
};

export type WorkspaceTab =
  | WorkspaceRouteTab
  | WorkspaceExplorerTab
  | WorkspaceDocumentTab
  | WorkspaceCardTab;

export type WorkspaceEntityTab = Exclude<
  WorkspaceTab,
  WorkspaceExplorerTab | WorkspaceRouteTab
>;

export const WORKSPACE_ROUTE_TABS = [
  {
    id: "route:home",
    kind: "route",
    title: "Home",
    routePath: "/schedule",
    isClosable: true,
    sectionKey: "home",
  },
  {
    id: "route:review",
    kind: "route",
    title: "Review",
    routePath: "/study",
    isClosable: true,
    sectionKey: "review",
  },
  {
    id: "route:schedule",
    kind: "route",
    title: "Schedule",
    routePath: "/schedule",
    isClosable: true,
    sectionKey: "schedule",
  },
  {
    id: "route:settings",
    kind: "route",
    title: "設定",
    routePath: "/settings",
    isClosable: true,
    sectionKey: "settings",
  },
] as const satisfies readonly WorkspaceRouteTab[];

export const createDefaultExplorerRouteState = (): ExplorerRouteState => ({
  isHomeOnlyMode: false,
  isSectionListMode: true,
  selectedFolderId: null,
  selectedItem: null,
});

export const resolveRouteTabBySection = (
  sectionKey: WorkspaceRouteSection,
): WorkspaceRouteTab => {
  const matchedTab = WORKSPACE_ROUTE_TABS.find(
    (tab) => tab.sectionKey === sectionKey,
  );

  if (!matchedTab) {
    throw new Error(`Unknown workspace route section: ${sectionKey}`);
  }

  return matchedTab;
};
