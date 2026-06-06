import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
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
  type WorkspaceTab 
} from "@/pane.desktop/tab.desktopnative/Tab";

// Store の定義を続ける
export const useWorkspaceTabsStore = create(
  persist(
    (set, get) => ({
      tabs: [] as WorkspaceTab[],
      activeTabId: WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
      addTab: (tab: WorkspaceTab) => set({ tabs: [...get().tabs, tab] }),
      removeTab: (tabId: string) => set({ tabs: get().tabs.filter(t => t.id !== tabId) }),
      setActiveTab: (tabId: string) => set({ activeTabId: tabId }),
    }),
    {
      name: "workspace-tabs",
      storage: createJSONStorage(() => localStorage) as StateStorage,
    }
  )
);