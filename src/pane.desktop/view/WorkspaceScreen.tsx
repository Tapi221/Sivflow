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

const FOLDER_TAB_SEARCH_TRIGGER_CLASS_NAME = "absolute right-4 top-3 z-30 flex h-8 w-[220px] shrink-0 items-center gap-1.5 rounded-[9px] border border-[rgba(0,0,0,0.04)] bg-[#efeeee]/95 px-2.5 text-left text-[12px] font-medium leading-none tracking-[-0.012em] text-[#85827e] shadow-none outline-none ring-0 backdrop-blur-xl transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[rgba(0,0,0,0.04)] hover:bg-[#eeeeee] hover:text-[#2f343b] active:scale-[0.99] focus:outline-none focus:ring-0 focus-visible:bg-[#eeeeee] focus-visible:text-[#2f343b] motion-reduce:transition-none motion-reduce:active:scale-100";
const FOLDER_TAB_SEARCH_SHORTCUT_CLASS_NAME = "ml-auto flex h-5 min-w-[31px] items-center justify-center rounded-[5px] border border-[rgba(0,0,0,0.04)] bg-[#eeeeee] px-1.5 text-[10px] font-semibold leading-none tracking-[-0.02em] text-[#85827e]";

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
          <Search className="h-3.5 w-3.5 shrink-0 text-[#85827e]" />
          <span className="min-w-0 truncate">Search in Workspace...</span>
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
