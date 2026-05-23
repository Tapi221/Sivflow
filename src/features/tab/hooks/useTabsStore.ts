import { create } from "zustand";

import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import {
  createDefaultExplorerRouteState,
  resolveRouteTabBySection,
  WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
  type WorkspaceCardTab,
  type WorkspaceDocumentTab,
  type WorkspaceExplorerTab,
  type WorkspaceRouteTab,
  type WorkspaceSidebarSection,
  type WorkspaceTab,
} from "@/features/tab/Tab";

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
  cardId: string;
  title: string;
  folderId: string | null;
};

type WorkspaceTabsState = {
  tabs: WorkspaceTab[];
  activeTabId: WorkspaceTab["id"] | null;
  lastOpenedTabId: WorkspaceTab["id"] | null;
  openExplorerTab: (
    params?: OpenExplorerTabParams,
  ) => WorkspaceExplorerTab["id"];
  createExplorerTab: (
    explorerState?: ExplorerRouteState,
  ) => WorkspaceExplorerTab["id"];
  openDocumentTab: (
    params: OpenDocumentTabParams,
  ) => WorkspaceDocumentTab["id"];
  openCardTab: (params: OpenCardTabParams) => WorkspaceCardTab["id"];
  openSectionTab: (sectionKey: WorkspaceSidebarSection) => WorkspaceTab["id"];
  selectTab: (tabId: WorkspaceTab["id"]) => void;
  closeTab: (tabId: WorkspaceTab["id"]) => void;
  reorderTabs: (nextTabs: WorkspaceTab[]) => void;
  updateExplorerTabState: (
    tabId: WorkspaceExplorerTab["id"],
    explorerState: ExplorerRouteState,
  ) => void;
  updateTabTitle: (tabId: WorkspaceTab["id"], title: string) => void;
};

const EXPLORER_TAB_TITLE = "Library";

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
): WorkspaceTab["id"] | null => {
  const closingIndex = tabs.findIndex((tab) => tab.id === closingTabId);
  const nextTabs = tabs.filter((tab) => tab.id !== closingTabId);

  if (nextTabs.length === 0) {
    return null;
  }

  const fallbackIndex = Math.max(
    0,
    Math.min(closingIndex, nextTabs.length - 1),
  );
  const fallbackTab = nextTabs[fallbackIndex];

  return fallbackTab?.id ?? nextTabs[0]?.id ?? null;
};

const upsertTab = (
  tabs: WorkspaceTab[],
  nextTab: WorkspaceTab,
): WorkspaceTab[] => {
  const existingIndex = tabs.findIndex((tab) => tab.id === nextTab.id);

  if (existingIndex === -1) {
    return [...tabs, nextTab];
  }

  const nextTabs = [...tabs];
  nextTabs[existingIndex] = nextTab;
  return nextTabs;
};

const reorderTabsByIds = (
  currentTabs: WorkspaceTab[],
  nextTabs: WorkspaceTab[],
): WorkspaceTab[] | null => {
  if (currentTabs.length !== nextTabs.length) return null;

  const currentTabsById = new Map(
    currentTabs.map((tab) => [tab.id, tab]),
  );

  const reorderedTabs = nextTabs.map((tab) => currentTabsById.get(tab.id));

  if (reorderedTabs.some((tab) => !tab)) return null;

  return reorderedTabs as WorkspaceTab[];
};

const createRouteTabFromSection = (
  sectionKey: Exclude<WorkspaceSidebarSection, "library">,
): WorkspaceRouteTab => {
  return { ...resolveRouteTabBySection(sectionKey) };
};

export const useWorkspaceTabsStore = create<WorkspaceTabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  lastOpenedTabId: null,

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
      isClosable: params.isClosable ?? true,
      sectionKey: "library",
    };

    set((state) => ({
      tabs: upsertTab(state.tabs, nextTab),
      activeTabId: nextTab.id,
      lastOpenedTabId: nextTab.id,
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
      sectionKey: "library",
    };

    set((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
      lastOpenedTabId: nextTab.id,
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
      sectionKey: "library",
    };

    set((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
      lastOpenedTabId: nextTab.id,
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
      sectionKey: "library",
    };

    set((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
      lastOpenedTabId: nextTab.id,
    }));

    return id;
  },

  openSectionTab: (sectionKey) => {
    if (sectionKey === "library") {
      return get().openExplorerTab({
        id: WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
        title: EXPLORER_TAB_TITLE,
        explorerState: createDefaultExplorerRouteState(),
        isClosable: true,
      });
    }

    const nextRouteTab = createRouteTabFromSection(sectionKey);
    const existing = get().tabs.find((tab) => tab.id === nextRouteTab.id);

    if (existing?.kind === "route") {
      set({ activeTabId: existing.id });
      return existing.id;
    }

    set((state) => ({
      tabs: upsertTab(state.tabs, nextRouteTab),
      activeTabId: nextRouteTab.id,
      lastOpenedTabId: nextRouteTab.id,
    }));

    return nextRouteTab.id;
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
    const nextLastOpenedTabId =
      state.lastOpenedTabId === normalizedTabId ? null : state.lastOpenedTabId;

    set({
      tabs: nextTabs,
      activeTabId: nextActiveTabId,
      lastOpenedTabId: nextLastOpenedTabId,
    });
  },

  reorderTabs: (nextTabs) => {
    set((state) => {
      const reorderedTabs = reorderTabsByIds(state.tabs, nextTabs);

      if (!reorderedTabs) return state;

      return { tabs: reorderedTabs };
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
