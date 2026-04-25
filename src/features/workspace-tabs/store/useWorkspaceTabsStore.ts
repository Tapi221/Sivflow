import { create } from "zustand";

import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import {
  createDefaultExplorerRouteState,
  WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
  type WorkspaceCardSetTab,
  type WorkspaceCardTab,
  type WorkspaceDocumentTab,
  type WorkspaceExplorerTab,
  type WorkspaceTab,
} from "@/features/workspace-tabs/domain/workspaceTab";

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

type OpenCardSetTabParams = {
  cardSetId: string;
  title: string;
  folderId: string | null;
};

type OpenCardTabParams = {
  cardId: string;
  title: string;
  folderId: string | null;
};

type WorkspaceTabsState = {
  tabs: WorkspaceTab[];
  activeTabId: WorkspaceTab["id"];
  openExplorerTab: (params?: OpenExplorerTabParams) => WorkspaceExplorerTab["id"];
  createExplorerTab: (explorerState?: ExplorerRouteState) => WorkspaceExplorerTab["id"];
  openDocumentTab: (params: OpenDocumentTabParams) => WorkspaceDocumentTab["id"];
  openCardSetTab: (params: OpenCardSetTabParams) => WorkspaceCardSetTab["id"];
  openCardTab: (params: OpenCardTabParams) => WorkspaceCardTab["id"];
  selectTab: (tabId: WorkspaceTab["id"]) => void;
  closeTab: (tabId: WorkspaceTab["id"]) => void;
  updateExplorerTabState: (
    tabId: WorkspaceExplorerTab["id"],
    explorerState: ExplorerRouteState,
  ) => void;
  updateTabTitle: (tabId: WorkspaceTab["id"], title: string) => void;
};

const EXPLORER_TAB_TITLE = "エクスプローラー";

const createInitialExplorerTab = (): WorkspaceExplorerTab => ({
  id: WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
  kind: "explorer",
  title: EXPLORER_TAB_TITLE,
  explorerState: createDefaultExplorerRouteState(),
  isClosable: false,
});

const createRandomIdSegment = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const assertWorkspaceTabId = (value: string): WorkspaceTab["id"] => {
  return value as WorkspaceTab["id"];
};

const areSelectedExplorerItemsEqual = (
  left: ExplorerRouteState["selectedItem"],
  right: ExplorerRouteState["selectedItem"],
): boolean => {
  if (left === right) return true;
  if (left === null || right === null) return false;
  if (left.type !== right.type) return false;

  const leftId = "id" in left ? left.id : null;
  const rightId = "id" in right ? right.id : null;

  return leftId === rightId;
};

const areExplorerRouteStatesEqual = (
  left: ExplorerRouteState,
  right: ExplorerRouteState,
): boolean => {
  return (
    left.isHomeOnlyMode === right.isHomeOnlyMode &&
    left.isSectionListMode === right.isSectionListMode &&
    left.selectedFolderId === right.selectedFolderId &&
    areSelectedExplorerItemsEqual(left.selectedItem, right.selectedItem)
  );
};

const resolveNextActiveTabId = (
  tabs: WorkspaceTab[],
  closingTabId: WorkspaceTab["id"],
): WorkspaceTab["id"] => {
  const closingIndex = tabs.findIndex((tab) => tab.id === closingTabId);
  const nextTabs = tabs.filter((tab) => tab.id !== closingTabId);

  if (nextTabs.length === 0) {
    return WORKSPACE_DEFAULT_EXPLORER_TAB_ID;
  }

  const fallbackIndex = Math.max(0, Math.min(closingIndex, nextTabs.length - 1));
  const fallbackTab = nextTabs[fallbackIndex];

  return fallbackTab?.id ?? WORKSPACE_DEFAULT_EXPLORER_TAB_ID;
};

export const useWorkspaceTabsStore = create<WorkspaceTabsState>((set, get) => ({
  tabs: [createInitialExplorerTab()],
  activeTabId: WORKSPACE_DEFAULT_EXPLORER_TAB_ID,

  openExplorerTab: (params = {}) => {
    const id = params.id ?? WORKSPACE_DEFAULT_EXPLORER_TAB_ID;
    const existing = get().tabs.find((tab) => tab.id === id);

    if (existing?.kind === "explorer") {
      set({ activeTabId: existing.id });
      return existing.id;
    }

    const nextTab: WorkspaceExplorerTab = {
      id,
      kind: "explorer",
      title: params.title ?? EXPLORER_TAB_TITLE,
      explorerState: params.explorerState ?? createDefaultExplorerRouteState(),
      isClosable: params.isClosable ?? id !== WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
    };

    set((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
    }));

    return nextTab.id;
  },

  createExplorerTab: (explorerState) => {
    const id = `explorer:${createRandomIdSegment()}` as const;
    const nextTab: WorkspaceExplorerTab = {
      id,
      kind: "explorer",
      title: EXPLORER_TAB_TITLE,
      explorerState: explorerState ?? createDefaultExplorerRouteState(),
      isClosable: true,
    };

    set((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
    }));

    return id;
  },

  openDocumentTab: ({ documentId, title, folderId }) => {
    const id = `document:${documentId}` as const;
    const existing = get().tabs.find((tab) => tab.id === id);

    if (existing) {
      set({ activeTabId: id });
      return id;
    }

    const nextTab: WorkspaceDocumentTab = {
      id,
      kind: "document",
      title,
      documentId,
      folderId,
      isClosable: true,
    };

    set((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
    }));

    return id;
  },

  openCardSetTab: ({ cardSetId, title, folderId }) => {
    const id = `cardSet:${cardSetId}` as const;
    const existing = get().tabs.find((tab) => tab.id === id);

    if (existing) {
      set({ activeTabId: id });
      return id;
    }

    const nextTab: WorkspaceCardSetTab = {
      id,
      kind: "cardSet",
      title,
      cardSetId,
      folderId,
      isClosable: true,
    };

    set((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
    }));

    return id;
  },

  openCardTab: ({ cardId, title, folderId }) => {
    const id = `card:${cardId}` as const;
    const existing = get().tabs.find((tab) => tab.id === id);

    if (existing) {
      set({ activeTabId: id });
      return id;
    }

    const nextTab: WorkspaceCardTab = {
      id,
      kind: "card",
      title,
      cardId,
      folderId,
      isClosable: true,
    };

    set((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
    }));

    return id;
  },

  selectTab: (tabId) => {
    const normalizedTabId = assertWorkspaceTabId(tabId);
    const exists = get().tabs.some((tab) => tab.id === normalizedTabId);
    if (!exists) return;

    set({ activeTabId: normalizedTabId });
  },

  closeTab: (tabId) => {
    const normalizedTabId = assertWorkspaceTabId(tabId);
    const state = get();
    const target = state.tabs.find((tab) => tab.id === normalizedTabId);

    if (!target || !target.isClosable) return;

    const nextTabs = state.tabs.filter((tab) => tab.id !== normalizedTabId);
    const nextActiveTabId =
      state.activeTabId === normalizedTabId
        ? resolveNextActiveTabId(state.tabs, normalizedTabId)
        : state.activeTabId;

    set({
      tabs: nextTabs.length > 0 ? nextTabs : [createInitialExplorerTab()],
      activeTabId: nextActiveTabId,
    });
  },

  updateExplorerTabState: (tabId, explorerState) => {
    set((state) => {
      let didChange = false;
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.kind !== "explorer") {
          return tab;
        }

        if (areExplorerRouteStatesEqual(tab.explorerState, explorerState)) {
          return tab;
        }

        didChange = true;
        return { ...tab, explorerState };
      });

      return didChange ? { tabs } : state;
    });
  },

  updateTabTitle: (tabId, title) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    set((state) => {
      let didChange = false;
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.title === trimmedTitle) {
          return tab;
        }

        didChange = true;
        return { ...tab, title: trimmedTitle };
      });

      return didChange ? { tabs } : state;
    });
  },
}));
