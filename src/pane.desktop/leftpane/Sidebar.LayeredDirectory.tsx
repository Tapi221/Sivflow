import { useCallback, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from "react";
import { CalendarIcon, GalleryIcon, HomeIcon, SettingIcon, SidebarOpenIcon } from "@/chip/icons/icons.sidebar";
import { RightClickPanelSurface } from "@/chip/rightclickpanel.desktop/rightClickPanelCommon";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, resolveRightClickPanelTextWidth, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { DEFAULT_NEW_FOLDER_NAME, DEFAULT_NEW_PROJECT_NAME, getFolderId, getParentFolderId, type FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { useFolderTagModeStore } from "@/hooks/folder/useFolderTagModeStore";
import { LibraryHierarchySidebar, ProjectListSidebar } from "@/pane.desktop/leftpane/folder/LayeredDirectorySidebar";
import { TagTreeSidebar } from "@/pane.desktop/leftpane/folder/TagTreeSidebar";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { StratisTagIcon } from "@/ui/icons/stratis";

type IconProps = {
  className?: string;
};

type ProjectAddMenuActionId = "create-folder" | "import-pdf";

type ProjectAddMenuItemDefinition = {
  id: ProjectAddMenuActionId;
  label: string;
};

type ProjectAddMenuState = {
  x: number;
  y: number;
};

type ProjectAddMenuProps = {
  x: number;
  y: number;
  menuRef: RefObject<HTMLDivElement | null>;
  onCreateFolder: () => void;
  onImportPdf: () => void;
};

type SidebarLayeredDirectoryProps = {
  calendarContent?: ReactNode;
  onToggleLeftPanel?: () => void;
};

const WORKSPACE_OWNER_FALLBACK_NAME = "Akari T";
const WORKSPACE_NAME_SUFFIX = "のWorkspace";
const WORKSPACE_AVATAR_FALLBACK = "A";
const WORKSPACE_HOME_LABEL = "ホーム";
const WORKSPACE_LIBRARY_LABEL = "ライブラリ";
const WORKSPACE_TAGS_LABEL = "タグ";
const WORKSPACE_SCHEDULE_LABEL = "カレンダー";
const WORKSPACE_EXPLORE_LABEL = "Explore";
const WORKSPACE_SETTINGS_LABEL = "設定";
const FAVORITE_SECTION_LABEL = "お気に入り";
const FAVORITE_EMPTY_MESSAGE = "プロジェクトをお気に入りに追加すると、ここからすぐ開けます";
const PROJECT_SECTION_LABEL = "プロジェクト";
const TAG_SECTION_LABEL = "タグツリー";
const ADD_PROJECT_ARIA_LABEL = "プロジェクトを追加";
const ADD_PROJECT_CONTENT_ARIA_LABEL = "プロジェクトに追加";
const PROJECT_ADD_MENU_PANEL_ID = "layered-project-add-menu";
const PROJECT_ADD_MENU_ITEM_DEFINITIONS: readonly ProjectAddMenuItemDefinition[] = [
  { id: "create-folder", label: "新規フォルダ" },
  { id: "import-pdf", label: "PDFを追加" },
];
const PROJECT_ADD_MENU_WIDTH = resolveRightClickPanelTextWidth(PROJECT_ADD_MENU_ITEM_DEFINITIONS.map((item) => item.label), 132);
const PROJECT_ADD_MENU_HEIGHT = PROJECT_ADD_MENU_ITEM_DEFINITIONS.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
const EMPTY_COLLECTION: never[] = [];

const IconPlus = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" className={className}><path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>);
const IconChevronDown = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" className={className}><path d="M4 6.25L8 10.25L12 6.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);

const getFolderName = (folder: FolderTreeNode): string => {
  const name = folder.folderName ?? folder.folder_name;
  return typeof name === "string" && name.trim() ? name.trim() : "無題のフォルダ";
};

const getWorkspaceOwnerName = (displayName: string | null | undefined, email: string | null | undefined): string => {
  const trimmedDisplayName = displayName?.trim();
  if (trimmedDisplayName) return trimmedDisplayName;

  const emailLocalPart = email?.split("@")[0]?.trim();
  if (emailLocalPart) return emailLocalPart;

  return WORKSPACE_OWNER_FALLBACK_NAME;
};

const getWorkspaceInitial = (workspaceOwnerName: string): string => {
  const initial = workspaceOwnerName.trim().charAt(0);
  return initial ? initial.toUpperCase() : WORKSPACE_AVATAR_FALLBACK;
};

const ProjectAddMenu = ({ x, y, menuRef, onCreateFolder, onImportPdf }: ProjectAddMenuProps) => {
  const handleItemClick = (event: ReactMouseEvent<HTMLButtonElement>, id: ProjectAddMenuActionId) => {
    event.preventDefault();
    event.stopPropagation();

    if (id === "create-folder") {
      onCreateFolder();
      return;
    }

    onImportPdf();
  };

  return (
    <RightClickPanelSurface x={x} y={y} width={PROJECT_ADD_MENU_WIDTH} panelRef={menuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} ariaLabel="project add menu" panelId={PROJECT_ADD_MENU_PANEL_ID}>
      {PROJECT_ADD_MENU_ITEM_DEFINITIONS.map((item) => (
        <button key={item.id} type="button" className="right-click-panel-item" role="menuitem" onClick={(event) => handleItemClick(event, item.id)}>
          <span>{item.label}</span>
        </button>
      ))}
    </RightClickPanelSurface>
  );
};

const getProjectAddMenuPosition = (event: ReactMouseEvent<HTMLElement>): ProjectAddMenuState => {
  const rect = event.currentTarget.getBoundingClientRect();
  return clampRightClickPanelPosition(rect.right - PROJECT_ADD_MENU_WIDTH, rect.bottom + 6, { width: PROJECT_ADD_MENU_WIDTH, height: PROJECT_ADD_MENU_HEIGHT });
};

const resolveRootProjectId = (folderId: string | null | undefined, folderById: ReadonlyMap<string, FolderTreeNode>, rootFolderIds: ReadonlySet<string>): string | null => {
  if (!folderId) return null;

  let currentId: string | null = folderId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    if (rootFolderIds.has(currentId)) return currentId;
    visited.add(currentId);
    const folder = folderById.get(currentId);
    if (!folder) return null;
    currentId = getParentFolderId(folder);
  }

  return null;
};

const SidebarLayeredDirectory = ({ calendarContent, onToggleLeftPanel }: SidebarLayeredDirectoryProps) => {
  const { currentUser } = useAuthSession();
  const folderTagMode = useFolderTagModeStore((state) => state.folderTagMode);
  const setFolderTagMode = useFolderTagModeStore((state) => state.setFolderTagMode);
  const { createFolder } = useFolderCommands();
  const { folders } = useFoldersRead();
  const openSearch = useSearchStore((state) => state.open);
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const openSectionTab = useWorkspaceTabsStore((state) => state.openSectionTab);
  const [, setProjectAddExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const projectAddMenuRef = useRef<HTMLDivElement | null>(null);
  const [projectAddMenu, setProjectAddMenu] = useState<ProjectAddMenuState | null>(null);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const treeFolders = useMemo(() => folders as FolderTreeNode[], [folders]);
  const { rootFolders, getNextOrderIndex } = useExplorerDerivedData({ treeFolders, treeCards: EMPTY_COLLECTION, cardSets: EMPTY_COLLECTION, documents: EMPTY_COLLECTION, isFiltering: false });
  const folderById = useMemo(() => {
    const map = new Map<string, FolderTreeNode>();
    treeFolders.forEach((folder) => {
      const folderId = getFolderId(folder);
      if (folderId) map.set(folderId, folder);
    });
    return map;
  }, [treeFolders]);
  const rootFolderIds = useMemo(() => new Set(rootFolders.map(getFolderId).filter(Boolean)), [rootFolders]);
  const selectedFolderId = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedFolderId : null;
  const selectedProjectId = useMemo(() => resolveRootProjectId(selectedFolderId, folderById, rootFolderIds), [folderById, rootFolderIds, selectedFolderId]);
  const selectedProject = selectedProjectId ? folderById.get(selectedProjectId) ?? null : null;
  const sectionLabel = folderTagMode === "tag" ? TAG_SECTION_LABEL : selectedProject ? getFolderName(selectedProject) : PROJECT_SECTION_LABEL;
  const shouldShowFavoriteSection = folderTagMode !== "tag" && !selectedProject;
  const workspaceOwnerName = useMemo(() => getWorkspaceOwnerName(currentUser?.displayName, currentUser?.email), [currentUser?.displayName, currentUser?.email]);
  const workspaceName = `${workspaceOwnerName}${WORKSPACE_NAME_SUFFIX}`;
  const workspaceInitial = useMemo(() => getWorkspaceInitial(workspaceOwnerName), [workspaceOwnerName]);
  const isHomeActive = activeTab?.sectionKey === "home";
  const isFolderActive = activeTab?.sectionKey === "library" && folderTagMode === "folder";
  const isTagActive = activeTab?.sectionKey === "library" && folderTagMode === "tag";
  const isScheduleActive = activeTab?.sectionKey === "schedule";
  const isSettingsActive = activeTab?.sectionKey === "settings";
  const shouldShowCalendarContent = isScheduleActive && calendarContent !== undefined;
  const shouldShowDirectoryContent = !shouldShowCalendarContent;
  const { fileInputRef, handleToolbarAddDocument, currentFileAccept, handleToolbarFileInputChange } = useFolderDocumentUpload({ actionFolderId: selectedProjectId, getNextOrderIndex, setExpandedFolders: setProjectAddExpandedFolderIds });

  const closeProjectAddMenu = useCallback(() => {
    setProjectAddMenu(null);
  }, []);

  useRightClickPanelDismiss(PROJECT_ADD_MENU_PANEL_ID, projectAddMenu !== null, projectAddMenuRef, closeProjectAddMenu);

  const handleCreateRootFolder = useCallback(() => {
    void createFolder(DEFAULT_NEW_PROJECT_NAME);
  }, [createFolder]);

  const handleOpenHome = useCallback(() => {
    openSectionTab("home");
  }, [openSectionTab]);

  const handleOpenProjectList = useCallback(() => {
    setFolderTagMode("folder");
    openExplorerTab({ title: "Library", explorerState: { isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null } });
  }, [openExplorerTab, setFolderTagMode]);

  const handleOpenTagTree = useCallback(() => {
    setFolderTagMode("tag");
    openExplorerTab({ title: "Library", explorerState: { isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null } });
  }, [openExplorerTab, setFolderTagMode]);

  const handleOpenProjectAddMenu = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setProjectAddMenu(getProjectAddMenuPosition(event));
  }, []);

  const handleCreateProjectFolder = useCallback(() => {
    if (!selectedProjectId) return;
    closeProjectAddMenu();
    void createFolder(DEFAULT_NEW_FOLDER_NAME, selectedProjectId);
  }, [closeProjectAddMenu, createFolder, selectedProjectId]);

  const handleImportProjectPdf = useCallback(() => {
    handleToolbarAddDocument();
    closeProjectAddMenu();
  }, [closeProjectAddMenu, handleToolbarAddDocument]);

  const handleOpenSchedule = useCallback(() => {
    openSectionTab("schedule");
  }, [openSectionTab]);

  const handleOpenExplore = useCallback(() => {
    openSearch();
  }, [openSearch]);

  const handleOpenSettings = useCallback(() => {
    openSectionTab("settings");
  }, [openSectionTab]);

  return (
    <div className="app-layered-directory flex h-full min-h-0 w-[240px] shrink-0 flex-col overflow-hidden bg-transparent font-sans text-[var(--app-sidebar-text)] antialiased">
      <div className="app-layered-directory__primary-nav">
        <div className="app-layered-directory__workspace-header">
          <button type="button" className="app-layered-directory__workspace-toggle" onClick={onToggleLeftPanel} aria-label="サイドバーを閉じる" disabled={!onToggleLeftPanel}>
            <SidebarOpenIcon className="app-layered-directory__workspace-toggle-icon" />
          </button>
          <button type="button" className="app-layered-directory__workspace-button" onClick={handleOpenProjectList} aria-label={`${workspaceName}を開く`}>
            <span className="app-layered-directory__workspace-avatar" aria-hidden="true">{workspaceInitial}</span>
            <span className="app-layered-directory__workspace-name">{workspaceName}</span>
          </button>
        </div>
        <nav className="app-layered-directory__notion-nav" aria-label="ワークスペースナビゲーション">
          <button type="button" className={`app-layered-directory__notion-action${isHomeActive ? " is-active" : ""}`} onClick={handleOpenHome} aria-current={isHomeActive ? "page" : undefined} aria-label={WORKSPACE_HOME_LABEL} title={WORKSPACE_HOME_LABEL}>
            <HomeIcon className="app-layered-directory__notion-icon" />
          </button>
          <button type="button" className={`app-layered-directory__notion-action${isFolderActive ? " is-active" : ""}`} onClick={handleOpenProjectList} aria-current={isFolderActive ? "page" : undefined} aria-label={WORKSPACE_LIBRARY_LABEL} title={WORKSPACE_LIBRARY_LABEL}>
            <ExplorerChromeFolderIcon className="app-layered-directory__notion-icon" />
          </button>
          <button type="button" className={`app-layered-directory__notion-action${isTagActive ? " is-active" : ""}`} onClick={handleOpenTagTree} aria-current={isTagActive ? "page" : undefined} aria-label={WORKSPACE_TAGS_LABEL} title={WORKSPACE_TAGS_LABEL}>
            <StratisTagIcon className="app-layered-directory__notion-icon" />
          </button>
          <button type="button" className={`app-layered-directory__notion-action${isScheduleActive ? " is-active" : ""}`} onClick={handleOpenSchedule} aria-current={isScheduleActive ? "page" : undefined} aria-label={WORKSPACE_SCHEDULE_LABEL} title={WORKSPACE_SCHEDULE_LABEL}>
            <CalendarIcon className="app-layered-directory__notion-icon" />
          </button>
          <button type="button" className="app-layered-directory__notion-action" onClick={handleOpenExplore} aria-label={WORKSPACE_EXPLORE_LABEL} title={WORKSPACE_EXPLORE_LABEL}>
            <GalleryIcon className="app-layered-directory__notion-icon" />
          </button>
          <button type="button" className={`app-layered-directory__notion-action${isSettingsActive ? " is-active" : ""}`} onClick={handleOpenSettings} aria-current={isSettingsActive ? "page" : undefined} aria-label={WORKSPACE_SETTINGS_LABEL} title={WORKSPACE_SETTINGS_LABEL}>
            <SettingIcon className="app-layered-directory__notion-icon" />
          </button>
        </nav>
      </div>
      {shouldShowDirectoryContent ? (
        <>
          <div className="app-layered-directory__section-strip">
            {shouldShowFavoriteSection ? (
              <section className="app-layered-directory__section app-layered-directory__section--favorites" aria-label={FAVORITE_SECTION_LABEL}>
                <h2 className="app-layered-directory__section-heading">{FAVORITE_SECTION_LABEL}</h2>
                <p className="app-layered-directory__empty-message">{FAVORITE_EMPTY_MESSAGE}</p>
              </section>
            ) : null}
            <section className="app-layered-directory__section" aria-label={sectionLabel}>
              <div className="app-layered-directory__section-heading-row">
                {folderTagMode !== "tag" && selectedProject ? (
                  <button type="button" className="app-layered-directory__section-heading-button" onClick={handleOpenProjectList} aria-label="プロジェクト一覧を開く">
                    <span className="block truncate">{sectionLabel}</span>
                    <IconChevronDown className="app-layered-directory__section-chevron" />
                  </button>
                ) : (
                  <h2 className="app-layered-directory__section-heading">{sectionLabel}</h2>
                )}
                {folderTagMode !== "tag" ? (
                  <button type="button" onClick={selectedProject ? handleOpenProjectAddMenu : handleCreateRootFolder} aria-label={selectedProject ? ADD_PROJECT_CONTENT_ARIA_LABEL : ADD_PROJECT_ARIA_LABEL} title={selectedProject ? ADD_PROJECT_CONTENT_ARIA_LABEL : ADD_PROJECT_ARIA_LABEL} className="app-layered-directory__add-button">
                    <IconPlus className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </section>
          </div>
          <input ref={fileInputRef} type="file" accept={currentFileAccept} className="hidden" tabIndex={-1} onChange={handleToolbarFileInputChange} />
          <div className="min-h-0 flex-1">
            {folderTagMode === "tag" ? <TagTreeSidebar /> : selectedProjectId ? <LibraryHierarchySidebar projectRootId={selectedProjectId} /> : <ProjectListSidebar />}
          </div>
        </>
      ) : null}
      {shouldShowCalendarContent ? <div className="min-h-0 flex-1">{calendarContent}</div> : null}
      {shouldShowDirectoryContent && projectAddMenu ? <ProjectAddMenu x={projectAddMenu.x} y={projectAddMenu.y} menuRef={projectAddMenuRef} onCreateFolder={handleCreateProjectFolder} onImportPdf={handleImportProjectPdf} /> : null}
    </div>
  );
};

export { LibraryHierarchySidebar, ProjectListSidebar, SidebarLayeredDirectory, TagTreeSidebar };
