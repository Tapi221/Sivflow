/* eslint-disable react-hooks/exhaustive-deps -- large legacy explorer handlers intentionally stabilized to avoid interaction regressions. */
import { ExplorerEmptyState } from "@/components/folder/components/ExplorerEmptyState";
import { ExplorerNoResultsState } from "@/components/folder/components/ExplorerNoResultsState";
import { ExplorerTreeNodeRenderer } from "@/components/folder/components/ExplorerTreeNode";
import { RootFolderPanelList } from "@/components/folder/components/RootFolderPanelList";
import {
  getFolderId,
  type FolderTreeNode,
} from "@/components/folder/explorer/model/utils";
import {
  buildExplorerTreeData,
  parseSelectedTreeId,
  toExpandedTreeIds,
  toSelectedTreeId,
  type ExplorerTreeNode,
} from "@/components/folder/explorer/tree/arboristAdapter";
import { useEnsureAncestorFoldersExpanded } from "@/components/folder/hooks/useEnsureAncestorFoldersExpanded";
import { useExpandedFolders } from "@/components/folder/hooks/useExpandedFolders";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useExplorerDialogs } from "@/components/folder/hooks/useExplorerDialogs";
import { useExplorerKeyboardNavigation } from "@/components/folder/hooks/useExplorerKeyboardNavigation";
import { useFolderActions } from "@/components/folder/hooks/useFolderActions";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { shouldDisableExplorerDrop } from "@/components/folder/components/views/explorerDropRules";
import { FolderTreeArborist } from "@/components/sidebar/FolderTreeArborist";
import BulkTagDialog from "@/components/tag/BulkTagDialog";
import { cn } from "@/lib/utils";
import type {
  Card,
  CardSet,
  DocumentItem,
  ExplorerItem,
  SelectedExplorerItem,
} from "@/types";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NodeApi } from "react-arborist";

interface FolderTreeWithCardsProps {
  sidebarDisplayMode?: "tree" | "navigation";
  folders: FolderTreeNode[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onCreateFolder?: (
    name: string,
    parentId?: string,
    options?: {
      id?: string;
      orderIndex?: number;
      color?: string;
      cloudSyncEnabled?: boolean;
    },
  ) => Promise<string>;
  onUpdateFolder?: (folderId: string, data: unknown) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
  onCreateCardSet?: (
    name: string,
    folderId: string,
    opts?: {
      description?: string;
      id?: string;
      orderIndex?: number;
    },
  ) => Promise<CardSet>;
  onUpdateCardSet?: (cardSetId: string, data: unknown) => Promise<void>;
  onDeleteCardSet?: (cardSetId: string) => Promise<void>;
  onCreateCard?: (data: unknown) => Promise<unknown>;
  onUpdateCard?: (cardId: string, data: unknown) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
  onUpdateDocument?: (documentId: string, data: unknown) => Promise<void>;
  onDeleteDocument?: (documentId: string) => Promise<void>;
  moveCardToSet?: (cardId: string, targetCardSetId: string) => Promise<void>;
  moveCardSetToFolder?: (
    cardSetId: string,
    targetFolderId: string,
  ) => Promise<void>;
  moveDocumentToFolder?: (
    documentId: string,
    targetFolderId: string,
  ) => Promise<void>;
  reorderCardsInCardSet?: (
    cardSetId: string,
    cardIds: string[],
  ) => Promise<void>;
  selectedCardSetId?: string | null;
  onSelectCardSet?: (
    cardSetId: string,
    folderId: string,
    label: string,
  ) => void;
  isFiltering?: boolean;
  onRegisterCreateFolderTrigger?: (fn: (() => void) | null) => void;
  onRegisterCreateCardSetTrigger?: (
    fn: ((folderId?: string | null) => void) | null,
  ) => void;
  onRegisterDocumentTrigger?: (fn: () => void) => void;
  navigateToSectionListToken?: number;
  folderSelectionNonce?: number;
  forceSectionListRoot?: boolean;
  onHeaderFolderIdChange?: (folderId: string | null) => void;
  className?: string;
}

export const FolderTreeWithCards = ({
  sidebarDisplayMode = "tree",
  folders,
  cards,
  cardSets = [],
  documents,
  selectedFolderId,
  selectedItem,
  onFolderSelect,
  onItemSelect,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateCardSet,
  onUpdateCardSet,
  onDeleteCardSet,
  onCreateCard: _onCreateCard,
  onUpdateCard: _onUpdateCard,
  onDeleteCard,
  onUpdateDocument,
  onDeleteDocument,
  moveCardToSet,
  moveCardSetToFolder,
  moveDocumentToFolder,
  selectedCardSetId = null,
  onSelectCardSet,
  isFiltering = false,
  onRegisterCreateFolderTrigger,
  onRegisterCreateCardSetTrigger,
  onRegisterDocumentTrigger,
  navigateToSectionListToken = 0,
  folderSelectionNonce = 0,
  forceSectionListRoot = false,
  onHeaderFolderIdChange,
  className,
}: FolderTreeWithCardsProps) => {
  const { expandedFolders, setExpandedFolders, toggleFolder } =
    useExpandedFolders();
  const {
    expandedFolders: expandedCardSets,
    setExpandedFolders: setExpandedCardSets,
  } = useExpandedFolders("folder_expandedCardSets");

  const dialogs = useExplorerDialogs();

  const [optimisticFolders, setOptimisticFolders] = useState<FolderTreeNode[]>(
    [],
  );
  const [optimisticCards] = useState<Card[]>([]);
  const [optimisticCardSets, setOptimisticCardSets] = useState<CardSet[]>([]);
  const [hiddenFolderIds, setHiddenFolderIds] = useState<Set<string>>(
    new Set(),
  );
  const [hiddenCardSetIds, setHiddenCardSetIds] = useState<Set<string>>(
    new Set(),
  );
  const [newlyCreatedCardId, setNewlyCreatedCardId] = useState<string | null>(
    null,
  );
  const [fileDragFolderId, setFileDragFolderId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [navigationParentFolderId, setNavigationParentFolderId] = useState<
    string | null
  >(null);

  const canCreateFolder = Boolean(onCreateFolder);
  const canCreateCardSet = Boolean(onCreateCardSet);
  const canRenameFolder = Boolean(onUpdateFolder);
  const canDeleteFolder = Boolean(onDeleteFolder);
  const canRenameCardSet = Boolean(onUpdateCardSet);
  const canDeleteCardSet = Boolean(onDeleteCardSet);
  const canDeleteCard = Boolean(onDeleteCard);
  const canRenameDocument = Boolean(onUpdateDocument);
  const canDeleteDocument = Boolean(onDeleteDocument);

  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const treeRootRef = useRef<HTMLDivElement | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const findScrollableAncestorWithinTree = useCallback(
    (node: HTMLElement): HTMLElement | null => {
      const boundary = treeRootRef.current;
      let current: HTMLElement | null = node.parentElement;

      while (current) {
        if (boundary && !boundary.contains(current)) break;
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY;
        const isScrollable =
          (overflowY === "auto" || overflowY === "scroll") &&
          current.scrollHeight > current.clientHeight;
        if (isScrollable) return current;
        current = current.parentElement;
      }

      return null;
    },
    [],
  );

  const scrollRowWithinSidebar = useCallback(
    (row: HTMLElement, behavior: ScrollBehavior = "auto") => {
      const container = findScrollableAncestorWithinTree(row);
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const deltaTop = rowRect.top - containerRect.top;
      const deltaBottom = rowRect.bottom - containerRect.bottom;

      if (deltaTop < 0) {
        container.scrollBy({ top: deltaTop, behavior });
        return;
      }

      if (deltaBottom > 0) {
        container.scrollBy({ top: deltaBottom, behavior });
      }
    },
    [findScrollableAncestorWithinTree],
  );

  const resetIfScrollable = useCallback((node: HTMLElement) => {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight;
    if (isScrollable) node.scrollTop = 0;
  }, []);

  const treeFolders = useMemo(() => {
    const map = new Map<string, FolderTreeNode>();

    for (const f of optimisticFolders) {
      const id = getFolderId(f);
      if (!id || hiddenFolderIds.has(id)) continue;
      map.set(id, f);
    }

    for (const f of folders) {
      const id = getFolderId(f);
      if (!id || hiddenFolderIds.has(id)) continue;
      if (!map.has(id)) map.set(id, f);
    }

    return Array.from(map.values());
  }, [folders, optimisticFolders, hiddenFolderIds]);

  const treeCards = useMemo(() => {
    const map = new Map<string, Card>();
    for (const c of cards) map.set(c.id, c);
    for (const c of optimisticCards) {
      if (!map.has(c.id)) map.set(c.id, c);
    }
    return Array.from(map.values());
  }, [cards, optimisticCards]);

  const treeCardSets = useMemo(() => {
    const map = new Map<string, CardSet>();

    for (const cs of optimisticCardSets) {
      if (hiddenCardSetIds.has(cs.id)) continue;
      map.set(cs.id, cs);
    }

    for (const cs of cardSets) {
      if (hiddenCardSetIds.has(cs.id)) continue;
      if (!map.has(cs.id)) map.set(cs.id, cs);
    }

    return Array.from(map.values());
  }, [cardSets, optimisticCardSets, hiddenCardSetIds]);

  const derived = useExplorerDerivedData({
    treeFolders,
    treeCards,
    cardSets: treeCardSets,
    documents,
    isFiltering,
  });

  const {
    rootFolders,
    getChildFolders,
    getFolderItems,
    getCardSets,
    getCardSetItems,
    matchCountMap,
    getNextOrderIndex,
    getFolderContentCount,
  } = derived;

  const rootItems = useMemo(() => getFolderItems(null), [getFolderItems]);

  const hasFolderMatches = useCallback(
    (folderId: string) => {
      if (!isFiltering) return true;
      return (matchCountMap.get(folderId) ?? 0) > 0;
    },
    [isFiltering, matchCountMap],
  );

  const hasCardSetMatches = useCallback(
    (cardSetId: string) => {
      if (!isFiltering) return true;
      return getCardSetItems(cardSetId).length > 0;
    },
    [getCardSetItems, isFiltering],
  );

  const effectiveSidebarDisplayMode = useMemo(() => {
    if (forceSectionListRoot) {
      return "navigation";
    }

    return sidebarDisplayMode === "navigation" ? "navigation" : "tree";
  }, [forceSectionListRoot, sidebarDisplayMode]);

  const activeNavigationParentFolderId =
    effectiveSidebarDisplayMode === "navigation"
      ? navigationParentFolderId
      : null;

  const navigationFolderId = activeNavigationParentFolderId ?? null;

  const navigationCardSets = useMemo(
    () =>
      getCardSets(navigationFolderId).filter((cardSet) =>
        hasCardSetMatches(cardSet.id),
      ),
    [getCardSets, navigationFolderId, hasCardSetMatches],
  );

  const navigationItems = useMemo(
    () => getFolderItems(navigationFolderId),
    [getFolderItems, navigationFolderId],
  );

  const navigationFolderPanels = useMemo(
    () =>
      (activeNavigationParentFolderId
        ? getChildFolders(activeNavigationParentFolderId)
        : rootFolders
      )
        .filter((folder) => {
          const id = getFolderId(folder);
          return id ? hasFolderMatches(id) : false;
        })
        .map((folder) => {
          const id = getFolderId(folder);
          if (!id) return null;
          return {
            id,
            name:
              (folder as { folderName?: string; folder_name?: string })
                .folderName ??
              (folder as { folderName?: string; folder_name?: string })
                .folder_name ??
              "無題のフォルダ",
            folder,
          };
        })
        .filter(
          (
            item,
          ): item is { id: string; name: string; folder: FolderTreeNode } =>
            item !== null,
        ),
    [
      activeNavigationParentFolderId,
      getChildFolders,
      rootFolders,
      hasFolderMatches,
    ],
  );

  const navigationEntries = useMemo(
    () => [
      ...navigationFolderPanels.map((panel) => ({
        kind: "folder" as const,
        id: panel.id,
        name: panel.name,
        folder: panel.folder,
        contentCount: getFolderContentCount(panel.id),
      })),
      ...navigationCardSets.map((cardSet) => ({
        kind: "cardSet" as const,
        id: cardSet.id,
        name: cardSet.name?.trim() || "無題のセット",
        contentCount: getCardSetItems(cardSet.id).length,
      })),
      ...navigationItems.map((item: ExplorerItem) => {
        if (item.type === "document") {
          return {
            kind: "document" as const,
            id: item.data.id,
            name:
              item.data.title?.trim() ||
              item.data.fileName?.trim() ||
              "無題の文書",
          };
        }

        return {
          kind: "card" as const,
          id: item.data.id,
          name:
            item.data.title?.trim() ||
            item.data.questionNumber?.trim() ||
            "無題のカード",
        };
      }),
    ],
    [
      getFolderContentCount,
      getCardSetItems,
      navigationFolderPanels,
      navigationCardSets,
      navigationItems,
    ],
  );

  const rootFolderPanels = useMemo(
    () =>
      rootFolders
        .filter((folder) => {
          const id = getFolderId(folder);
          return id ? hasFolderMatches(id) : false;
        })
        .map((folder) => {
          const id = getFolderId(folder);
          if (!id) return null;
          return {
            id,
            name:
              (folder as { folderName?: string; folder_name?: string })
                .folderName ??
              (folder as { folderName?: string; folder_name?: string })
                .folder_name ??
              "無題のフォルダ",
            folder,
          };
        })
        .filter(
          (
            item,
          ): item is { id: string; name: string; folder: FolderTreeNode } =>
            item !== null,
        ),
    [rootFolders, hasFolderMatches],
  );

  const navigationEmptyMessage = useMemo(() => {
    if (isFiltering) {
      return "一致する項目がありません";
    }

    if (activeNavigationParentFolderId) {
      return "このフォルダには表示できる項目がありません";
    }

    return "表示できる項目はありません";
  }, [activeNavigationParentFolderId, isFiltering]);

  const allFolderIdSet = useMemo(
    () =>
      new Set(
        treeFolders
          .map((folder) => getFolderId(folder))
          .filter((id): id is string => Boolean(id)),
      ),
    [treeFolders],
  );

  const actions = useFolderActions({
    treeFolders,
    treeCardSets,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    onCreateCardSet,
    onUpdateCardSet,
    onDeleteCardSet,
    onDeleteCard,
    onUpdateDocument,
    onDeleteDocument,
    editingIdRef: dialogs.editingIdRef,
    editingNameRef: dialogs.editingNameRef,
    renameCancelledRef: dialogs.renameCancelledRef,
    setEditingId: dialogs.setEditingId,
    setEditingName: dialogs.setEditingName,
    closeRename: dialogs.closeRename,

    setOptimisticFolders,
    setOptimisticCardSets,
    setHiddenFolderIds,
    setHiddenCardSetIds,

    optimisticFolders,
    optimisticCardSets,
    setExpandedFolders,
    setPendingScrollId,
    onFolderSelect,
    onItemSelect,
    onSelectCardSet,
    setNewlyCreatedCardId,
  });

  useEnsureAncestorFoldersExpanded({
    selectedFolderId,
    selectedItem,
    treeFolders,
    treeCards,
    treeCardSets,
    setExpandedFolders,
  });

  useEffect(() => {
    setOptimisticFolders((prev) => {
      let changed = false;
      const next = prev.filter((optimisticFolder) => {
        const optimisticId = getFolderId(optimisticFolder);
        const persistedFolder = folders.find(
          (folder) => getFolderId(folder) === optimisticId,
        );
        if (!persistedFolder) return true;

        const optimisticName =
          (optimisticFolder as { folderName?: string; folder_name?: string })
            .folderName ??
          (optimisticFolder as { folderName?: string; folder_name?: string })
            .folder_name ??
          "";
        const persistedName =
          (persistedFolder as { folderName?: string; folder_name?: string })
            .folderName ??
          (persistedFolder as { folderName?: string; folder_name?: string })
            .folder_name ??
          "";

        if (optimisticName !== persistedName) return true;
        changed = true;
        return false;
      });

      return changed ? next : prev;
    });
  }, [folders]);

  useEffect(() => {
    setOptimisticCardSets((prev) => {
      let changed = false;
      const next = prev.filter((optimisticCardSet) => {
        const persistedCardSet = cardSets.find(
          (cardSet) => cardSet.id === optimisticCardSet.id,
        );
        if (!persistedCardSet) return true;
        if (persistedCardSet.name !== optimisticCardSet.name) return true;
        changed = true;
        return false;
      });

      return changed ? next : prev;
    });
  }, [cardSets]);

  useEffect(() => {
    setHiddenFolderIds((prev) => {
      if (prev.size === 0) return prev;

      const activeIds = new Set<string>();
      for (const folder of folders) {
        const id = getFolderId(folder);
        if (id) activeIds.add(id);
      }
      for (const folder of optimisticFolders) {
        const id = getFolderId(folder);
        if (id) activeIds.add(id);
      }

      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (activeIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [folders, optimisticFolders]);

  useEffect(() => {
    setHiddenCardSetIds((prev) => {
      if (prev.size === 0) return prev;

      const activeIds = new Set<string>();
      for (const cardSet of cardSets) {
        activeIds.add(cardSet.id);
      }
      for (const cardSet of optimisticCardSets) {
        activeIds.add(cardSet.id);
      }

      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (activeIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [cardSets, optimisticCardSets]);

  useEffect(() => {
    dialogs.editingIdRef.current = dialogs.editingId;
  }, [dialogs.editingId]);

  useEffect(() => {
    dialogs.editingNameRef.current = dialogs.editingName;
  }, [dialogs.editingName]);

  useEffect(() => {
    if (
      selectedItem?.type === "card" &&
      selectedItem.id &&
      newlyCreatedCardId &&
      selectedItem.id !== newlyCreatedCardId
    ) {
      setNewlyCreatedCardId(null);
    }
  }, [selectedItem, newlyCreatedCardId]);

  useEffect(() => {
    if (!pendingScrollId) return;
    const row = rowRefs.current.get(pendingScrollId);
    if (!row) return;
    const rafId = window.requestAnimationFrame(() => {
      scrollRowWithinSidebar(row, "smooth");
      setPendingScrollId(null);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [
    pendingScrollId,
    treeFolders,
    treeCards,
    expandedFolders,
    scrollRowWithinSidebar,
  ]);

  useEffect(() => {
    const targetId = (() => {
      if (selectedItem?.type === "card") return selectedItem.id;
      if (selectedItem?.type === "cardSet") return selectedItem.id;
      if (selectedItem?.type === "document") return selectedItem.id;
      if (selectedCardSetId) return selectedCardSetId;
      return selectedFolderId;
    })();
    if (!targetId) return;
    const row = rowRefs.current.get(targetId);
    if (!row) return;
    const rafId = window.requestAnimationFrame(() => {
      scrollRowWithinSidebar(row, "auto");
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [
    expandedCardSets,
    expandedFolders,
    selectedCardSetId,
    selectedFolderId,
    selectedItem,
    treeCards,
    treeCardSets,
    treeFolders,
    scrollRowWithinSidebar,
  ]);

  useEffect(() => {
    if (navigateToSectionListToken <= 0) return;
    setNavigationParentFolderId(null);

    const root = treeRootRef.current;
    if (!root) return;

    const candidates = new Set<HTMLElement>();
    candidates.add(root);
    root
      .querySelectorAll<HTMLElement>(
        ".overflow-y-auto, .overflow-auto, [role='tree']",
      )
      .forEach((node) => {
        candidates.add(node);
        if (node.getAttribute("role") === "tree") {
          const listScroller = node.querySelector<HTMLElement>(
            "div[style*='overflow']",
          );
          if (listScroller) candidates.add(listScroller);
        }
      });

    candidates.forEach(resetIfScrollable);
  }, [navigateToSectionListToken, resetIfScrollable]);

  useEffect(() => {
    if (folderSelectionNonce <= 0) return;
    const root = treeRootRef.current;
    if (!root) return;

    const candidates = new Set<HTMLElement>();
    candidates.add(root);
    root
      .querySelectorAll<HTMLElement>(
        ".overflow-y-auto, .overflow-auto, [role='tree']",
      )
      .forEach((node) => {
        candidates.add(node);
        if (node.getAttribute("role") === "tree") {
          const listScroller = node.querySelector<HTMLElement>(
            "div[style*='overflow']",
          );
          if (listScroller) candidates.add(listScroller);
        }
      });

    candidates.forEach(resetIfScrollable);
  }, [folderSelectionNonce, resetIfScrollable]);

  useEffect(() => {
    if (effectiveSidebarDisplayMode !== "navigation") return;

    if (forceSectionListRoot) {
      if (navigationParentFolderId !== null) {
        setNavigationParentFolderId(null);
      }
      return;
    }

    if (!selectedFolderId || !allFolderIdSet.has(selectedFolderId)) {
      if (selectedFolderId === null && navigationParentFolderId !== null) {
        setNavigationParentFolderId(null);
      }
      return;
    }

    if (navigationParentFolderId !== selectedFolderId) {
      setNavigationParentFolderId(selectedFolderId);
    }
  }, [
    allFolderIdSet,
    effectiveSidebarDisplayMode,
    forceSectionListRoot,
    navigationParentFolderId,
    selectedFolderId,
  ]);

  const headerFolderId = useMemo(() => {
    if (forceSectionListRoot) return null;
    if (selectedFolderId) return selectedFolderId;
    if (activeNavigationParentFolderId) return activeNavigationParentFolderId;
    if (selectedItem?.type === "cardSet") {
      return (
        treeCardSets.find((cardSet) => cardSet.id === selectedItem.id)
          ?.folderId ?? null
      );
    }
    return null;
  }, [
    activeNavigationParentFolderId,
    forceSectionListRoot,
    selectedFolderId,
    selectedItem,
    treeCardSets,
  ]);

  useEffect(() => {
    onHeaderFolderIdChange?.(headerFolderId);
  }, [headerFolderId, onHeaderFolderIdChange]);

  useEffect(() => {
    if (!canCreateFolder) {
      onRegisterCreateFolderTrigger?.(null);
      return;
    }

    const trigger = () => {
      actions.handleCreateFolderAction(headerFolderId);
    };
    onRegisterCreateFolderTrigger?.(trigger);
    return () => onRegisterCreateFolderTrigger?.(null);
  }, [
    actions.handleCreateFolderAction,
    canCreateFolder,
    headerFolderId,
    onRegisterCreateFolderTrigger,
  ]);

  const setRowRef = useCallback((id: string, node: HTMLElement | null) => {
    if (node) rowRefs.current.set(id, node);
    else rowRefs.current.delete(id);
  }, []);

  const {
    fileInputRef,
    handlePdfDropped,
    handleToolbarAddDocument,
    currentFileAccept,
    handleToolbarFileInputChange,
  } = useFolderDocumentUpload({
    actionFolderId: headerFolderId,
    getNextOrderIndex,
    setExpandedFolders,
  });

  useExplorerKeyboardNavigation({
    selectedFolderId,
    selectedItem,
    treeFolders,
    treeCardSets,
    documents,
    expandedFolders,
    treeRootRef,
    rootFolders,
    getChildFolders,
    getFolderItems,
    toggleFolder,
    onFolderSelect,
    onItemSelect,
    canCreateFolder,
    canDeleteFolder,
    canDeleteCardSet,
    canDeleteCard,
    canDeleteDocument,
    handleCreateFolderAction: actions.handleCreateFolderAction,
    handleToolbarAddDocument,
    handleDelete: (id, type) => {
      void actions.handleDelete({ id, type });
    },
    setEditingId: dialogs.setEditingId,
    setEditingName: dialogs.setEditingName,
  });

  const handleCreateCardSetFromMenu = useCallback(
    (folderId: string | null) => actions.handleCreateCardSetAction(folderId),
    [actions.handleCreateCardSetAction],
  );

  useEffect(() => {
    if (!canCreateCardSet) {
      onRegisterCreateCardSetTrigger?.(null);
      return;
    }

    const trigger = (folderId?: string | null) => {
      handleCreateCardSetFromMenu(folderId ?? headerFolderId);
    };
    onRegisterCreateCardSetTrigger?.(trigger);
    return () => onRegisterCreateCardSetTrigger?.(null);
  }, [
    canCreateCardSet,
    handleCreateCardSetFromMenu,
    headerFolderId,
    onRegisterCreateCardSetTrigger,
  ]);

  useEffect(() => {
    onRegisterDocumentTrigger?.(handleToolbarAddDocument);
  }, [onRegisterDocumentTrigger, handleToolbarAddDocument]);

  const handleCreateCardSetFromRootPanel = useCallback(
    (folderId: string | null) => {
      if (folderId) {
        onFolderSelect(folderId);
      }
      return handleCreateCardSetFromMenu(folderId);
    },
    [handleCreateCardSetFromMenu, onFolderSelect],
  );

  const hasFilterMatches = useMemo(() => {
    if (!isFiltering) return true;
    if (rootItems.length > 0) return true;
    return rootFolders.some((folder) => {
      const folderId = getFolderId(folder);
      return (matchCountMap.get(folderId) ?? 0) > 0;
    });
  }, [isFiltering, rootItems, rootFolders, matchCountMap]);

  const explorerTreeData = useMemo<ExplorerTreeNode[]>(
    () =>
      buildExplorerTreeData({
        rootFolders,
        rootItems,
        getChildFolders,
        getFolderItems,
        getCardSets,
        getCardSetItems,
        isFiltering,
        matchCountMap,
        getFolderId,
      }),
    [
      getChildFolders,
      getFolderItems,
      getCardSets,
      getCardSetItems,
      isFiltering,
      matchCountMap,
      rootFolders,
      rootItems,
    ],
  );

  const selectedTreeId = useMemo(() => {
    return toSelectedTreeId(selectedFolderId, selectedItem, selectedCardSetId);
  }, [selectedCardSetId, selectedFolderId, selectedItem]);

  const handleTreeSelect = useCallback(
    (id: string) => {
      const parsed = parseSelectedTreeId(id);
      if (!parsed) return;

      if (parsed.type === "folder") {
        onFolderSelect(parsed.id);
        return;
      }

      if (parsed.type === "cardSet") {
        onItemSelect({ type: "cardSet", id: parsed.id });
        return;
      }

      if (parsed.type === "card") {
        onItemSelect({ type: "card", id: parsed.id });
        return;
      }

      if (parsed.type === "document") {
        onItemSelect({ type: "document", id: parsed.id });
      }
    },
    [onFolderSelect, onItemSelect],
  );

  const handleFolderNodeSelect = useCallback(
    (folderId: string | null) => onFolderSelect(folderId),
    [onFolderSelect],
  );

  const handleArboristMove = useCallback(
    async ({
      dragIds,
      parentId,
    }: {
      dragIds: string[];
      parentId: string | null;
      index: number;
    }) => {
      const parsedParent =
        parentId !== null ? parseSelectedTreeId(parentId) : null;
      const targetFolderId =
        parsedParent?.type === "folder" ? parsedParent.id : null;
      const targetCardSetId =
        parsedParent?.type === "cardSet" ? parsedParent.id : null;

      for (const dragId of dragIds) {
        const parsed = parseSelectedTreeId(dragId);
        if (!parsed) continue;

        if (parsed.type === "folder") {
          await onUpdateFolder?.(parsed.id, {
            parentFolderId: targetFolderId,
          });
          continue;
        }

        if (parsed.type === "cardSet") {
          if (!targetFolderId) continue;
          await moveCardSetToFolder?.(parsed.id, targetFolderId);
          continue;
        }

        if (parsed.type === "card") {
          if (!targetCardSetId) continue;
          await moveCardToSet?.(parsed.id, targetCardSetId);
          continue;
        }

        if (parsed.type === "document") {
          if (!targetFolderId) continue;
          await moveDocumentToFolder?.(parsed.id, targetFolderId);
        }
      }
    },
    [onUpdateFolder, moveCardSetToFolder, moveCardToSet, moveDocumentToFolder],
  );

  const arboristDisableDrag = useCallback(
    (node: NodeApi<ExplorerTreeNode>) => !node.data?.kind,
    [],
  );

  const arboristDisableDrop = useCallback(
    ({
      parentNode,
      dragNodes,
    }: {
      parentNode: NodeApi<ExplorerTreeNode>;
      dragNodes: NodeApi<ExplorerTreeNode>[];
      index: number;
    }) => shouldDisableExplorerDrop({ parentNode, dragNodes }),
    [],
  );

  const nodeRendererProps = {
    editingId: dialogs.editingId,
    editingName: dialogs.editingName,
    editingNameRef: dialogs.editingNameRef,
    renameCancelledRef: dialogs.renameCancelledRef,
    editInputRef,
    setEditingId: dialogs.setEditingId,
    setEditingName: dialogs.setEditingName,
    fileDragFolderId,
    setFileDragFolderId,
    handlePdfDropped,
    openRowMenuId: dialogs.openRowMenuId,
    setOpenRowMenuId: dialogs.setOpenRowMenuId,
    onFolderSelect: handleFolderNodeSelect,
    onItemSelect,
    canCreateFolder,
    canCreateCardSet,
    canRenameFolder,
    canDeleteFolder,
    canRenameCardSet,
    canDeleteCardSet,
    canRenameDocument,
    canDeleteDocument,
    handleCreateFolderAction: actions.handleCreateFolderAction,
    handleCreateCardSetAction: handleCreateCardSetFromMenu,
    handleDelete: (
      id: string,
      type: "folder" | "cardSet" | "card" | "document",
    ) => {
      void actions.handleDelete({ id, type });
    },
    handleRenameConfirm: actions.handleRenameConfirm,
    setRowRef,
    isFiltering,
    setBulkTagFolderId: dialogs.setBulkTagFolderId,
  } as const;

  const renderTreeNode = useCallback(
    (renderProps: {
      node: { data: ExplorerTreeNode; level: number };
      style: React.CSSProperties;
      isOpen: boolean;
      isSelected: boolean;
      toggle: () => void;
    }) => <ExplorerTreeNodeRenderer {...renderProps} {...nodeRendererProps} />,
    [
      canCreateCardSet,
      canCreateFolder,
      canDeleteCardSet,
      canDeleteDocument,
      canDeleteFolder,
      canRenameCardSet,
      canRenameDocument,
      canRenameFolder,
      dialogs.editingId,
      dialogs.editingName,
      dialogs.editingNameRef,
      dialogs.renameCancelledRef,
      dialogs.setBulkTagFolderId,
      dialogs.setEditingId,
      dialogs.setEditingName,
      dialogs.openRowMenuId,
      dialogs.setOpenRowMenuId,
      fileDragFolderId,
      handleCreateCardSetFromMenu,
      handleFolderNodeSelect,
      handlePdfDropped,
      isFiltering,
      onItemSelect,
      setFileDragFolderId,
      setRowRef,
      actions.handleCreateFolderAction,
      actions.handleRenameConfirm,
    ],
  );

  const onToggleExpand = useCallback(
    (id: string, nextOpen: boolean) => {
      if (id.startsWith("folder:")) {
        const folderId = id.slice("folder:".length);
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          if (nextOpen) next.add(folderId);
          else next.delete(folderId);
          return next;
        });
        return;
      }

      if (id.startsWith("cardSet:")) {
        const cardSetId = id.slice("cardSet:".length);
        setExpandedCardSets((prev) => {
          const next = new Set(prev);
          if (nextOpen) next.add(cardSetId);
          else next.delete(cardSetId);
          return next;
        });
      }
    },
    [setExpandedFolders, setExpandedCardSets],
  );

  const hasRootContent =
    navigationEntries.length > 0 ||
    rootFolderPanels.length > 0 ||
    rootItems.length > 0 ||
    explorerTreeData.length > 0;

  return (
    <div ref={treeRootRef} className={cn("h-full w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={currentFileAccept}
        className="hidden"
        multiple
        onChange={handleToolbarFileInputChange}
      />

      {!hasRootContent ? (
        <ExplorerEmptyState />
      ) : isFiltering && !hasFilterMatches ? (
        <ExplorerNoResultsState />
      ) : (
        <div className="h-full min-h-0">
          {effectiveSidebarDisplayMode === "tree" ? (
            <FolderTreeArborist
              data={explorerTreeData}
              selectedId={selectedTreeId}
              expandedIds={toExpandedTreeIds(expandedFolders, expandedCardSets)}
              onSelect={handleTreeSelect}
              onToggleExpand={onToggleExpand}
              renderNode={renderTreeNode}
              onMove={handleArboristMove}
              disableDrag={arboristDisableDrag}
              disableDrop={arboristDisableDrop}
            />
          ) : (
            <RootFolderPanelList
              entries={navigationEntries}
              selectedFolderId={selectedFolderId}
              selectedItem={selectedItem}
              selectedCardSetId={selectedCardSetId}
              openRowMenuId={dialogs.openRowMenuId}
              setOpenRowMenuId={dialogs.setOpenRowMenuId}
              emptyMessage={navigationEmptyMessage}
              setRowRef={setRowRef}
              onSelectFolder={(id) => {
                if (!id) return;
                setNavigationParentFolderId(id);
                onFolderSelect(id);
              }}
              onItemSelect={onItemSelect}
              canCreateFolder={canCreateFolder}
              canCreateCardSet={canCreateCardSet}
              canRenameFolder={canRenameFolder}
              canDeleteFolder={canDeleteFolder}
              canRenameCardSet={canRenameCardSet}
              canDeleteCardSet={canDeleteCardSet}
              canRenameDocument={canRenameDocument}
              canDeleteDocument={canDeleteDocument}
              handleCreateFolderAction={actions.handleCreateFolderAction}
              handleCreateCardSetAction={handleCreateCardSetFromRootPanel}
              handleDelete={(id, type) => {
                void actions.handleDelete({ id, type });
              }}
              setEditingId={dialogs.setEditingId}
              setEditingName={dialogs.setEditingName}
              renameCancelledRef={dialogs.renameCancelledRef}
              editingId={dialogs.editingId}
              editingName={dialogs.editingName}
              editingNameRef={dialogs.editingNameRef}
              handleRenameConfirm={actions.handleRenameConfirm}
            />
          )}
        </div>
      )}

      {dialogs.bulkTagFolderId && (
        <BulkTagDialog
          open={Boolean(dialogs.bulkTagFolderId)}
          onOpenChange={(open) => {
            if (!open) dialogs.setBulkTagFolderId(null);
          }}
          folderId={dialogs.bulkTagFolderId}
        />
      )}
    </div>
  );
};
