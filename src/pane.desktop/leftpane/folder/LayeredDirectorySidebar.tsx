import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type SetStateAction } from "react";
import { LAYERED_COLOR_MENU_HEIGHT, LAYERED_COLOR_MENU_WIDTH, LayeredColorMenu } from "@/chip/rightclickpanel.desktop/LayeredColorMenu.desktop";
import { LAYERED_PROJECT_MENU_HEIGHT, LAYERED_PROJECT_MENU_PANEL_ID, LAYERED_PROJECT_MENU_WIDTH, LayeredProjectMenu, type LayeredProjectMenuAction, type LayeredProjectMenuActionId, type LayeredProjectMenuSubmenuAnchor } from "@/chip/rightclickpanel.desktop/LayeredProjectMenu";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
import { useCardSets } from "@/components/card/hooks/useCardSets";
import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { getFolderProjectColor } from "@/components/folder/explorer/model/projectColor";
import { DEFAULT_NEW_CARD_SET_NAME, DEFAULT_NEW_FOLDER_NAME, getFolderId, UNTITLED_FOLDER_NAME, UNTITLED_PROJECT_NAME, type FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { useDocumentsRead } from "@/hooks/platform/useDocumentsRead";
import { cn } from "@/lib/utils";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";

type FolderCommandSet = ReturnType<typeof useFolderCommands>;

type CardSetCommandSet = ReturnType<typeof useCardSets>;

type DirectoryTreeNodeProps = { folder: FolderTreeNode; level: number; isRootProject: boolean; selectedFolderId: string | null; expandedFolderIds: Set<string>; getChildFolders: (folderId: string) => FolderTreeNode[]; onToggleFolder: (folderId: string) => void; onSelectFolder: (folderId: string) => void; onOpenContextMenu: (event: ReactMouseEvent<HTMLElement>, folder: FolderTreeNode, isRootProject: boolean) => void; };

type LibraryHierarchySidebarProps = { projectRootId?: string | null; };

type FolderContextMenuState = { folderId: string; folderName: string; folderColor: string | null; isFavorite: boolean; isRootProject: boolean; x: number; y: number; };

type FolderColorMenuState = { x: number; y: number; };

type UseFolderContextMenuParams = { createFolder: FolderCommandSet["createFolder"]; updateFolder: FolderCommandSet["updateFolder"]; deleteFolder: FolderCommandSet["deleteFolder"]; createCardSet: CardSetCommandSet["createCardSet"]; getNextOrderIndex: (folderId: string | null, resolvedFolderId?: string) => number; setExpandedFolderIds: Dispatch<SetStateAction<Set<string>>>; };

type IconProps = { className?: string; };

const EMPTY_COLLECTION: never[] = [];
const LIBRARY_TITLE = "Library";
const ROOT_LEVEL = 1;
const LAYERED_PROJECT_MENU_DIMENSIONS = { width: LAYERED_PROJECT_MENU_WIDTH, height: LAYERED_PROJECT_MENU_HEIGHT };
const LAYERED_PROJECT_SUBMENU_OVERLAP_PX = 6;

const IconChevronRight = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconProjectFolder = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={cn("shrink-0", className)}>
    <path d="M9 6.75V5.25C9 4.42157 9.67157 3.75 10.5 3.75H13.5C14.3284 3.75 15 4.42157 15 5.25V6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 6.75H19.5C20.3284 6.75 21 7.42157 21 8.25V18.75C21 19.5784 20.3284 20.25 19.5 20.25H4.5C3.67157 20.25 3 19.5784 3 18.75V8.25C3 7.42157 3.67157 6.75 4.5 6.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11.25H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 12.75H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const getFolderName = (folder: FolderTreeNode, isRootProject = false): string => {
  const name = folder.folderName ?? folder.folder_name;
  return typeof name === "string" && name.trim() ? name.trim() : isRootProject ? UNTITLED_PROJECT_NAME : UNTITLED_FOLDER_NAME;
};

const getFolderIsFavorite = (folder: FolderTreeNode): boolean => folder.isFavorite === true || folder.is_favorite === true;

const getRootFolderIds = (rootFolders: FolderTreeNode[]): string[] => rootFolders.map(getFolderId).filter(Boolean);

const getLayeredProjectColorMenuPosition = (menu: FolderContextMenuState, anchor: LayeredProjectMenuSubmenuAnchor): FolderColorMenuState => {
  const rightX = menu.x + LAYERED_PROJECT_MENU_WIDTH - LAYERED_PROJECT_SUBMENU_OVERLAP_PX;
  const leftX = menu.x - LAYERED_COLOR_MENU_WIDTH + LAYERED_PROJECT_SUBMENU_OVERLAP_PX;
  const rawX = rightX + LAYERED_COLOR_MENU_WIDTH + LAYERED_PROJECT_SUBMENU_OVERLAP_PX <= window.innerWidth ? rightX : leftX;
  return clampRightClickPanelPosition(rawX, menu.y + anchor.itemOffsetY, { width: LAYERED_COLOR_MENU_WIDTH, height: LAYERED_COLOR_MENU_HEIGHT });
};

const createFolderContextMenuState = (event: ReactMouseEvent<HTMLElement>, folder: FolderTreeNode, isRootProject: boolean): FolderContextMenuState | null => {
  const folderId = getFolderId(folder);
  if (!folderId) return null;

  return { folderId, folderName: getFolderName(folder, isRootProject), folderColor: getFolderProjectColor(folder), isFavorite: getFolderIsFavorite(folder), isRootProject, ...clampRightClickPanelPosition(event.clientX, event.clientY, LAYERED_PROJECT_MENU_DIMENSIONS) };
};

const useLibraryHierarchyData = () => {
  const { folders, loading: foldersLoading, error: foldersError } = useFoldersRead();
  const { cardSets, loading: cardSetsLoading, createCardSet } = useCardSets();
  const { documents, loading: documentsLoading, error: documentsError } = useDocumentsRead();
  const treeFolders = useMemo(() => folders as FolderTreeNode[], [folders]);
  const { rootFolders, getChildFolders, getNextOrderIndex } = useExplorerDerivedData({ treeFolders, treeCards: EMPTY_COLLECTION, cardSets, documents, isFiltering: false });

  return { rootFolders, getChildFolders, getNextOrderIndex, createCardSet, loading: foldersLoading || cardSetsLoading || documentsLoading, error: foldersError ?? documentsError };
};

const useFolderContextMenu = ({ createFolder, updateFolder, deleteFolder, createCardSet, getNextOrderIndex, setExpandedFolderIds }: UseFolderContextMenuParams) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const colorMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<FolderContextMenuState | null>(null);
  const [colorMenu, setColorMenu] = useState<FolderColorMenuState | null>(null);
  const { fileInputRef, handleToolbarAddDocument, currentFileAccept, handleToolbarFileInputChange } = useFolderDocumentUpload({ actionFolderId: contextMenu?.folderId ?? null, getNextOrderIndex, setExpandedFolders: setExpandedFolderIds });

  const closeContextMenu = useCallback(() => {
    setColorMenu(null);
    setContextMenu(null);
  }, []);

  useRightClickPanelDismiss(LAYERED_PROJECT_MENU_PANEL_ID, contextMenu !== null, menuRef, closeContextMenu);

  const openContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>, folder: FolderTreeNode, isRootProject: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    setColorMenu(null);
    setContextMenu(createFolderContextMenuState(event, folder, isRootProject));
  }, []);

  const handleOpenSubmenu = useCallback((id: LayeredProjectMenuActionId, anchor: LayeredProjectMenuSubmenuAnchor) => {
    if (!contextMenu || id !== "change-color") return;
    setColorMenu(getLayeredProjectColorMenuPosition(contextMenu, anchor));
  }, [contextMenu]);

  const handleSelectColor = useCallback((folderColor: string) => {
    if (!contextMenu) return;
    void updateFolder(contextMenu.folderId, { folderColor });
    closeContextMenu();
  }, [closeContextMenu, contextMenu, updateFolder]);

  const actions = useMemo<LayeredProjectMenuAction[]>(() => {
    if (!contextMenu) return [];
    const { folderId, folderName, isFavorite, isRootProject } = contextMenu;
    return [
      { id: "change-color", onSelect: () => undefined },
      { id: "rename", onSelect: () => { const nextFolderName = window.prompt(isRootProject ? "プロジェクト名を変更" : "フォルダ名を変更", folderName)?.trim(); closeContextMenu(); if (nextFolderName && nextFolderName !== folderName) void updateFolder(folderId, { folderName: nextFolderName, name: nextFolderName }); } },
      { id: "create-card-set", onSelect: () => { closeContextMenu(); void createCardSet(DEFAULT_NEW_CARD_SET_NAME, folderId); } },
      { id: "create-folder", onSelect: () => { closeContextMenu(); void createFolder(DEFAULT_NEW_FOLDER_NAME, folderId); setExpandedFolderIds((current) => new Set(current).add(folderId)); } },
      { id: "import-pdf", onSelect: () => { handleToolbarAddDocument(); closeContextMenu(); } },
      { id: "add-to-favorites", disabled: isFavorite, onSelect: () => { closeContextMenu(); void updateFolder(folderId, { isFavorite: true }); } },
      { id: "hide", onSelect: () => { closeContextMenu(); void updateFolder(folderId, { isHidden: true }); } },
      { id: "delete", onSelect: () => { closeContextMenu(); void deleteFolder(folderId); } },
    ];
  }, [closeContextMenu, contextMenu, createCardSet, createFolder, deleteFolder, handleToolbarAddDocument, setExpandedFolderIds, updateFolder]);

  const contextMenuElement = <><input ref={fileInputRef} type="file" accept={currentFileAccept} className="hidden" tabIndex={-1} onChange={handleToolbarFileInputChange} />{contextMenu ? <LayeredProjectMenu x={contextMenu.x} y={contextMenu.y} actions={actions} menuRef={menuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} panelId={LAYERED_PROJECT_MENU_PANEL_ID} openSubmenuId={colorMenu ? "change-color" : null} submenuElement={colorMenu ? <LayeredColorMenu x={colorMenu.x} y={colorMenu.y} currentColor={contextMenu.folderColor} menuRef={colorMenuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} onSelectColor={handleSelectColor} /> : null} onOpenSubmenu={handleOpenSubmenu} onCloseSubmenu={() => setColorMenu(null)} /> : null}</>;

  return { contextMenuElement, openContextMenu };
};

const DirectoryTreeNode = ({ folder, level, isRootProject, selectedFolderId, expandedFolderIds, getChildFolders, onToggleFolder, onSelectFolder, onOpenContextMenu }: DirectoryTreeNodeProps) => {
  const folderId = getFolderId(folder);
  if (!folderId) return null;

  const childFolders = getChildFolders(folderId);
  const hasChildren = childFolders.length > 0;
  const isExpanded = expandedFolderIds.has(folderId);
  const isSelected = selectedFolderId === folderId;
  const folderName = getFolderName(folder, isRootProject);
  const rowPaddingLeft = Math.max(0, level - ROOT_LEVEL) * 14;
  const Icon = isRootProject ? IconProjectFolder : ExplorerChromeFolderIcon;
  const handleToggleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (hasChildren) onToggleFolder(folderId);
  };
  const handleRowClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectFolder(folderId);
    if (hasChildren && !isExpanded) onToggleFolder(folderId);
  };
  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => onOpenContextMenu(event, folder, isRootProject);

  return <div data-folder-id={folderId}><div role="treeitem" aria-level={level} aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected} onContextMenu={handleContextMenu} className={cn("group/directory-tree-row flex h-8 items-center gap-2 rounded-[8px] pr-2 text-[14px] font-medium text-[var(--app-sidebar-text)] hover:bg-[#eeeeee]", isSelected && "bg-[#e9e9e9]")} style={{ paddingLeft: rowPaddingLeft }}>{hasChildren ? <button type="button" onClick={handleToggleClick} aria-label={isExpanded ? `${folderName} を閉じる` : `${folderName} を開く`} className="relative flex h-8 w-4 shrink-0 items-center justify-center rounded-[4px] text-[var(--app-sidebar-icon)]"><Icon className="layered-directory-row-icon absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 transition-opacity group-hover/directory-tree-row:opacity-0" /><IconChevronRight className={cn("absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 opacity-0 transition-opacity group-hover/directory-tree-row:opacity-100", isExpanded && "rotate-90")} /></button> : <span className="flex h-8 w-4 shrink-0 items-center justify-center text-[var(--app-sidebar-icon)]"><Icon className="layered-directory-row-icon h-4 w-4" /></span>}<button type="button" onClick={handleRowClick} title={folderName} className="flex h-8 min-w-0 flex-1 items-center text-left leading-[20px] text-inherit"><span className="min-w-0 flex-1 truncate">{folderName}</span></button></div>{hasChildren && isExpanded ? <div role="group" className="mt-0.5 flex flex-col gap-0.5">{childFolders.map((childFolder) => <DirectoryTreeNode key={getFolderId(childFolder)} folder={childFolder} level={level + 1} isRootProject={false} selectedFolderId={selectedFolderId} expandedFolderIds={expandedFolderIds} getChildFolders={getChildFolders} onToggleFolder={onToggleFolder} onSelectFolder={onSelectFolder} onOpenContextMenu={onOpenContextMenu} />)}</div> : null}</div>;
};

const ProjectListSidebar = () => {
  const { rootFolders, getChildFolders, getNextOrderIndex, createCardSet, loading, error } = useLibraryHierarchyData();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const { contextMenuElement, openContextMenu } = useFolderContextMenu({ createFolder, updateFolder, deleteFolder, createCardSet, getNextOrderIndex, setExpandedFolderIds });
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const selectedFolderId = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedFolderId : null;
  const handleToggleFolder = useCallback((folderId: string) => setExpandedFolderIds((current) => { const next = new Set(current); if (next.has(folderId)) next.delete(folderId); else next.add(folderId); return next; }), []);
  const handleSelectFolder = useCallback((folderId: string) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: folderId, selectedItem: null } }), [openExplorerTab]);

  if (loading) return <aside aria-label="Project list explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[13px] text-[#9aa1ad]">読み込み中...</aside>;
  if (error) return <aside aria-label="Project list explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[13px] text-[#b48a8a]">{error}</aside>;

  return <><aside aria-label="Project list explorer" className="h-full min-h-0 overflow-hidden"><div className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1"><div role="tree" aria-label="プロジェクト" className="flex flex-col gap-0.5">{rootFolders.length > 0 ? rootFolders.map((folder) => <DirectoryTreeNode key={getFolderId(folder)} folder={folder} level={ROOT_LEVEL} isRootProject selectedFolderId={selectedFolderId} expandedFolderIds={expandedFolderIds} getChildFolders={getChildFolders} onToggleFolder={handleToggleFolder} onSelectFolder={handleSelectFolder} onOpenContextMenu={openContextMenu} />) : <p className="px-1 py-2 text-[13px] font-medium text-[#9aa1ad]">フォルダがありません</p>}</div></div></aside>{contextMenuElement}</>;
};

const LibraryHierarchySidebar = ({ projectRootId = null }: LibraryHierarchySidebarProps) => {
  const { rootFolders, getChildFolders, getNextOrderIndex, createCardSet, loading, error } = useLibraryHierarchyData();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set(getRootFolderIds(rootFolders)));
  const { contextMenuElement, openContextMenu } = useFolderContextMenu({ createFolder, updateFolder, deleteFolder, createCardSet, getNextOrderIndex, setExpandedFolderIds });
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const selectedFolderId = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedFolderId : null;
  const visibleRootFolders = useMemo(() => projectRootId ? getChildFolders(projectRootId) : rootFolders, [getChildFolders, projectRootId, rootFolders]);
  const emptyMessage = projectRootId ? "フォルダがありません" : "フォルダがありません";
  const firstLevel = projectRootId ? ROOT_LEVEL + 1 : ROOT_LEVEL;

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

  const handleToggleFolder = useCallback((folderId: string) => setExpandedFolderIds((current) => { const next = new Set(current); if (next.has(folderId)) next.delete(folderId); else next.add(folderId); return next; }), []);
  const handleSelectFolder = useCallback((folderId: string) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: folderId, selectedItem: null } }), [openExplorerTab]);

  if (loading) return <aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[13px] text-[#9aa1ad]">読み込み中...</aside>;
  if (error) return <aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[13px] text-[#b48a8a]">{error}</aside>;

  return <><aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-hidden"><div className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1"><div role="tree" aria-label="ライブラリ" className="flex flex-col gap-0.5">{visibleRootFolders.length > 0 ? visibleRootFolders.map((folder) => <DirectoryTreeNode key={getFolderId(folder)} folder={folder} level={firstLevel} isRootProject={!projectRootId} selectedFolderId={selectedFolderId} expandedFolderIds={expandedFolderIds} getChildFolders={getChildFolders} onToggleFolder={handleToggleFolder} onSelectFolder={handleSelectFolder} onOpenContextMenu={openContextMenu} />) : <p className="px-1 py-2 text-[13px] font-medium text-[#9aa1ad]">{emptyMessage}</p>}</div></div></aside>{contextMenuElement}</>;
};

export { LibraryHierarchySidebar, ProjectListSidebar };