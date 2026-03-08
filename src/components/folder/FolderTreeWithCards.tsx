/* eslint-disable react-hooks/exhaustive-deps -- large legacy explorer handlers intentionally stabilized to avoid interaction regressions. */
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { FileText } from "@/ui/icons";
import { cn } from "@/lib/utils";
import type {
  Card,
  ExplorerItem,
  SelectedExplorerItem,
} from "@/types";
import DeleteFolderDialog from "./DeleteFolderDialog";
import { useToast } from "@/contexts/ToastContext";
import {
  type FolderTreeNode,
  ROOT_FOLDER_ID,
  DEFAULT_NEW_FOLDER_NAME,
  getFolderId,
  getParentFolderId,
  normalizeFolderId,
  isSameFolder,
  getEntityTime,
  createOptimisticId,
  isFileDragEvent,
  extractPdfFiles,
  extractPptxFiles,
} from "./explorer/model/utils";
// useAuth / useReliableFileUpload は useFolderDocumentUpload hook 内で使用
import { FolderRow } from "./explorer/rows/FolderRow";
import { EXPLORER_ROW_BASE_CLASS_NAME } from "./explorer/rows/shared";
import BulkTagDialog from "@/components/tag/BulkTagDialog";
import { FolderTreeArborist } from "@/components/sidebar/FolderTreeArborist";
import {
  buildExplorerTreeData,
  parseSelectedTreeId,
  toExpandedTreeIds,
  toSelectedTreeId,
  type ExplorerTreeNode,
} from "./explorer/tree/arboristAdapter";
import { useEnsureAncestorFoldersExpanded } from "./hooks/useEnsureAncestorFoldersExpanded";
import { useFolderDocumentUpload } from "./hooks/useFolderDocumentUpload";
import { useExplorerKeyboardNavigation } from "./hooks/useExplorerKeyboardNavigation";
import { RootFolderPanelList } from "./components/RootFolderPanelList";
import { ExplorerEmptyState } from "./components/ExplorerEmptyState";
import { ExplorerNoResultsState } from "./components/ExplorerNoResultsState";

type LegacyEntityFields = {
  isDeleted?: boolean;
  is_deleted?: boolean;
  folder_id?: string | null;
  blobUrl?: string | null;
  __optimistic?: boolean;
  cardId?: string;
  documentId?: string;
  message?: string;
};

type CreateCardResult = {
  id?: string;
  cardId?: string;
};

const isSoftDeleted = (
  entity?: { isDeleted?: boolean; is_deleted?: boolean } | null,
) => Boolean(entity?.isDeleted ?? entity?.is_deleted);

const withLegacyFields = <T extends object>(
  value: T,
): T & LegacyEntityFields => value as T & LegacyEntityFields;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
};

const isCreateCardResult = (value: unknown): value is CreateCardResult =>
  typeof value === "object" && value !== null;

const getExplorerItemId = (item: ExplorerItem): string =>
  item.data.id ||
  withLegacyFields(item.data).cardId ||
  withLegacyFields(item.data).documentId ||
  "";

const getSelectedEntityId = (
  item: SelectedExplorerItem | null | undefined,
): string | null => {
  if (!item || typeof item !== "object") return null;
  return "id" in item && typeof item.id === "string" ? item.id : null;
};

interface FolderTreeWithCardsProps {
  folders: FolderTreeNode[];
  cards: Card[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onCreateFolder?: (name: string, parentId?: string) => Promise<string>;
  onUpdateFolder?: (folderId: string, data: unknown) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
  onCreateCard?: (data: unknown) => Promise<unknown>;
  onUpdateCard?: (cardId: string, data: unknown) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
  moveCardToFolder?: (cardId: string, targetFolderId: string) => Promise<void>;
  moveDocumentToFolder?: (
    documentId: string,
    targetFolderId: string,
  ) => Promise<void>;
  reorderCards?: (folderId: string, cardIds: string[]) => Promise<void>;
  pinnedItems?: Array<{ type: "folder" | "card" | "document"; id: string }>;
  onPinItem?: (item: {
    type: "folder" | "card" | "document";
    id: string;
  }) => void;
  onUnpinItem?: (item: {
    type: "folder" | "card" | "document";
    id: string;
  }) => void;
  isFiltering?: boolean;
  createFolderRequestToken?: number;

  /** セクション一覧に戻るよう外部から要求するトークン（変化のたびにセクション一覧へ） */
  navigateToSectionListToken?: number;
  /** サイドバー外側のclass（任意） */
  className?: string;
}

export function FolderTreeWithCards({
  folders,
  cards,
  documents,
  selectedFolderId,
  selectedItem,
  onFolderSelect,
  onItemSelect,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  moveCardToFolder,
  moveDocumentToFolder,
  pinnedItems,
  onPinItem,
  onUnpinItem,
  isFiltering = false,
  createFolderRequestToken = 0,
  navigateToSectionListToken = 0,
  className,
}: FolderTreeWithCardsProps) {
  const ROW_BASE = EXPLORER_ROW_BASE_CLASS_NAME;

  const { error: toastError } = useToast();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("folder_expandedFolders");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [optimisticFolders, setOptimisticFolders] = useState<FolderTreeNode[]>(
    [],
  );
  const [optimisticCards, setOptimisticCards] = useState<Card[]>([]);

  useEffect(() => {
    localStorage.setItem(
      "folder_expandedFolders",
      JSON.stringify(Array.from(expandedFolders)),
    );
  }, [expandedFolders]);

  const treeFolders = useMemo(() => {
    const map = new Map<string, FolderTreeNode>();
    for (const folder of folders) {
      const folderId = getFolderId(folder);
      if (!folderId) continue;
      map.set(folderId, folder);
    }
    for (const folder of optimisticFolders) {
      const id = getFolderId(folder);
      if (!id) continue;
      if (!map.has(id)) map.set(id, folder);
    }
    return Array.from(map.values());
  }, [folders, optimisticFolders]);

  const treeCards = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of cards) {
      map.set(card.id, card);
    }
    for (const card of optimisticCards) {
      if (!map.has(card.id)) map.set(card.id, card);
    }
    return Array.from(map.values());
  }, [cards, optimisticCards]);

  useEnsureAncestorFoldersExpanded({
    selectedFolderId,
    selectedItem,
    treeFolders,
    treeCards,
    setExpandedFolders,
  });

  const [newlyCreatedCardId, setNewlyCreatedCardId] = useState<string | null>(
    null,
  );
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (
      selectedItem?.type === "card" &&
      selectedItem.id &&
      newlyCreatedCardId
    ) {
      if (selectedItem.id !== newlyCreatedCardId) {
        setNewlyCreatedCardId(null);
      }
    }
  }, [selectedItem, newlyCreatedCardId]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [fileDragFolderId, setFileDragFolderId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [deleteTargetFolderId, setDeleteTargetFolderId] = useState<
    string | null
  >(null);
  const [bulkTagFolderId, setBulkTagFolderId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const treeRootRef = useRef<HTMLDivElement | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const editingNameRef = useRef("");
  const optimisticFolderNameRef = useRef<Map<string, string>>(new Map());
  const optimisticCardNameRef = useRef<Map<string, string>>(new Map());
  const renameCancelledRef = useRef(false);
  const inFlightRef = useRef(false);


  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  useEffect(() => {
    editingNameRef.current = editingName;
  }, [editingName]);

  useEffect(() => {
    if (!pendingScrollId) return;
    const row = rowRefs.current.get(pendingScrollId);
    if (!row) return;
    const rafId = window.requestAnimationFrame(() => {
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setPendingScrollId(null);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [pendingScrollId, treeFolders, treeCards, expandedFolders]);

  const setRowRef = useCallback((id: string, node: HTMLElement | null) => {
    if (node) rowRefs.current.set(id, node);
    else rowRefs.current.delete(id);
  }, []);


  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const childFoldersByParentId = useMemo(() => {
    const map = new Map<string, FolderTreeNode[]>();
    for (const folder of treeFolders) {
      const isHidden = folder.isHidden ?? folder.is_hidden;
      if (isSoftDeleted(folder) || isHidden) continue;

      const parentId = normalizeFolderId(getParentFolderId(folder));
      const siblings = map.get(parentId);
      if (siblings) siblings.push(folder);
      else map.set(parentId, [folder]);
    }

    for (const siblings of map.values()) {
      siblings.sort((a, b) => {
        const orderA = (a.orderIndex ?? a.order_index ?? 0) as number;
        const orderB = (b.orderIndex ?? b.order_index ?? 0) as number;
        return orderA - orderB;
      });
    }
    return map;
  }, [treeFolders]);

  const rootFolders = useMemo(
    () => childFoldersByParentId.get(ROOT_FOLDER_ID) ?? [],
    [childFoldersByParentId],
  );

  const getChildFolders = useCallback(
    (parentId: string) => childFoldersByParentId.get(parentId) ?? [],
    [childFoldersByParentId],
  );

  const visibleFolderIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const folder of treeFolders) {
      const isHidden = folder.isHidden ?? folder.is_hidden;
      if (isSoftDeleted(folder) || isHidden) continue;
      const id = getFolderId(folder);
      if (id) set.add(id);
    }
    return set;
  }, [treeFolders]);

  const resolveTreeFolderId = useCallback(
    (folderId: string | null | undefined) => {
      const normalized = normalizeFolderId(folderId);
      if (normalized === ROOT_FOLDER_ID) return ROOT_FOLDER_ID;
      return visibleFolderIdSet.has(normalized) ? normalized : ROOT_FOLDER_ID;
    },
    [visibleFolderIdSet],
  );

  const hasValidFolderBinding = useCallback(
    (folderId: string | null | undefined) => {
      const normalized = normalizeFolderId(folderId);
      if (normalized === ROOT_FOLDER_ID) return false;
      return visibleFolderIdSet.has(normalized);
    },
    [visibleFolderIdSet],
  );

  const directCardCountByFolderId = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of treeCards) {
      if (isSoftDeleted(withLegacyFields(card))) continue;
      if (
        !hasValidFolderBinding(card.folderId ?? withLegacyFields(card).folder_id)
      )
        continue;
      const folderId = resolveTreeFolderId(
        card.folderId ?? withLegacyFields(card).folder_id,
      );
      map.set(folderId, (map.get(folderId) ?? 0) + 1);
    }
    return map;
  }, [treeCards, resolveTreeFolderId, hasValidFolderBinding]);

  const deleteTargetFolder = useMemo(() => {
    if (!deleteTargetFolderId) return null;
    return (
      treeFolders.find(
        (folder) => getFolderId(folder) === deleteTargetFolderId,
      ) ?? null
    );
  }, [deleteTargetFolderId, treeFolders]);

  const deleteTargetCounts = useMemo(() => {
    if (!deleteTargetFolderId) return { cardCount: 0, subfolderCount: 0 };

    let cardCount = 0;
    let subfolderCount = 0;
    const stack = [deleteTargetFolderId];

    while (stack.length > 0) {
      const folderId = stack.pop()!;
      cardCount += directCardCountByFolderId.get(folderId) ?? 0;

      const children = childFoldersByParentId.get(folderId) ?? [];
      subfolderCount += children.length;
      for (const child of children) {
        stack.push(getFolderId(child));
      }
    }

    return { cardCount, subfolderCount };
  }, [deleteTargetFolderId, directCardCountByFolderId, childFoldersByParentId]);

  const itemsByFolderId = useMemo(() => {
    const map = new Map<string, ExplorerItem[]>();
    const pushItem = (
      folderId: string | null | undefined,
      item: ExplorerItem,
    ) => {
      const key = normalizeFolderId(folderId);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    };

    for (const card of treeCards) {
      if (isSoftDeleted(withLegacyFields(card))) continue;
      if (
        !hasValidFolderBinding(card.folderId ?? withLegacyFields(card).folder_id)
      )
        continue;
      pushItem(
        resolveTreeFolderId(card.folderId ?? withLegacyFields(card).folder_id),
        {
          type: "card",
          data: card,
        },
      );
    }
    for (const doc of documents) {
      if (isSoftDeleted(withLegacyFields(doc))) continue;
      if (
        !hasValidFolderBinding(doc.folderId ?? withLegacyFields(doc).folder_id)
      )
        continue;
      pushItem(
        resolveTreeFolderId(doc.folderId ?? withLegacyFields(doc).folder_id),
        {
          type: "document",
          data: doc,
        },
      );
    }

    for (const list of map.values()) {
      list.sort((a, b) => {
        const orderA = a.data.orderIndex ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.data.orderIndex ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;

        const timeA = getEntityTime(a.data.updatedAt);
        const timeB = getEntityTime(b.data.updatedAt);
        return timeB - timeA;
      });
    }
    return map;
  }, [treeCards, documents, resolveTreeFolderId, hasValidFolderBinding]);

  const getFolderItems = useCallback(
    (folderId: string | null): ExplorerItem[] =>
      itemsByFolderId.get(normalizeFolderId(folderId)) ?? [],
    [itemsByFolderId],
  );

  const matchCountMap = useMemo(() => {
    if (!isFiltering) return new Map<string, number>();

    const map = new Map<string, number>();
    const calcMatchCount = (folderId: string): number => {
      if (map.has(folderId)) return map.get(folderId)!;
      const directCount = getFolderItems(folderId).length;
      const children = getChildFolders(folderId);
      const childCount = children.reduce(
        (acc, child) => acc + calcMatchCount(getFolderId(child)),
        0,
      );
      const total = directCount + childCount;
      map.set(folderId, total);
      return total;
    };

    for (const folder of treeFolders) {
      const folderId = getFolderId(folder);
      if (!map.has(folderId)) calcMatchCount(folderId);
    }
    return map;
  }, [isFiltering, treeFolders, getFolderItems, getChildFolders]);

  const rootItems = useMemo(() => getFolderItems(null), [getFolderItems]);

  const hasFilterMatches = useMemo(() => {
    if (!isFiltering) return true;
    if (rootItems.length > 0) return true;

    return rootFolders.some((folder) => {
      const folderId = getFolderId(folder);
      return (matchCountMap.get(folderId) ?? 0) > 0;
    });
  }, [isFiltering, rootItems, rootFolders, matchCountMap]);

  const handleArboristMove = useCallback(
    async ({
      dragIds,
      parentId,
    }: {
      dragIds: string[];
      parentId: string | null;
      index: number;
    }) => {
      const newFolderRawId =
        parentId !== null
          ? (parseSelectedTreeId(parentId)?.id ?? ROOT_FOLDER_ID)
          : ROOT_FOLDER_ID;

      for (const dragId of dragIds) {
        const parsed = parseSelectedTreeId(dragId);
        if (!parsed) continue;

        if (parsed.type === "folder") {
          await onUpdateFolder?.(parsed.id, {
            parentFolderId: newFolderRawId || null,
          });
        } else if (parsed.type === "card") {
          await moveCardToFolder?.(parsed.id, newFolderRawId);
        } else if (parsed.type === "document") {
          await moveDocumentToFolder?.(parsed.id, newFolderRawId);
        }
      }
    },
    [onUpdateFolder, moveCardToFolder, moveDocumentToFolder],
  );

  const arboristDisableDrag = useCallback(
    (node: import("react-arborist").NodeApi<ExplorerTreeNode>) => {
      return !node.data?.kind;
    },
    [],
  );

  const arboristDisableDrop = useCallback(
    ({
      parentNode,
      dragNodes,
    }: {
      parentNode: import("react-arborist").NodeApi<ExplorerTreeNode>;
      dragNodes: import("react-arborist").NodeApi<ExplorerTreeNode>[];
      index: number;
    }) => {
      const parentKind = parentNode?.data?.kind;

      if (parentKind === "card" || parentKind === "document") return true;

      for (const dragNode of dragNodes) {
        if (dragNode.data?.kind !== "folder") continue;
        let check: import("react-arborist").NodeApi<ExplorerTreeNode> | null =
          parentNode;
        while (check) {
          if (check.id === dragNode.id) return true;
          check = check.parent;
        }
      }

      return false;
    },
    [],
  );

  const explorerTreeData = useMemo<ExplorerTreeNode[]>(
    () =>
      buildExplorerTreeData({
        rootFolders,
        rootItems,
        getChildFolders,
        getFolderItems,
        isFiltering,
        matchCountMap,
        getFolderId,
      }),
    [
      getChildFolders,
      getFolderItems,
      isFiltering,
      matchCountMap,
      rootFolders,
      rootItems,
    ],
  );

  const rootFolderPanels = useMemo(
    () =>
      rootFolders
        .map((folder) => {
          const id = getFolderId(folder);
          if (!id) return null;
          return {
            id,
            name: folder.folderName || folder.folder_name || "無題のフォルダ",
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

  const [activeRootFolderId, setActiveRootFolderId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (navigateToSectionListToken <= 0) return;
    setActiveRootFolderId(null);
  }, [navigateToSectionListToken]);

  useEffect(() => {
    if (!selectedFolderId) return;
    const rootFolderIds = new Set(
      rootFolders.map((folder) => getFolderId(folder)).filter(Boolean),
    );
    let currentId: string | null = selectedFolderId;
    let rootId: string | null = null;
    while (currentId) {
      if (rootFolderIds.has(currentId)) {
        rootId = currentId;
        break;
      }
      const folder = treeFolders.find((f) => getFolderId(f) === currentId);
      if (!folder) break;
      currentId = normalizeFolderId(getParentFolderId(folder));
    }
    if (rootId === selectedFolderId) return;
    if (rootId && activeRootFolderId !== rootId) {
      setActiveRootFolderId(rootId);
    }
  }, [selectedFolderId, rootFolders, treeFolders, activeRootFolderId]);

  const scopedTreeData = useMemo<ExplorerTreeNode[]>(() => {
    if (!activeRootFolderId) return [];
    const rootNode = explorerTreeData.find(
      (node) => node.kind === "folder" && node.rawId === activeRootFolderId,
    );
    return rootNode?.children ?? [];
  }, [activeRootFolderId, explorerTreeData]);

  const selectedTreeId = useMemo(() => {
    return toSelectedTreeId(selectedFolderId, selectedItem);
  }, [selectedFolderId, selectedItem]);

  const handleTreeSelect = useCallback(
    (id: string) => {
      const parsed = parseSelectedTreeId(id);
      if (!parsed) return;
      if (parsed.type === "folder") onFolderSelect(parsed.id);
      if (parsed.type === "card") onItemSelect({ type: "card", id: parsed.id });
      if (parsed.type === "document")
        onItemSelect({ type: "document", id: parsed.id });
    },
    [onFolderSelect, onItemSelect],
  );

  const getNextOrderIndex = useCallback(
    (folderId: string | null) => {
      const targetFolderId = resolveTreeFolderId(folderId);
      let maxOrder = -1;
      for (const card of treeCards) {
        if (isSoftDeleted(withLegacyFields(card))) continue;
        const cardFolderId = resolveTreeFolderId(
          card.folderId ?? withLegacyFields(card).folder_id,
        );
        if (!isSameFolder(cardFolderId, targetFolderId)) continue;
        const order = card.orderIndex ?? -1;
        if (order > maxOrder) maxOrder = order;
      }
      for (const doc of documents) {
        if (isSoftDeleted(withLegacyFields(doc))) continue;
        const docFolderId = resolveTreeFolderId(
          doc.folderId ?? withLegacyFields(doc).folder_id,
        );
        if (!isSameFolder(docFolderId, targetFolderId)) continue;
        const order = doc.orderIndex ?? -1;
        if (order > maxOrder) maxOrder = order;
      }
      return maxOrder + 1;
    },
    [treeCards, documents, resolveTreeFolderId],
  );

  const {
    fileInputRef,
    handlePdfDropped,
    handlePptxDropped,
    handleToolbarAddFile,
    handleToolbarFileInputChange,
  } = useFolderDocumentUpload({
    selectedFolderId,
    getNextOrderIndex,
    setExpandedFolders,
  });

  const getUniqueFolderName = useCallback(
    (parentId: string | null) => {
      const siblings = treeFolders.filter((folder) => {
        if (isSoftDeleted(folder)) return false;
        return isSameFolder(getParentFolderId(folder), parentId);
      });
      const names = new Set(
        siblings
          .map((folder) =>
            String(folder.folderName ?? folder.folder_name ?? "").trim(),
          )
          .filter(Boolean),
      );
      if (!names.has(DEFAULT_NEW_FOLDER_NAME)) return DEFAULT_NEW_FOLDER_NAME;

      let next = 2;
      while (names.has(`${DEFAULT_NEW_FOLDER_NAME} (${next})`)) {
        next += 1;
      }
      return `${DEFAULT_NEW_FOLDER_NAME} (${next})`;
    },
    [treeFolders],
  );

  const closeRename = useCallback(() => {
    setEditingId(null);
    setEditingName("");
    editingIdRef.current = null;
    editingNameRef.current = "";
    renameCancelledRef.current = false;
  }, []);

  const handleCreateFolderAction = async (parentId: string | null) => {
    if (!onCreateFolder) return;
    const name = getUniqueFolderName(parentId);
    const tempId = createOptimisticId("folder");
    optimisticFolderNameRef.current.set(tempId, name);
    const siblingCount = treeFolders.filter((folder) => {
      if (isSoftDeleted(folder)) return false;
      return isSameFolder(getParentFolderId(folder), parentId);
    }).length;

    const optimisticFolder = {
      id: tempId,
      folderId: tempId,
      folderName: name,
      parentFolderId: parentId,
      isDeleted: false,
      orderIndex: siblingCount,
      __optimistic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setOptimisticFolders((prev) => [...prev, optimisticFolder]);
    if (parentId) {
      setExpandedFolders((prev) => new Set(prev).add(parentId));
    }
    setEditingId(tempId);
    setEditingName(name);
    editingIdRef.current = tempId;
    editingNameRef.current = name;
    renameCancelledRef.current = false;
    setPendingScrollId(tempId);

    try {
      const createdFolderId = await onCreateFolder(name, parentId ?? undefined);
      if (!createdFolderId) {
        throw new Error("フォルダIDの取得に失敗しました");
      }
      const finalName =
        (editingIdRef.current === tempId
          ? editingNameRef.current.trim()
          : optimisticFolderNameRef.current.get(tempId)) || name;

      setOptimisticFolders((prev) =>
        prev.filter((folder) => getFolderId(folder) !== tempId),
      );
      if (parentId) {
        setExpandedFolders((prev) => new Set(prev).add(parentId));
      }
      optimisticFolderNameRef.current.delete(tempId);
      const isStillEditingTemp = editingIdRef.current === tempId;
      if (isStillEditingTemp) {
        const carriedName = editingNameRef.current || finalName || name;
        setEditingId(createdFolderId);
        setEditingName(carriedName);
        editingIdRef.current = createdFolderId;
        editingNameRef.current = carriedName;
      }
      onFolderSelect(createdFolderId);
      if (!isStillEditingTemp && finalName !== name) {
        void onUpdateFolder?.(createdFolderId, { folderName: finalName });
      }
      setPendingScrollId(createdFolderId);
    } catch (err: unknown) {
      setOptimisticFolders((prev) =>
        prev.filter((folder) => getFolderId(folder) !== tempId),
      );
      optimisticFolderNameRef.current.delete(tempId);
      setPendingScrollId((prev) => (prev === tempId ? null : prev));
      if (editingIdRef.current === tempId) {
        closeRename();
      }
      toastError?.(getErrorMessage(err, "フォルダの作成に失敗しました"));
    }
  };

  useEffect(() => {
    if (createFolderRequestToken <= 0) return;
    void handleCreateFolderAction(null);
  }, [createFolderRequestToken]);

  const handleCreateCardAction = async (targetFolderId: string | null) => {
    if (!onCreateCard) return;

    const normalizedFolderId = normalizeFolderId(targetFolderId);
    const title = "";
    const tempId = createOptimisticId("card");
    optimisticCardNameRef.current.set(tempId, title);
    const now = new Date();

    const optimisticCard = {
      id: tempId,
      folderId: normalizedFolderId,
      title,
      orderIndex: getNextOrderIndex(targetFolderId),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      __optimistic: true,
    } as unknown as Card;

    setOptimisticCards((prev) => [...prev, optimisticCard]);
    if (targetFolderId) {
      setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
    }
    setPendingScrollId(tempId);

    try {
      const createdCardRaw = await onCreateCard({
        folderId: normalizedFolderId,
        title,
        blocks: [],
      });
      const createdCard = isCreateCardResult(createdCardRaw)
        ? createdCardRaw
        : null;
      const createdCardId = createdCard?.id ?? createdCard?.cardId ?? null;

      if (createdCardId) {
        setNewlyCreatedCardId(createdCardId);
        onItemSelect({ type: "card", id: createdCardId });
      }

      const finalName =
        (editingIdRef.current === tempId
          ? editingNameRef.current.trim()
          : optimisticCardNameRef.current.get(tempId)) || title;

      setOptimisticCards((prev) => prev.filter((card) => card.id !== tempId));
      optimisticCardNameRef.current.delete(tempId);

      if (!createdCardId) {
        throw new Error("カードIDの取得に失敗しました");
      }

      if (editingIdRef.current === tempId) {
        closeRename();
      }
      if (finalName !== title) {
        void onUpdateCard?.(createdCardId, { title: finalName });
      }
      setPendingScrollId(createdCardId);
    } catch (err: unknown) {
      setOptimisticCards((prev) => prev.filter((card) => card.id !== tempId));
      optimisticCardNameRef.current.delete(tempId);
      setPendingScrollId((prev) => (prev === tempId ? null : prev));
      if (editingIdRef.current === tempId) {
        closeRename();
      }
      toastError?.(getErrorMessage(err, "カードの作成に失敗しました"));
    }
  };

  const handleRenameConfirm = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      if (renameCancelledRef.current) {
        renameCancelledRef.current = false;
        closeRename();
        return;
      }

      const id = editingIdRef.current;
      const nextName = editingNameRef.current.trim();

      if (!id) return;

      if (!nextName) {
        closeRename();
        return;
      }

      if (id.startsWith("tmp-")) {
        const isOptimisticFolder = optimisticFolders.some(
          (folder) => getFolderId(folder) === id,
        );
        if (isOptimisticFolder) {
          optimisticFolderNameRef.current.set(id, nextName);
          setOptimisticFolders((prev) =>
            prev.map((folder) =>
              getFolderId(folder) === id
                ? { ...folder, folderName: nextName, folder_name: nextName }
                : folder,
            ),
          );
          closeRename();
          return;
        }

        const isOptimisticCard = optimisticCards.some((card) => card.id === id);
        if (isOptimisticCard) {
          optimisticCardNameRef.current.set(id, nextName);
          setOptimisticCards((prev) =>
            prev.map((card) =>
              card.id === id ? ({ ...card, title: nextName } as Card) : card,
            ),
          );
          closeRename();
          return;
        }

        closeRename();
        return;
      }

      const isFolder = treeFolders.some((folder) => getFolderId(folder) === id);
      if (isFolder) {
        await onUpdateFolder?.(id, { folderName: nextName });
      } else {
        await onUpdateCard?.(id, { title: nextName });
      }
      closeRename();
    } catch (err: unknown) {
      toastError?.(getErrorMessage(err, "名前の変更に失敗しました"));
    } finally {
      inFlightRef.current = false;
    }
  };

  const handleDelete = async (id: string, type: "folder" | "card") => {
    const isOptimistic =
      type === "folder"
        ? optimisticFolders.some((folder) => getFolderId(folder) === id)
        : optimisticCards.some((card) => card.id === id);
    if (isOptimistic) return;

    if (type === "folder") {
      if (!onDeleteFolder) return;
      setDeleteTargetFolderId(id);
      setDeleteFolderDialogOpen(true);
      return;
    }

    const confirmMessage = "このカードを削除しますか?";
    if (!confirm(confirmMessage)) return;

    await onDeleteCard?.(id);
  };

  const handleDeleteFolderDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      setDeleteFolderDialogOpen(nextOpen);
      if (!nextOpen) setDeleteTargetFolderId(null);
    },
    [],
  );

  const handleConfirmDeleteFolder = useCallback(
    async (folder: unknown) => {
      if (!folder || typeof folder !== "object") {
        throw new Error("フォルダ情報の取得に失敗しました");
      }
      const typedFolder = folder as { id?: string; folderId?: string };
      const folderId = String(typedFolder.id ?? typedFolder.folderId ?? "");
      if (!folderId) throw new Error("フォルダIDの取得に失敗しました");
      if (!onDeleteFolder) throw new Error("フォルダ削除ハンドラが未設定です");
      await onDeleteFolder(folderId);
    },
    [onDeleteFolder],
  );

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
    handleCreateFolderAction,
    handleToolbarAddFile,
    handleDelete,
    setEditingId,
    setEditingName,
  });

  const renderTreeNode = useCallback(
    ({
      node,
      style,
      isOpen,
      isSelected,
      toggle,
    }: {
      node: { data: ExplorerTreeNode; level: number };
      style: React.CSSProperties;
      isOpen: boolean;
      isSelected: boolean;
      toggle: () => void;
    }) => {
      const treeNode = node.data;

      if (treeNode.kind === "folder" && treeNode.folder) {
        const folderId = treeNode.rawId;
        const isPinned =
          pinnedItems?.some(
            (item) => item.type === "folder" && item.id === folderId,
          ) ?? false;

        return (
          <div style={style}>
            <FolderRow
              folder={treeNode.folder}
              depth={0}
              isExpanded={isOpen}
              isSelected={isSelected}
              isEditing={editingId === folderId}
              editingId={editingId}
              setEditingId={setEditingId}
              editingName={editingName}
              setEditingName={setEditingName}
              editingNameRef={editingNameRef}
              editInputRef={
                editInputRef as unknown as React.RefObject<HTMLInputElement>
              }
              onToggle={toggle}
              onSelect={() => onFolderSelect(folderId)}
              onNavigate={() => onFolderSelect(folderId)}
              handleCreateFolderAction={handleCreateFolderAction}
              handleCreateCardAction={handleCreateCardAction}
              handleDelete={handleDelete}
              handleRenameConfirm={handleRenameConfirm}
              renameCancelledRef={renameCancelledRef}
              isPinned={isPinned}
              handleTogglePin={() => {
                if (isPinned) onUnpinItem?.({ type: "folder", id: folderId });
                else onPinItem?.({ type: "folder", id: folderId });
              }}
              isFiltering={Boolean(isFiltering)}
              matchCount={treeNode.matchCount ?? -1}
              rowBaseClassName={ROW_BASE}
              hasUpdateOrDelete={Boolean(onUpdateFolder || onDeleteFolder)}
              menuOpen={openRowMenuId === `folder:${folderId}`}
              onMenuOpenChange={(open) =>
                setOpenRowMenuId(
                  open
                    ? `folder:${folderId}`
                    : (prev) => (prev === `folder:${folderId}` ? null : prev),
                )
              }
              onBulkTag={() => setBulkTagFolderId(folderId)}
              setRowRef={
                setRowRef as (id: string, node: HTMLElement | null) => void
              }
              isDimmed={Boolean(treeNode.isDimmed)}
              isFileDraggingOver={fileDragFolderId === folderId}
              onDragEnterCapture={(e) => {
                if (!isFileDragEvent(e)) return;
                e.preventDefault();
                e.stopPropagation();
                setFileDragFolderId(folderId);
              }}
              onDragOverCapture={(e) => {
                if (!isFileDragEvent(e)) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "copy";
                setFileDragFolderId(folderId);
              }}
              onDragLeaveCapture={(e) => {
                if (!isFileDragEvent(e)) return;
                const nextTarget = e.relatedTarget as Node | null;
                if (nextTarget && e.currentTarget.contains(nextTarget)) return;
                setFileDragFolderId((prev) =>
                  prev === folderId ? null : prev,
                );
              }}
              onDropCapture={(e) => {
                if (!isFileDragEvent(e)) return;
                e.preventDefault();
                e.stopPropagation();
                setFileDragFolderId(null);
                const files = e.dataTransfer?.files ?? null;
                const pdfFiles = extractPdfFiles(files);
                const pptxFiles = extractPptxFiles(files);
                if (pdfFiles.length > 0)
                  void handlePdfDropped(folderId, pdfFiles);
                if (pptxFiles.length > 0)
                  void handlePptxDropped(folderId, pptxFiles);
              }}
              hasExpandableContent={Boolean(treeNode.children?.length)}
            />
          </div>
        );
      }

      const iconClassName =
        treeNode.kind === "document" ? "text-rose-500" : "text-[#6E6E80]";

      return (
        <div style={style}>
          <div
            ref={(el) => setRowRef(treeNode.rawId, el)}
            className={cn(
              ROW_BASE,
              "flex h-6 min-h-6 items-center pr-2 pl-0 leading-6 select-none",
              treeNode.kind === "card" && "sidebar-row--document",
              treeNode.kind === "document" && "sidebar-row--document",
            )}
            data-selected={isSelected || undefined}
            style={{ paddingLeft: "4px" }}
            onClick={() => {
              if (treeNode.kind === "card")
                onItemSelect({ type: "card", id: treeNode.rawId });
              if (treeNode.kind === "document")
                onItemSelect({ type: "document", id: treeNode.rawId });
            }}
          >
            <span className="mr-1 size-4 shrink-0" />
            <FileText
              className={cn("mr-2 h-4 w-4 shrink-0", iconClassName)}
              style={{ transform: "translateY(-1px)" }}
            />
            <span
              className={cn(
                "truncate text-sm",
                isSelected ? "font-medium text-[#202123]" : "text-[#202123]",
              )}
            >
              {treeNode.name}
            </span>
          </div>
        </div>
      );
    },
    [
      ROW_BASE,
      editInputRef,
      editingId,
      editingName,
      editingNameRef,
      fileDragFolderId,
      handleCreateCardAction,
      handleCreateFolderAction,
      handleDelete,
      handlePdfDropped,
      handlePptxDropped,
      handleRenameConfirm,
      isFiltering,
      onDeleteFolder,
      onFolderSelect,
      onItemSelect,
      onPinItem,
      onUnpinItem,
      openRowMenuId,
      pinnedItems,
      renameCancelledRef,
      setRowRef,
      setEditingId,
      setEditingName,
      onUpdateFolder,
    ],
  );

  const hasRootContent =
    rootFolderPanels.length > 0 || explorerTreeData.length > 0;

  return (
    <div
      ref={treeRootRef}
      className={cn("h-full w-full border-r border-black/5", className)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
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
          {rootFolderPanels.length === 0 ? (
            <FolderTreeArborist
              data={explorerTreeData}
              selectedId={selectedTreeId}
              expandedIds={toExpandedTreeIds(expandedFolders)}
              onSelect={handleTreeSelect}
              onToggleExpand={(id, nextOpen) => {
                if (!id.startsWith("folder:")) return;
                const folderId = id.slice("folder:".length);
                setExpandedFolders((prev) => {
                  const next = new Set(prev);
                  if (nextOpen) next.add(folderId);
                  else next.delete(folderId);
                  return next;
                });
              }}
              renderNode={renderTreeNode}
              onMove={handleArboristMove}
              disableDrag={arboristDisableDrag}
              disableDrop={arboristDisableDrop}
            />
          ) : !activeRootFolderId ? (
            <RootFolderPanelList
              rootFolderPanels={rootFolderPanels}
              selectedFolderId={selectedFolderId}
              openRowMenuId={openRowMenuId}
              setOpenRowMenuId={setOpenRowMenuId}
              onSelectFolder={(id) => {
                setActiveRootFolderId(id);
                onFolderSelect(id);
              }}
              handleCreateFolderAction={handleCreateFolderAction}
              handleCreateCardAction={handleCreateCardAction}
              handleDelete={handleDelete}
              pinnedItems={pinnedItems}
              onPinItem={onPinItem}
              onUnpinItem={onUnpinItem}
              setEditingId={setEditingId}
              setEditingName={setEditingName}
            />
          ) : (
            <div className="h-full min-h-0 flex flex-col">
              <div className="flex-1 min-h-0">
                <FolderTreeArborist
                  data={scopedTreeData}
                  selectedId={selectedTreeId}
                  expandedIds={toExpandedTreeIds(expandedFolders)}
                  onSelect={handleTreeSelect}
                  onToggleExpand={(id, nextOpen) => {
                    if (!id.startsWith("folder:")) return;
                    const folderId = id.slice("folder:".length);
                    setExpandedFolders((prev) => {
                      const next = new Set(prev);
                      if (nextOpen) next.add(folderId);
                      else next.delete(folderId);
                      return next;
                    });
                  }}
                  renderNode={renderTreeNode}
                  onMove={handleArboristMove}
                  disableDrag={arboristDisableDrag}
                  disableDrop={arboristDisableDrop}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <DeleteFolderDialog
        open={deleteFolderDialogOpen}
        onOpenChange={handleDeleteFolderDialogOpenChange}
        folder={deleteTargetFolder}
        cardCount={deleteTargetCounts.cardCount}
        subfolderCount={deleteTargetCounts.subfolderCount}
        onConfirm={handleConfirmDeleteFolder}
      />

      {bulkTagFolderId && (
        <BulkTagDialog
          open={Boolean(bulkTagFolderId)}
          onOpenChange={(open) => {
            if (!open) setBulkTagFolderId(null);
          }}
          folderId={bulkTagFolderId}
        />
      )}
    </div>
  );
}