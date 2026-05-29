import { type ChangeEvent, type CSSProperties, type Dispatch, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCardsRead } from "@/components/card/hooks/useCardsRead";
import { useCardSets } from "@/components/card/hooks/useCardSets";
import { DEFAULT_NEW_CARD_SET_NAME, DEFAULT_NEW_FOLDER_NAME, getFolderId, getParentFolderId, normalizeFolderId, type FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { buildExplorerTreeData, parseSelectedTreeId, toSelectedTreeId, type ExplorerTreeNode } from "@/components/folder/explorer/tree/arboristAdapter";
import { useExpandedFolders } from "@/components/folder/hooks/useExpandedFolders";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { LAYERED_PROJECT_MENU_HEIGHT, LAYERED_PROJECT_MENU_PANEL_ID, LAYERED_PROJECT_MENU_WIDTH, LayeredProjectMenu, type LayeredProjectMenuAction } from "@/chip/rightclickpanel.desktop/LayeredProjectMenu";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
import { resolveCardFolderId } from "@/domain/card/selectors/cardFolder";
import { FadeSkeleton } from "@/features/fade/skeltom";
import { toVirtualMfCardDisplayName } from "@/features/fileDisplay/virtualFileExtensions";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { useDocumentsRead } from "@/hooks/platform/useDocumentsRead";
import { cn } from "@/lib/utils";
import { createDefaultExplorerRouteState, WORKSPACE_DEFAULT_EXPLORER_TAB_ID, type WorkspaceExplorerTab, type WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { Card, CardSet, DocumentItem, SelectedExplorerItem } from "@/types";

type ExplorerSelectionPatch = {
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
};

type TreeBranchMask = boolean[];

type NodeIconProps = {
  className?: string;
};

type LayeredProjectContextMenuState = {
  folderId: string;
  folderName: string;
  folderColor: string | null;
  x: number;
  y: number;
};

const LIBRARY_EXPANDED_FOLDERS_STORAGE_KEY = "flashcard-master:calendar-sidebar:library-expanded-folders";
const LIBRARY_EXPANDED_CARD_SETS_STORAGE_KEY = "flashcard-master:calendar-sidebar:library-expanded-card-sets";
const TREE_INDENT_PX = 16;
const TREE_ROW_BASE_PADDING_LEFT_PX = 8;
const TREE_GUIDE_LEFT_OFFSET_PX = TREE_ROW_BASE_PADDING_LEFT_PX + 8;
const TREE_ROW_HEIGHT_CLASS_NAME = "h-7";
const TREE_ROW_HEIGHT_PX = 28;
const TREE_TERMINAL_GUIDE_HEIGHT_PX = TREE_ROW_HEIGHT_PX / 2;
const TREE_EMPTY_TEXT_CLASS_NAME = "px-3 py-2 text-[12px] font-medium leading-[1.45] tracking-normal text-[#c7c7cc]";
const TREE_GUIDE_CLASS_NAME = "pointer-events-none absolute bg-[#eeeeee]";
const TREE_ROW_BASE_CLASS_NAME = "group relative flex w-full cursor-default select-none items-center gap-1 rounded-[10px] pr-2 text-left text-[12px] font-medium leading-none tracking-normal outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#d9d9de]";
const TREE_ROW_SELECTED_CLASS_NAME = "bg-white text-[#5f6672] shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.06)]";
const TREE_ROW_IDLE_CLASS_NAME = "text-[#5f6672] hover:bg-[#f7f7f8] hover:text-[#5f6672]";
const TREE_NODE_MARKER_CLASS_NAME = "library-tree-marker h-4 w-4 shrink-0 rounded-full";
const TREE_TOGGLE_BUTTON_CLASS_NAME = "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#a7abb3] transition hover:bg-white hover:text-[#6f7580] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d9de]";
const TREE_TOGGLE_ICON_CLASS_NAME = "h-3 w-3 transition-transform duration-150";
const TREE_TOGGLE_SPACER_CLASS_NAME = "h-4 w-4 shrink-0";
const TREE_TRASH_BUTTON_BASE_CLASS_NAME = "flex h-8 w-full items-center gap-2 rounded-[10px] px-2 text-left text-[12px] font-medium leading-none tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d9de]";
const LAYERED_PROJECT_MENU_DIMENSIONS = { width: LAYERED_PROJECT_MENU_WIDTH, height: LAYERED_PROJECT_MENU_HEIGHT };
const HIDDEN_INPUT_STYLE: CSSProperties = { position: "fixed", left: -9999, top: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" };

const TrashGlyph = ({ className }: NodeIconProps) => (
  <svg viewBox="0 0 18 18" fill="none" aria-hidden="true" className={className}>
    <path d="M4.25 6H13.75M7 6V4.75C7 4.2 7.45 3.75 8 3.75H10C10.55 3.75 11 4.2 11 4.75V6M5.25 6.25L5.78 13.2C5.84 14.07 6.57 14.75 7.44 14.75H10.56C11.43 14.75 12.16 14.07 12.22 13.2L12.75 6.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ToggleGlyph = ({ className }: NodeIconProps) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const isWorkspaceExplorerTab = (tab: WorkspaceTab | null | undefined): tab is WorkspaceExplorerTab => tab?.kind === "explorer";

const getActiveWorkspaceTab = (
  tabs: WorkspaceTab[],
  activeTabId: WorkspaceTab["id"] | null,
): WorkspaceTab | null => {
  if (!activeTabId) return null;

  return tabs.find((tab) => tab.id === activeTabId) ?? null;
};

const getCardSetIdFromCard = (card: Card): string | null => {
  const legacyCardSetId = (card as unknown as { card_set_id?: string | null }).card_set_id;
  return card.cardSetId ?? legacyCardSetId ?? null;
};

const getCardFolderId = (
  card: Card,
  cardSetById: ReadonlyMap<string, Pick<CardSet, "id" | "folderId">>,
): string | null => resolveCardFolderId(card, cardSetById);

const getCardTitle = (card: Card): string =>
  toVirtualMfCardDisplayName(
    card.title?.trim() ||
      card.questionNumber?.trim() ||
      "無題のカード",
  );

const getDocumentTitle = (document: DocumentItem): string =>
  document.title?.trim() ||
  document.fileName?.trim() ||
  "無題の文書";

const getFolderAncestorIds = (
  folderId: string | null | undefined,
  folders: FolderTreeNode[],
): string[] => {
  const folderById = new Map<string, FolderTreeNode>();

  for (const folder of folders) {
    const id = getFolderId(folder);
    if (id) folderById.set(id, folder);
  }

  const ancestorIds: string[] = [];
  const visitedIds = new Set<string>();
  let currentId = folderId ? normalizeFolderId(folderId) : null;

  while (currentId && !visitedIds.has(currentId)) {
    const folder = folderById.get(currentId);
    if (!folder) break;

    ancestorIds.push(currentId);
    visitedIds.add(currentId);

    const parentId = normalizeFolderId(getParentFolderId(folder));
    if (!parentId || parentId === currentId) break;
    currentId = parentId;
  }

  return ancestorIds;
};

const addIdsToSet = (
  ids: string[],
  setState: Dispatch<SetStateAction<Set<string>>>,
) => {
  if (ids.length === 0) return;

  setState((prev) => {
    let didChange = false;
    const next = new Set(prev);

    for (const id of ids) {
      if (!next.has(id)) {
        next.add(id);
        didChange = true;
      }
    }

    return didChange ? next : prev;
  });
};

const isNodeExpandable = (node: ExplorerTreeNode): boolean => node.type === "folder" || node.type === "cardSet";

const getFolderColorFromNode = (node: ExplorerTreeNode): string | null => {
  if (node.type !== "folder") return null;

  const folder = node.data as { folderColor?: string | null; folder_color?: string | null } | null | undefined;
  return folder?.folderColor ?? folder?.folder_color ?? null;
};

const getNodeMarkerStyle = (node: ExplorerTreeNode): CSSProperties | undefined => {
  const folderColor = getFolderColorFromNode(node);
  return folderColor ? { backgroundColor: folderColor } : undefined;
};

const LibraryHierarchySidebar = () => {
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const openDocumentTab = useWorkspaceTabsStore((state) => state.openDocumentTab);
  const openCardTab = useWorkspaceTabsStore((state) => state.openCardTab);
  const selectTab = useWorkspaceTabsStore((state) => state.selectTab);
  const updateExplorerTabState = useWorkspaceTabsStore((state) => state.updateExplorerTabState);
  const { folders, loading: foldersLoading } = useFoldersRead();
  const { cards, loading: cardsLoading } = useCardsRead();
  const { cardSets, loading: cardSetsLoading, createCardSet } = useCardSets();
  const { documents, loading: documentsLoading } = useDocumentsRead();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const { expandedFolders, setExpandedFolders } = useExpandedFolders(LIBRARY_EXPANDED_FOLDERS_STORAGE_KEY);
  const { expandedFolders: expandedCardSets, setExpandedFolders: setExpandedCardSets } = useExpandedFolders(LIBRARY_EXPANDED_CARD_SETS_STORAGE_KEY);
  const didSeedInitialOpenStateRef = useRef(false);
  const layeredProjectMenuRef = useRef<HTMLDivElement | null>(null);
  const folderColorInputRef = useRef<HTMLInputElement | null>(null);
  const [layeredProjectMenu, setLayeredProjectMenu] = useState<LayeredProjectContextMenuState | null>(null);
  const [folderColorInputTargetId, setFolderColorInputTargetId] = useState<string | null>(null);

  const activeTab = useMemo(() => getActiveWorkspaceTab(tabs, activeTabId), [activeTabId, tabs]);

  const activeLibrarySelection = useMemo<ExplorerSelectionPatch>(() => {
    if (activeTab?.sectionKey !== "library") {
      return {
        selectedFolderId: null,
        selectedItem: null,
      };
    }

    if (activeTab.kind === "explorer") {
      return {
        selectedFolderId: activeTab.explorerState.selectedFolderId,
        selectedItem: activeTab.explorerState.selectedItem,
      };
    }

    if (activeTab.kind === "document") {
      return {
        selectedFolderId: activeTab.folderId,
        selectedItem: { type: "document" as const, id: activeTab.documentId },
      };
    }

    if (activeTab.kind === "card") {
      return {
        selectedFolderId: activeTab.folderId,
        selectedItem: { type: "card" as const, id: activeTab.cardId },
      };
    }

    return {
      selectedFolderId: null,
      selectedItem: null,
    };
  }, [activeTab]);

  const treeFolders = useMemo(
    () => folders as unknown as FolderTreeNode[],
    [folders],
  );

  const cardById = useMemo(
    () => new Map<string, Card>(cards.map((card) => [card.id, card])),
    [cards],
  );

  const cardSetById = useMemo(
    () => new Map<string, CardSet>(cardSets.map((cardSet) => [cardSet.id, cardSet])),
    [cardSets],
  );

  const documentById = useMemo(
    () => new Map<string, DocumentItem>(documents.map((document) => [document.id, document])),
    [documents],
  );

  const folderById = useMemo(() => {
    const map = new Map<string, FolderTreeNode>();

    for (const folder of treeFolders) {
      const folderId = getFolderId(folder);
      if (folderId) map.set(folderId, folder);
    }

    return map;
  }, [treeFolders]);

  const {
    rootFolders,
    getChildFolders,
    getFolderItems,
    getCardSets,
    getCardSetItems,
    getNextOrderIndex,
    matchCountMap,
  } = useExplorerDerivedData({
    treeFolders,
    treeCards: cards,
    cardSets,
    documents,
    isFiltering: false,
  });

  const rootItems = useMemo(() => getFolderItems(null), [getFolderItems]);

  const treeData = useMemo(
    () =>
      buildExplorerTreeData({
        rootFolders,
        rootItems,
        getChildFolders,
        getFolderItems,
        getCardSets,
        getCardSetItems,
        isFiltering: false,
        matchCountMap,
        getFolderId,
      }),
    [
      rootFolders,
      rootItems,
      getChildFolders,
      getFolderItems,
      getCardSets,
      getCardSetItems,
      matchCountMap,
    ],
  );

  const selectedTreeId = useMemo(
    () =>
      toSelectedTreeId(
        activeLibrarySelection.selectedFolderId,
        activeLibrarySelection.selectedItem,
      ),
    [activeLibrarySelection.selectedFolderId, activeLibrarySelection.selectedItem],
  );

  const isExplorerDataLoading = foldersLoading || cardsLoading || cardSetsLoading || documentsLoading;

  const {
    fileInputRef,
    handleToolbarAddDocument,
    currentFileAccept,
    handleToolbarFileInputChange,
  } = useFolderDocumentUpload({
    actionFolderId: layeredProjectMenu?.folderId ?? null,
    getNextOrderIndex,
    setExpandedFolders,
  });

  useRightClickPanelDismiss(LAYERED_PROJECT_MENU_PANEL_ID, layeredProjectMenu !== null, layeredProjectMenuRef, () => setLayeredProjectMenu(null));

  const applyExplorerSelection = useCallback(
    ({ selectedFolderId, selectedItem }: ExplorerSelectionPatch) => {
      const defaultExplorerTab = tabs.find(
        (tab): tab is WorkspaceExplorerTab =>
          tab.kind === "explorer" &&
          tab.id === WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
      );
      const firstExplorerTab = tabs.find(
        (tab): tab is WorkspaceExplorerTab => tab.kind === "explorer",
      );
      const explorerTab = isWorkspaceExplorerTab(activeTab)
        ? activeTab
        : defaultExplorerTab ?? firstExplorerTab ?? null;
      const baseState = explorerTab?.explorerState ?? createDefaultExplorerRouteState();
      const nextState = {
        ...baseState,
        selectedFolderId,
        selectedItem,
      };

      if (explorerTab) {
        updateExplorerTabState(explorerTab.id, nextState);
        selectTab(explorerTab.id);
        return;
      }

      openExplorerTab({
        id: WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
        title: "Library",
        explorerState: nextState,
        isClosable: true,
      });
    },
    [
      activeTab,
      openExplorerTab,
      selectTab,
      tabs,
      updateExplorerTabState,
    ],
  );

  const closeLayeredProjectMenu = useCallback(() => {
    setLayeredProjectMenu(null);
  }, []);

  const handleOpenLayeredProjectMenu = useCallback((event: ReactMouseEvent<HTMLElement>, node: ExplorerTreeNode, depth: number) => {
    if (depth !== 0 || node.type !== "folder") return;

    event.preventDefault();
    event.stopPropagation();

    const { x, y } = clampRightClickPanelPosition(event.clientX, event.clientY, LAYERED_PROJECT_MENU_DIMENSIONS);

    setLayeredProjectMenu({
      folderId: node.rawId,
      folderName: node.name,
      folderColor: getFolderColorFromNode(node),
      x,
      y,
    });
  }, []);

  const handleChangeFolderColor = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const folderId = folderColorInputTargetId;
    if (!folderId) return;

    const folderColor = event.target.value;
    setFolderColorInputTargetId(null);
    void updateFolder(folderId, { folderColor });
  }, [folderColorInputTargetId, updateFolder]);

  const layeredProjectMenuActions = useMemo<LayeredProjectMenuAction[]>(() => {
    if (!layeredProjectMenu) return [];

    const { folderId, folderName, folderColor } = layeredProjectMenu;

    return [
      {
        id: "change-color",
        onSelect: () => {
          setFolderColorInputTargetId(folderId);
          window.setTimeout(() => {
            if (!folderColorInputRef.current) return;
            if (folderColor) folderColorInputRef.current.value = folderColor;
            folderColorInputRef.current.click();
          }, 0);
          closeLayeredProjectMenu();
        },
      },
      {
        id: "rename",
        onSelect: () => {
          const nextName = window.prompt("フォルダ名を変更", folderName)?.trim();
          closeLayeredProjectMenu();
          if (!nextName || nextName === folderName) return;
          void updateFolder(folderId, { folderName: nextName, name: nextName });
        },
      },
      {
        id: "create-card-set",
        onSelect: () => {
          closeLayeredProjectMenu();
          void createCardSet(DEFAULT_NEW_CARD_SET_NAME, folderId);
        },
      },
      {
        id: "create-folder",
        onSelect: () => {
          closeLayeredProjectMenu();
          void createFolder(DEFAULT_NEW_FOLDER_NAME, folderId);
        },
      },
      {
        id: "import-pdf",
        onSelect: () => {
          handleToolbarAddDocument();
          closeLayeredProjectMenu();
        },
      },
      {
        id: "hide",
        onSelect: () => {
          closeLayeredProjectMenu();
          void updateFolder(folderId, { isHidden: true });
        },
      },
      {
        id: "delete",
        onSelect: () => {
          closeLayeredProjectMenu();
          void deleteFolder(folderId);
        },
      },
    ];
  }, [closeLayeredProjectMenu, createCardSet, createFolder, deleteFolder, handleToolbarAddDocument, layeredProjectMenu, updateFolder]);

  const setFolderNodeOpen = useCallback(
    (folderId: string, isOpen: boolean) => {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        if (isOpen) next.add(folderId);
        else next.delete(folderId);
        return next;
      });
    },
    [setExpandedFolders],
  );

  const setCardSetNodeOpen = useCallback(
    (cardSetId: string, isOpen: boolean) => {
      setExpandedCardSets((prev) => {
        const next = new Set(prev);
        if (isOpen) next.add(cardSetId);
        else next.delete(cardSetId);
        return next;
      });
    },
    [setExpandedCardSets],
  );

  const isNodeOpen = useCallback(
    (node: ExplorerTreeNode) => {
      const parsed = parseSelectedTreeId(node.id);
      if (!parsed) return false;

      if (parsed.type === "folder") return expandedFolders.has(parsed.id);
      if (parsed.type === "cardSet") return expandedCardSets.has(parsed.id);

      return false;
    },
    [expandedCardSets, expandedFolders],
  );

  const setNodeOpen = useCallback(
    (node: ExplorerTreeNode, isOpen: boolean) => {
      const parsed = parseSelectedTreeId(node.id);
      if (!parsed) return;

      if (parsed.type === "folder") {
        setFolderNodeOpen(parsed.id, isOpen);
        return;
      }

      if (parsed.type === "cardSet") {
        setCardSetNodeOpen(parsed.id, isOpen);
      }
    },
    [setCardSetNodeOpen, setFolderNodeOpen],
  );

  const handleToggleNode = useCallback(
    (node: ExplorerTreeNode) => {
      setNodeOpen(node, !isNodeOpen(node));
    },
    [isNodeOpen, setNodeOpen],
  );

  const handleSelectNode = useCallback(
    (node: ExplorerTreeNode) => {
      const parsed = parseSelectedTreeId(node.id);
      if (!parsed) return;

      if (isNodeExpandable(node)) {
        setNodeOpen(node, !isNodeOpen(node));
      }

      if (parsed.type === "folder") {
        applyExplorerSelection({
          selectedFolderId: parsed.id,
          selectedItem: null,
        });
        return;
      }

      if (parsed.type === "cardSet") {
        const cardSet = cardSetById.get(parsed.id);
        applyExplorerSelection({
          selectedFolderId: cardSet?.folderId ?? node.folderId ?? null,
          selectedItem: { type: "cardSet", id: parsed.id },
        });
        return;
      }

      if (parsed.type === "document") {
        const document = documentById.get(parsed.id);
        if (!document) {
          applyExplorerSelection({
            selectedFolderId: null,
            selectedItem: { type: "document", id: parsed.id },
          });
          return;
        }

        openDocumentTab({
          documentId: document.id,
          title: getDocumentTitle(document),
          folderId: document.folderId ?? null,
        });
        return;
      }

      const card = cardById.get(parsed.id);
      if (!card) {
        applyExplorerSelection({
          selectedFolderId: null,
          selectedItem: { type: "card", id: parsed.id },
        });
        return;
      }

      openCardTab({
        cardId: card.id,
        title: getCardTitle(card),
        folderId: getCardFolderId(card, cardSetById),
      });
    },
    [
      applyExplorerSelection,
      cardById,
      cardSetById,
      documentById,
      isNodeOpen,
      openCardTab,
      openDocumentTab,
      setNodeOpen,
    ],
  );

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, node: ExplorerTreeNode) => {
      const isExpandable = isNodeExpandable(node);

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleSelectNode(node);
        return;
      }

      if (event.key === "ArrowRight" && isExpandable && !isNodeOpen(node)) {
        event.preventDefault();
        setNodeOpen(node, true);
        return;
      }

      if (event.key === "ArrowLeft" && isExpandable && isNodeOpen(node)) {
        event.preventDefault();
        setNodeOpen(node, false);
      }
    },
    [handleSelectNode, isNodeOpen, setNodeOpen],
  );

  const handleSelectTrash = useCallback(() => {
    applyExplorerSelection({
      selectedFolderId: null,
      selectedItem: { type: "trash" },
    });
  }, [applyExplorerSelection]);

  useEffect(() => {
    if (didSeedInitialOpenStateRef.current || isExplorerDataLoading || rootFolders.length === 0) {
      return;
    }

    didSeedInitialOpenStateRef.current = true;

    setExpandedFolders((prev) => {
      if (prev.size > 0) return prev;

      const rootFolderIds = rootFolders
        .map((folder) => getFolderId(folder))
        .filter((folderId): folderId is string => Boolean(folderId));

      return new Set(rootFolderIds);
    });
  }, [isExplorerDataLoading, rootFolders, setExpandedFolders]);

  useEffect(() => {
    const selectedItem = activeLibrarySelection.selectedItem;
    const selectedFolderId = activeLibrarySelection.selectedFolderId;
    const selectedFolder = selectedFolderId ? folderById.get(selectedFolderId) : null;
    const selectedCard = selectedItem?.type === "card" ? cardById.get(selectedItem.id) : null;
    const selectedCardSet = selectedItem?.type === "cardSet" ? cardSetById.get(selectedItem.id) : null;
    const selectedDocument = selectedItem?.type === "document" ? documentById.get(selectedItem.id) : null;
    const selectedFolderParentId = selectedFolder ? getParentFolderId(selectedFolder) : null;
    const cardFolderId = selectedCard ? getCardFolderId(selectedCard, cardSetById) : null;
    const targetFolderId = selectedItem?.type === "card" ? cardFolderId : selectedItem?.type === "cardSet" ? selectedCardSet?.folderId ?? null : selectedItem?.type === "document" ? selectedDocument?.folderId ?? null : selectedFolderParentId;
    const ancestorIds = getFolderAncestorIds(targetFolderId, treeFolders);

    addIdsToSet(ancestorIds, setExpandedFolders);

    if (selectedItem?.type === "card") {
      const cardSetId = selectedCard ? getCardSetIdFromCard(selectedCard) : null;
      if (cardSetId) addIdsToSet([cardSetId], setExpandedCardSets);
    }
  }, [
    activeLibrarySelection.selectedFolderId,
    activeLibrarySelection.selectedItem,
    cardById,
    cardSetById,
    documentById,
    folderById,
    setExpandedCardSets,
    setExpandedFolders,
    treeFolders,
  ]);

  function renderTreeNode(
    node: ExplorerTreeNode,
    depth: number,
    branchMask: TreeBranchMask,
    index: number,
    siblingCount: number,
  ) {
    const childCount = node.children?.length ?? 0;
    const hasChildren = childCount > 0;
    const isExpandable = isNodeExpandable(node);
    const isOpen = isExpandable && isNodeOpen(node);
    const isSelected = selectedTreeId === node.id;
    const ancestorBranchMask = branchMask.slice(0, -1);
    const shouldContinueCurrentBranch = branchMask[branchMask.length - 1] ?? false;
    const rowStyle: CSSProperties = { paddingLeft: TREE_ROW_BASE_PADDING_LEFT_PX + depth * TREE_INDENT_PX };
    const markerStyle = getNodeMarkerStyle(node);

    return (
      <div key={node.id} className="relative">
        <div className="relative">
          {ancestorBranchMask.map((shouldDrawGuide, guideIndex) =>
            shouldDrawGuide ? (
              <span
                key={`${node.id}:guide:${guideIndex}`}
                aria-hidden="true"
                className={cn(TREE_GUIDE_CLASS_NAME, "bottom-0 top-0 w-px")}
                style={{ left: TREE_GUIDE_LEFT_OFFSET_PX + guideIndex * TREE_INDENT_PX }}
              />
            ) : null,
          )}
          {depth > 0 ? (
            <span
              aria-hidden="true"
              className={cn(
                TREE_GUIDE_CLASS_NAME,
                shouldContinueCurrentBranch ? "bottom-0 top-0 w-px" : "top-0 w-px",
              )}
              style={{
                left: TREE_GUIDE_LEFT_OFFSET_PX + (depth - 1) * TREE_INDENT_PX,
                height: shouldContinueCurrentBranch ? undefined : TREE_TERMINAL_GUIDE_HEIGHT_PX,
              }}
            />
          ) : null}
          {depth > 0 ? (
            <span
              aria-hidden="true"
              className={cn(TREE_GUIDE_CLASS_NAME, "top-1/2 h-px")}
              style={{
                left: TREE_GUIDE_LEFT_OFFSET_PX + (depth - 1) * TREE_INDENT_PX,
                width: TREE_INDENT_PX - 3,
              }}
            />
          ) : null}

          <div
            role="treeitem"
            tabIndex={0}
            aria-level={depth + 1}
            aria-setsize={siblingCount}
            aria-posinset={index + 1}
            aria-selected={isSelected}
            aria-expanded={isExpandable ? isOpen : undefined}
            onClick={() => handleSelectNode(node)}
            onContextMenu={(event) => handleOpenLayeredProjectMenu(event, node, depth)}
            onKeyDown={(event) => handleRowKeyDown(event, node)}
            className={cn(
              TREE_ROW_BASE_CLASS_NAME,
              TREE_ROW_HEIGHT_CLASS_NAME,
              isSelected ? TREE_ROW_SELECTED_CLASS_NAME : TREE_ROW_IDLE_CLASS_NAME,
            )}
            style={rowStyle}
          >
            {isExpandable ? (
              <button
                type="button"
                aria-label={isOpen ? `${node.name} を閉じる` : `${node.name} を開く`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggleNode(node);
                }}
                className={TREE_TOGGLE_BUTTON_CLASS_NAME}
              >
                <ToggleGlyph className={cn(TREE_TOGGLE_ICON_CLASS_NAME, isOpen ? "rotate-90" : "rotate-0")} />
              </button>
            ) : (
              <span className={TREE_TOGGLE_SPACER_CLASS_NAME} aria-hidden="true" />
            )}

            <span className={TREE_NODE_MARKER_CLASS_NAME} style={markerStyle} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
          </div>
        </div>

        {isOpen && hasChildren ? (
          <div role="group">
            {node.children.map((childNode, childIndex) =>
              renderTreeNode(
                childNode,
                depth + 1,
                [...branchMask, childIndex < childCount - 1],
                childIndex,
                childCount,
              ),
            )}
          </div>
        ) : null}
      </div>
    );
  }

  const isTrashSelected = activeLibrarySelection.selectedItem?.type === "trash";
  const layeredProjectMenuElement = layeredProjectMenu ? (
    <LayeredProjectMenu
      x={layeredProjectMenu.x}
      y={layeredProjectMenu.y}
      actions={layeredProjectMenuActions}
      menuRef={layeredProjectMenuRef}
      noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE}
    />
  ) : null;

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent pb-2 pl-0 pr-2 pt-2 font-sans text-[#5f6672] antialiased" aria-label="Library hierarchy explorer">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isExplorerDataLoading ? (
          <FadeSkeleton ariaLabel="ライブラリを読み込み中" />
        ) : treeData.length > 0 ? (
          <div role="tree" aria-label="ライブラリ" className="space-y-[1px]">
            {treeData.map((node, index) =>
              renderTreeNode(node, 0, [], index, treeData.length),
            )}
          </div>
        ) : (
          <p className={TREE_EMPTY_TEXT_CLASS_NAME}>
            ライブラリに表示できる項目がありません
          </p>
        )}
      </div>

      <div className="mt-auto shrink-0 pt-2">
        <div className="mb-1 h-px w-full bg-[#eeeeee]" />
        <button
          type="button"
          onClick={handleSelectTrash}
          aria-pressed={isTrashSelected}
          className={cn(
            TREE_TRASH_BUTTON_BASE_CLASS_NAME,
            isTrashSelected ? TREE_ROW_SELECTED_CLASS_NAME : TREE_ROW_IDLE_CLASS_NAME,
          )}
        >
          <TrashGlyph className="h-4 w-4 shrink-0 text-[#8e8e93]" />
          <span className="truncate">ごみ箱</span>
        </button>
      </div>

      <input ref={folderColorInputRef} type="color" aria-label="フォルダ色" style={HIDDEN_INPUT_STYLE} onChange={handleChangeFolderColor} onBlur={() => setFolderColorInputTargetId(null)} />
      <input ref={fileInputRef} type="file" accept={currentFileAccept} multiple style={HIDDEN_INPUT_STYLE} onChange={handleToolbarFileInputChange} />
      {layeredProjectMenuElement ? createPortal(layeredProjectMenuElement, document.body) : null}
    </aside>
  );
};

export { LibraryHierarchySidebar };
