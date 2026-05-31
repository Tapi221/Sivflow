import { useCallback, useMemo } from "react";
import { CarvePanel, CarvePanelShell } from "@/components/panel/CarvePanel.desktop";
import { TreeViewLayout } from "@/components/folder/layout/TreeViewLayout";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { WorkspaceExplorerTab } from "@/pane.desktop/tab.desktopnative/Tab";
import { ScheduleScreen as CalendarScheduleScreen } from "./ScheduleScreen.desktop";
import type { SelectedExplorerItem } from "@/types";

type ExplorerWorkspaceContentProps = { activeTab: WorkspaceExplorerTab };

const createFolderRouteState = (folderId: string | null): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: folderId === null, selectedFolderId: folderId, selectedItem: null });

const createItemRouteState = (current: ExplorerRouteState, item: SelectedExplorerItem): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: current.selectedFolderId, selectedItem: item });

const getSelectedCardId = (item: SelectedExplorerItem): string | null => item?.type === "card" ? item.id : null;

const getSelectedDocumentId = (item: SelectedExplorerItem): string | null => item?.type === "document" ? item.id : null;

const ExplorerWorkspaceContent = ({ activeTab }: ExplorerWorkspaceContentProps) => {
  const { folders, loading, error } = useFoldersRead();
  const updateExplorerTabState = useWorkspaceTabsStore((state) => state.updateExplorerTabState);
  const explorerState = activeTab.explorerState;
  const selectedCardId = useMemo(() => getSelectedCardId(explorerState.selectedItem), [explorerState.selectedItem]);
  const selectedDocumentId = useMemo(() => getSelectedDocumentId(explorerState.selectedItem), [explorerState.selectedItem]);
  const handleFolderSelect = useCallback((folderId: string | null) => { updateExplorerTabState(activeTab.id, createFolderRouteState(folderId)); }, [activeTab.id, updateExplorerTabState]);
  const handleItemSelect = useCallback((item: SelectedExplorerItem) => { updateExplorerTabState(activeTab.id, createItemRouteState(explorerState, item)); }, [activeTab.id, explorerState, updateExplorerTabState]);

  if (loading) return <div className="h-full w-full bg-white" />;
  if (error) return <div className="h-full w-full bg-white p-4 text-[12px] text-[#b48a8a]">{error}</div>;

  return (
    <CarvePanelShell reserveToolbar leftPanel={<SidebarLayeredDirectory />}>
      <CarvePanel>
        <TreeViewLayout folders={folders} isSectionListMode={explorerState.isSectionListMode} selectedFolderId={explorerState.selectedFolderId} selectedItem={explorerState.selectedItem} selectedCardId={selectedCardId} selectedDocumentId={selectedDocumentId} onFolderSelect={handleFolderSelect} onItemSelect={handleItemSelect} onCardUpdated={() => undefined} folderSelectionNonce={0} navigateToSectionListToken={0} />
      </CarvePanel>
    </CarvePanelShell>
  );
};

const ScheduleScreen = () => {
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const activeExplorerTab = useMemo(() => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    return activeTab?.kind === "explorer" ? activeTab : null;
  }, [activeTabId, tabs]);

  if (activeExplorerTab) return <ExplorerWorkspaceContent activeTab={activeExplorerTab} />;

  return <CalendarScheduleScreen />;
};

export { ScheduleScreen };
