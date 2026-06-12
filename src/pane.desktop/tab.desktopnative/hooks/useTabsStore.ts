import { WEB_STORAGE_KEYS } from "@platform/storage/webStorageKeys.constants";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import type { WorkspaceCardTab, WorkspaceDocumentTab, WorkspaceExplorerTab, WorkspaceNoteTab, WorkspaceRouteTab, WorkspaceSidebarSection, WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";
import { createDefaultExplorerRouteState, resolveRouteTabBySection, WORKSPACE_DEFAULT_EXPLORER_TAB_ID } from "@/pane.desktop/tab.desktopnative/Tab";



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
type OpenNoteTabParams = {
  noteId: string;
  title: string;
  folderId: string | null;
};
type WorkspaceTabsState = {
  tabs: WorkspaceTab[];
  activeTabId: WorkspaceTab["id"] | null;
  lastOpenedTabId: WorkspaceTab["id"] | null;
  openExplorerTab: (params?: OpenExplorerTabParams) => WorkspaceExplorerTab["id"];
  createExplorerTab: (explorerState?: ExplorerRouteState) => WorkspaceExplorerTab["id"];
  openDocumentTab: (params: OpenDocumentTabParams) => WorkspaceDocumentTab["id"];
  openCardTab: (params: OpenCardTabParams) => WorkspaceCardTab["id"];
  openNoteTab: (params: OpenNoteTabParams) => WorkspaceNoteTab["id"];
  openSectionTab: (sectionKey: WorkspaceSidebarSection) => WorkspaceTab["id"];
  selectTab: (tabId: WorkspaceTab["id"]) => void;
  closeTab: (tabId: WorkspaceTab["id"]) => void;
  reorderTabs: (nextTabs: WorkspaceTab[]) => void;
  updateExplorerTabState: (tabId: WorkspaceExplorerTab["id"], explorerState: ExplorerRouteState) => void;
  updateTabTitle: (tabId: WorkspaceTab["id"], title: string) => void;
};
type WorkspaceTabsPersistedState = Pick<WorkspaceTabsState, "tabs" | "activeTabId" | "lastOpenedTabId">;



const EXPLORER_TAB_TITLE = "Library";
const useWorkspaceTabsStore = create<WorkspaceTabsState>()(persist((set, get) => ({ tabs: [], activeTabId: null, lastOpenedTabId: null, openExplorerTab: (params = {}) => {
  const id = params.id ?? WORKSPACE_DEFAULT_EXPLORER_TAB_ID;
  const existing = get().tabs.find((tab) => tab.id === id);

  if (existing?.kind === "explorer") {
    const nextTab: WorkspaceExplorerTab = {
      ...existing,
      title: params.title ?? existing.title,
      explorerState: params.explorerState ?? existing.explorerState,
      isClosable: params.isClosable ?? existing.isClosable,
    };

    set((state) => ({
      tabs: upsertTab(state.tabs, nextTab),
      activeTabId: nextTab.id,
    }));

    return nextTab.id;
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
    set((state) => ({
      tabs: upsertTab(state.tabs, existing),
      activeTabId: id,
    }));

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
    set((state) => ({
      tabs: upsertTab(state.tabs, existing),
      activeTabId: id,
    }));

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

openNoteTab: ({ noteId, title, folderId }) => {
  const id = `note:${noteId}` as const;
  const existing = get().tabs.find((tab) => tab.id === id);

  if (existing) {
    set((state) => ({
      tabs: upsertTab(state.tabs, existing),
      activeTabId: id,
    }));

    return id;
  }

  const nextTab: WorkspaceNoteTab = {
    id,
    kind: "note",
    title,
    noteId,
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
    set((state) => ({
      tabs: upsertTab(state.tabs, existing),
      activeTabId: existing.id,
    }));

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
    const reorderedTabs = reorderTabsByIds(state.tabs, normalizeTabs(nextTabs));

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
}),
{
  name: WEB_STORAGE_KEYS.workspaceTabs,
  storage: createJSONStorage(() => localStorage),
  partialize: (state): WorkspaceTabsPersistedState => ({
    tabs: normalizeTabs(state.tabs),
    activeTabId: state.activeTabId,
    lastOpenedTabId: state.lastOpenedTabId,
  }),
  merge: (persistedState, currentState) => ({
    ...currentState,
    ...normalizeWorkspaceTabsState(persistedState),
  }),
  version: 1,
},
),
);



const createRandomIdSegment = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
const assertWorkspaceTabId = (value: string): WorkspaceTab["id"] => value as WorkspaceTab["id"];
const isWorkspaceTab = (value: unknown): value is WorkspaceTab => {
  if (!value || typeof value !== "object") return false;

  const tab = value as Partial<WorkspaceTab>;

  return (
    typeof tab.id === "string" &&
    typeof tab.kind === "string" &&
    typeof tab.title === "string" &&
    typeof tab.isClosable === "boolean" &&
    typeof tab.sectionKey === "string"
  );
};
const normalizeTabs = (tabs: unknown): WorkspaceTab[] => {
  if (!Array.isArray(tabs)) return [];

  const normalizedTabs: WorkspaceTab[] = [];
  const usedTabIds = new Set<WorkspaceTab["id"]>();

  for (const tab of tabs) {
    if (!isWorkspaceTab(tab)) continue;
    if (usedTabIds.has(tab.id)) continue;

    usedTabIds.add(tab.id);
    normalizedTabs.push(tab);
  }

  return normalizedTabs;
};
const normalizeWorkspaceTabsState = (state: unknown): WorkspaceTabsPersistedState => {
  if (!state || typeof state !== "object") {
    return { tabs: [], activeTabId: null, lastOpenedTabId: null };
  }

  const persisted = state as Partial<WorkspaceTabsPersistedState>;
  const tabs = normalizeTabs(persisted.tabs);
  const tabIds = new Set(tabs.map((tab) => tab.id));
  const activeTabId =
    typeof persisted.activeTabId === "string" && tabIds.has(persisted.activeTabId)
      ? persisted.activeTabId
      : (tabs.at(-1)?.id ?? null);
  const lastOpenedTabId =
    typeof persisted.lastOpenedTabId === "string" && tabIds.has(persisted.lastOpenedTabId)
      ? persisted.lastOpenedTabId
      : null;

  return { tabs, activeTabId, lastOpenedTabId };
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

  const fallbackIndex = Math.max(0, Math.min(closingIndex, nextTabs.length - 1));
  const fallbackTab = nextTabs[fallbackIndex];

  return fallbackTab?.id ?? nextTabs[0]?.id ?? null;
};
const upsertTab = (tabs: WorkspaceTab[], nextTab: WorkspaceTab): WorkspaceTab[] => {
  let didReplace = false;

  const nextTabs = tabs.flatMap((tab) => {
    if (tab.id !== nextTab.id) {
      return [tab];
    }

    if (didReplace) {
      return [];
    }

    didReplace = true;
    return [nextTab];
  });

  return didReplace ? nextTabs : [...tabs, nextTab];
};
const reorderTabsByIds = (currentTabs: WorkspaceTab[], nextTabs: WorkspaceTab[]): WorkspaceTab[] | null => {
  if (currentTabs.length !== nextTabs.length) return null;

  const currentTabsById = new Map(currentTabs.map((tab) => [tab.id, tab]));
  const reorderedTabs = nextTabs.map((tab) => currentTabsById.get(tab.id));

  if (reorderedTabs.some((tab) => !tab)) return null;

  return reorderedTabs as WorkspaceTab[];
};
const createRouteTabFromSection = (
  sectionKey: Exclude<WorkspaceSidebarSection, "library">,
): WorkspaceRouteTab => {
  return { ...resolveRouteTabBySection(sectionKey) };
};



export { useWorkspaceTabsStore };
