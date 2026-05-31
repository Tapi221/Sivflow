import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { DEFAULT_NEW_FOLDER_NAME, getFolderId, getParentFolderId, UNTITLED_FOLDER_NAME, type FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { cn } from "@/lib/utils";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";

type DirectoryTreeNodeProps = {
  folder: FolderTreeNode;
  level: number;
  selectedFolderId: string | null;
  expandedFolderIds: Set<string>;
  getChildFolders: (folderId: string) => FolderTreeNode[];
  getFolderContentCount: (folderId: string | null) => number;
  onToggleFolder: (folderId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onCreateChildFolder: (folderId: string) => void;
  onRenameFolder: (folder: FolderTreeNode) => void;
  onDeleteFolder: (folder: FolderTreeNode) => void;
};

type IconProps = {
  className?: string;
};

const EMPTY_COLLECTION: never[] = [];
const LIBRARY_TITLE = "Library";
const ROOT_LEVEL = 1;

const IconChevronRight = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);

const IconFolder = ({ className }: IconProps) => (<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M2.75 6.5A2.25 2.25 0 0 1 5 4.25h2.05c.47 0 .92.19 1.24.52l.72.73H15A2.25 2.25 0 0 1 17.25 7.75v6A2.25 2.25 0 0 1 15 16H5a2.25 2.25 0 0 1-2.25-2.25V6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>);

const IconPlus = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>);

const getFolderName = (folder: FolderTreeNode): string => {
  const name = folder.folderName ?? folder.folder_name;
  return typeof name === "string" && name.trim() ? name.trim() : UNTITLED_FOLDER_NAME;
};

const getRootFolderIds = (rootFolders: FolderTreeNode[]): string[] => rootFolders.map(getFolderId).filter(Boolean);

const DirectoryTreeNode = ({ folder, level, selectedFolderId, expandedFolderIds, getChildFolders, getFolderContentCount, onToggleFolder, onSelectFolder, onCreateChildFolder, onRenameFolder, onDeleteFolder }: DirectoryTreeNodeProps) => {
  const folderId = getFolderId(folder);
  if (!folderId) return null;

  const childFolders = getChildFolders(folderId);
  const hasChildren = childFolders.length > 0;
  const isExpanded = expandedFolderIds.has(folderId);
  const isSelected = selectedFolderId === folderId;
  const folderName = getFolderName(folder);
  const contentCount = getFolderContentCount(folderId);
  const rowPaddingLeft = Math.max(0, level - ROOT_LEVEL) * 12;

  const handleToggleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!hasChildren) return;

    onToggleFolder(folderId);
  };

  const handleRowClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectFolder(folderId);

    if (hasChildren && !isExpanded) {
      onToggleFolder(folderId);
    }
  };

  const handleCreateChildFolder = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onCreateChildFolder(folderId);
  };

  const handleRenameFolder = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onRenameFolder(folder);
  };

  const handleDeleteFolder = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDeleteFolder(folder);
  };

  return (
    <div data-folder-id={folderId}>
      <div role="treeitem" aria-level={level} aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected} className={cn("group flex h-7 items-center rounded-[10px] pr-1 text-[12px] font-medium text-[#6d7380]", isSelected && "bg-[#f4f4f5] text-[#343a45]") } style={{ paddingLeft: rowPaddingLeft }}>
        <button type="button" onClick={handleToggleClick} aria-label={isExpanded ? `${folderName} を閉じる` : `${folderName} を開く`} disabled={!hasChildren} className={cn("flex h-6 w-5 shrink-0 items-center justify-center rounded-md text-[#b0b5bd]", hasChildren ? "hover:bg-white hover:text-[#6f7681]" : "opacity-0")}>
          <IconChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
        </button>
        <button type="button" onClick={handleRowClick} title={folderName} className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-[10px] text-left hover:bg-[#f7f7f8]">
          <IconFolder className="h-4 w-4 shrink-0 text-[#9aa1ad]" />
          <span className="min-w-0 flex-1 truncate">{folderName}</span>
          {contentCount > 0 ? <span className="shrink-0 rounded-full bg-[#eef1f4] px-1.5 py-0.5 text-[10px] font-bold text-[#8b929e]">{contentCount}</span> : null}
        </button>
        <div className="ml-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button type="button" onClick={handleCreateChildFolder} aria-label={`${folderName} にフォルダを追加`} title="フォルダを追加" className="flex h-5 w-5 items-center justify-center rounded-md text-[#9aa1ad] hover:bg-[#f0f1f3] hover:text-[#59616e]"><IconPlus className="h-3 w-3" /></button>
          <button type="button" onClick={handleRenameFolder} aria-label={`${folderName} の名前を変更`} title="名前を変更" className="flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-bold text-[#9aa1ad] hover:bg-[#f0f1f3] hover:text-[#59616e]">Aa</button>
          <button type="button" onClick={handleDeleteFolder} aria-label={`${folderName} を削除`} title="削除" className="flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-bold text-[#b48a8a] hover:bg-[#f7eeee] hover:text-[#9d5555]">×</button>
        </div>
      </div>
      {hasChildren && isExpanded ? (
        <div role="group" className="mt-0.5 flex flex-col gap-0.5">
          {childFolders.map((childFolder) => (
            <DirectoryTreeNode key={getFolderId(childFolder)} folder={childFolder} level={level + 1} selectedFolderId={selectedFolderId} expandedFolderIds={expandedFolderIds} getChildFolders={getChildFolders} getFolderContentCount={getFolderContentCount} onToggleFolder={onToggleFolder} onSelectFolder={onSelectFolder} onCreateChildFolder={onCreateChildFolder} onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const LibraryHierarchySidebar = () => {
  const { folders, loading, error } = useFoldersRead();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const treeFolders = useMemo(() => folders as FolderTreeNode[], [folders]);
  const { rootFolders, getChildFolders, getFolderContentCount } = useExplorerDerivedData({ treeFolders, treeCards: EMPTY_COLLECTION, cardSets: EMPTY_COLLECTION, documents: EMPTY_COLLECTION, isFiltering: false });
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set(getRootFolderIds(rootFolders)));
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const selectedFolderId = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedFolderId : null;

  useEffect(() => {
    const rootFolderIds = getRootFolderIds(rootFolders);
    if (rootFolderIds.length === 0) return;

    setExpandedFolderIds((current) => {
      const next = new Set(current);
      let didChange = false;

      rootFolderIds.forEach((folderId) => {
        if (next.has(folderId)) return;

        next.add(folderId);
        didChange = true;
      });

      return didChange ? next : current;
    });
  }, [rootFolders]);

  const handleToggleFolder = useCallback((folderId: string) => {
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const handleSelectFolder = useCallback((folderId: string) => {
    openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: folderId, selectedItem: null } });
  }, [openExplorerTab]);

  const handleCreateChildFolder = useCallback((folderId: string) => {
    void createFolder(DEFAULT_NEW_FOLDER_NAME, folderId);
    setExpandedFolderIds((current) => new Set(current).add(folderId));
  }, [createFolder]);

  const handleRenameFolder = useCallback((folder: FolderTreeNode) => {
    const folderId = getFolderId(folder);
    const folderName = getFolderName(folder);
    const nextFolderName = window.prompt("フォルダ名を変更", folderName)?.trim();
    if (!folderId || !nextFolderName || nextFolderName === folderName) return;

    void updateFolder(folderId, { folderName: nextFolderName });
  }, [updateFolder]);

  const handleDeleteFolder = useCallback((folder: FolderTreeNode) => {
    const folderId = getFolderId(folder);
    const folderName = getFolderName(folder);
    if (!folderId || !window.confirm(`${folderName} を削除しますか？`)) return;

    void deleteFolder(folderId);
  }, [deleteFolder]);

  if (loading) {
    return <aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-y-auto px-2 py-1 text-[12px] text-[#9aa1ad]">読み込み中...</aside>;
  }

  if (error) {
    return <aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-y-auto px-2 py-1 text-[12px] text-[#b48a8a]">{error}</aside>;
  }

  return (
    <aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-hidden">
      <div className="h-full min-h-0 overflow-y-auto px-2 pb-2 pt-1">
        <div role="tree" aria-label="ライブラリ" className="flex flex-col gap-0.5">
          {rootFolders.length > 0 ? rootFolders.map((folder) => (
            <DirectoryTreeNode key={getFolderId(folder)} folder={folder} level={ROOT_LEVEL} selectedFolderId={selectedFolderId} expandedFolderIds={expandedFolderIds} getChildFolders={getChildFolders} getFolderContentCount={getFolderContentCount} onToggleFolder={handleToggleFolder} onSelectFolder={handleSelectFolder} onCreateChildFolder={handleCreateChildFolder} onRenameFolder={handleRenameFolder} onDeleteFolder={handleDeleteFolder} />
          )) : <p className="px-2 py-2 text-[12px] font-medium text-[#9aa1ad]">プロジェクトがありません</p>}
        </div>
      </div>
    </aside>
  );
};

export { LibraryHierarchySidebar };
