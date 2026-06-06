import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { createDefaultExplorerRouteState, resolveRouteTabBySection, WORKSPACE_DEFAULT_EXPLORER_TAB_ID, type WorkspaceCardTab, type WorkspaceDocumentTab, type WorkspaceExplorerTab, type WorkspaceRouteTab, type WorkspaceSidebarSection, type WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";

type OpenExplorerTabParams = {
  id?: WorkspaceExplorerTab["id"];
  title?: string;
  explorerState?: ExplorerRouteState;
  isClosable?: boolean;
};

type OpenDocumentTabParams = {
  documentId: string;
  title: string;
  folderId: string | null;
};

type OpenCardTabParams = {
  cardId: string