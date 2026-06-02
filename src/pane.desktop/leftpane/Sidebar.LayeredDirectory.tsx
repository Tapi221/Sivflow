import { useCallback, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { RightClickPanelSurface } from "@/chip/rightclickpanel.desktop/rightClickPanelCommon";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, resolveRightClickPanelTextWidth, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
import { DEFAULT_NEW_FOLDER_NAME, DEFAULT_NEW_PROJECT_NAME, getFolderId, getParentFolderId, type FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
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

const FAVORITE_SECTION_LABEL = "お気に入り";
const PROJECT_SECTION_LABEL = "プロジェクト";
const TAG_SECTION_LABEL = "MY TAG TREE";
const ADD_PROJECT_ARIA_LABEL = "プロジェクトを追加";
const ADD_PROJECT_CONTENT_ARIA_LABEL = "プロジェクトに追加";
const PROJECT_ADD_MENU_PANEL_ID = "layered-project-add-menu";
const PROJECT_ADD_MENU_ITEM_DEFINITIONS: readonly ProjectAddMenuItemDefinition[] = [
  { id: "create-folder", label: "新規フォルダ" },
  { id: "import-pdf", label: "PDFをインポート" },
];
const PROJECT_ADD_MENU_WIDTH = resolveRightClickPanelTextWidth(PROJECT_ADD_MENU_ITEM_DEFINITIONS.map((item) => item.label), 132);
const PROJECT_ADD_MENU_HEIGHT = PROJECT_ADD_MENU_ITEM_DEFINITIONS.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
const EMPTY_COLLECTION: never[] = [];

const IconPlus = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" className={className}><path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>);
const IconChevronDown = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" className={className}><path d="M4 6.25L8 10.25L12 6.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);

const getFolderName = (folder: FolderTreeNode): string => {
  const name = folder.folderName ?? folder.folder_name;
  return typeof name === "string" && name.trim() ? name.trim() : "無題のプロジェクト";
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

const SidebarLayeredDirectory = () => {
  const folderTagMode = useFolderTagModeStore((state) => state.folderTagMode);
  const { createFolder } = useFolderCommands();
  const { folders } = useFoldersRead();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
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
  const { fileInputRef, handleToolbarAddDocument, currentFileAccept, handleToolbarFileInputChange } = useFolderDocumentUpload({ actionFolderId: selectedProjectId, getNextOrderIndex, setExpandedFolders: setProjectAddExpandedFolderIds });

  const closeProjectAddMenu = useCallback(() => {
    setProjectAddMenu(null);
  }, []);

  useRightClickPanelDismiss(PROJECT_ADD_MENU_PANEL_ID, projectAddMenu !== null, projectAddMenuRef, closeProjectAddMenu);

  const handleCreateRootFolder = useCallback(() => {
    void createFolder(DEFAULT_NEW_PROJECT_NAME);
  }, [createFolder]);

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

  return (
    <div className="app-layered-directory flex h-full min-h-0 w-[200px] shrink-0 flex-col overflow-hidden bg-transparent font-sans text-[var(--app-sidebar-text)] antialiased">
      <div className="shrink-0 pb-1 pl-3 pr-2 pt-3">
        {shouldShowFavoriteSection ? (
          <div className="mb-3 flex h-6 items-center gap-1.5">
            <div className="min-w-0 flex-1 text-[11px] font-bold uppercase leading-none tracking-[0.04em] text-[var(--app-sidebar-text-muted)]">
              <span className="block truncate">{FAVORITE_SECTION_LABEL}</span>
            </div>
          </div>
        ) : null}
        <div className="flex h-6 items-center gap-1.5">
          <div className="min-w-0 flex-1 text-[11px] font-bold uppercase leading-none tracking-[0.04em] text-[var(--app-sidebar-text-muted)]">
            {folderTagMode !== "tag" && selectedProject ? (
              <button type="button" className="flex min-w-0 items-center gap-1 text-left text-[13px] font-semibold normal-case leading-none tracking-normal text-[var(--app-sidebar-text-strong)] transition hover:text-[var(--app-sidebar-text-hover)]" onClick={handleOpenProjectList} aria-label="プロジェクト一覧を開く">
                <span className="block truncate">{sectionLabel}</span>
                <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--app-sidebar-icon)]" />
              </button>
            ) : (
              <span className="block truncate">{sectionLabel}</span>
            )}
          </div>
          {folderTagMode !== "tag" ? (
            <button type="button" onClick={selectedProject ? handleOpenProjectAddMenu : handleCreateRootFolder} aria-label={selectedProject ? ADD_PROJECT_CONTENT_ARIA_LABEL : ADD_PROJECT_ARIA_LABEL} title={selectedProject ? ADD_PROJECT_CONTENT_ARIA_LABEL : ADD_PROJECT_ARIA_LABEL} className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[10px] text-[var(--app-sidebar-icon)] transition hover:bg-white/70 hover:text-[var(--app-sidebar-text-hover)] active:scale-[0.94]">
              <IconPlus className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
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