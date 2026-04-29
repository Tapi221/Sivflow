import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";

export const WORKSPACE_DEFAULT_EXPLORER_TAB_ID = "explorer:default" as const;

export type WorkspaceSidebarSection =
  | "home"
  | "review"
  | "library"
  | "calendar"
  | "explore";

export type WorkspaceRouteTabId =
  | "route:home"
  | "route:review"
  | "route:calendar"
  | "route:explore";

export type WorkspaceTabKind =
  | "route"
  | "explorer"
  | "document"
  | "cardSet"
  | "card";

type WorkspaceTabBase = {
  title: string;
  isClosable: boolean;
  sectionKey: WorkspaceSidebarSection;
};

export type WorkspaceRouteTab = WorkspaceTabBase & {
  id: WorkspaceRouteTabId;
  kind: "route";
  routePath: string;
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

export type WorkspaceCardSetTab = WorkspaceTabBase & {
  id: `cardSet:${string}`;
  kind: "cardSet";
  cardSetId: string;
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
  | WorkspaceCardSetTab
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
    routePath: "/folders?home=1",
    isClosable: true,
    sectionKey: "home",
  },
  {
    id: "route:review",
    kind: "route",
    title: "Review",
    routePath: "/gallery",
    isClosable: true,
    sectionKey: "review",
  },
  {
    id: "route:calendar",
    kind: "route",
    title: "Calendar",
    routePath: "/calendar",
    isClosable: true,
    sectionKey: "calendar",
  },
  {
    id: "route:explore",
    kind: "route",
    title: "Explore",
    routePath: "/tag-map",
    isClosable: true,
    sectionKey: "explore",
  },
] as const satisfies readonly WorkspaceRouteTab[];

export const createDefaultExplorerRouteState = (): ExplorerRouteState => ({
  isHomeOnlyMode: false,
  isSectionListMode: true,
  selectedFolderId: null,
  selectedItem: null,
});

export const resolveRouteTabBySection = (
  sectionKey: Exclude<WorkspaceSidebarSection, "library">,
): WorkspaceRouteTab => {
  const matchedTab = WORKSPACE_ROUTE_TABS.find(
    (tab) => tab.sectionKey === sectionKey,
  );

  if (!matchedTab) {
    throw new Error(`Unknown workspace route section: ${sectionKey}`);
  }

  return matchedTab;
};
