import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";

export const WORKSPACE_DEFAULT_EXPLORER_TAB_ID = "explorer:default" as const;

export type WorkspaceTabKind = "explorer" | "document" | "cardSet" | "card";

export type WorkspaceExplorerTab = {
  id: `explorer:${string}`;
  kind: "explorer";
  title: string;
  explorerState: ExplorerRouteState;
  isClosable: boolean;
};

export type WorkspaceDocumentTab = {
  id: `document:${string}`;
  kind: "document";
  title: string;
  documentId: string;
  folderId: string | null;
  isClosable: boolean;
};

export type WorkspaceCardSetTab = {
  id: `cardSet:${string}`;
  kind: "cardSet";
  title: string;
  cardSetId: string;
  folderId: string | null;
  isClosable: boolean;
};

export type WorkspaceCardTab = {
  id: `card:${string}`;
  kind: "card";
  title: string;
  cardId: string;
  folderId: string | null;
  isClosable: boolean;
};

export type WorkspaceTab =
  | WorkspaceExplorerTab
  | WorkspaceDocumentTab
  | WorkspaceCardSetTab
  | WorkspaceCardTab;

export type WorkspaceEntityTab = Exclude<WorkspaceTab, WorkspaceExplorerTab>;

export const createDefaultExplorerRouteState = (): ExplorerRouteState => ({
  isHomeOnlyMode: false,
  isSectionListMode: true,
  selectedFolderId: null,
  selectedItem: null,
});
