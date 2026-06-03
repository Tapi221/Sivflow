import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type SetStateAction } from "react";
import { LAYERED_COLOR_MENU_HEIGHT, LAYERED_COLOR_MENU_WIDTH, LayeredColorMenu } from "@/chip/rightclickpanel.desktop/LayeredColorMenu.desktop";
import { LAYERED_PROJECT_MENU_HEIGHT, LAYERED_PROJECT_MENU_PANEL_ID, LAYERED_PROJECT_MENU_WIDTH, LayeredProjectMenu, type LayeredProjectMenuAction, type LayeredProjectMenuActionId, type LayeredProjectMenuSubmenuAnchor } from "@/chip/rightclickpanel.desktop/LayeredProjectMenu";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
import { useCardSets } from "@/components/card/hooks/useCardSets";
import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { getFolderProjectColor } from "@/components/folder/explorer/model/projectColor";
import { DEFAULT_NEW_CARD_SET_NAME, DEFAULT_NEW_FOLDER_NAME, getFolderId, getParentFolderId, UNTITLED_FOLDER_NAME, UNTITLED_PROJECT_NAME, type FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { useDocumentsRead } from "@/hooks/platform/useDocumentsRead";
import { cn } from "@/lib/utils";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";

type FolderCommandSet = ReturnType<typeof useFolderCommands>;

type CardSetCommandSet = ReturnType<typeof useCardSets>;

type FolderDropPosition = "before" | "inside" | "after";

type FolderDropInstruction = { sourceId: string; targetId: string; position: FolderDropPosition; };

type FolderDragState = { draggingFolderId: string | null; dropInstruction: FolderDropInstruction | null; };

type DirectoryTreeNodeProps = { folder: FolderTreeNode; level: number; isRootProject: boolean; selectedFolderId: string | null; expandedFolderIds: Set<string>; dragState: FolderDragState; getChildFolders: (folderId: string) => FolderTreeNode[]; onToggleFolder: (folderId: string) => void; onSelectFolder: (folderId: string) => void; onOpenContextMenu: (event: ReactMouseEvent<HTMLElement>, folder: FolderTreeNode, isRootProject: boolean) => void; onFolderDragStart: (event: ReactDragEvent<HTMLElement>, folderId: string) => void; onFolderDragOver: (event: ReactDragEvent<HTMLElement>, targetId: string) => void; onFolderDragLeave: (event: ReactDragEvent<HTMLElement>, targetId: string) => void; onFolderDrop: (event: ReactDragEvent<HTMLElement>, targetId: string) => void; onFolderDragEnd: () => void; };

type LibraryHierarchySidebarProps = { projectRootId?: string | null; };

type FolderContextMenuState = { folderId: string; folderName: string; folderColor: string | null; isFavorite: boolean; isRootProject: boolean; x: number; y: number; };

type FolderColorMenuState = { x: number; y: number; };

type UseFolderContextMenuParams = { createFolder: FolderCommandSet["createFolder"]; updateFolder: FolderCommandSet["updateFolder"]; deleteFolder: FolderCommandSet["deleteFolder"]; createCardSet: CardSetCommandSet["createCardSet"]; getNextOrderIndex: (folderId: string | null, resolvedFolderId?: string) => number; setExpandedFolderIds: Dispatch<SetStateAction<Set<string>>>; };

type UseFolderDragDropParams = { rootFolders: FolderTreeNode[]; getChildFolders: (folderId: string) => FolderTreeNode[]; updateFolder: FolderCommandSet["updateFolder"]; setExpandedFolderIds: Dispatch<SetStateAction<Set<string>>>; };

type IconProps = { className?: string; };

const EMPTY_COLLECTION: never[] = [];
const LIBRARY_TITLE = "Library";
const ROOT_LEVEL = 1;
const LAYERED_PROJECT_MENU_DIMENSIONS = { width: LAYERED_PROJECT_MENU_WIDTH, height: LAYERED_PROJECT_MENU_HEIGHT };
const LAYERED_PROJECT_SUBMENU_OVERLAP_PX = 6;
const FOLDER_DND_MIME_TYPE = "application/x-manifolia-folder-id";
const FOLDER_DROP_EDGE_RATIO = 0.24;
const FOLDER_AUTO_EXPAND_DELAY_MS = 520;
const FOLDER_DRAG_IMAGE_OFFSET_X = 18;
const FOLDER_DRAG_IMAGE_OFFSET_Y = 16;

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

const getRootFolderIds = (rootFolders: FolderTreeNode[]): string[] => rootFolders.map(getFolderId).filter(Boolean);

const isDropInstructionEqual = (left: FolderDropInstruction | null, right: FolderDropInstruction | null): boolean => left?.sourceId === right?.sourceId && left?.targetId === right?.targetId && left?.position === right?.position;

const getFolderDropPosition = (event: ReactDragEvent<HTMLElement>): FolderDropPosition => {
  const rect = event.currentTarget.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;

  if (offsetY <= rect.height * FOLDER_DROP_EDGE_RATIO) return "before";
  if (offsetY >= rect.height * (1 - FOLDER_DROP_EDGE_RATIO)) return "after";
  return "inside";
};

const getFolderDropParentId = (targetFolder: FolderTreeNode, targetId: string, position: FolderDropPosition): string | null => position === "inside" ? targetId : getParentFolderId(targetFolder);

const createFolderMap = (rootFolders: FolderTreeNode[], getChildFolders: (folderId: string) => FolderTreeNode[]): Map<string, FolderTreeNode> => {
  const map = new Map<string, FolderTreeNode>();
  const stack = [...rootFolders];

  while (stack.length > 0) {
    const folder = stack.pop();
    if (!folder) continue;

    const folderId = getFolderId(folder);
    if (!folderId || map.has(folderId)) continue;

    map.set(folderId, folder);
    stack.push(...getChildFolders(folderId));
  }

  return map;
};

const isFolderAncestorOf = (sourceId: string, candidateParentId: string | null, getChildFolders: (folderId: string) => FolderTreeNode[]): boolean => {
  if (!candidateParentId) return false;
  if (sourceId === candidateParentId) return true;

  const stack = getChildFolders(sourceId).map(getFolderId).filter(Boolean);
  const visited = new Set<string>();

  while (stack.length > 0) {
    const folderId = stack.pop();
    if (!folderId || visited.has(folderId)) continue;
    if (folderId === candidateParentId) return true;

    visited.add(folderId);
    stack.push(...getChildFolders(folderId).map(getFolderId).filter(Boolean));
  }

  return false;
};

const getFolderSiblings = (parentFolderId: string | null, rootFolders: FolderTreeNode[], getChildFolders: (folderId: string) => FolderTreeNode[]): FolderTreeNode[] => parentFolderId ? getChildFolders(parentFolderId) : rootFolders;

const createReorderedSiblingList = (sourceFolder: FolderTreeNode, targetFolder: FolderTreeNode, targetParentId: string | null, position: FolderDropPosition, rootFolders: FolderTreeNode[], getChildFolders: (folderId: string) => FolderTreeNode[]): FolderTreeNode[] => {
  const sourceId = getFolderId(sourceFolder);
  const targetId = getFolderId(targetFolder);
  const siblings = getFolderSiblings(targetParentId, rootFolders, getChildFolders).filter((folder) => getFolderId(folder) !== sourceId);
  const insertionIndex = position === "inside" ? siblings.length : Math.max(0, siblings.findIndex((folder) => getFolderId(folder) === targetId) + (position === "after" ? 1 : 0));
  const nextSiblings = [...siblings];
  nextSiblings.splice(insertionIndex, 0, sourceFolder);
  return nextSiblings;
};

const createFolderDragPreview = (sourceElement: HTMLElement): HTMLElement => {
  const rect = sourceElement.getBoundingClientRect();
  const preview = sourceElement.cloneNode(true) as HTMLElement;
  preview.removeAttribute("id");
  preview.setAttribute("aria-hidden", "true");
  preview.style.position = "fixed";
  preview.style.top = "-1000px";
  preview.style.left = "-1000px";
  preview.style.width = `${rect.width}px`;
  preview.style.height = `${rect.height}px`;
  preview.style.boxSizing = "border-box";
  preview.style.pointerEvents = "none";
  preview.style.opacity = "0.92";
  preview.style.background = "rgba(255,255,255,0.96)";
  preview.style.boxShadow = "0 10px 28px rgba(0,0,0,0.16)";
  preview.style.borderRadius = "8px";
  preview.style.zIndex = "2147483647";
  document.body.append(preview);
  return preview;
};

const applyFolderDragPreview = (event: ReactDragEvent<HTMLElement>) => {
  const preview = createFolderDragPreview(event.currentTarget);
  event.dataTransfer.setDragImage(preview, FOLDER_DRAG_IMAGE_OFFSET_X, FOLDER_DRAG_IMAGE_OFFSET_Y);
  requestAnimationFrame(() => preview.remove());
};

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

const useFolderDragDrop = ({ rootFolders, getChildFolders, updateFolder, setExpandedFolderIds }: UseFolderDragDropParams) => {
  const folderMap = useMemo(() => createFolderMap(rootFolders, getChildFolders), [getChildFolders, rootFolders]);
  const autoExpandTimerRef = useRef<number | null>(null);
  const autoExpandTargetRef = useRef<string | null>(null);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [dropInstruction, setDropInstruction] = useState<FolderDropInstruction | null>(null);

  const clearAutoExpandTimer = useCallback(() => {
    if (autoExpandTimerRef.current !== null) {
      window.clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
    autoExpandTargetRef.current = null;
  }, []);

  const clearDragState = useCallback(() => {
    clearAutoExpandTimer();
    setDraggingFolderId(null);
    setDropInstruction(null);
  }, [clearAutoExpandTimer]);

  const scheduleAutoExpand = useCallback((instruction: FolderDropInstruction) => {
    if (instruction.position !== "inside") {
      clearAutoExpandTimer();
      return;
    }
    if (autoExpandTargetRef.current === instruction.targetId) return;

    clearAutoExpandTimer();
    autoExpandTargetRef.current = instruction.targetId;
    autoExpandTimerRef.current = window.setTimeout(() => {
      setExpandedFolderIds((current) => current.has(instruction.targetId) ? current : new Set(current).add(instruction.targetId));
      autoExpandTimerRef.current = null;
    }, FOLDER_AUTO_EXPAND_DELAY_MS);
  }, [clearAutoExpandTimer, setExpandedFolderIds]);

  const getValidDropInstruction = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string): FolderDropInstruction | null => {
    const sourceId = draggingFolderId;
    if (!sourceId || sourceId === targetId) return null;

    const sourceFolder = folderMap.get(sourceId);
    const targetFolder = folderMap.get(targetId);
    if (!sourceFolder || !targetFolder) return null;

    const position = getFolderDropPosition(event);
    const targetParentId = getFolderDropParentId(targetFolder, targetId, position);
    if (isFolderAncestorOf(sourceId, targetParentId, getChildFolders)) return null;

    return { sourceId, targetId, position };
  }, [draggingFolderId, folderMap, getChildFolders]);

  const commitFolderDrop = useCallback(async (instruction: FolderDropInstruction) => {
    const sourceFolder = folderMap.get(instruction.sourceId);
    const targetFolder = folderMap.get(instruction.targetId);
    if (!sourceFolder || !targetFolder) return;

    const targetParentId = getFolderDropParentId(targetFolder, instruction.targetId, instruction.position);
    if (isFolderAncestorOf(instruction.sourceId, targetParentId, getChildFolders)) return;

    const nextSiblings = createReorderedSiblingList(sourceFolder, targetFolder, targetParentId, instruction.position, rootFolders, getChildFolders);

    for (const [orderIndex, folder] of nextSiblings.entries()) {
      const folderId = getFolderId(folder);
      if (!folderId) continue;

      const currentParentId = getParentFolderId(folder);
      const currentOrderIndex = getFolderOrderIndex(folder);
      if (currentParentId === targetParentId && currentOrderIndex === orderIndex) continue;

      await updateFolder(folderId, { parentFolderId: targetParentId, orderIndex });
    }

    if (instruction.position === "inside") {
      setExpandedFolderIds((current) => new Set(current).add(instruction.targetId));
    }
  }, [folderMap, getChildFolders, rootFolders, setExpandedFolderIds, updateFolder]);

  const handleFolderDragStart = useCallback((event: ReactDragEvent<HTMLElement>, folderId: string) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(FOLDER_DND_MIME_TYPE, folderId);
    event.dataTransfer.setData("text/plain", folderId);
    applyFolderDragPreview(event);
    setDraggingFolderId(folderId);
  }, []);

  const handleFolderDragOver = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string) => {
    const instruction = getValidDropInstruction(event, targetId);
    if (!instruction) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    scheduleAutoExpand(instruction);
    setDropInstruction((current) => isDropInstructionEqual(current, instruction) ? current : instruction);
  }, [getValidDropInstruction, scheduleAutoExpand]);

  const handleFolderDragLeave = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;

    setDropInstruction((current) => {
      if (current?.targetId !== targetId) return current;
      clearAutoExpandTimer();
      return null;
    });
  }, [clearAutoExpandTimer]);

  const handleFolderDrop = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string) => {
    const instruction = getValidDropInstruction(event, targetId);
    if (!instruction) return;

    event.preventDefault();
    event.stopPropagation();
    setDropInstruction(null);
    void commitFolderDrop(instruction).finally(clearDragState);
  }, [clearDragState, commitFolderDrop, getValidDropInstruction]);

  useEffect(() => clearAutoExpandTimer, [clearAutoExpandTimer]);

  return { dragState: { draggingFolderId, dropInstruction }, handleFolderDragStart, handleFolderDragOver, handleFolderDragLeave, handleFolderDrop, handleFolderDragEnd: clearDragState };
};

const DirectoryTreeNode = ({ folder, level, isRootProject, selectedFolderId, expandedFolderIds, dragState, getChildFolders, onToggleFolder, onSelectFolder, onOpenContextMenu, onFolderDragStart, onFolderDragOver, onFolderDragLeave, onFolderDrop, onFolderDragEnd }: DirectoryTreeNodeProps) => {
  const folderId = getFolderId(folder);
  if (!folderId) return null;

  const childFolders = getChildFolders(folderId);
  const hasChildren = childFolders.length > 0;
  const isExpanded = expandedFolderIds.has(folderId);
  const isSelected = selectedFolderId === folderId;
  const isDragging = dragState.draggingFolderId === folderId;
  const dropPosition = dragState.dropInstruction?.targetId === folderId ? dragState.dropInstruction.position : null;
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

  return (
    <div data-folder-id={folderId}>
      <div role="treeitem" aria-level={level} aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected} aria-grabbed={isDragging || undefined} draggable onDragStart={(event) => onFolderDragStart(event, folderId)} onDragOver={(event) => onFolderDragOver(event, folderId)} onDragLeave={(event) => onFolderDragLeave(event, folderId)} onDrop={(event) => onFolderDrop(event, folderId)} onDragEnd={onFolderDragEnd} onContextMenu={handleContextMenu} data-folder-drop-position={dropPosition ?? undefined} className={cn("group/directory-tree-row relative flex h-8 items-center gap-2 rounded-[8px] pr-2 text-[14px] font-medium text-[var(--app-sidebar-text)] transition-[background,opacity] hover:bg-[#eeeeee]", isSelected && "bg-[#e9e9e9]", isDragging && "opacity-45", dropPosition === "inside" && "bg-[#e2e2e2] ring-1 ring-[#c7c7c7]")} style={{ paddingLeft: rowPaddingLeft }}>
        {dropPosition === "before" ? <span aria-hidden="true" className="pointer-events-none absolute left-2 right-2 top-0 h-0.5 rounded-full bg-[#8f8f8f]" /> : null}
        {dropPosition === "after" ? <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#8f8f8f]" /> : null}
        {hasChildren ? <button type="button" onClick={handleToggleClick} aria-label={isExpanded ? `${folderName} を閉じる` : `${folderName} を開く`} className="relative flex h-8 w-4 shrink-0 items-center justify-center rounded-[4px] text-[var(--app-sidebar-icon)]"><Icon className="layered-directory-row-icon absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 transition-opacity group-hover/directory-tree-row:opacity-0" /><IconChevronRight className={cn("absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 opacity-0 transition-opacity group-hover/directory-tree-row:opacity-100", isExpanded && "rotate-90")} /></button> : <span className="flex h-8 w-4 shrink-0 items-center justify-center text-[var(--app-sidebar-icon)]"><Icon className="layered-directory-row-icon h-4 w-4" /></span>}
        <button type="button" onClick={handleRowClick} title={folderName} className="flex h-8 min-w-0 flex-1 items-center text-left leading-[20px] text-inherit"><span className="min-w-0 flex-1 truncate">{folderName}</span></button>
      </div>
      {hasChildren && isExpanded ? <div role="group" className="mt-0.5 flex flex-col gap-0.5">{childFolders.map((childFolder) => <DirectoryTreeNode key={getFolderId(childFolder)} folder={childFolder} level={level + 1} isRootProject={false} selectedFolderId={selectedFolderId} expandedFolderIds={expandedFolderIds} dragState={dragState} getChildFolders={getChildFolders} onToggleFolder={onToggleFolder} onSelectFolder={onSelectFolder} onOpenContextMenu={onOpenContextMenu} onFolderDragStart={onFolderDragStart} onFolderDragOver={onFolderDragOver} onFolderDragLeave={onFolderDragLeave} onFolderDrop={onFolderDrop} onFolderDragEnd={onFolderDragEnd} />)}</div> : null}
    </div>
  );
};

const ProjectListSidebar = () => {
  const { rootFolders, getChildFolders, getNextOrderIndex, createCardSet, loading, error } = useLibraryHierarchyData();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const { contextMenuElement, openContextMenu } = useFolderContextMenu({ createFolder, updateFolder, deleteFolder, createCardSet, getNextOrderIndex, setExpandedFolderIds });
  const { dragState, handleFolderDragStart, handleFolderDragOver, handleFolderDragLeave, handleFolderDrop, handleFolderDragEnd } = useFolderDragDrop({ rootFolders, getChildFolders, updateFolder, setExpandedFolderIds });
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const selectedFolderId = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedFolderId : null;
  const handleToggleFolder = useCallback((folderId: string) => setExpandedFolderIds((current) => { const next = new Set(current); if (next.has(folderId)) next.delete(folderId); else next.add(folderId); return next; }), []);
  const handleSelectFolder = useCallback((folderId: string) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: folderId, selectedItem: null } }), [openExplorerTab]);

  if (loading) return <aside aria-label="Project list explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[13px] text-[#9aa1ad]">読み込み中...</aside>;
  if (error) return <aside aria-label="Project list explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[13px] text-[#b48a8a]">{error}</aside>;

  return <><aside aria-label="Project list explorer" className="h-full min-h-0 overflow-hidden"><div className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1"><div role="tree" aria-label="プロジェクト" className="flex flex-col gap-0.5">{rootFolders.length > 0 ? rootFolders.map((folder) => <DirectoryTreeNode key={getFolderId(folder)} folder={folder} level={ROOT_LEVEL} isRootProject selectedFolderId={selectedFolderId} expandedFolderIds={expandedFolderIds} dragState={dragState} getChildFolders={getChildFolders} onToggleFolder={handleToggleFolder} onSelectFolder={handleSelectFolder} onOpenContextMenu={openContextMenu} onFolderDragStart={handleFolderDragStart} onFolderDragOver={handleFolderDragOver} onFolderDragLeave={handleFolderDragLeave} onFolderDrop={handleFolderDrop} onFolderDragEnd={handleFolderDragEnd} />) : <p className="px-1 py-2 text-[13px] font-medium text-[#9aa1ad]">フォルダがありません</p>}</div></div></aside>{contextMenuElement}</>;
};

const LibraryHierarchySidebar = ({ projectRootId = null }: LibraryHierarchySidebarProps) => {
  const { rootFolders, getChildFolders, getNextOrderIndex, createCardSet, loading, error } = useLibraryHierarchyData();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set(getRootFolderIds(rootFolders)));
  const { contextMenuElement, openContextMenu } = useFolderContextMenu({ createFolder, updateFolder, deleteFolder, createCardSet, getNextOrderIndex, setExpandedFolderIds });
  const visibleRootFolders = useMemo(() => projectRootId ? getChildFolders(projectRootId) : rootFolders, [getChildFolders, projectRootId, rootFolders]);
  const { dragState, handleFolderDragStart, handleFolderDragOver, handleFolderDragLeave, handleFolderDrop, handleFolderDragEnd } = useFolderDragDrop({ rootFolders, getChildFolders, updateFolder, setExpandedFolderIds });
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const selectedFolderId = activeTab?.kind === "explorer" && !activeTab.explorerState.isSectionListMode ? activeTab.explorerState.selectedFolderId : null;
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

  return <><aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-hidden"><div className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1"><div role="tree" aria-label="ライブラリ" className="flex flex-col gap-0.5">{visibleRootFolders.length > 0 ? visibleRootFolders.map((folder) => <DirectoryTreeNode key={getFolderId(folder)} folder={folder} level={firstLevel} isRootProject={!projectRootId} selectedFolderId={selectedFolderId} expandedFolderIds={expandedFolderIds} dragState={dragState} getChildFolders={getChildFolders} onToggleFolder={handleToggleFolder} onSelectFolder={handleSelectFolder} onOpenContextMenu={openContextMenu} onFolderDragStart={handleFolderDragStart} onFolderDragOver={handleFolderDragOver} onFolderDragLeave={handleFolderDragLeave} onFolderDrop={handleFolderDrop} onFolderDragEnd={handleFolderDragEnd} />) : <p className="px-1 py-2 text-[13px] font-medium text-[#9aa1ad]">{emptyMessage}</p>}</div></div></aside>{contextMenuElement}</>;
};

export { LibraryHierarchySidebar, ProjectListSidebar };
