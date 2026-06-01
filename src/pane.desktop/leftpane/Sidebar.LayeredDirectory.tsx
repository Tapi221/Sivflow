import { useCallback, useMemo } from "react";
import { DEFAULT_NEW_PROJECT_NAME, getFolderId, getParentFolderId, type FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { useFolderTagModeStore } from "@/hooks/folder/useFolderTagModeStore";
import { LibraryHierarchySidebar, ProjectListSidebar } from "@/pane.desktop/leftpane/folder/LayeredDirectorySidebar";
import { TagTreeSidebar } from "@/pane.desktop/leftpane/folder/TagTreeSidebar";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";

type IconProps = {
  className?: string;
};

const PROJECT_SECTION_LABEL = "MY PROJECTS";
const TAG_SECTION_LABEL = "MY TAG TREE";
const ADD_PROJECT_ARIA_LABEL = "プロジェクトを追加";
const EMPTY_COLLECTION: never[] = [];

const IconPlus = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>);
const IconChevronDown = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M4 6.25L8 10.25L12 6.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);

const getFolderName = (folder: FolderTreeNode): string => {
  const name = folder.folderName ?? folder.folder_name;
  return typeof name === "string" && name.trim() ? name.trim() : "無題のプロジェクト";
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

const SidebarLayeredDirectory = () => {
  const folderTagMode = useFolderTagModeStore((state) => state.folderTagMode);
  const { createFolder } = useFolderCommands();
  const { folders } = useFoldersRead();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const treeFolders = useMemo(() => folders as FolderTreeNode[], [folders]);
  const { rootFolders } = useExplorerDerivedData({ treeFolders, treeCards: EMPTY_COLLECTION, cardSets: EMPTY_COLLECTION, documents: EMPTY_COLLECTION, isFiltering: false });
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

  const handleCreateRootFolder = useCallback(() => {
    void createFolder(DEFAULT_NEW_PROJECT_NAME);
  }, [createFolder]);

  const handleOpenProjectList = useCallback(() => {
    openExplorerTab({ title: "Library", explorerState: { isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null } });
  }, [openExplorerTab]);

  return (
    <div className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent font-sans text-[var(--app-sidebar-text)] antialiased">
      <div className="shrink-0 pb-1 pl-3 pr-2 pt-3">
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
          {folderTagMode !== "tag" && !selectedProject ? (
            <button type="button" onClick={handleCreateRootFolder} aria-label={ADD_PROJECT_ARIA_LABEL} title={ADD_PROJECT_ARIA_LABEL} className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--app-sidebar-hover-bg)] text-[var(--app-sidebar-icon)] transition hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-sidebar-text-hover)] active:scale-[0.94]">
              <IconPlus className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {folderTagMode === "tag" ? <TagTreeSidebar /> : selectedProjectId ? <LibraryHierarchySidebar projectRootId={selectedProjectId} /> : <ProjectListSidebar />}
      </div>
    </div>
  );
};

export { LibraryHierarchySidebar, ProjectListSidebar, SidebarLayeredDirectory, TagTreeSidebar };
