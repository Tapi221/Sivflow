import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CardSetContextMenuAction } from "@web-renderer/chip/panel/rightclickpanel.desktop/CardSetContextMenu.desktop";
import { CARD_SET_CONTEXT_MENU_HEIGHT, CARD_SET_CONTEXT_MENU_PANEL_ID, CARD_SET_CONTEXT_MENU_WIDTH, CardSetContextMenu } from "@web-renderer/chip/panel/rightclickpanel.desktop/CardSetContextMenu.desktop";
import type { DocumentContextMenuAction } from "@web-renderer/chip/panel/rightclickpanel.desktop/DocumentContextMenu.desktop";
import { DOCUMENT_CONTEXT_MENU_HEIGHT, DOCUMENT_CONTEXT_MENU_PANEL_ID, DOCUMENT_CONTEXT_MENU_WIDTH, DocumentContextMenu } from "@web-renderer/chip/panel/rightclickpanel.desktop/DocumentContextMenu.desktop";
import { LAYERED_COLOR_MENU_HEIGHT, LAYERED_COLOR_MENU_WIDTH, LayeredColorMenu } from "@web-renderer/chip/panel/rightclickpanel.desktop/LayeredColorMenu.desktop";
import type { LayeredProjectMenuAction, LayeredProjectMenuActionId, LayeredProjectMenuSubmenuAnchor } from "@web-renderer/chip/panel/rightclickpanel.desktop/LayeredProjectMenu";
import { LAYERED_PROJECT_MENU_HEIGHT, LAYERED_PROJECT_MENU_PANEL_ID, LAYERED_PROJECT_MENU_WIDTH, LayeredProjectMenu } from "@web-renderer/chip/panel/rightclickpanel.desktop/LayeredProjectMenu";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, useRightClickPanelDismiss } from "@web-renderer/chip/panel/rightClickPanel.utils";
import { LoadingSpinner } from "@web-renderer/components/common/LoadingSpinner";
import { cn } from "@web-renderer/lib/utils";
import type { Dispatch, DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from "react";
import { useCardSets } from "@/components/card/hooks/useCardSets";
import { ExplorerChromeCardSetIcon, ExplorerChromeFolderIcon, ExplorerChromePdfIcon } from "@/components/explorer/icons";
import { getFolderProjectColor } from "@/components/folder/explorer/model/projectColor";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { DEFAULT_NEW_CARD_SET_NAME, DEFAULT_NEW_FOLDER_NAME, getFolderId, getParentFolderId, UNTITLED_FOLDER_NAME, UNTITLED_PROJECT_NAME } from "@/components/folder/explorer/model/utils";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useDocumentCommands } from "@/features/document/hooks/useDocumentCommands";
import { useDocumentsRead } from "@/features/document/hooks/useDocumentsRead";
import { useFolderCommands } from "@/features/folder/hooks/useFolderCommands";
import { useFoldersRead } from "@/features/folder/hooks/useFoldersRead";
import { useNotes } from "@/features/note/hooks/useNotes";
import { LayeredTreeDropIndicator } from "./layeredTreeDnd";
import { LAYERED_TREE_INDENT_PX, LAYERED_TREE_ROOT_DROP_INDICATOR_LEFT_PX, LAYERED_TREE_ROOT_LEVEL } from "./layeredTreeDnd.constants";
import type { LayeredTreeDragState } from "./layeredTreeDnd.types";
import { getLayeredTreeDropIndicatorLeft, isLayeredTreeAppendDropTarget } from "./layeredTreeDnd.utils";
import { useLayeredTreeDragDrop } from "./useLayeredTreeDragDrop";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";
import type { CardSet, DocumentItem, Note, SelectedExplorerItem } from "@/types";



type FolderCommandSet = ReturnType<typeof useFolderCommands>;
type CardSetCommandSet = ReturnType<typeof useCardSets>;
type NoteCommandSet = ReturnType<typeof useNotes>;
type DocumentCommandSet = ReturnType<typeof useDocumentCommands>;
type DirectoryFolderNode = FolderTreeNode & { id: string; };
type DirectoryTreeNodeProps = {
  folder: DirectoryFolderNode;
  level: number;
  isRootProject: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  expandedFolderIds: Set<string>;
  dragState: LayeredTreeDragState;
  getChildFolders: (folderId: string) => DirectoryFolderNode[];
  getCardSets: (folderId: string | null) => CardSet[];
  getFolderDocuments: (folderId: string | null) => DocumentItem[];
  getFolderNotes: (folderId: string | null) => Note[];
  onToggleFolder: (folderId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectCardSet: (cardSet: CardSet) => void;
  onSelectDocument: (document: DocumentItem) => void;
  onSelectNote: (note: Note) => void;
  onOpenContextMenu: (event: ReactMouseEvent<HTMLElement>, folder: DirectoryFolderNode, isRootProject: boolean) => void;
  onOpenCardSetContextMenu: (event: ReactMouseEvent<HTMLElement>, cardSet: CardSet) => void;
  onOpenDocumentContextMenu: (event: ReactMouseEvent<HTMLElement>, document: DocumentItem) => void;
  onOpenNoteContextMenu: (event: ReactMouseEvent<HTMLElement>, note: Note) => void;
  onFolderDragStart: (event: ReactDragEvent<HTMLElement>, folderId: string) => void;
  onFolderDragOver: (event: ReactDragEvent<HTMLElement>, targetId: string) => void;
  onFolderDragLeave: (event: ReactDragEvent<HTMLElement>, targetId: string) => void;
  onFolderDrop: (event: ReactDragEvent<HTMLElement>, targetId: string) => void;
  onFolderDragEnd: () => void;
};
type DirectoryEntityRowProps = {
  id: string;
  label: string;
  kind: "cardSet" | "document" | "note";
  level: number;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLElement>) => void;
};
type ProjectListSidebarProps = {
  onOpenCardSet?: () => void;
};
type LibraryHierarchySidebarProps = {
  parentFolderId?: string | null;
  onOpenCardSet?: () => void;
};
type FolderContextMenuState = {
  folderId: string;
  folderName: string;
  folderColor: string | null;
  isFavorite: boolean;
  isRootProject: boolean;
  x: number;
  y: number;
};
type CardSetContextMenuState = {
  cardSetId: string;
  cardSetName: string;
  x: number;
  y: number;
};
type DocumentContextMenuState = {
  documentId: string;
  documentName: string;
  x: number;
  y: number;
};
type NoteContextMenuState = {
  noteId: string;
  noteTitle: string;
  x: number;
  y: number;
};
type FolderColorMenuState = {
  x: number;
  y: number;
};
type UseFolderContextMenuParams = {
  createFolder: FolderCommandSet["createFolder"];
  updateFolder: FolderCommandSet["updateFolder"];
  deleteFolder: FolderCommandSet["deleteFolder"];
  createCardSet: CardSetCommandSet["createCardSet"];
  createNote: NoteCommandSet["createNote"];
  openCardSet: (cardSet: CardSet, folderId: string | null) => void;
  openNoteTab: (params: { noteId: string; title: string; folderId: string | null; }) => void;
  getNextOrderIndex: (folderId: string | null, resolvedFolderId?: string) => number;
  setExpandedFolderIds: Dispatch<SetStateAction<Set<string>>>;
};
type UseCardSetContextMenuParams = {
  updateCardSet: CardSetCommandSet["updateCardSet"];
  deleteCardSet: CardSetCommandSet["deleteCardSet"];
};
type UseNoteContextMenuParams = {
  updateNote: NoteCommandSet["updateNote"];
  deleteNote: NoteCommandSet["deleteNote"];
};
type UseDocumentContextMenuParams = {
  updateDocument: DocumentCommandSet["updateDocument"];
  deleteDocument: DocumentCommandSet["deleteDocument"];
};
type UseFolderLayeredTreeDragDropParams = {
  rootFolders: DirectoryFolderNode[];
  rootDropParentId: string | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  getChildFolders: (folderId: string) => DirectoryFolderNode[];
  updateFolder: FolderCommandSet["updateFolder"];
  setExpandedFolderIds: Dispatch<SetStateAction<Set<string>>>;
};
type SidebarLoadingStateProps = {
  ariaLabel: string;
  label: string;
};
type IconProps = {
  className?: string;
};
type LegacyDocumentFields = {
  folder_id?: string | null;
  file_name?: string | null;
  order_index?: number;
};
type LegacyCardSetFields = {
  folder_id?: string | null;
  order_index?: number;
};
type LegacyNoteFields = {
  folder_id?: string | null;
  order_index?: number;
};



const DEFAULT_NEW_NOTE_NAME = "新規ノート";
const EMPTY_COLLECTION: never[] = [];
const LIBRARY_TITLE = "Library";
const LAYERED_PROJECT_MENU_DIMENSIONS = { width: LAYERED_PROJECT_MENU_WIDTH, height: LAYERED_PROJECT_MENU_HEIGHT };
const CARD_SET_CONTEXT_MENU_DIMENSIONS = { width: CARD_SET_CONTEXT_MENU_WIDTH, height: CARD_SET_CONTEXT_MENU_HEIGHT };
const DOCUMENT_CONTEXT_MENU_DIMENSIONS = { width: DOCUMENT_CONTEXT_MENU_WIDTH, height: DOCUMENT_CONTEXT_MENU_HEIGHT };
const LAYERED_PROJECT_SUBMENU_OVERLAP_PX = 6;



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
const toDirectoryFolderNodes = (folders: FolderTreeNode[]): DirectoryFolderNode[] => {
  return folders.map(toDirectoryFolderNode).filter((folder): folder is DirectoryFolderNode => folder !== null);
};
const getDirectoryFolderParentId = (folder: FolderTreeNode): string | null => getParentFolderId(folder) ?? null;
const getCardSetFolderId = (cardSet: CardSet, fallbackFolderId: string | null = null): string | null => {
  return cardSet.folderId ?? (cardSet as CardSet & LegacyCardSetFields).folder_id ?? fallbackFolderId;
};
const getDocumentFolderId = (document: DocumentItem, fallbackFolderId: string | null = null): string | null => {
  return document.folderId ?? (document as DocumentItem & LegacyDocumentFields).folder_id ?? fallbackFolderId;
};
const getNoteFolderId = (note: Note, fallbackFolderId: string | null = null): string | null => {
  return note.folderId ?? (note as Note & LegacyNoteFields).folder_id ?? fallbackFolderId;
};
const getCardSetName = (cardSet: CardSet): string => cardSet.name?.trim() ?? "無題のセット";
const getDocumentName = (document: DocumentItem): string => {
  return (document.title?.trim() || document.fileName?.trim() || (document as DocumentItem & LegacyDocumentFields).file_name?.trim()) ?? "無題のPDF";
};
const getNoteTitle = (note: Note): string => note.title?.trim() ?? "無題のノート";
const getRootFolderIds = (rootFolders: DirectoryFolderNode[]): string[] => rootFolders.map((folder) => folder.id);
const getSelectedFolderIdFromActiveTab = (tab: WorkspaceTab | null): string | null => {
  if (!tab || tab.sectionKey !== "library") return null;
  if (tab.kind === "explorer" && !tab.explorerState.isSectionListMode) return tab.explorerState.selectedFolderId;
  if (tab.kind === "document" || tab.kind === "card" || tab.kind === "note") return tab.folderId;
  return null;
};
const getSelectedItemFromActiveTab = (tab: WorkspaceTab | null): SelectedExplorerItem => {
  if (!tab || tab.sectionKey !== "library") return null;
  if (tab.kind === "explorer" && !tab.explorerState.isSectionListMode) return tab.explorerState.selectedItem;
  if (tab.kind === "document") return { type: "document", id: tab.documentId };
  if (tab.kind === "card") return { type: "card", id: tab.cardId };
  if (tab.kind === "note") return { type: "note", id: tab.noteId };
  return null;
};
const isSelectedExplorerItem = (selectedItem: SelectedExplorerItem, type: "cardSet" | "document" | "note", id: string): boolean => {
  return selectedItem !== null && "id" in selectedItem && selectedItem.type === type && selectedItem.id === id;
};
const createFolderContextMenuState = (event: ReactMouseEvent<HTMLElement>, folder: DirectoryFolderNode, isRootProject: boolean): FolderContextMenuState => {
  return { folderId: folder.id, folderName: getFolderName(folder, isRootProject), folderColor: getFolderProjectColor(folder), isFavorite: getFolderIsFavorite(folder), isRootProject, ...clampRightClickPanelPosition(event.clientX, event.clientY, LAYERED_PROJECT_MENU_DIMENSIONS) };
};
const createCardSetContextMenuState = (event: ReactMouseEvent<HTMLElement>, cardSet: CardSet): CardSetContextMenuState => {
  return { cardSetId: cardSet.id, cardSetName: getCardSetName(cardSet), ...clampRightClickPanelPosition(event.clientX, event.clientY, CARD_SET_CONTEXT_MENU_DIMENSIONS) };
};
const createDocumentContextMenuState = (event: ReactMouseEvent<HTMLElement>, document: DocumentItem): DocumentContextMenuState => {
  return { documentId: document.id, documentName: getDocumentName(document), ...clampRightClickPanelPosition(event.clientX, event.clientY, DOCUMENT_CONTEXT_MENU_DIMENSIONS) };
};
const createNoteContextMenuState = (event: ReactMouseEvent<HTMLElement>, note: Note): NoteContextMenuState => {
  return { noteId: note.id, noteTitle: getNoteTitle(note), ...clampRightClickPanelPosition(event.clientX, event.clientY, DOCUMENT_CONTEXT_MENU_DIMENSIONS) };
};
const useLibraryHierarchyData = () => {
  const { folders, loading: foldersLoading, error: foldersError } = useFoldersRead();
  const { cardSets, loading: cardSetsLoading, createCardSet, updateCardSet, deleteCardSet } = useCardSets();
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote } = useNotes();
  const { documents, loading: documentsLoading, error: documentsError } = useDocumentsRead();
  const treeFolders = useMemo(() => folders as FolderTreeNode[], [folders]);
  const { rootFolders, getChildFolders, getNextOrderIndex, getCardSets, getFolderItems } = useExplorerDerivedData({ treeFolders, treeCards: EMPTY_COLLECTION, cardSets, documents, notes, isFiltering: false });
  const directoryRootFolders = useMemo(() => toDirectoryFolderNodes(rootFolders), [rootFolders]);
  const getDirectoryChildFolders = useCallback((folderId: string): DirectoryFolderNode[] => toDirectoryFolderNodes(getChildFolders(folderId)), [getChildFolders]);
  const getFolderDocuments = useCallback((folderId: string | null): DocumentItem[] => getFolderItems(folderId).flatMap((item) => item.type === "document" ? [item.data] : []), [getFolderItems]);
  const getFolderNotes = useCallback((folderId: string | null): Note[] => getFolderItems(folderId).flatMap((item) => item.type === "note" ? [item.data] : []), [getFolderItems]);
  return { rootFolders: directoryRootFolders, getChildFolders: getDirectoryChildFolders, getNextOrderIndex, getCardSets, getFolderDocuments, getFolderNotes, createCardSet, updateCardSet, deleteCardSet, createNote, updateNote, deleteNote, loading: foldersLoading || cardSetsLoading || documentsLoading || notesLoading, error: foldersError ?? documentsError };
};
const useFolderContextMenu = ({ createFolder, updateFolder, deleteFolder, createCardSet, createNote, openCardSet, openNoteTab, getNextOrderIndex, setExpandedFolderIds }: UseFolderContextMenuParams) => {
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
      { id: "rename", onSelect: () => {
        const nextFolderName = window.prompt(isRootProject ? "プロジェクト名を変更" : "フォルダ名を変更", folderName)?.trim(); closeContextMenu(); if (nextFolderName && nextFolderName !== folderName) void updateFolder(folderId, { folderName: nextFolderName, name: nextFolderName }); } },
      { id: "create-note", onSelect: () => {
        closeContextMenu(); void (async () => {
          const note = await createNote(DEFAULT_NEW_NOTE_NAME, folderId, { orderIndex: getNextOrderIndex(folderId) }); openNoteTab({ noteId: note.id, title: note.title, folderId: note.folderId }); })(); } },
      { id: "create-card-set", onSelect: () => {
        closeContextMenu(); void (async () => {
          const cardSet = await createCardSet(DEFAULT_NEW_CARD_SET_NAME, folderId); openCardSet(cardSet, folderId); })(); } },
      { id: "create-folder", onSelect: () => {
        closeContextMenu(); void createFolder(DEFAULT_NEW_FOLDER_NAME, folderId); setExpandedFolderIds((current) => new Set(current).add(folderId)); } },
      { id: "import-pdf", onSelect: () => {
        handleToolbarAddDocument(); closeContextMenu(); } },
      { id: "add-to-favorites", disabled: isFavorite, onSelect: () => {
        closeContextMenu(); void updateFolder(folderId, { isFavorite: true }); } },
      { id: "hide", onSelect: () => {
        closeContextMenu(); void updateFolder(folderId, { isHidden: true }); } },
      { id: "delete", onSelect: () => {
        closeContextMenu(); void deleteFolder(folderId); } },
    ];
  }, [closeContextMenu, contextMenu, createCardSet, createFolder, createNote, deleteFolder, getNextOrderIndex, handleToolbarAddDocument, openCardSet, openNoteTab, setExpandedFolderIds, updateFolder]);
  const contextMenuElement = <><input ref={fileInputRef} type="file" accept={currentFileAccept} className="hidden" tabIndex={-1} onChange={handleToolbarFileInputChange} />{contextMenu ? <LayeredProjectMenu x={contextMenu.x} y={contextMenu.y} actions={actions} menuRef={menuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} panelId={LAYERED_PROJECT_MENU_PANEL_ID} openSubmenuId={colorMenu ? "change-color" : null} submenuElement={colorMenu ? <LayeredColorMenu x={colorMenu.x} y={colorMenu.y} currentColor={contextMenu.folderColor} menuRef={colorMenuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} onSelectColor={handleSelectColor} /> : null} onOpenSubmenu={handleOpenSubmenu} onCloseSubmenu={() => setColorMenu(null)} /> : null}</>;
  return { contextMenuElement, openContextMenu };
};
const useCardSetContextMenu = ({ updateCardSet, deleteCardSet }: UseCardSetContextMenuParams) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<CardSetContextMenuState | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  useRightClickPanelDismiss(CARD_SET_CONTEXT_MENU_PANEL_ID, contextMenu !== null, menuRef, closeContextMenu);
  const openContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>, cardSet: CardSet) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(createCardSetContextMenuState(event, cardSet));
  }, []);
  const actions = useMemo<CardSetContextMenuAction[]>(() => {
    if (!contextMenu) return [];
    const { cardSetId, cardSetName } = contextMenu;
    return [
      { id: "rename", label: "名前を変更", onSelect: () => {
        const nextCardSetName = window.prompt("カードセット名を変更", cardSetName)?.trim(); closeContextMenu(); if (nextCardSetName && nextCardSetName !== cardSetName) void updateCardSet(cardSetId, { name: nextCardSetName }); } },
      { id: "delete", label: "削除", danger: true, onSelect: () => {
        closeContextMenu(); void deleteCardSet(cardSetId); } },
    ];
  }, [closeContextMenu, contextMenu, deleteCardSet, updateCardSet]);
  const contextMenuElement = contextMenu ? <CardSetContextMenu x={contextMenu.x} y={contextMenu.y} actions={actions} menuRef={menuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} panelId={CARD_SET_CONTEXT_MENU_PANEL_ID} /> : null;
  return { contextMenuElement, openContextMenu };
};
const useNoteContextMenu = ({ updateNote, deleteNote }: UseNoteContextMenuParams) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<NoteContextMenuState | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  useRightClickPanelDismiss(DOCUMENT_CONTEXT_MENU_PANEL_ID, contextMenu !== null, menuRef, closeContextMenu);
  const openContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>, note: Note) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(createNoteContextMenuState(event, note));
  }, []);
  const actions = useMemo<DocumentContextMenuAction[]>(() => {
    if (!contextMenu) return [];
    const { noteId, noteTitle } = contextMenu;
    return [
      { id: "rename", label: "名前を変更", onSelect: () => {
        const nextNoteTitle = window.prompt("ノート名を変更", noteTitle)?.trim(); closeContextMenu(); if (nextNoteTitle && nextNoteTitle !== noteTitle) void updateNote(noteId, { title: nextNoteTitle }); } },
      { id: "delete", label: "削除", danger: true, onSelect: () => {
        closeContextMenu(); void deleteNote(noteId); } },
    ];
  }, [closeContextMenu, contextMenu, deleteNote, updateNote]);
  const contextMenuElement = contextMenu ? <DocumentContextMenu x={contextMenu.x} y={contextMenu.y} actions={actions} menuRef={menuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} panelId={DOCUMENT_CONTEXT_MENU_PANEL_ID} /> : null;
  return { contextMenuElement, openContextMenu };
};
const useDocumentContextMenu = ({ updateDocument, deleteDocument }: UseDocumentContextMenuParams) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<DocumentContextMenuState | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  useRightClickPanelDismiss(DOCUMENT_CONTEXT_MENU_PANEL_ID, contextMenu !== null, menuRef, closeContextMenu);
  const openContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>, document: DocumentItem) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(createDocumentContextMenuState(event, document));
  }, []);
  const actions = useMemo<DocumentContextMenuAction[]>(() => {
    if (!contextMenu) return [];
    const { documentId, documentName } = contextMenu;
    return [
      { id: "rename", label: "名前を変更", onSelect: () => {
        const nextDocumentName = window.prompt("PDF名を変更", documentName)?.trim(); closeContextMenu(); if (nextDocumentName && nextDocumentName !== documentName) void updateDocument(documentId, { title: nextDocumentName, fileName: nextDocumentName }); } },
      { id: "delete", label: "削除", danger: true, onSelect: () => {
        closeContextMenu(); void deleteDocument(documentId); } },
    ];
  }, [closeContextMenu, contextMenu, deleteDocument, updateDocument]);
  const contextMenuElement = contextMenu ? <DocumentContextMenu x={contextMenu.x} y={contextMenu.y} actions={actions} menuRef={menuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} panelId={DOCUMENT_CONTEXT_MENU_PANEL_ID} /> : null;
  return { contextMenuElement, openContextMenu };
};
const useFolderLayeredTreeDragDrop = ({ rootFolders, rootDropParentId, scrollContainerRef, getChildFolders, updateFolder, setExpandedFolderIds }: UseFolderLayeredTreeDragDropParams) => {
  const getParentId = useCallback((folder: DirectoryFolderNode): string | null => getDirectoryFolderParentId(folder), []);
  const getOrderIndex = useCallback((folder: DirectoryFolderNode): number => getFolderOrderIndex(folder), []);
  const updateItem = useCallback((folderId: string, patch: { parentId: string | null; orderIndex: number; }) => updateFolder(folderId, { parentFolderId: patch.parentId, orderIndex: patch.orderIndex }), [updateFolder]);
  return useLayeredTreeDragDrop({ rootItems: rootFolders, rootDropParentId, scrollContainerRef, getChildItems: getChildFolders, getParentId, getOrderIndex, updateItem, setExpandedIds: setExpandedFolderIds });
};



const IconChevronRight = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconProjectFolder = ({ className }: IconProps) => <ExplorerChromeFolderIcon className={className} />;
const IconNote = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M4.5 2.75H9.8L12 4.95V13.25H4.5V2.75Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    <path d="M9.75 2.9V5H11.85" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    <path d="M6.25 7.25H10.25M6.25 9.5H10.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);
const SidebarLoadingState = ({ ariaLabel, label }: SidebarLoadingStateProps) => {
  return (
    <aside aria-label={ariaLabel} className="h-full min-h-0 overflow-y-auto px-3 py-1 text-[#9aa1ad]">
      <LoadingSpinner className="h-full min-h-0" label={label} />
    </aside>
  );
};
const DirectoryEntityRow = ({ id, label, kind, level, isSelected, onSelect, onContextMenu }: DirectoryEntityRowProps) => {
  const Icon = kind === "cardSet" ? ExplorerChromeCardSetIcon : kind === "document" ? ExplorerChromePdfIcon : IconNote;
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
  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    if (!onContextMenu) return;
    onContextMenu(event);
  };
  return (
    <div role="treeitem" tabIndex={0} aria-level={level} aria-selected={isSelected} data-directory-entity-id={id} data-directory-entity-kind={kind} onClick={handleClick} onKeyDown={handleKeyDown} onContextMenu={handleContextMenu} className={cn("group/directory-tree-row relative flex h-8 cursor-default items-center gap-2 rounded-lg pr-2 text-sm font-medium text-[var(--app-sidebar-text)] transition-[background,box-shadow,opacity,transform] duration-150 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7c7]", isSelected && "bg-[#e9e9e9]")} style={{ paddingLeft: rowPaddingLeft }}>
      <span className="flex h-8 w-4 shrink-0 items-center justify-center text-[var(--app-sidebar-icon)]"><Icon className="h-4 w-4" /></span>
      <span title={label} className="flex h-8 min-w-0 flex-1 items-center text-left leading-[20px] text-inherit"><span className="min-w-0 flex-1 truncate">{label}</span></span>
    </div>
  );
};
const DirectoryTreeNode = ({ folder, level, isRootProject, selectedFolderId, selectedItem, expandedFolderIds, dragState, getChildFolders, getCardSets, getFolderDocuments, getFolderNotes, onToggleFolder, onSelectFolder, onSelectCardSet, onSelectDocument, onSelectNote, onOpenContextMenu, onOpenCardSetContextMenu, onOpenDocumentContextMenu, onOpenNoteContextMenu, onFolderDragStart, onFolderDragOver, onFolderDragLeave, onFolderDrop, onFolderDragEnd }: DirectoryTreeNodeProps) => {
  const folderId = folder.id;
  const childFolders = getChildFolders(folderId);
  const childCardSets = getCardSets(folderId);
  const childDocuments = getFolderDocuments(folderId);
  const childNotes = getFolderNotes(folderId);
  const hasChildren = childFolders.length > 0 || childCardSets.length > 0 || childDocuments.length > 0 || childNotes.length > 0;
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
  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    onOpenContextMenu(event, folder, isRootProject);
  };
  return (
    <div data-folder-id={folderId}>
      <div role="treeitem" tabIndex={0} aria-level={level} aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected} aria-grabbed={isDragging || undefined} draggable data-layered-tree-row="true" data-folder-tree-row="true" onClick={handleRowClick} onKeyDown={handleRowKeyDown} onDragStart={(event) => onFolderDragStart(event, folderId)} onDragEnter={(event) => onFolderDragOver(event, folderId)} onDragOver={(event) => onFolderDragOver(event, folderId)} onDragLeave={(event) => onFolderDragLeave(event, folderId)} onDrop={(event) => onFolderDrop(event, folderId)} onDragEnd={onFolderDragEnd} onContextMenu={handleContextMenu} data-folder-drop-position={dropPosition ?? undefined} className={cn("group/directory-tree-row relative flex h-8 cursor-grab items-center gap-2 rounded-lg pr-2 text-sm font-medium text-[var(--app-sidebar-text)] transition-[background,box-shadow,opacity,transform] duration-150 hover:bg-slate-100 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7c7]", isSelected && "bg-[#e9e9e9]", isDragging && "scale-[0.995] opacity-35", dropPosition === "inside" && "bg-[#e2e2e2] shadow-[inset_0_0_0_1px_#c7c7c7]")} style={{ paddingLeft: rowPaddingLeft }}>
        {dropPosition === "before" ? <LayeredTreeDropIndicator position="before" left={dropIndicatorLeft} /> : null}
        {dropPosition === "after" ? <LayeredTreeDropIndicator position="after" left={dropIndicatorLeft} /> : null}
        {hasChildren ? (
          <button type="button" onClick={handleToggleClick} aria-label={isExpanded ? `${folderName} を閉じる` : `${folderName} を開く`} className="relative flex h-8 w-4 shrink-0 items-center justify-center rounded text-[var(--app-sidebar-icon)]">
            <Icon className="layered-directory-row-icon absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 transition-opacity group-hover/directory-tree-row:opacity-0" />
            <IconChevronRight className={cn("absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 opacity-0 transition-opacity group-hover/directory-tree-row:opacity-100", isExpanded && "rotate-90")} />
          </button>
        ) : (
          <span className="flex h-8 w-4 shrink-0 items-center justify-center text-[var(--app-sidebar-icon)]"><Icon className="layered-directory-row-icon h-4 w-4" /></span>
        )}
        <span title={folderName} className="flex h-8 min-w-0 flex-1 items-center text-left leading-[20px] text-inherit"><span className="min-w-0 flex-1 truncate">{folderName}</span></span>
      </div>
      {hasChildren && isExpanded ? (
        <div role="group" className="mt-0.5 flex flex-col gap-0.5">
          {childFolders.map((childFolder) => <DirectoryTreeNode key={childFolder.id} folder={childFolder} level={level + 1} isRootProject={false} selectedFolderId={selectedFolderId} selectedItem={selectedItem} expandedFolderIds={expandedFolderIds} dragState={dragState} getChildFolders={getChildFolders} getCardSets={getCardSets} getFolderDocuments={getFolderDocuments} getFolderNotes={getFolderNotes} onToggleFolder={onToggleFolder} onSelectFolder={onSelectFolder} onSelectCardSet={onSelectCardSet} onSelectDocument={onSelectDocument} onSelectNote={onSelectNote} onOpenContextMenu={onOpenContextMenu} onOpenCardSetContextMenu={onOpenCardSetContextMenu} onOpenDocumentContextMenu={onOpenDocumentContextMenu} onOpenNoteContextMenu={onOpenNoteContextMenu} onFolderDragStart={onFolderDragStart} onFolderDragOver={onFolderDragOver} onFolderDragLeave={onFolderDragLeave} onFolderDrop={onFolderDrop} onFolderDragEnd={onFolderDragEnd} />)}
          {childNotes.map((note) => <DirectoryEntityRow key={note.id} id={note.id} kind="note" label={getNoteTitle(note)} level={level + 1} isSelected={isSelectedExplorerItem(selectedItem, "note", note.id)} onSelect={() => onSelectNote(note)} onContextMenu={(event) => onOpenNoteContextMenu(event, note)} />)}
          {childCardSets.map((cardSet) => <DirectoryEntityRow key={cardSet.id} id={cardSet.id} kind="cardSet" label={getCardSetName(cardSet)} level={level + 1} isSelected={isSelectedExplorerItem(selectedItem, "cardSet", cardSet.id)} onSelect={() => onSelectCardSet(cardSet)} onContextMenu={(event) => onOpenCardSetContextMenu(event, cardSet)} />)}
          {childDocuments.map((document) => <DirectoryEntityRow key={document.id} id={document.id} kind="document" label={getDocumentName(document)} level={level + 1} isSelected={isSelectedExplorerItem(selectedItem, "document", document.id)} onSelect={() => onSelectDocument(document)} onContextMenu={(event) => onOpenDocumentContextMenu(event, document)} />)}
        </div>
      ) : null}
    </div>
  );
};
const ProjectListSidebarView = ({ onOpenCardSet }: ProjectListSidebarProps) => {
  const { rootFolders, getChildFolders, getCardSets, getFolderDocuments, getFolderNotes, getNextOrderIndex, createCardSet, updateCardSet, deleteCardSet, createNote, updateNote, deleteNote, loading, error } = useLibraryHierarchyData();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const { updateDocument, deleteDocument } = useDocumentCommands();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const openDocumentTab = useWorkspaceTabsStore((state) => state.openDocumentTab);
  const openNoteTab = useWorkspaceTabsStore((state) => state.openNoteTab);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const handleOpenCardSet = useCallback((cardSet: CardSet, fallbackFolderId: string | null = null) => {
    openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: getCardSetFolderId(cardSet, fallbackFolderId), selectedItem: { type: "cardSet", id: cardSet.id } } });
    onOpenCardSet?.();
  }, [onOpenCardSet, openExplorerTab]);
  const { contextMenuElement: folderContextMenuElement, openContextMenu: openFolderContextMenu } = useFolderContextMenu({ createFolder, updateFolder, deleteFolder, createCardSet, createNote, openCardSet: handleOpenCardSet, openNoteTab, getNextOrderIndex, setExpandedFolderIds });
  const { contextMenuElement: cardSetContextMenuElement, openContextMenu: openCardSetContextMenu } = useCardSetContextMenu({ updateCardSet, deleteCardSet });
  const { contextMenuElement: documentContextMenuElement, openContextMenu: openDocumentContextMenu } = useDocumentContextMenu({ updateDocument, deleteDocument });
  const { contextMenuElement: noteContextMenuElement, openContextMenu: openNoteContextMenu } = useNoteContextMenu({ updateNote, deleteNote });
  const { dragState, handleItemDragStart, handleItemDragOver, handleItemDragLeave, handleItemDrop, handleItemDragEnd, handleListDragOver, handleListDragLeave, handleListDrop } = useFolderLayeredTreeDragDrop({ rootFolders, rootDropParentId: null, scrollContainerRef, getChildFolders, updateFolder, setExpandedFolderIds });
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const selectedFolderId = useMemo(() => getSelectedFolderIdFromActiveTab(activeTab), [activeTab]);
  const selectedItem = useMemo(() => getSelectedItemFromActiveTab(activeTab), [activeTab]);
  const handleToggleFolder = useCallback((folderId: string) => setExpandedFolderIds((current) => {
    const next = new Set(current); if (next.has(folderId)) next.delete(folderId); else next.add(folderId); return next; }), []);
  const handleSelectFolder = useCallback((folderId: string) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: folderId, selectedItem: null } }), [openExplorerTab]);
  const handleSelectCardSet = useCallback((cardSet: CardSet) => {
    handleOpenCardSet(cardSet); }, [handleOpenCardSet]);
  const handleSelectDocument = useCallback((document: DocumentItem) => openDocumentTab({ documentId: document.id, title: getDocumentName(document), folderId: getDocumentFolderId(document) }), [openDocumentTab]);
  const handleSelectNote = useCallback((note: Note) => openNoteTab({ noteId: note.id, title: getNoteTitle(note), folderId: getNoteFolderId(note) }), [openNoteTab]);
  const isAppendingToRoot = isLayeredTreeAppendDropTarget(dragState, null);
  if (loading) return <SidebarLoadingState ariaLabel="Project list explorer" label="プロジェクトを読み込み中" />;
  if (error) return <aside aria-label="Project list explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-xs text-[#b48a8a]">{error}</aside>;
  return <><aside aria-label="Project list explorer" className="h-full min-h-0 overflow-hidden"><div ref={scrollContainerRef} className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1"><div role="tree" aria-label="プロジェクト" className="flex min-h-full flex-col gap-0.5" onDragOver={handleListDragOver} onDragLeave={handleListDragLeave} onDrop={handleListDrop}>{rootFolders.length > 0 ? rootFolders.map((folder) => <DirectoryTreeNode key={folder.id} folder={folder} level={LAYERED_TREE_ROOT_LEVEL} isRootProject selectedFolderId={selectedFolderId} selectedItem={selectedItem} expandedFolderIds={expandedFolderIds} dragState={dragState} getChildFolders={getChildFolders} getCardSets={getCardSets} getFolderDocuments={getFolderDocuments} getFolderNotes={getFolderNotes} onToggleFolder={handleToggleFolder} onSelectFolder={handleSelectFolder} onSelectCardSet={handleSelectCardSet} onSelectDocument={handleSelectDocument} onSelectNote={handleSelectNote} onOpenContextMenu={openFolderContextMenu} onOpenCardSetContextMenu={openCardSetContextMenu} onOpenDocumentContextMenu={openDocumentContextMenu} onOpenNoteContextMenu={openNoteContextMenu} onFolderDragStart={handleItemDragStart} onFolderDragOver={handleItemDragOver} onFolderDragLeave={handleItemDragLeave} onFolderDrop={handleItemDrop} onFolderDragEnd={handleItemDragEnd} />) : <p className="px-1 py-2 text-xs font-medium text-[#9aa1ad]">項目がありません</p>}{isAppendingToRoot ? <LayeredTreeDropIndicator position="append" left={LAYERED_TREE_ROOT_DROP_INDICATOR_LEFT_PX} className="mx-2" /> : null}<div aria-hidden="true" className="min-h-8 flex-1" /></div></div></aside>{folderContextMenuElement}{cardSetContextMenuElement}{documentContextMenuElement}{noteContextMenuElement}</>;
};
const LibraryHierarchySidebar = ({ parentFolderId = null, onOpenCardSet }: LibraryHierarchySidebarProps) => {
  const { rootFolders, getChildFolders, getCardSets, getFolderDocuments, getFolderNotes, getNextOrderIndex, createCardSet, updateCardSet, deleteCardSet, createNote, updateNote, deleteNote, loading, error } = useLibraryHierarchyData();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const { updateDocument, deleteDocument } = useDocumentCommands();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const openDocumentTab = useWorkspaceTabsStore((state) => state.openDocumentTab);
  const openNoteTab = useWorkspaceTabsStore((state) => state.openNoteTab);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set(getRootFolderIds(rootFolders)));
  const handleOpenCardSet = useCallback((cardSet: CardSet, fallbackFolderId: string | null = parentFolderId) => {
    openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: getCardSetFolderId(cardSet, fallbackFolderId), selectedItem: { type: "cardSet", id: cardSet.id } } });
    onOpenCardSet?.();
  }, [onOpenCardSet, openExplorerTab, parentFolderId]);
  const { contextMenuElement: folderContextMenuElement, openContextMenu: openFolderContextMenu } = useFolderContextMenu({ createFolder, updateFolder, deleteFolder, createCardSet, createNote, openCardSet: handleOpenCardSet, openNoteTab, getNextOrderIndex, setExpandedFolderIds });
  const { contextMenuElement: cardSetContextMenuElement, openContextMenu: openCardSetContextMenu } = useCardSetContextMenu({ updateCardSet, deleteCardSet });
  const { contextMenuElement: documentContextMenuElement, openContextMenu: openDocumentContextMenu } = useDocumentContextMenu({ updateDocument, deleteDocument });
  const { contextMenuElement: noteContextMenuElement, openContextMenu: openNoteContextMenu } = useNoteContextMenu({ updateNote, deleteNote });
  const visibleFolders = useMemo(() => parentFolderId ? getChildFolders(parentFolderId) : rootFolders, [getChildFolders, parentFolderId, rootFolders]);
  const visibleCardSets = useMemo(() => getCardSets(parentFolderId), [getCardSets, parentFolderId]);
  const visibleDocuments = useMemo(() => getFolderDocuments(parentFolderId), [getFolderDocuments, parentFolderId]);
  const visibleNotes = useMemo(() => getFolderNotes(parentFolderId), [getFolderNotes, parentFolderId]);
  const hasVisibleItems = visibleFolders.length > 0 || visibleCardSets.length > 0 || visibleDocuments.length > 0 || visibleNotes.length > 0;
  const rootDropParentId = parentFolderId ?? null;
  const { dragState, handleItemDragStart, handleItemDragOver, handleItemDragLeave, handleItemDrop, handleItemDragEnd, handleListDragOver, handleListDragLeave, handleListDrop } = useFolderLayeredTreeDragDrop({ rootFolders, rootDropParentId, scrollContainerRef, getChildFolders, updateFolder, setExpandedFolderIds });
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const selectedFolderId = useMemo(() => getSelectedFolderIdFromActiveTab(activeTab), [activeTab]);
  const selectedItem = useMemo(() => getSelectedItemFromActiveTab(activeTab), [activeTab]);
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
  const handleToggleFolder = useCallback((folderId: string) => setExpandedFolderIds((current) => {
    const next = new Set(current); if (next.has(folderId)) next.delete(folderId); else next.add(folderId); return next; }), []);
  const handleSelectFolder = useCallback((folderId: string) => openExplorerTab({ title: LIBRARY_TITLE, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: folderId, selectedItem: null } }), [openExplorerTab]);
  const handleSelectCardSet = useCallback((cardSet: CardSet) => {
    handleOpenCardSet(cardSet, parentFolderId); }, [handleOpenCardSet, parentFolderId]);
  const handleSelectDocument = useCallback((document: DocumentItem) => openDocumentTab({ documentId: document.id, title: getDocumentName(document), folderId: getDocumentFolderId(document, parentFolderId) }), [openDocumentTab, parentFolderId]);
  const handleSelectNote = useCallback((note: Note) => openNoteTab({ noteId: note.id, title: getNoteTitle(note), folderId: getNoteFolderId(note, parentFolderId) }), [openNoteTab, parentFolderId]);
  if (loading) return <SidebarLoadingState ariaLabel="Library hierarchy explorer" label="ライブラリを読み込み中" />;
  if (error) return <aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-y-auto px-3 py-1 text-xs text-[#b48a8a]">{error}</aside>;
  return <><aside aria-label="Library hierarchy explorer" className="h-full min-h-0 overflow-hidden"><div ref={scrollContainerRef} className="h-full min-h-0 overflow-y-auto px-3 pb-3 pt-1"><div role="tree" aria-label="ライブラリ" className="flex min-h-full flex-col gap-0.5" onDragOver={handleListDragOver} onDragLeave={handleListDragLeave} onDrop={handleListDrop}>{hasVisibleItems ? <>{visibleFolders.map((folder) => <DirectoryTreeNode key={folder.id} folder={folder} level={firstLevel} isRootProject={!parentFolderId} selectedFolderId={selectedFolderId} selectedItem={selectedItem} expandedFolderIds={expandedFolderIds} dragState={dragState} getChildFolders={getChildFolders} getCardSets={getCardSets} getFolderDocuments={getFolderDocuments} getFolderNotes={getFolderNotes} onToggleFolder={handleToggleFolder} onSelectFolder={handleSelectFolder} onSelectCardSet={handleSelectCardSet} onSelectDocument={handleSelectDocument} onSelectNote={handleSelectNote} onOpenContextMenu={openFolderContextMenu} onOpenCardSetContextMenu={openCardSetContextMenu} onOpenDocumentContextMenu={openDocumentContextMenu} onOpenNoteContextMenu={openNoteContextMenu} onFolderDragStart={handleItemDragStart} onFolderDragOver={handleItemDragOver} onFolderDragLeave={handleItemDragLeave} onFolderDrop={handleItemDrop} onFolderDragEnd={handleItemDragEnd} />)}{visibleNotes.map((note) => <DirectoryEntityRow key={note.id} id={note.id} kind="note" label={getNoteTitle(note)} level={firstLevel} isSelected={isSelectedExplorerItem(selectedItem, "note", note.id)} onSelect={() => handleSelectNote(note)} onContextMenu={(event) => openNoteContextMenu(event, note)} />)}{visibleCardSets.map((cardSet) => <DirectoryEntityRow key={cardSet.id} id={cardSet.id} kind="cardSet" label={getCardSetName(cardSet)} level={firstLevel} isSelected={isSelectedExplorerItem(selectedItem, "cardSet", cardSet.id)} onSelect={() => handleSelectCardSet(cardSet)} onContextMenu={(event) => openCardSetContextMenu(event, cardSet)} />)}{visibleDocuments.map((document) => <DirectoryEntityRow key={document.id} id={document.id} kind="document" label={getDocumentName(document)} level={firstLevel} isSelected={isSelectedExplorerItem(selectedItem, "document", document.id)} onSelect={() => handleSelectDocument(document)} onContextMenu={(event) => openDocumentContextMenu(event, document)} />)}</> : <p className="px-1 py-2 text-xs font-medium text-[#9aa1ad]">{emptyMessage}</p>}{isAppendingToCurrentList ? <LayeredTreeDropIndicator position="append" left={appendIndicatorLeft} className="mx-2" /> : null}<div aria-hidden="true" className="min-h-8 flex-1" /></div></div></aside>{folderContextMenuElement}{cardSetContextMenuElement}{documentContextMenuElement}{noteContextMenuElement}</>;
};



export { LibraryHierarchySidebar, ProjectListSidebarView as ProjectListSidebar };
