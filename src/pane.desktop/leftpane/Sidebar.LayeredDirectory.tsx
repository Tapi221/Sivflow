import { useCallback, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { HomeIcon, SidebarOpenIcon } from "@/chip/icons/icons.sidebar";
import { RightClickPanelSurface } from "@/chip/rightclickpanel.desktop/rightClickPanelCommon";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, resolveRightClickPanelTextWidth, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
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
  onToggleLeftPanel?: () => void;
};

const WORKSPACE_OWNER_FALLBACK_NAME = "Akari T";
const WORKSPACE_NAME_SUFFIX = "のNotion";
const WORKSPACE_AVATAR_FALLBACK = "A";
const WORKSPACE_HOME_LABEL = "ホーム";
const WORKSPACE_COMMENTS_LABEL = "コメント";
const WORKSPACE_NEW_DOCUMENT_LABEL = "新しいドキュメント";
const WORKSPACE_ALL_DOCUMENTS_LABEL = "すべてのドキュメント";
const WORKSPACE_SEARCH_LABEL = "検索";
const FAVORITE_SECTION_LABEL = "お気に入り";
const FAVORITE_EMPTY_MESSAGE = "プロジェクトをお気に入りに追加すると、ここからすぐ開けます";
const PROJECT_SECTION_LABEL = "プロジェクト";
const TAG_SECTION_LABEL = "MY TAG TREE";
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
const IconDoubleChevronLeft = ({ className }: IconProps) => (<svg viewBox="0 0 20 20" fill="none" className={className}><path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" /><path d="M16.5 5L11.5 10L16.5 15" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconComment = ({ className }: IconProps) => (<svg viewBox="0 0 20 20" fill="none" className={className}><path d="M10 3.25c-4.1 0-7.25 2.78-7.25 6.2 0 1.72.8 3.26 2.08 4.38l-.46 2.24c-.07.36.31.63.61.43l2.2-1.42c.86.36 1.81.56 2.82.56 4.1 0 7.25-2.78 7.25-6.19 0-3.42-3.15-6.2-7.25-6.2Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" /></svg>);
const IconQuickDocument = ({ className }: IconProps) => (<svg viewBox="0 0 20 20" fill="none" className={className}><path d="M6 2.75h5.15c.4 0 .78.16 1.06.44l2.6 2.6c.28.28.44.66.44 1.06V15A2.25 2.25 0 0 1 13 17.25H6A2.25 2.25 0 0 1 3.75 15V5A2.25 2.25 0 0 1 6 2.75Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" /><path d="M11 3v3.1c0 .5.4.9.9.9H15" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" /><path d="M8 11.25h4M10 9.25v4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" /></svg>);
const IconTray = ({ className }: IconProps) => (<svg viewBox="0 0 20 20" fill="none" className={className}><path d="M4.75 7.75h10.5l1.4 6.3c.15.67-.36 1.3-1.04 1.3H4.39c-.68 0-1.19-.63-1.04-1.3l1.4-6.3Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" /><path d="M7.5 11.25h1.05c.45 0 .84.28.98.7.15.43.54.72.99.72h.96c.45 0 .84-.29.99-.72.14-.42.53-.7.98-.7h1.05" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" /><path d="M6.5 7.75V5.9c0-.69.56-1.25 1.25-1.25h4.5c.69 0 1.25.56 1.25 1.25v1.85" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" /></svg>);
const IconSearch = ({ className }: IconProps) => (<svg viewBox="0 0 20 20" fill="none" className={className}><path d="M9.15 15.05a5.9 5.9 0 1 0 0-11.8 5.9 5.9 0 0 0 0 11.8Z" stroke="currentColor" strokeWidth="1.55" /><path d="m13.55 13.55 3.2 3.2" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" /></svg>);

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

const SidebarLayeredDirectory = ({ onToggleLeftPanel }: SidebarLayeredDirectoryProps) => {
  const { currentUser } = useAuthSession();
  const folderTagMode = useFolderTagModeStore((state) => state.folderTagMode);
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
    openExplorerTab({ title: "Library", explorerState: { isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null } });
  }, [openExplorerTab]);

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

  const handleOpenNewDocument = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (selectedProjectId) {
      handleOpenProjectAddMenu(event);
      return;
    }

    handleCreateRootFolder();
  }, [handleCreateRootFolder, handleOpenProjectAddMenu, selectedProjectId]);

  const handleOpenSearch = useCallback(() => {
    openSearch();
  }, [openSearch]);

  return (
    <div className="app-layered-directory flex h-full min-h-0 w-[240px] shrink-0 flex-col overflow-hidden bg-transparent font-sans text-[var(--app-sidebar-text)] antialiased">
      <div className="app-layered-directory__primary-nav">
        <div className="app-layered-directory__workspace-header">
          <button type="button" className="app-layered-directory__workspace-button" onClick={handleOpenProjectList} aria-label={`${workspaceName}を開く`}>
            <span className="app-layered-directory__workspace-avatar" aria-hidden="true">{workspaceInitial}</span>
            <span className="app-layered-directory__workspace-name">{workspaceName}</span>
          </button>
          <button type="button" className="app-layered-directory__workspace-collapse" onClick={onToggleLeftPanel} aria-label="サイドバーを閉じる" disabled={!onToggleLeftPanel}>
            <IconDoubleChevronLeft className="app-layered-directory__workspace-collapse-icon" />
          </button>
        </div>
        <nav className="app-layered-directory__notion-nav" aria-label="ワークスペースナビゲーション">
          <button type="button" className={`app-layered-directory__notion-home${isHomeActive ? " is-active" : ""}`} onClick={handleOpenHome} aria-current={isHomeActive ? "page" : undefined} aria-label={WORKSPACE_HOME_LABEL} title={WORKSPACE_HOME_LABEL}>
            <HomeIcon className="app-layered-directory__notion-icon" />
          </button>
          <button type="button" className="app-layered-directory__notion-action" disabled aria-label={WORKSPACE_COMMENTS_LABEL} title={WORKSPACE_COMMENTS_LABEL}>
            <IconComment className="app-layered-directory__notion-icon" />
          </button>
          <button type="button" className="app-layered-directory__notion-action" onClick={handleOpenNewDocument} aria-label={WORKSPACE_NEW_DOCUMENT_LABEL} title={WORKSPACE_NEW_DOCUMENT_LABEL}>
            <IconQuickDocument className="app-layered-directory__notion-icon" />
          </button>
          <button type="button" className="app-layered-directory__notion-action" onClick={handleOpenProjectList} aria-label={WORKSPACE_ALL_DOCUMENTS_LABEL} title={WORKSPACE_ALL_DOCUMENTS_LABEL}>
            <IconTray className="app-layered-directory__notion-icon" />
          </button>
          <button type="button" className="app-layered-directory__notion-action" onClick={handleOpenSearch} aria-label={WORKSPACE_SEARCH_LABEL} title={WORKSPACE_SEARCH_LABEL}>
            <IconSearch className="app-layered-directory__notion-icon" />
          </button>
        </nav>
      </div>
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
                <SidebarOpenIcon className="app-layered-directory__section-leading-icon" />
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
      {projectAddMenu ? <ProjectAddMenu x={projectAddMenu.x} y={projectAddMenu.y} menuRef={projectAddMenuRef} onCreateFolder={handleCreateProjectFolder} onImportPdf={handleImportProjectPdf} /> : null}
    </div>
  );
};

export { LibraryHierarchySidebar, ProjectListSidebar, SidebarLayeredDirectory, TagTreeSidebar };
