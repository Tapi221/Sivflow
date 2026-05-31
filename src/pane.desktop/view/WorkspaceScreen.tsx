import { useCallback, useMemo } from "react";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { CarvePanel, CarvePanelShell } from "@/components/panel/CarvePanel.desktop";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { CalendarWorkspaceToolbar } from "@/pane.desktop/header/ScheduleToolbar";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { WorkspaceExplorerTab, WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";
import type { SelectedExplorerItem } from "@/types";
import { ScheduleScreen as CalendarScheduleScreen } from "./ScheduleScreen.desktop";

type ExplorerWorkspaceContentProps = {
  explorerState: ExplorerRouteState;
  explorerTabId: WorkspaceExplorerTab["id"] | null;
};

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

const ExplorerWorkspaceContent = ({ explorerState, explorerTabId }: ExplorerWorkspaceContentProps) => {
  const { folders, loading, error } = useFoldersRead();
  const updateExplorerTabState = useWorkspaceTabsStore((state) => state.updateExplorerTabState);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const selectedCardId = useMemo(() => getSelectedCardId(explorerState.selectedItem), [explorerState.selectedItem]);
  const selectedDocumentId = useMemo(() => getSelectedDocumentId(explorerState.selectedItem), [explorerState.selectedItem]);

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

  return <CarvePanelShell toolbar={<CalendarWorkspaceToolbar />} leftPanel={<SidebarLayeredDirectory />}><CarvePanel><TreeViewLayout folders={folders} isSectionListMode={explorerState.isSectionListMode} selectedFolderId={explorerState.selectedFolderId} selectedItem={explorerState.selectedItem} selectedCardId={selectedCardId} selectedDocumentId={selectedDocumentId} onFolderSelect={handleFolderSelect} onItemSelect={handleItemSelect} onCardUpdated={() => undefined} folderSelectionNonce={0} navigateToSectionListToken={0} /></CarvePanel></CarvePanelShell>;
};

const WorkspaceScreen = () => {
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const libraryExplorerState = useMemo(() => getLibraryExplorerState(activeTab), [activeTab]);
  const explorerTabId = useMemo(() => getExplorerTabId(activeTab), [activeTab]);

  if (libraryExplorerState) return <ExplorerWorkspaceContent explorerState={libraryExplorerState} explorerTabId={explorerTabId} />;

  return <CalendarScheduleScreen />;
};

export { WorkspaceScreen };
