import "@/pane.desktop/leftpane/sidebar.layered-directory.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { HotkeyBadge } from "@web-renderer/chip/budge/Budge.hotkey";
import { Search } from "@web-renderer/chip/icons";
import { SidebarOpenIcon } from "@web-renderer/chip/icons/icons.sidebar";
import { SettingsWorkspaceDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.SettingsWorkspace";
import { CarvePanel } from "@web-renderer/chip/panel/panel/CarvePanel.desktop";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { NoteDocumentEditor } from "@/components/note/NoteDocumentEditor";
import { useSetBreadcrumbCrumbs } from "@/contexts/BreadcrumbContext";
import type { BreadcrumbCrumb, ExplorerBreadcrumbContext } from "@/features/breadcrumbs/breadcrumbs.types";
import { areExplorerBreadcrumbContextsEqual, EMPTY_EXPLORER_BREADCRUMB_CONTEXT } from "@/features/breadcrumbs/breadcrumbs.types";
import { buildFolderPathCrumbs } from "@/features/breadcrumbs/builders";
import { WorkspaceBreadcrumbs } from "@/features/breadcrumbs/components/WorkspaceBreadcrumbs";
import { useDocumentsRead } from "@/features/document/hooks/useDocumentsRead";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { useFoldersRead } from "@/features/folder/hooks/useFoldersRead";
import { useNotes } from "@/features/note/hooks/useNotes";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import type { AppLayoutOutletContext } from "@/layout/AppLayout";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { WorkspaceExplorerTab, WorkspaceNoteTab, WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";
import { MobileCalendarSidebar, MobileCalendarSidebarOpenButton } from "./MobileCalendarSidebar";
import { ScheduleScreen as CalendarScheduleScreen } from "./Screen.Schedule.desktop";
import { WorkspaceActionToolbar } from "./WorkspaceActionToolbar";
import type { DocumentItem, Folder, Note, SelectedExplorerItem } from "@/types";



type ExplorerWorkspaceContentProps = {
  explorerState: ExplorerRouteState;
  explorerTabId: WorkspaceExplorerTab["id"] | null;
  isLeftPanelCollapsed: boolean;
  onOpenSettings: () => void;
  onToggleLeftPanel: () => void;
};
type NoteWorkspaceContentProps = {
  noteTab: WorkspaceNoteTab;
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
type CollapsedSidebarToggleProps = {
  isVisible: boolean;
  onToggleLeftPanel: () => void;
};
type SettingsDialogHostProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};



const MOBILE_WORKSPACE_MEDIA_QUERY = "(max-width: 767px)";
const MOBILE_WORKSPACE_SIDEBAR_OPEN_BUTTON_CLASS_NAME = "pointer-events-auto absolute left-3 top-3 z-[90] flex h-10 w-10 items-center justify-center bg-transparent p-0 text-neutral-950 outline-none transition hover:text-neutral-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1d1d6]";
const MOBILE_WORKSPACE_MAIN_PANEL_CLASS_NAME = "!rounded-none !border-0 !shadow-none";
const COLLAPSED_SIDEBAR_TOGGLE_CLASS_NAME = "pointer-events-auto absolute left-3 top-3 z-[90] flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.82)] p-0 text-[#8c8c8c] shadow-[0_1px_2px_rgba(15,23,42,0.08)] outline-none backdrop-blur-xl transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-[#2f343b] active:scale-[0.97] focus:outline-none focus:ring-0 focus-visible:bg-slate-100 focus-visible:text-[#2f343b] motion-reduce:transition-none motion-reduce:active:scale-100";
const COLLAPSED_SIDEBAR_TOGGLE_ICON_CLASS_NAME = "h-5 w-5 shrink-0 [transform:scaleX(-1)]";
const FOLDER_TAB_SEARCH_TRIGGER_CLASS_NAME = "absolute right-4 top-3 z-30 flex h-8 w-56 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.04)] bg-[#efeeee]/95 px-2.5 text-left text-xs font-medium leading-none tracking-tight text-[#85827e] shadow-none outline-none ring-0 backdrop-blur-xl transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[rgba(0,0,0,0.04)] hover:bg-slate-100 hover:text-[#2f343b] active:scale-[0.99] focus:outline-none focus:ring-0 focus-visible:bg-slate-100 focus-visible:text-[#2f343b] motion-reduce:transition-none motion-reduce:active:scale-100";
const WORKSPACE_ACTION_TOOLBAR_CLASS_NAME = "absolute z-30";
const WORKSPACE_ACTION_TOOLBAR_STYLE = { right: "252px", top: "12px" };
const WORKSPACE_DOCUMENT_BREADCRUMBS_CLASS_NAME = "max-w-[calc(100%-96px)]";
const WORKSPACE_MAIN_PANEL_CLASS_NAME = "relative z-0 isolate min-w-0";
const SIDEBAR_INTERACTION_REGION_STYLE: SidebarInteractionRegionStyle = { WebkitAppRegion: "no-drag" };



const getDocumentBreadcrumbLabel = (document: DocumentItem): string => (document.title.trim() || document.fileName.trim()) ?? "PDF";
const getNoteBreadcrumbLabel = (note: Note): string => note.title.trim() ?? "ノート";
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
const buildNoteBreadcrumbCrumbs = (folders: Folder[], note: Note | null): BreadcrumbCrumb[] => {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const crumbs = buildFolderPathCrumbs({ folderId: note?.folderId ?? null, folderById });
  if (note) {
    crumbs.push({ label: getNoteBreadcrumbLabel(note) });
  }
  return crumbs;
};
const createFolderRouteState = (folderId: string | null): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: folderId, selectedItem: null });
const createItemRouteState = (current: ExplorerRouteState, item: SelectedExplorerItem): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: current.selectedFolderId, selectedItem: item });
const getSelectedCardId = (item: SelectedExplorerItem): string | null => item?.type === "card" ? item.id : null;
const getSelectedDocumentId = (item: SelectedExplorerItem): string | null => item?.type === "document" ? item.id : null;
const createDocumentRouteState = (tab: Extract<WorkspaceTab, { kind: "document"; }>): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: tab.folderId, selectedItem: { type: "document", id: tab.documentId } });
const createCardRouteState = (tab: Extract<WorkspaceTab, { kind: "card"; }>): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: tab.folderId, selectedItem: { type: "card", id: tab.cardId } });
const getLibraryExplorerState = (tab: WorkspaceTab | null): ExplorerRouteState | null => {
  if (!tab || tab.sectionKey !== "library") return null;
  if (tab.kind === "note") return null;
  if (tab.kind === "explorer") return tab.explorerState;
  if (tab.kind === "document") return createDocumentRouteState(tab);
  if (tab.kind === "card") return createCardRouteState(tab);
  return createFolderRouteState(null);
};
const getExplorerTabId = (tab: WorkspaceTab | null): WorkspaceExplorerTab["id"] | null => {
  return tab?.kind === "explorer" ? tab.id : null;
};
const getNoteTab = (tab: WorkspaceTab | null): WorkspaceNoteTab | null => {
  return tab?.kind === "note" ? tab : null;
};
const readIsMobileWorkspaceViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_WORKSPACE_MEDIA_QUERY).matches;
};
const joinClassNames = (...classNames: Array<string | false | null | undefined>): string => classNames.filter(Boolean).join(" ");
const useIsMobileWorkspaceViewport = (): boolean => {
  const [isMobileWorkspaceViewport, setIsMobileWorkspaceViewport] = useState(readIsMobileWorkspaceViewport);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQueryList = window.matchMedia(MOBILE_WORKSPACE_MEDIA_QUERY);
    const handleChange = () => setIsMobileWorkspaceViewport(mediaQueryList.matches);
    handleChange();
    mediaQueryList.addEventListener("change", handleChange);
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);
  return isMobileWorkspaceViewport;
};



const SidebarInteractionRegion = ({ children }: SidebarInteractionRegionProps) => {
  return (
    <div className="pointer-events-auto relative z-[80] flex h-full min-h-0 shrink-0" style={SIDEBAR_INTERACTION_REGION_STYLE}>
      {children}
    </div>
  );
};
const CollapsedSidebarToggle = ({ isVisible, onToggleLeftPanel }: CollapsedSidebarToggleProps) => {
  if (!isVisible) return null;
  return (
    <button type="button" className={COLLAPSED_SIDEBAR_TOGGLE_CLASS_NAME} onClick={onToggleLeftPanel} aria-label="サイドバーを開く" title="サイドバーを開く">
      <SidebarOpenIcon className={COLLAPSED_SIDEBAR_TOGGLE_ICON_CLASS_NAME} />
    </button>
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
  const isMobileWorkspace = useIsMobileWorkspaceViewport();
  const openSearch = useSearchStore((state) => state.open);
  const setExtraCrumbs = useSetBreadcrumbCrumbs();
  const updateExplorerTabState = useWorkspaceTabsStore((state) => state.updateExplorerTabState);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const selectedCardId = useMemo(() => getSelectedCardId(explorerState.selectedItem), [explorerState.selectedItem]);
  const selectedDocumentId = useMemo(() => getSelectedDocumentId(explorerState.selectedItem), [explorerState.selectedItem]);
  const { documents } = useDocumentsRead(undefined, { enabled: selectedDocumentId !== null });
  const selectedDocument = useMemo(() => selectedDocumentId ? (documents.find((document: DocumentItem) => document.id === selectedDocumentId) ?? null) : null, [documents, selectedDocumentId]);
  const showWorkspaceBreadcrumbs = !loading && !error;
  const showWorkspaceActions = selectedDocumentId === null && !loading && !error;
  const [explorerBreadcrumbContext, setExplorerBreadcrumbContext] = useState<ExplorerBreadcrumbContext>(EMPTY_EXPLORER_BREADCRUMB_CONTEXT);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const extraCrumbs = useMemo(() => buildWorkspaceBreadcrumbCrumbs(explorerBreadcrumbContext, folders, selectedDocument), [explorerBreadcrumbContext, folders, selectedDocument]);
  const handleOpenSearch = useCallback(() => {
    openSearch();
  }, [openSearch]);
  const handleOpenMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);
  const handleCloseMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);
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
  useEffect(() => {
    if (isMobileWorkspace) return;
    setIsMobileSidebarOpen(false);
  }, [isMobileWorkspace]);
  const mainPanelClassName = joinClassNames(WORKSPACE_MAIN_PANEL_CLASS_NAME, isMobileWorkspace && MOBILE_WORKSPACE_MAIN_PANEL_CLASS_NAME);
  return (
    <div className="relative isolate flex h-full min-h-0 w-full overflow-hidden bg-transparent">
      {isMobileWorkspace ? (
        <>
          <MobileCalendarSidebarOpenButton isOpen={isMobileSidebarOpen} onOpen={handleOpenMobileSidebar} className={MOBILE_WORKSPACE_SIDEBAR_OPEN_BUTTON_CLASS_NAME} />
          <MobileCalendarSidebar isOpen={isMobileSidebarOpen} onClose={handleCloseMobileSidebar} onOpenSettings={onOpenSettings} />
        </>
      ) : (
        <>
          <CollapsedSidebarToggle isVisible={isLeftPanelCollapsed} onToggleLeftPanel={onToggleLeftPanel} />
          {isLeftPanelCollapsed ? null : (
            <SidebarInteractionRegion>
              <SidebarLayeredDirectory onOpenSettings={onOpenSettings} onToggleLeftPanel={onToggleLeftPanel} />
            </SidebarInteractionRegion>
          )}
        </>
      )}
      <CarvePanel className={mainPanelClassName}>
        {loading ? <div className="h-full w-full bg-white" /> : error ? <div className="h-full w-full bg-white p-4 text-xs text-[#b48a8a]">{error}</div> : <TreeViewLayout folders={folders} isSectionListMode={explorerState.isSectionListMode} selectedFolderId={explorerState.selectedFolderId} selectedItem={explorerState.selectedItem} selectedCardId={selectedCardId} selectedDocumentId={selectedDocumentId} onFolderSelect={handleFolderSelect} onItemSelect={handleItemSelect} onCardUpdated={() => undefined} onBreadcrumbContextChange={handleBreadcrumbContextChange} folderSelectionNonce={0} navigateToSectionListToken={0} />}
        {showWorkspaceBreadcrumbs ? <WorkspaceBreadcrumbs className={selectedDocumentId ? WORKSPACE_DOCUMENT_BREADCRUMBS_CLASS_NAME : undefined} isLeftPanelCollapsed={isLeftPanelCollapsed} /> : null}
        {showWorkspaceActions ? <WorkspaceActionToolbar className={WORKSPACE_ACTION_TOOLBAR_CLASS_NAME} style={WORKSPACE_ACTION_TOOLBAR_STYLE} /> : null}
        {showWorkspaceActions && !isMobileWorkspace ? (
          <button type="button" className={FOLDER_TAB_SEARCH_TRIGGER_CLASS_NAME} aria-label="検索を開く" aria-keyshortcuts="Meta+K Control+K" title="検索を開く" onClick={handleOpenSearch}>
            <Search className="h-3.5 w-3.5 shrink-0 text-[#85827e]" />
            <span className="min-w-0 truncate">Search in Workspace...</span>
            <HotkeyBadge />
          </button>
        ) : null}
      </CarvePanel>
    </div>
  );
};
const NoteWorkspaceContent = ({ noteTab, isLeftPanelCollapsed, onOpenSettings, onToggleLeftPanel }: NoteWorkspaceContentProps) => {
  const { folders, loading: foldersLoading, error: foldersError } = useFoldersRead();
  const { notes, loading: notesLoading, updateNote } = useNotes();
  const isMobileWorkspace = useIsMobileWorkspaceViewport();
  const setExtraCrumbs = useSetBreadcrumbCrumbs();
  const updateTabTitle = useWorkspaceTabsStore((state) => state.updateTabTitle);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const note = useMemo(() => notes.find((item) => item.id === noteTab.noteId) ?? null, [noteTab.noteId, notes]);
  const extraCrumbs = useMemo(() => buildNoteBreadcrumbCrumbs(folders, note), [folders, note]);
  const mainPanelClassName = joinClassNames(WORKSPACE_MAIN_PANEL_CLASS_NAME, isMobileWorkspace && MOBILE_WORKSPACE_MAIN_PANEL_CLASS_NAME);
  const isLoading = foldersLoading || notesLoading;
  const handleOpenMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);
  const handleCloseMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);
  const handleNoteChange = useCallback((changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => {
    void updateNote(noteTab.noteId, changes);
  }, [noteTab.noteId, updateNote]);
  useLayoutEffect(() => {
    setExtraCrumbs(extraCrumbs);
  }, [extraCrumbs, setExtraCrumbs]);
  useLayoutEffect(() => {
    return () => {
      setExtraCrumbs([]);
    };
  }, [setExtraCrumbs]);
  useEffect(() => {
    if (!note) return;
    updateTabTitle(noteTab.id, getNoteBreadcrumbLabel(note));
  }, [note, noteTab.id, updateTabTitle]);
  useEffect(() => {
    if (isMobileWorkspace) return;
    setIsMobileSidebarOpen(false);
  }, [isMobileWorkspace]);
  return (
    <div className="relative isolate flex h-full min-h-0 w-full overflow-hidden bg-transparent">
      {isMobileWorkspace ? (
        <>
          <MobileCalendarSidebarOpenButton isOpen={isMobileSidebarOpen} onOpen={handleOpenMobileSidebar} className={MOBILE_WORKSPACE_SIDEBAR_OPEN_BUTTON_CLASS_NAME} />
          <MobileCalendarSidebar isOpen={isMobileSidebarOpen} onClose={handleCloseMobileSidebar} onOpenSettings={onOpenSettings} />
        </>
      ) : (
        <>
          <CollapsedSidebarToggle isVisible={isLeftPanelCollapsed} onToggleLeftPanel={onToggleLeftPanel} />
          {isLeftPanelCollapsed ? null : (
            <SidebarInteractionRegion>
              <SidebarLayeredDirectory onOpenSettings={onOpenSettings} onToggleLeftPanel={onToggleLeftPanel} />
            </SidebarInteractionRegion>
          )}
        </>
      )}
      <CarvePanel className={mainPanelClassName}>
        {isLoading ? <div className="h-full w-full bg-white" /> : foldersError ? <div className="h-full w-full bg-white p-4 text-xs text-[#b48a8a]">{foldersError}</div> : note ? <NoteDocumentEditor note={note} onChange={handleNoteChange} /> : <div className="h-full w-full bg-white p-4 text-xs text-[#8a8a8a]">ノートが見つかりません</div>}
        {!isLoading && !foldersError ? <WorkspaceBreadcrumbs className={WORKSPACE_DOCUMENT_BREADCRUMBS_CLASS_NAME} isLeftPanelCollapsed={isLeftPanelCollapsed} /> : null}
      </CarvePanel>
    </div>
  );
};
const WorkspaceScreen = () => {
  const { isLeftPanelCollapsed = false, onToggleLeftPanel } = useOutletContext<AppLayoutOutletContext>();
  const navigate = useNavigate();
  const isMobileWorkspace = useIsMobileWorkspaceViewport();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const noteTab = useMemo(() => getNoteTab(activeTab), [activeTab]);
  const libraryExplorerState = useMemo(() => getLibraryExplorerState(activeTab), [activeTab]);
  const explorerTabId = useMemo(() => getExplorerTabId(activeTab), [activeTab]);
  const handleOpenSettings = useCallback(() => {
    if (isMobileWorkspace) {
      setIsSettingsDialogOpen(false);
      navigate("/settings");
      return;
    }
    setIsSettingsDialogOpen(true);
  }, [isMobileWorkspace, navigate]);
  if (noteTab) return <SettingsDialogHost open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}><NoteWorkspaceContent noteTab={noteTab} isLeftPanelCollapsed={isLeftPanelCollapsed} onOpenSettings={handleOpenSettings} onToggleLeftPanel={onToggleLeftPanel} /></SettingsDialogHost>;
  if (libraryExplorerState) return <SettingsDialogHost open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}><ExplorerWorkspaceContent explorerState={libraryExplorerState} explorerTabId={explorerTabId} isLeftPanelCollapsed={isLeftPanelCollapsed} onOpenSettings={handleOpenSettings} onToggleLeftPanel={onToggleLeftPanel} /></SettingsDialogHost>;
  return (
    <SettingsDialogHost open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
      <div className="relative h-full min-h-0 w-full overflow-hidden">
        <CollapsedSidebarToggle isVisible={isLeftPanelCollapsed} onToggleLeftPanel={onToggleLeftPanel} />
        <CalendarScheduleScreen isLeftPanelCollapsed={isLeftPanelCollapsed} />
      </div>
    </SettingsDialogHost>
  );
};



export { WorkspaceScreen };
