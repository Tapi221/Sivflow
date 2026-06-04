import { useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import type { AppLayoutOutletContext } from "@/layout/AppLayout";
import { Sidebar } from "@/pane.desktop/leftpane/Sidebar.desktop";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";
import "@/pane.desktop/leftpane/sidebar.layered-directory.css";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { WorkspaceExplorerTab, WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";
import { Search } from "@/ui/icons";
import type { SelectedExplorerItem } from "@/types";
import { ScheduleScreen as CalendarScheduleScreen } from "./ScheduleScreen.desktop";

type ExplorerWorkspaceContentProps = {
  explorerState: ExplorerRouteState;
  explorerTabId: WorkspaceExplorerTab["id"] | null;
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
};

const FOLDER_TAB_SEARCH_TRIGGER_CLASS_NAME = "absolute right-5 top-4 z-30 flex h-9 w-[268px] shrink-0 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-left text-[13px] font-medium leading-none text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-0 transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-[#d7dbe2] hover:bg-[#fbfbfc] focus:outline-none focus:ring-0 focus-visible:border-[#c7d2fe] focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]";
const FOLDER_TAB_SEARCH_SHORTCUT_CLASS_NAME = "ml-auto flex h-[22px] min-w-[34px] items-center justify-center rounded-[6px] border border-[#e6e6e8] bg-[#f7f7f8] px-1.5 text-[11px] font-semibold leading-none tracking-[-0.02em] text-[#8e8e93] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";

const createFolderRouteState = (folderId: string | null): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: folderId === null, selectedFolderId: folderId, selectedItem: null });

const createItemRouteState = (current: ExplorerRouteState, item: SelectedExplorerItem): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: current.selectedFolderId, selectedItem: item });

const getSelectedCardId = (item: SelectedExplorerItem): string | null => item?.type === "card" ? item.id : null;

const getSelectedDocumentId = (item: SelectedExplorerItem): string | null => item?.type === "document" ? item.id : null;

const createDocumentRouteState = (tab: Extract<WorkspaceTab, { kind: "document" }>): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: tab.folderId, selectedItem: { type: "document", id: tab.documentId } });

const createCardRouteState = (tab: Extract<WorkspaceTab, { kind: "card" }>): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: tab.folderId, selectedItem: { type: "card", id: tab.cardId } });

const getLibraryExplorerState = (tab: WorkspaceTab | null): ExplorerRouteState | null => {
  if (!tab || tab.sectionKey !== "library") return null;
  if (tab.kind === "explorer") return tab.explorerState;
  if (tab.kind === "document") return createDocumentRouteState(tab);
  if (tab.kind === "card") return createCardRouteState(tab);
  return createFolderRouteState(null);
};

const getExplorerTabId = (tab: WorkspaceTab | null): WorkspaceExplorerTab["id"] | null => {
  return tab?.kind === "explorer" ? tab.id : null;
};

const ExplorerWorkspaceContent = ({ explorerState, explorerTabId, isLeftPanelCollapsed, onToggleLeftPanel }: ExplorerWorkspaceContentProps) => {
  const { folders, loading, error } = useFoldersRead();
  const openSearch = useSearchStore((state) => state.open);
  const updateExplorerTabState = useWorkspaceTabsStore((state) => state.updateExplorerTabState);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const selectedCardId = useMemo(() => getSelectedCardId(explorerState.selectedItem), [explorerState.selectedItem]);
  const selectedDocumentId = useMemo(() => getSelectedDocumentId(explorerState.selectedItem), [explorerState.selectedItem]);

  const handleOpenSearch = useCallback(() => {
    openSearch();
  }, [openSearch]);
  const updateLibraryExplorerState = useCallback((nextExplorerState: ExplorerRouteState) => {
    if (explorerTabId) {
      updateExplorerTabState(explorerTabId, nextExplorerState);
      return;
    }

    openExplorerTab({ explorerState: nextExplorerState });
  }, [explorerTabId, openExplorerTab, updateExplorerTabState]);

  const handleFolderSelect = useCallback((folderId: string | null) => {
    updateLibraryExplorerState(createFolderRouteState(folderId));
  }, [updateLibraryExplorerState]);

  const handleItemSelect = useCallback((item: SelectedExplorerItem) => {
    updateLibraryExplorerState(createItemRouteState(explorerState, item));
  }, [explorerState, updateLibraryExplorerState]);

  if (loading) return <div className="h-full w-full bg-white" />;
  if (error) return <div className="h-full w-full bg-white p-4 text-[12px] text-[#b48a8a]">{error}</div>;

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-transparent">
      {isLeftPanelCollapsed ? <Sidebar isLeftPanelCollapsed={isLeftPanelCollapsed} onToggleLeftPanel={onToggleLeftPanel} /> : <SidebarLayeredDirectory onToggleLeftPanel={onToggleLeftPanel} />}
      <CarvePanel className="relative min-w-0">
        <TreeViewLayout folders={folders} isSectionListMode={explorerState.isSectionListMode} selectedFolderId={explorerState.selectedFolderId} selectedItem={explorerState.selectedItem} selectedCardId={selectedCardId} selectedDocumentId={selectedDocumentId} onFolderSelect={handleFolderSelect} onItemSelect={handleItemSelect} onCardUpdated={() => undefined} folderSelectionNonce={0} navigateToSectionListToken={0} />
        <button type="button" className={FOLDER_TAB_SEARCH_TRIGGER_CLASS_NAME} aria-label="検索を開く" aria-keyshortcuts="Meta+K Control+K" title="検索を開く" onClick={handleOpenSearch}>
          <Search className="h-4 w-4 shrink-0 text-[#8e8e93]" />
          <span className="min-w-0 truncate text-[#7a7f88]">Search in Workspace...</span>
          <kbd className={FOLDER_TAB_SEARCH_SHORTCUT_CLASS_NAME}>⌘K</kbd>
        </button>
      </CarvePanel>
    </div>
  );
};

const WorkspaceScreen = () => {
  const { isLeftPanelCollapsed = false, onToggleLeftPanel } = useOutletContext<AppLayoutOutletContext>();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const libraryExplorerState = useMemo(() => getLibraryExplorerState(activeTab), [activeTab]);
  const explorerTabId = useMemo(() => getExplorerTabId(activeTab), [activeTab]);

  if (libraryExplorerState) return <ExplorerWorkspaceContent explorerState={libraryExplorerState} explorerTabId={explorerTabId} isLeftPanelCollapsed={isLeftPanelCollapsed} onToggleLeftPanel={onToggleLeftPanel} />;

  if (isLeftPanelCollapsed) {
    return (
      <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-transparent">
        <Sidebar isLeftPanelCollapsed={isLeftPanelCollapsed} onToggleLeftPanel={onToggleLeftPanel} />
        <div className="min-w-0 flex-1">
          <CalendarScheduleScreen isLeftPanelCollapsed={isLeftPanelCollapsed} />
        </div>
      </div>
    );
  }

  return <CalendarScheduleScreen isLeftPanelCollapsed={isLeftPanelCollapsed} />;
};

export { WorkspaceScreen };
