import { useCallback, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import { areExplorerBreadcrumbContextsEqual, EMPTY_EXPLORER_BREADCRUMB_CONTEXT, type BreadcrumbCrumb, type ExplorerBreadcrumbContext } from "@/features/breadcrumbs/breadcrumbs.types";
import { buildFolderPathCrumbs } from "@/features/breadcrumbs/builders";
import { WorkspaceBreadcrumbs } from "@/features/breadcrumbs/components/WorkspaceBreadcrumbs";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { SettingsWorkspaceDialog } from "@/features/settings/SettingsWorkspaceDialog";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { useSetBreadcrumbCrumbs } from "@/contexts/BreadcrumbContext";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { useDocumentsRead } from "@/hooks/platform/useDocumentsRead";
import type { AppLayoutOutletContext } from "@/layout/AppLayout";
import { Sidebar } from "@/pane.desktop/leftpane/Sidebar.desktop";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";
import "@/pane.desktop/leftpane/sidebar.layered-directory.css";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { WorkspaceExplorerTab, WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";
import type { DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { Search } from "@/ui/icons";
import { ScheduleScreen as CalendarScheduleScreen } from "./ScheduleScreen.desktop";
import { WorkspaceActionToolbar } from "./WorkspaceActionToolbar";

type ExplorerWorkspaceContentProps = {
  explorerState: ExplorerRouteState;
  explorerTabId: WorkspaceExplorerTab["id"] | null;
  isLeftPanelCollapsed: boolean;
  onOpenSettings: () => void;
  onToggleLeftPanel: () => void;
};

type SidebarInteractionRegionStyle = CSSProperties & {
  WebkitAppRegion?: "no-drag";
};

type SidebarInteractionRegionProps = {
  children: ReactNode;
};

type SettingsDialogHostProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FOLDER_TAB_SEARCH_TRIGGER_CLASS_NAME = "absolute right-4 top-3 z-30 flex h-8 w-[220px] shrink-0 items-center gap-1.5 rounded-[9px] border border-[rgba(0,0,0,0.04)] bg-[#efeeee]/95 px-2.5 text-left text-[12px] font-medium leading-none tracking-[-0.012em] text-[#85827e] shadow-none outline-none ring-0 backdrop-blur-xl transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[rgba(0,0,0,0.04)] hover:bg-[#eeeeee] hover:text-[#2f343b] active:scale-[0.99] focus:outline-none focus:ring-0 focus-visible:bg-[#eeeeee] focus-visible:text-[#2f343b] motion-reduce:transition-none motion-reduce:active:scale-100";
const FOLDER_TAB_SEARCH_SHORTCUT_CLASS_NAME = "ml-auto flex h-5 min-w-[31px] items-center justify-center rounded-[5px] border border-[rgba(0,0,0,0.04)] bg-[#eeeeee] px-1.5 text-[10px] font-semibold leading-none tracking-[-0.02em] text-[#85827e]";
const WORKSPACE_ACTION_TOOLBAR_CLASS_NAME = "absolute z-30";
const WORKSPACE_ACTION_TOOLBAR_STYLE = { right: "252px", top: "12px" };
const WORKSPACE_DOCUMENT_BREADCRUMBS_CLASS_NAME = "max-w-[calc(100%-96px)]";
const WORKSPACE_MAIN_CONTENT_CLASS_NAME = "relative z-0 isolate min-h-0 min-w-0 flex-1";
const WORKSPACE_MAIN_PANEL_CLASS_NAME = "relative z-0 isolate min-w-0";
const SIDEBAR_INTERACTION_REGION_STYLE: SidebarInteractionRegionStyle = { WebkitAppRegion: "no-drag" };

const getDocumentBreadcrumbLabel = (document: DocumentItem): string => document.title.trim() || document.fileName.trim() || "PDF";

const buildWorkspaceBreadcrumbCrumbs = (context: ExplorerBreadcrumbContext, folders: Folder[], selectedDocument: DocumentItem | null): BreadcrumbCrumb[] => {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const crumbs = buildFolderPathCrumbs({ folderId: context.folderId, folderById });

  if (context.cardSet) {
    crumbs.push({ label: context.cardSet.label });
  }

  if (selectedDocument) {
    crumbs.push({ label: getDocumentBreadcrumbLabel(selectedDocument) });
  }

  return crumbs;
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

const SidebarInteractionRegion = ({ children }: SidebarInteractionRegionProps) => {
  return (
    <div className="pointer-events-auto relative z-[80] flex h-full min-h-0 shrink-0" style={SIDEBAR_INTERACTION_REGION_STYLE}>
      {children}
    </div>
  );
};

const SettingsDialogHost = ({ children, open, onOpenChange }: SettingsDialogHostProps) => {
  return (
    <>
      {children}
      <SettingsWorkspaceDialog open={open} onOpenChange={onOpenChange} />
    </>
  );
};

const ExplorerWorkspaceContent = ({ explorerState, explorerTabId, isLeftPanelCollapsed, onOpenSettings, onToggleLeftPanel }: ExplorerWorkspaceContentProps) => {
  const { folders, loading, error } = useFoldersRead();
  const openSearch = useSearchStore((state) => state.open);
  const setExtraCrumbs = useSetBreadcrumbCrumbs();
  const updateExplorerTabState = useWorkspaceTabsStore((state) => state.updateExplorerTabState);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const selectedCardId = useMemo(() => getSelectedCardId(explorerState.selectedItem), [explorerState.selectedItem]);
  const selectedDocumentId = useMemo(() => getSelectedDocumentId(explorerState.selectedItem), [explorerState.selectedItem]);
  const { documents } = useDocumentsRead(undefined, { enabled: selectedDocumentId !== null });
  const selectedDocument = useMemo(() => selectedDocumentId ? (documents.find((document) => document.id === selectedDocumentId) ?? null) : null, [documents, selectedDocumentId]);
  const showWorkspaceBreadcrumbs = !loading && !error;
  const showWorkspaceActions = selectedDocumentId === null && !loading && !error;
  const [explorerBreadcrumbContext, setExplorerBreadcrumbContext] = useState<ExplorerBreadcrumbContext>(EMPTY_EXPLORER_BREADCRUMB_CONTEXT);
  const extraCrumbs = useMemo(() => buildWorkspaceBreadcrumbCrumbs(explorerBreadcrumbContext, folders, selectedDocument), [explorerBreadcrumbContext, folders, selectedDocument]);

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

  const handleBreadcrumbContextChange = useCallback((context: ExplorerBreadcrumbContext) => {
    setExplorerBreadcrumbContext((currentContext) => areExplorerBreadcrumbContextsEqual(currentContext, context) ? currentContext : context);
  }, []);

  useLayoutEffect(() => {
    setExtraCrumbs(extraCrumbs);
  }, [extraCrumbs, setExtraCrumbs]);

  useLayoutEffect(() => {
    return () => {
      setExtraCrumbs([]);
    };
  }, [setExtraCrumbs]);

  return (
    <div className="relative isolate flex h-full min-h-0 w-full overflow-hidden bg-transparent">
      <SidebarInteractionRegion>
        {isLeftPanelCollapsed ? <Sidebar isLeftPanelCollapsed={isLeftPanelCollapsed} onOpenSettings={onOpenSettings} onToggleLeftPanel={onToggleLeftPanel} /> : <SidebarLayeredDirectory onOpenSettings={onOpenSettings} onToggleLeftPanel={onToggleLeftPanel} />}
      </SidebarInteractionRegion>
      <CarvePanel className={WORKSPACE_MAIN_PANEL_CLASS_NAME}>
        {loading ? <div className="h-full w-full bg-white" /> : error ? <div className="h-full w-full bg-white p-4 text-[12px] text-[#b48a8a]">{error}</div> : <TreeViewLayout folders={folders} isSectionListMode={explorerState.isSectionListMode} selectedFolderId={explorerState.selectedFolderId} selectedItem={explorerState.selectedItem} selectedCardId={selectedCardId} selectedDocumentId={selectedDocumentId} onFolderSelect={handleFolderSelect} onItemSelect={handleItemSelect} onCardUpdated={() => undefined} onBreadcrumbContextChange={handleBreadcrumbContextChange} folderSelectionNonce={0} navigateToSectionListToken={0} />}
        {showWorkspaceBreadcrumbs ? <WorkspaceBreadcrumbs className={selectedDocumentId ? WORKSPACE_DOCUMENT_BREADCRUMBS_CLASS_NAME : undefined} /> : null}
        {showWorkspaceActions ? <WorkspaceActionToolbar className={WORKSPACE_ACTION_TOOLBAR_CLASS_NAME} style={WORKSPACE_ACTION_TOOLBAR_STYLE} /> : null}
        {showWorkspaceActions ? (
          <button type="button" className={FOLDER_TAB_SEARCH_TRIGGER_CLASS_NAME} aria-label="検索を開く" aria-keyshortcuts="Meta+K Control+K" title="検索を開く" onClick={handleOpenSearch}>
            <Search className="h-3.5 w-3.5 shrink-0 text-[#85827e]" />
            <span className="min-w-0 truncate">Search in Workspace...</span>
            <kbd className={FOLDER_TAB_SEARCH_SHORTCUT_CLASS_NAME}>⌘K</kbd>
          </button>
        ) : null}
      </CarvePanel>
    </div>
  );
};

const WorkspaceScreen = () => {
  const { isLeftPanelCollapsed = false, onToggleLeftPanel } = useOutletContext<AppLayoutOutletContext>();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const libraryExplorerState = useMemo(() => getLibraryExplorerState(activeTab), [activeTab]);
  const explorerTabId = useMemo(() => getExplorerTabId(activeTab), [activeTab]);
  const handleOpenSettings = useCallback(() => setIsSettingsDialogOpen(true), []);

  if (libraryExplorerState) return <SettingsDialogHost open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}><ExplorerWorkspaceContent explorerState={libraryExplorerState} explorerTabId={explorerTabId} isLeftPanelCollapsed={isLeftPanelCollapsed} onOpenSettings={handleOpenSettings} onToggleLeftPanel={onToggleLeftPanel} /></SettingsDialogHost>;

  if (isLeftPanelCollapsed) {
    return (
      <SettingsDialogHost open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <div className="relative isolate flex h-full min-h-0 w-full overflow-hidden bg-transparent">
          <SidebarInteractionRegion>
            <Sidebar isLeftPanelCollapsed={isLeftPanelCollapsed} onOpenSettings={handleOpenSettings} onToggleLeftPanel={onToggleLeftPanel} />
          </SidebarInteractionRegion>
          <div className={WORKSPACE_MAIN_CONTENT_CLASS_NAME}>
            <CalendarScheduleScreen isLeftPanelCollapsed={isLeftPanelCollapsed} />
          </div>
        </div>
      </SettingsDialogHost>
    );
  }

  return (
    <SettingsDialogHost open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
      <div className="relative h-full min-h-0 w-full overflow-hidden">
        <CalendarScheduleScreen isLeftPanelCollapsed={isLeftPanelCollapsed} />
      </div>
    </SettingsDialogHost>
  );
};

export { WorkspaceScreen };
