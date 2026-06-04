import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { LAYERED_COLOR_MENU_HEIGHT, LAYERED_COLOR_MENU_WIDTH, LayeredColorMenu } from "@/chip/rightclickpanel.desktop/LayeredColorMenu.desktop";
import { LAYERED_PROJECT_MENU_HEIGHT, LAYERED_PROJECT_MENU_PANEL_ID, LAYERED_PROJECT_MENU_WIDTH, LayeredProjectMenu, type LayeredProjectMenuAction, type LayeredProjectMenuActionId, type LayeredProjectMenuSubmenuAnchor } from "@/chip/rightclickpanel.desktop/LayeredProjectMenu";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
import { useCardSets } from "@/components/card/hooks/useCardSets";
import { ExplorerChromeCardSetIcon, ExplorerChromeFolderIcon, ExplorerChromePdfIcon } from "@/components/explorer/icons";
import { getFolderProjectColor } from "@/components/folder/explorer/model/projectColor";
import { DEFAULT_NEW_CARD_SET_NAME, DEFAULT_NEW_FOLDER_NAME, getFolderId, getParentFolderId, UNTITLED_FOLDER_NAME, UNTITLED_PROJECT_NAME, type FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { useDocumentsRead } from "@/hooks/platform/useDocumentsRead";
import { cn } from "@/lib/utils";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { CardSet, DocumentItem, SelectedExplorerItem } from "@/types";
import { LAYERED_TREE_INDENT_PX, LAYERED_TREE_ROOT_LEVEL, LAYERED_TREE_ROOT_DROP_INDICATOR_LEFT_PX, LayeredTreeDropIndicator, getLayeredTreeDropIndicatorLeft, isLayeredTreeAppendDropTarget, useLayeredTreeDragDrop, type LayeredTreeDragState } from "./layeredTreeDnd";

type FolderCommandSet = ReturnType<typeof useFolderCommands>;

type CardSetCommandSet = ReturnType<typeof useCardSets>;

type DirectoryFolderNode = FolderTreeNode & { id: string };

type DirectoryTreeNodeProps = { folder: DirectoryFolderNode; level: number; isRootProject: boolean; selectedFolderId: string | null; selectedItem: SelectedExplorerItem; expandedFolderIds: Set<string>; dragState: LayeredTreeDragState; getChildFolders: (folderId: string) => DirectoryFolderNode[]; getCardSets: (folderId: string | null) => CardSet[]; getFolderDocuments: (folderId: string | null) => DocumentItem[]; onToggleFolder: (folderId: string) => void; onSelectFolder: (folderId: string) => void; onSelectCardSet: (cardSet: CardSet) => void; onSelectDocument: (document: DocumentItem) => void; onOpenContextMenu: (event: ReactMouseEvent<HTMLElement>, folder: DirectoryFolderNode, isRootProject: boolean) => void; onFolderDragStart: (event: ReactDragEvent<HTMLElement>, folderId: string) => void; onFolderDragOver: (event: ReactDragEvent<HTMLElement>, targetId: string) => void; onFolderDragLeave: (event: ReactDragEvent<HTMLElement>, targetId: string) => void; onFolderDrop: (event: ReactDragEvent<HTMLElement>, targetId: string) => void; onFolderDragEnd: () => void; };

type DirectoryEntityRowProps = { id: string; label: string; kind: "cardSet" | "document"; level: number; isSelected: boolean; onSelect: () => void; };

type LibraryHierarchySidebarProps = { parentFolderId?: string | null; };

type FolderContextMenuState = { folderId: string; folderName: string; folderColor: string | null; isFavorite: boolean; isRootProject: boolean; x: number; y: number; };

type FolderColorMenuState = { x: number; y: number; };

type UseFolderContextMenuParams = { createFolder: FolderCommandSet["createFolder"]; updateFolder: FolderCommandSet["updateFolder"]; deleteFolder: FolderCommandSet["deleteFolder"]; createCardSet: CardSetCommandSet["createCardSet"]; getNextOrderIndex: (folderId: string | null, resolvedFolderId?: string) => number; setExpandedFolderIds: React.Dispatch<React.SetStateAction<Set<string>>>; };

type UseFolderLayeredTreeDragDropParams = { rootFolders: DirectoryFolderNode[]; rootDropParentId: string | null; scrollContainerRef: RefObject<HTMLDivElement | null>; getChildFolders: (folderId: string) => DirectoryFolderNode[]; updateFolder: FolderCommandSet["updateFolder"]; setExpandedFolderIds: React.Dispatch<React.SetStateAction<Set<string>>>; };

type IconProps = { className?: string; };

type LegacyDocumentFields = { folder_id?: string | null; file_name?: string | null; order_index?: number; };

type LegacyCardSetFields = { folder_id?: string | null; order_index?: number; };

const EMPTY_COLLECTION: never[] = [];
const LIBRARY_TITLE = "Library";
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

const getFolderOrderIndex = (folder: FolderTreeNode): number => folder.orderIndex ?? folder.order_index ?? 0;

const toDirectoryFolderNode = (folder: FolderTreeNode): DirectoryFolderNode | null => {
  const id = getFolderId(folder);
  return id ? { ...folder, id } : null;
};

const toDirectoryFolderNodes = (folders: FolderTreeNode[]): DirectoryFolderNode[] => folders.map(toDirectoryFolderNode).filter((folder): folder is DirectoryFolderNode => folder !== null);

const getDirectoryFolderParentId = (folder: FolderTreeNode): string | null => getParentFolderId(folder) ?? null;

const getCardSetFolderId = (cardSet: CardSet, fallbackFolderId: string | null = null): string | null => cardSet.folderId ?? (cardSet as CardSet & LegacyCardSetFields).folder_id ?? fallbackFolderId;

const getDocumentFolderId = (document: DocumentItem, fallbackFolderId: string | null = null): string | null => document.folderId ?? (document as DocumentItem & LegacyDocumentFields).folder_id ?? fallbackFolderId;

const getCardSetName = (cardSet: CardSet): string => cardSet.name?.trim() || "無題のセット";

const getDocumentName = (document: DocumentItem): string => document.title?.trim() || document.fileName?.trim() || (document as DocumentItem & LegacyDocumentFields).file_name?.trim() || "無題のPDF";

const getRootFolderIds = (rootFolders: DirectoryFolderNode[]): string[] => rootFolders.map((folder) => folder.id);

const isSelectedExplorerItem = (selectedItem: SelectedExplorerItem, type: "cardSet" | "document", id: string): boolean => selectedItem !== null && "id" in selectedItem && selectedItem.type === type && selectedItem.id === id;

const createFolderContextMenuState = (event: ReactMouseEvent<HTMLElement>, folder: DirectoryFolderNode, isRootProject: boolean): FolderContextMenuState => ({ folderId: folder.id, folderName: getFolderName(folder, isRootProject), folderColor: getFolderProjectColor(folder), isFavorite: getFolderIsFavorite(folder), isRootProject, ...clampRightClickPanelPosition(event.clientX, event.clientY, LAYERED_PROJECT_MENU_DIMENSIONS) });

const DirectoryEntityRow = ({ id, label, kind, level, isSelected, onSelect }: DirectoryEntityRowProps) => {
  const Icon = kind === "cardSet" ? ExplorerChromeCardSetIcon : ExplorerChromePdfIcon;
  const rowPaddingLeft = Math.max(0, level - LAYERED_TREE_ROOT_LEVEL) * LAYERED_TREE_INDENT_PX + 18;
  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
  };

  return (
    <div role="treeitem" tabIndex={0} aria-level={level} aria-selected={isSelected} data-directory-entity-id={id} data-directory-entity-kind={kind} onClick={handleClick} onKeyDown={handleKeyDown} className={cn("group/directory-tree-row relative flex h-8 cursor-default items-center gap-2 rounded-[8px] pr-2 text-[14px] font-medium text-[var(--app-sidebar-text)] transition-[background,box-shadow,opacity,transform] duration-150 hover:bg-[#eeeeee] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7c7]", isSelected && "bg-[#e9e9e9]")} style={{ paddingLeft: rowPaddingLeft }}>
      <span className="flex h-8 w-4 shrink-0 items-center justify-center text-[var(--app-sidebar-icon)]"><Icon className="h-4 w-4" /></span>
      <span title={label} className="flex h-8 min-w-0 flex-1 items-center text-left leading-[20px] text-inherit"><span className="min-w-0 flex-1 truncate">{label}</span></span>
    </div>
  );
};

const DirectoryTreeNode = ({ folder, level, isRootProject, selectedFolderId, selectedItem, expandedFolderIds, dragState, getChildFolders, getCardSets, getFolderDocuments, onToggleFolder, onSelectFolder, onSelectCardSet, onSelectDocument, onOpenContextMenu, onFolderDragStart, onFolderDragOver, onFolderDragLeave, onFolderDrop, onFolderDragEnd }: DirectoryTreeNodeProps) => {
  const folderId = folder.id;
  const childFolders = getChildFolders(folderId);
  const childCardSets = getCardSets(folderId);
  const childDocuments = getFolderDocuments(folderId);
  const hasChildren = childFolders.length > 0 || childCardSets.length > 0 || childDocuments.length > 0;
  const isExpanded = expandedFolderIds.has(folderId);
  const isSelected = selectedFolderId === folderId;
  const isDragging = dragState.draggingId === folderId;
  const dropPosition = dragState.dropInstruction?.targetId === folderId ? dragState.dropInstruction.position : null;
  const folderName = getFolderName(folder, isRootProject);
  const rowPaddingLeft = Math.max(0, level - LAYERED_TREE_ROOT_LEVEL) * LAYERED_TREE_INDENT_PX;
  const dropIndicatorLeft = getLayeredTreeDropIndicatorLeft(level);
  const Icon = isRootProject ? IconProjectFolder : ExplorerChromeFolderIcon;
  const selectFolder = () => {
    onSelectFolder(folderId);
    if (hasChildren && !isExpanded) onToggleFolder(folderId);
  };
  const handleToggleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (hasChildren) onToggleFolder(folderId);
  };
  const handleRowClick = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    selectFolder();
  };
  const handleRowKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    selectFolder();
  };
  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => onOpenContextMenu(event, folder, isRootProject);

  return (
    <div data-folder-id={folderId}>
      <div role="treeitem" tabIndex={0} aria-level={level} aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected} aria-grabbed={isDragging || undefined} draggable data-layered-tree-row="true" onClick={handleRowClick} onKeyDown={handleRowKeyDown} onDragStart={(event) => onFolderDragStart(event, folderId)} onDragEnter={(event) => onFolderDragOver(event, folderId)} onDragOver={(event) => onFolderDragOver(event, folderId)} onDragLeave={(event) => onFolderDragLeave(event, folderId)} onDrop={(event) => onFolderDrop(event, folderId)} onDragEnd={onFolderDragEnd} onContextMenu={handleContextMenu} data-folder-drop-position={dropPosition ?? undefined} className={cn("group/directory-tree-row relative flex h-8 cursor-grab items-center gap-2 rounded-[8px] pr-2 text-[14px] font-medium text-[var(--app-sidebar-text)] transition-[background,box-shadow,opacity,transform] duration-150 hover:bg-[#eeeeee] active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7c7]", isSelected && "bg-[#e9e9e9]", isDragging && "scale-[0.995] opacity-35", dropPosition === "inside" && "bg-[#e2e2e2] shadow-[inset_0_0_0_1px_#c7c7c7]")} style={{ paddingLeft: rowPaddingLeft }}>
        {dropPosition === "before" ? <LayeredTreeDropIndicator position="before" left={dropIndicatorLeft} /> : null}
        {dropPosition === "after" ? <LayeredTreeDropIndicator position="after" left={dropIndicatorLeft} /> : null}
        {hasChildren ? <button type="button" onClick={handleToggleClick} aria-label={isExpanded ? `${folderName} を閉じる` : `${folderName} を開く`} className="relative flex h-8 w-4 shrink-0 items-center justify-center rounded-[4px] text-[var(--app-sidebar-icon)]"><Icon className="layered-directory-row-icon absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 transition-opacity group-hover/directory-tree-row:opacity-0" /><IconChevronRight className={cn("absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 opacity-0 transition-opacity group-hover/directory-tree-row:opacity-100", isExpanded && "rotate-90")} /></button> : <span className="flex h-8 w-4 shrink-0 items-center justify-center text-[var(--app-sidebar-icon)]"><Icon className="layered-directory-row-icon h-4 w-4" /></span>}
        <span title={folderName} className="flex h-8 min-w-0 flex-1 items-center text-left leading-[20px] text-inherit"><span className="min-w-0 flex-1 truncate">{folderName}</span></span>
      </div>
      {hasChildren && isExpanded ? <div role="group" className="mt-0.5 flex flex-col gap-0.5">{childFolders.map((childFolder) => <DirectoryTreeNode key={childFolder.id} folder={childFolder} level={level + 1} isRootProject={false} selectedFolderId={selectedFolderId} selectedItem={selectedItem} expandedFolderIds={expandedFolderIds} dragState={dragState} getChildFolders={getChildFolders} getCardSets={getCardSets} getFolderDocuments={getFolderDocuments} onToggleFolder={onToggleFolder} onSelectFolder={onSelectFolder} onSelectCardSet={onSelectCardSet} onSelectDocument={onSelectDocument} onOpenContextMenu={onOpenContextMenu} onFolderDragStart={onFolderDragStart} onFolderDragOver={onFolderDragOver} onFolderDragLeave={onFolderDragLeave} onFolderDrop={onFolderDrop} onFolderDragEnd={onFolderDragEnd} />)}{childCardSets.map((cardSet) => <DirectoryEntityRow key={cardSet.id} id={cardSet.id} kind="cardSet" label={getCardSetName(cardSet)} level={level + 1} isSelected={isSelectedExplorerItem(selectedItem, "cardSet", cardSet.id)} onSelect={() => onSelectCardSet(cardSet)} />)}{childDocuments.map((document) => <DirectoryEntityRow key={document.id} id={document.id} kind="document" label={getDocumentName(document)} level={level + 1} isSelected={isSelectedExplorerItem(selectedItem, "document", document.id)} onSelect={() => onSelectDocument(document)} />)}</div> : null}
    </div>
  );
};

const useLibraryHierarchyData = () => {
  const { folders, loading: foldersLoading, error: foldersError } = useFoldersRead();
  const { cardSets, loading: cardSetsLoading, createCardSet } = useCardSets();
  const { documents, loading: documentsLoading, error: documentsError } = useDocumentsRead();
  const treeFolders = useMemo(() => folders as FolderTreeNode[], [folders]);
  const { rootFolders, getChildFolders, getNextOrderIndex, getCardSets, getFolderItems } = useExplorerDerivedData({ treeFolders, treeCards: EMPTY_COLLECTION, cardSets, documents, isFiltering: false });
  const directoryRootFolders = useMemo(() => toDirectoryFolderNodes(rootFolders), [rootFolders]);
  const getDirectoryChildFolders = useCallback((folderId: string): DirectoryFolderNode[] => toDirectoryFolderNodes(getChildFolders(folderId)), [getChildFolders]);
  const getFolderDocuments = useCallback((folderId: string | null): DocumentItem[] => getFolderItems(folderId).flatMap((item) => item.type === "document" ? [item.data] : []), [getFolderItems]);

  return { rootFolders: directoryRootFolders, getChildFolders: getDirectoryChildFolders, getNextOrderIndex, getCardSets, getFolderDocuments, createCardSet, loading: foldersLoading || cardSetsLoading || documentsLoading, error: foldersError ?? documentsError };
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

  const openContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>, folder: DirectoryFolderNode, isRootProject: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    setColorMenu(null);
    setContextMenu(createFolderContextMenuState(event, folder, isRootProject));
  }, []);

  const handleOpenSubmenu = useCallback((id: LayeredProjectMenuActionId, anchor: LayeredProjectMenuSubmenuAnchor) => {
    if (!contextMenu || id !== "change-color") return;
    const rightX = contextMenu.x + LAYERED_PROJECT_MENU_WIDTH - LAYERED_PROJECT_SUBMENU_OVERLAP_PX;
    const leftX = contextMenu.x - LAYERED_COLOR_MENU_WIDTH + LAYERED_PROJECT_SUBMENU_OVERLAP_PX;
    const rawX = rightX + LAYERED_COLOR_MENU_WIDTH + LAYERED_PROJECT_SUBMENU_OVERLAP_PX <= window.innerWidth ? rightX : leftX;
    setColorMenu(clampRightClickPanelPosition(rawX, contextMenu.y + anchor.itemOffsetY, { width: LAYERED_COLOR_MENU_WIDTH, height: LAYERED_COLOR_MENU_HEIGHT }));
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

const useFolderLayeredTreeDragDrop = ({ rootFolders, rootDropParentId, scrollContainerRef, getChildFolders, updateFolder, setExpandedFolderIds }: UseFolderLayeredTreeDragDropParams) => {
  const getParentId = useCallback((folder: DirectoryFolderNode): string | null => getDirectoryFolderParentId(folder), []);
  const getOrderIndex = useCallback((folder: DirectoryFolderNode): number => getFolderOrderIndex(folder), []);
  const updateItem = useCallback((folderId: string, patch: { parentId: string | null; orderIndex: number }) => updateFolder(folderId, { parentFolderId: patch.parentId, orderIndex: patch.orderIndex }), [updateFolder]);

  return useLayeredTreeDragDrop({ rootItems: rootFolders, rootDropParentId, scrollContainerRef, getChildItems: getChildFolders, getParentId, getOrderIndex, updateItem, setExpandedIds: setExpandedFolderIds });
};

const ProjectListSidebar = () => {
  const { rootFolders, getChildFolders, getCardSets, getFolderDocuments, getNextOrderIndex, createCardSet, loading, error } = useLibraryHierarchyData();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const { contextMenuElement, openContextMenu } = useFolderContextMenu({ createFolder, updateFolder, deleteFolder, createCardSet, getNextOrderIndex, setExpandedFolderIds });
  const { dragState, handleItemDragStart, handleItemDragOver, handleItemDragLeave, handleItemDrop, handleItemDragEnd, handleListDragOver, handleListDragLeave, handleListDrop } = useFolderLayeredTreeDragDrop({ rootFolders, rootDropParentId: null, scrollContainerRef, getChildFolders, updateFolder, setExpandedFolderIds });
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const selectedFolderId = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedFolderId : null;
  const selectedItem = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedItem : null;
  const handleToggleFolder = useCallback((folderId: string) => setExpandedFolderIds((current) => { const next = new Set(current); if (next.has(folderId)) next.delete(folderId); else next.add(folderId); return next; }), []);
  const handleSelectFolder = useCallback((folderId: string) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: folderId, selectedItem: null } }), [openExplorerTab]);
  const handleSelectCardSet = useCallback((cardSet: CardSet) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: getCardSetFolderId(cardSet), selectedItem: { type: "cardSet", id: cardSet.id } } }), [openExplorerTab]);
  const handleSelectDocument = useCallback((document: DocumentItem) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: getDocumentFolderId(document), selectedItem: { type: "document", id: document.id } } }), [openExplorerTab]);
  const isAppendingToRoot = isLayeredTreeAppendDropTarget(dragState, null);

  if (loading) return <aside aria-label="Project list explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[13px] text-[#9aa1ad]">読み込み中...</aside>;
  if (error) return <aside aria-label="Project list explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[13px] text-[#b48a8a]">{error}</aside>;

  return <><aside aria-label="Project list explorer" className="h-full min-h-0 overflow-hidden"><div ref={scrollContainerRef} className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1"><div role="tree" aria-label="プロジェクト" className="flex min-h-full flex-col gap-0.5" onDragOver={handleListDragOver} onDragLeave={handleListDragLeave} onDrop={handleListDrop}>{rootFolders.length > 0 ? rootFolders.map((folder) => <DirectoryTreeNode key={folder.id} folder={folder} level={LAYERED_TREE_ROOT_LEVEL} isRootProject selectedFolderId={selectedFolderId} selectedItem={selectedItem} expandedFolderIds={expandedFolderIds} dragState={dragState} getChildFolders={getChildFolders} getCardSets={getCardSets} getFolderDocuments={getFolderDocuments} onToggleFolder={handleToggleFolder} onSelectFolder={handleSelectFolder} onSelectCardSet={handleSelectCardSet} onSelectDocument={handleSelectDocument} onOpenContextMenu={openContextMenu} onFolderDragStart={handleItemDragStart} onFolderDragOver={handleItemDragOver} onFolderDragLeave={handleItemDragLeave} onFolderDrop={handleItemDrop} onFolderDragEnd={handleItemDragEnd} />) : <p className="px-1 py-2 text-[13px] font-medium text-[#9aa1ad]">項目がありません</p>}{isAppendingToRoot ? <LayeredTreeDropIndicator position="append" left={LAYERED_TREE_ROOT_DROP_INDICATOR_LEFT_PX} className="mx-2" /> : null}<div aria-hidden="true" className="min-h-8 flex-1" /></div></div></aside>{contextMenuElement}</>;
};

const LibraryHierarchySidebar = ({ parentFolderId = null }: LibraryHierarchySidebarProps) => {
  const { rootFolders, getChildFolders, getCardSets, getFolderDocuments, getNextOrderIndex, createCardSet, loading, error } = useLibraryHierarchyData();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set(getRootFolderIds(rootFolders)));
  const { contextMenuElement, openContextMenu } = useFolderContextMenu({ createFolder, updateFolder, deleteFolder, createCardSet, getNextOrderIndex, setExpandedFolderIds });
  const visibleFolders = useMemo(() => parentFolderId ? getChildFolders(parentFolderId) : rootFolders, [getChildFolders, parentFolderId, rootFolders]);
  const visibleCardSets = useMemo(() => getCardSets(parentFolderId), [getCardSets, parentFolderId]);
  const visibleDocuments = useMemo(() => getFolderDocuments(parentFolderId), [getFolderDocuments, parentFolderId]);
  const hasVisibleItems = visibleFolders.length > 0 || visibleCardSets.length > 0 || visibleDocuments.length > 0;
  const rootDropParentId = parentFolderId ?? null;
  const { dragState, handleItemDragStart, handleItemDragOver, handleItemDragLeave, handleItemDrop, handleItemDragEnd, handleListDragOver, handleListDragLeave, handleListDrop } = useFolderLayeredTreeDragDrop({ rootFolders, rootDropParentId, scrollContainerRef, getChildFolders, updateFolder, setExpandedFolderIds });
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const selectedFolderId = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedFolderId : null;
  const selectedItem = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedItem : null;
  const emptyMessage = "項目がありません";
  const firstLevel = parentFolderId ? LAYERED_TREE_ROOT_LEVEL + 1 : LAYERED_TREE_ROOT_LEVEL;
  const appendIndicatorLeft = getLayeredTreeDropIndicatorLeft(firstLevel);
  const isAppendingToCurrentList = isLayeredTreeAppendDropTarget(dragState, rootDropParentId);

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
  const handleSelectCardSet = useCallback((cardSet: CardSet) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: getCardSetFolderId(cardSet, parentFolderId), selectedItem: { type: "cardSet", id: cardSet.id } } }), [openExplorerTab, parentFolderId]);
  const handleSelectDocument = useCallback((document: DocumentItem) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: getDocumentFolderId(document, parentFolderId), selectedItem: { type: "document", id: document.id } } }), [openExplorerTab, parentFolderId]);

  if (loading) return <aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[13px] text-[#9aa1ad]">読み込み中...</aside>;
  if (error) return <aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[#b48a8a]">{error}</aside>;

  return <><aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-hidden"><div ref={scrollContainerRef} className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1"><div role="tree" aria-label="ライブラリ" className="flex min-h-full flex-col gap-0.5" onDragOver={handleListDragOver} onDragLeave={handleListDragLeave} onDrop={handleListDrop}>{hasVisibleItems ? <>{visibleFolders.map((folder) => <DirectoryTreeNode key={folder.id} folder={folder} level={firstLevel} isRootProject={!parentFolderId} selectedFolderId={selectedFolderId} selectedItem={selectedItem} expandedFolderIds={expandedFolderIds} dragState={dragState} getChildFolders={getChildFolders} getCardSets={getCardSets} getFolderDocuments={getFolderDocuments} onToggleFolder={handleToggleFolder} onSelectFolder={handleSelectFolder} onSelectCardSet={handleSelectCardSet} onSelectDocument={handleSelectDocument} onOpenContextMenu={openContextMenu} onFolderDragStart={handleItemDragStart} onFolderDragOver={handleItemDragOver} onFolderDragLeave={handleItemDragLeave} onFolderDrop={handleItemDrop} onFolderDragEnd={handleItemDragEnd} />)}{visibleCardSets.map((cardSet) => <DirectoryEntityRow key={cardSet.id} id={cardSet.id} kind="cardSet" label={getCardSetName(cardSet)} level={firstLevel} isSelected={isSelectedExplorerItem(selectedItem, "cardSet", cardSet.id)} onSelect={() => handleSelectCardSet(cardSet)} />)}{visibleDocuments.map((document) => <DirectoryEntityRow key={document.id} id={document.id} kind="document" label={getDocumentName(document)} level={firstLevel} isSelected={isSelectedExplorerItem(selectedItem, "document", document.id)} onSelect={() => handleSelectDocument(document)} />)}</> : <p className="px-1 py-2 text-[13px] font-medium text-[#9aa1ad]">{emptyMessage}</p>}{isAppendingToCurrentList ? <LayeredTreeDropIndicator position="append" left={appendIndicatorLeft} className="mx-2" /> : null}<div aria-hidden="true" className="min-h-8 flex-1" /></div></div></aside>{contextMenuElement}</>;
};

export { LibraryHierarchySidebar, ProjectListSidebar };
