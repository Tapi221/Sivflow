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
  sidebarDisplayMode?: "auto" | "tree" | "navigation";
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
  moveCardToFolder?: (cardId: string, targetFolderId: string) => Promise<void>;
  moveCardSetToFolder?: (
    cardSetId: string,
    targetFolderId: string,
  ) => Promise<void>;
  moveDocumentToFolder?: (
    documentId: string,
    targetFolderId: string,
  ) => Promise<void>;
  reorderCards?: (folderId: string, cardIds: string[]) => Promise<void>;
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
  onSectionListModeChange?: (isSectionListMode: boolean) => void;
  onHeaderFolderIdChange?: (folderId: string | null) => void;
  className?: string;
}

export const FolderTreeWithCards = ({
  sidebarDisplayMode = "auto",
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
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onUpdateDocument,
  onDeleteDocument,
  moveCardToFolder,
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
  onSectionListModeChange,
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
  const [optimisticCards, setOptimisticCards] = useState<Card[]>([]);
  const [optimisticCardSets, setOptimisticCardSets] = useState<CardSet[]>([]);
  const [newlyCreatedCardId, setNewlyCreatedCardId] = useState<string | null>(
    null,
  );
  const [fileDragFolderId, setFileDragFolderId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [navigationParentFolderId, setNavigationParentFolderId] = useState<
    string | null
  >(null);

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
      if (id) map.set(id, f);
    }
    for (const f of folders) {
      const id = getFolderId(f);
      if (id && !map.has(id)) map.set(id, f);
    }
    return Array.from(map.values());
  }, [folders, optimisticFolders]);

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
      map.set(cs.id, cs);
    }
    for (const cs of cardSets) {
      if (!map.has(cs.id)) map.set(cs.id, cs);
    }
    return Array.from(map.values());
  }, [cardSets, optimisticCardSets]);

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
  } = derived;

  const rootFolderIdSet = useMemo(
    () =>
      new Set(
        rootFolders
          .map((folder) => getFolderId(folder))
          .filter((id): id is string => Boolean(id)),
      ),
    [rootFolders],
  );

  const rootItems = useMemo(() => getFolderItems(null), [getFolderItems]);

  const navigationFolderId = navigationParentFolderId ?? null;

  const navigationCardSets = useMemo(
    () => getCardSets(navigationFolderId),
    [getCardSets, navigationFolderId],
  );

  const navigationItems = useMemo(
    () => getFolderItems(navigationFolderId),
    [getFolderItems, navigationFolderId],
  );

  const navigationFolderPanels = useMemo(
    () =>
      (navigationParentFolderId
        ? getChildFolders(navigationParentFolderId)
        : rootFolders
      )
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
    [getChildFolders, navigationParentFolderId, rootFolders],
  );

  const navigationEntries = useMemo(
    () => [
      ...navigationFolderPanels.map((panel) => ({
        kind: "folder" as const,
        id: panel.id,
        name: panel.name,
        folder: panel.folder,
      })),
      ...navigationCardSets.map((cardSet) => ({
        kind: "cardSet" as const,
        id: cardSet.id,
        name: cardSet.name?.trim() || "無題のセット",
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
    [navigationFolderPanels, navigationCardSets, navigationItems],
  );

  const rootFolderPanels = useMemo(
    () =>
      rootFolders
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
    [rootFolders],
  );

  const canUseNavigationMode =
    rootFolderPanels.length > 0 && rootItems.length === 0;

  const effectiveSidebarDisplayMode = useMemo(() => {
    if (sidebarDisplayMode === "tree") return "tree";
    if (sidebarDisplayMode === "navigation") {
      return canUseNavigationMode ? "navigation" : "tree";
    }
    return canUseNavigationMode ? "navigation" : "tree";
  }, [canUseNavigationMode, sidebarDisplayMode]);

  const isSectionListVisible =
    effectiveSidebarDisplayMode === "navigation" &&
    navigationParentFolderId === null;

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
    onCreateCard,
    onUpdateCard,
    onDeleteCard,
    onUpdateDocument,
    onDeleteDocument,
    selectedCardSetId,
    editingIdRef: dialogs.editingIdRef,
    editingNameRef: dialogs.editingNameRef,
    renameCancelledRef: dialogs.renameCancelledRef,
    setEditingId: dialogs.setEditingId,
    setEditingName: dialogs.setEditingName,
    closeRename: dialogs.closeRename,

    setOptimisticFolders,
    setOptimisticCards,
    setOptimisticCardSets,
    optimisticFolders,
    optimisticCards,
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
    navigationParentFolderId,
    selectedFolderId,
  ]);

  const headerFolderId = useMemo(() => {
    if (selectedFolderId) return selectedFolderId;
    if (navigationParentFolderId) return navigationParentFolderId;
    if (selectedItem?.type === "cardSet") {
      return (
        treeCardSets.find((cardSet) => cardSet.id === selectedItem.id)
          ?.folderId ?? null
      );
    }
    return null;
  }, [navigationParentFolderId, selectedFolderId, selectedItem, treeCardSets]);

  useEffect(() => {
    onHeaderFolderIdChange?.(headerFolderId);
  }, [headerFolderId, onHeaderFolderIdChange]);

  useEffect(() => {
    const trigger = () => {
      actions.handleCreateFolderAction(headerFolderId);
    };
    onRegisterCreateFolderTrigger?.(trigger);
    return () => onRegisterCreateFolderTrigger?.(null);
  }, [
    actions.handleCreateFolderAction,
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
    handlePptxDropped,
    handleToolbarAddDocument,
    currentFileAccept,
    handleToolbarFileInputChange,
  } = useFolderDocumentUpload({
    selectedFolderId,
    actionFolderId: headerFolderId,
    getNextOrderIndex,
    setExpandedFolders,
  });

  useExplorerKeyboardNavigation({
    selectedFolderId,
    selectedItem,
    treeFolders,
    expandedFolders,
    treeRootRef,
    rootFolders,
    getChildFolders,
    getFolderItems,
    toggleFolder,
    onFolderSelect,
    onItemSelect,
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
    const trigger = (folderId?: string | null) => {
      handleCreateCardSetFromMenu(folderId ?? headerFolderId);
    };
    onRegisterCreateCardSetTrigger?.(trigger);
    return () => onRegisterCreateCardSetTrigger?.(null);
  }, [
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

  useEffect(() => {
    onSectionListModeChange?.(isSectionListVisible);
  }, [isSectionListVisible, onSectionListModeChange]);

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
          if (!targetFolderId) continue;
          await moveCardToFolder?.(parsed.id, targetFolderId);
          continue;
        }

        if (parsed.type === "document") {
          if (!targetFolderId) continue;
          await moveDocumentToFolder?.(parsed.id, targetFolderId);
        }
      }
    },
    [
      onUpdateFolder,
      moveCardSetToFolder,
      moveCardToFolder,
      moveDocumentToFolder,
    ],
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
    }) => {
      const parentKind = parentNode?.data?.kind;
      if (
        parentKind === "card" ||
        parentKind === "document" ||
        parentKind === "cardSet"
      ) {
        return true;
      }

      const isDropToRoot =
        !parentNode?.data || parentNode.data.kind !== "folder";

      for (const dragNode of dragNodes) {
        const dragKind = dragNode.data?.kind;

        if (dragKind === "folder") {
          let check: NodeApi<ExplorerTreeNode> | null = parentNode;
          while (check) {
            if (check.id === dragNode.id) return true;
            check = check.parent;
          }
          continue;
        }

        if (
          isDropToRoot &&
          (dragKind === "cardSet" ||
            dragKind === "card" ||
            dragKind === "document")
        ) {
          return true;
        }
      }

      return false;
    },
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
    handlePptxDropped,
    openRowMenuId: dialogs.openRowMenuId,
    setOpenRowMenuId: dialogs.setOpenRowMenuId,
    onFolderSelect: handleFolderNodeSelect,
    onItemSelect,
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
    hasUpdateOrDelete: Boolean(onUpdateFolder || onDeleteFolder),
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
      dialogs.editingId,
      dialogs.editingName,
      dialogs.editingNameRef,
      dialogs.renameCancelledRef,
      dialogs.setEditingId,
      dialogs.setEditingName,
      dialogs.openRowMenuId,
      dialogs.setOpenRowMenuId,
      dialogs.setBulkTagFolderId,
      fileDragFolderId,
      setFileDragFolderId,
      handlePdfDropped,
      handlePptxDropped,
      handleFolderNodeSelect,
      onItemSelect,
      actions.handleCreateFolderAction,
      handleCreateCardSetFromMenu,
      actions.handleRenameConfirm,
      setRowRef,
      isFiltering,
      onUpdateFolder,
      onDeleteFolder,
      onUpdateDocument,
      onDeleteDocument,
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

  const navigationEmptyMessage =
    effectiveSidebarDisplayMode === "navigation" &&
    navigationParentFolderId !== null &&
    navigationEntries.length === 0
      ? "この階層には表示できるコンテンツがありません"
      : null;

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
              handleCreateFolderAction={actions.handleCreateFolderAction}
              handleCreateCardSetAction={handleCreateCardSetFromRootPanel}
              handleDelete={(id, type) => {
                void actions.handleDelete({ id, type });
              }}
              setEditingId={dialogs.setEditingId}
              setEditingName={dialogs.setEditingName}
              editingNameRef={dialogs.editingNameRef}
              renameCancelledRef={dialogs.renameCancelledRef}
              editingId={dialogs.editingId}
              editingName={dialogs.editingName}
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
