/* eslint-disable react-hooks/exhaustive-deps -- large legacy explorer handlers intentionally stabilized to avoid interaction regressions. */
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";
import type { Card, CardSet, SelectedExplorerItem } from "@/types";
import type { DocumentItem } from "@/types";
import DeleteFolderDialog from "../dialogs/DeleteFolderDialog";
import {
  type FolderTreeNode,
  getFolderId,
  normalizeFolderId,
} from "@/components/folder/explorer/model/utils";
import BulkTagDialog from "@/components/tag/BulkTagDialog";
import { FolderTreeArborist } from "@/components/sidebar/FolderTreeArborist";
import {
  buildExplorerTreeData,
  parseSelectedTreeId,
  toExpandedTreeIds,
  toSelectedTreeId,
  type ExplorerTreeNode,
} from "@/components/folder/explorer/tree/arboristAdapter";
import { useEnsureAncestorFoldersExpanded } from "@/components/folder/hooks/useEnsureAncestorFoldersExpanded";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useExplorerKeyboardNavigation } from "@/components/folder/hooks/useExplorerKeyboardNavigation";
import { useExpandedFolders } from "@/components/folder/hooks/useExpandedFolders";
import { useExplorerDialogs } from "@/components/folder/hooks/useExplorerDialogs";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderActions } from "@/components/folder/hooks/useFolderActions";
import { RootFolderPanelList } from "@/components/folder/components/RootFolderPanelList";
import { ExplorerEmptyState } from "@/components/folder/components/ExplorerEmptyState";
import { ExplorerNoResultsState } from "@/components/folder/components/ExplorerNoResultsState";
import { ExplorerTreeNodeRenderer } from "@/components/folder/components/ExplorerTreeNode";
import type { NodeApi } from "react-arborist";

interface FolderTreeWithCardsProps {
  folders: FolderTreeNode[];
  cards: Card[];
  cardSets?: CardSet[];
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
  moveCardSetToFolder?: (cardSetId: string, targetFolderId: string | null) => Promise<void>;
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
  selectedCardSetId?: string | null;
  isFiltering?: boolean;
  createFolderRequestToken?: number;
  navigateToSectionListToken?: number;
  className?: string;
}

export function FolderTreeWithCards({
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
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  moveCardToFolder,
  moveCardSetToFolder,
  moveDocumentToFolder,
  pinnedItems,
  onPinItem,
  onUnpinItem,
  selectedCardSetId = null,
  isFiltering = false,
  createFolderRequestToken = 0,
  navigateToSectionListToken = 0,
  className,
}: FolderTreeWithCardsProps) {
  const { expandedFolders, setExpandedFolders, toggleFolder } =
    useExpandedFolders();

  const dialogs = useExplorerDialogs();

  const [optimisticFolders, setOptimisticFolders] = useState<FolderTreeNode[]>([]);
  const [optimisticCards, setOptimisticCards] = useState<Card[]>([]);
  const [newlyCreatedCardId, setNewlyCreatedCardId] = useState<string | null>(null);
  const [fileDragFolderId, setFileDragFolderId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [activeRootFolderId, setActiveRootFolderId] = useState<string | null>(null);

  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const treeRootRef = useRef<HTMLDivElement | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // merge optimistic
  const treeFolders = useMemo(() => {
    const map = new Map<string, FolderTreeNode>();
    for (const f of folders) {
      const id = getFolderId(f);
      if (id) map.set(id, f);
    }
    for (const f of optimisticFolders) {
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

  const derived = useExplorerDerivedData({
    treeFolders,
    treeCards,
    cardSets,
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
    deleteTargetCounts,
    getNextOrderIndex,
    getUniqueFolderName,
  } = derived;

  const actions = useFolderActions({
    treeFolders,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    onCreateCard,
    onUpdateCard,
    onDeleteCard,
    selectedCardSetId,
    editingIdRef: dialogs.editingIdRef,
    editingNameRef: dialogs.editingNameRef,
    renameCancelledRef: dialogs.renameCancelledRef,
    setEditingId: dialogs.setEditingId,
    setEditingName: dialogs.setEditingName,
    closeRename: dialogs.closeRename,
    openDeleteFolderDialog: dialogs.openDeleteFolderDialog,
    setOptimisticFolders,
    setOptimisticCards,
    optimisticFolders,
    optimisticCards,
    setExpandedFolders,
    setPendingScrollId,
    onFolderSelect,
    onItemSelect,
    setNewlyCreatedCardId,
    getNextOrderIndex,
    getUniqueFolderName,
  });

  useEnsureAncestorFoldersExpanded({
    selectedFolderId,
    selectedItem,
    treeFolders,
    treeCards,
    setExpandedFolders,
  });

  // sync refs with state changes
  useEffect(() => {
    if (editInputRef.current && dialogs.editingId) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [dialogs.editingId]);

  useEffect(() => {
    dialogs.editingIdRef.current = dialogs.editingId;
  }, [dialogs.editingId]);

  useEffect(() => {
    dialogs.editingNameRef.current = dialogs.editingName;
  }, [dialogs.editingName]);

  // clear newlyCreatedCardId when selection changes
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

  // scroll to pending row
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

  // navigate to section list on token change
  useEffect(() => {
    if (navigateToSectionListToken <= 0) return;
    setActiveRootFolderId(null);
  }, [navigateToSectionListToken]);

  // sync activeRootFolderId with selectedFolderId
  useEffect(() => {
    if (!selectedFolderId) return;
    const rootFolderIds = new Set(
      rootFolders.map((f) => getFolderId(f)).filter(Boolean),
    );
    let currentId: string | null = selectedFolderId;
    let rootId: string | null = null;
    while (currentId) {
      if (rootFolderIds.has(currentId)) { rootId = currentId; break; }
      const folder = treeFolders.find((f) => getFolderId(f) === currentId);
      if (!folder) break;
      currentId = normalizeFolderId(
        (folder as { parentFolderId?: string | null; parent_folder_id?: string | null })
          .parentFolderId ??
          (folder as { parentFolderId?: string | null; parent_folder_id?: string | null })
            .parent_folder_id,
      );
    }
    if (rootId === selectedFolderId) return;
    if (rootId && activeRootFolderId !== rootId) setActiveRootFolderId(rootId);
  }, [selectedFolderId, rootFolders, treeFolders, activeRootFolderId]);

  // trigger folder creation from external token
  useEffect(() => {
    if (createFolderRequestToken <= 0) return;
    void actions.handleCreateFolderAction(null);
  }, [createFolderRequestToken]);

  const setRowRef = useCallback((id: string, node: HTMLElement | null) => {
    if (node) rowRefs.current.set(id, node);
    else rowRefs.current.delete(id);
  }, []);

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
    handleToolbarAddFile,
    handleDelete: actions.handleDelete,
    setEditingId: dialogs.setEditingId,
    setEditingName: dialogs.setEditingName,
  });

  const rootItems = useMemo(() => getFolderItems(null), [getFolderItems]);

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
    [getChildFolders, getFolderItems, getCardSets, getCardSetItems, isFiltering, matchCountMap, rootFolders, rootItems],
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
              (folder as { folderName?: string; folder_name?: string }).folderName ??
              (folder as { folderName?: string; folder_name?: string }).folder_name ??
              "無題のフォルダ",
            folder,
          };
        })
        .filter(
          (item): item is { id: string; name: string; folder: FolderTreeNode } =>
            item !== null,
        ),
    [rootFolders],
  );

  const scopedTreeData = useMemo<ExplorerTreeNode[]>(() => {
    if (!activeRootFolderId) return [];
    const rootNode = explorerTreeData.find(
      (node) => node.kind === "folder" && node.rawId === activeRootFolderId,
    );
    return rootNode?.children ?? [];
  }, [activeRootFolderId, explorerTreeData]);

  const selectedTreeId = useMemo(
    () => toSelectedTreeId(selectedFolderId, selectedItem),
    [selectedFolderId, selectedItem],
  );

  const handleTreeSelect = useCallback(
    (id: string) => {
      const parsed = parseSelectedTreeId(id);
      if (!parsed) return;
      if (parsed.type === "folder") onFolderSelect(parsed.id);
      if (parsed.type === "cardSet") onItemSelect({ type: "cardSet", id: parsed.id });
      if (parsed.type === "card") onItemSelect({ type: "card", id: parsed.id });
      if (parsed.type === "document")
        onItemSelect({ type: "document", id: parsed.id });
    },
    [onFolderSelect, onItemSelect],
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
      const newFolderRawId =
        parentId !== null
          ? (parseSelectedTreeId(parentId)?.id ?? "root")
          : "root";

      for (const dragId of dragIds) {
        const parsed = parseSelectedTreeId(dragId);
        if (!parsed) continue;
        if (parsed.type === "folder") {
          await onUpdateFolder?.(parsed.id, {
            parentFolderId: newFolderRawId || null,
          });
        } else if (parsed.type === "cardSet") {
          await moveCardSetToFolder?.(parsed.id, newFolderRawId || null);
        } else if (parsed.type === "card") {
          await moveCardToFolder?.(parsed.id, newFolderRawId);
        } else if (parsed.type === "document") {
          await moveDocumentToFolder?.(parsed.id, newFolderRawId);
        }
      }
    },
    [onUpdateFolder, moveCardSetToFolder, moveCardToFolder, moveDocumentToFolder],
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
      if (parentKind === "card" || parentKind === "document" || parentKind === "cardSet") return true;
      for (const dragNode of dragNodes) {
        if (dragNode.data?.kind !== "folder") continue;
        let check: NodeApi<ExplorerTreeNode> | null = parentNode;
        while (check) {
          if (check.id === dragNode.id) return true;
          check = check.parent;
        }
      }
      return false;
    },
    [],
  );

  const deleteTargetFolder = useMemo(
    () =>
      dialogs.deleteTargetFolderId
        ? (treeFolders.find(
            (f) => getFolderId(f) === dialogs.deleteTargetFolderId,
          ) ?? null)
        : null,
    [dialogs.deleteTargetFolderId, treeFolders],
  );

  const deleteTargetCountsValue = useMemo(
    () => deleteTargetCounts(dialogs.deleteTargetFolderId),
    [deleteTargetCounts, dialogs.deleteTargetFolderId],
  );

  // shared node renderer props (stable across renders via useCallback in renderTreeNode)
  const nodeRendererProps = {
    editingId: dialogs.editingId,
    editingName: dialogs.editingName,
    editingNameRef: dialogs.editingNameRef,
    renameCancelledRef: dialogs.renameCancelledRef,
    editInputRef: editInputRef as React.RefObject<HTMLInputElement>,
    setEditingId: dialogs.setEditingId,
    setEditingName: dialogs.setEditingName,
    fileDragFolderId,
    setFileDragFolderId,
    handlePdfDropped,
    handlePptxDropped,
    openRowMenuId: dialogs.openRowMenuId,
    setOpenRowMenuId: dialogs.setOpenRowMenuId,
    onFolderSelect,
    onItemSelect,
    handleCreateFolderAction: actions.handleCreateFolderAction,
    handleCreateCardAction: actions.handleCreateCardAction,
    handleDelete: actions.handleDelete,
    handleRenameConfirm: actions.handleRenameConfirm,
    setRowRef,
    pinnedItems,
    onPinItem,
    onUnpinItem,
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
      onFolderSelect,
      onItemSelect,
      actions.handleCreateFolderAction,
      actions.handleCreateCardAction,
      actions.handleDelete,
      actions.handleRenameConfirm,
      setRowRef,
      pinnedItems,
      onPinItem,
      onUnpinItem,
      isFiltering,
      onUpdateFolder,
      onDeleteFolder,
    ],
  );

  const onToggleExpand = useCallback(
    (id: string, nextOpen: boolean) => {
      if (!id.startsWith("folder:")) return;
      const folderId = id.slice("folder:".length);
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        if (nextOpen) next.add(folderId);
        else next.delete(folderId);
        return next;
      });
    },
    [setExpandedFolders],
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
              onToggleExpand={onToggleExpand}
              renderNode={renderTreeNode}
              onMove={handleArboristMove}
              disableDrag={arboristDisableDrag}
              disableDrop={arboristDisableDrop}
            />
          ) : !activeRootFolderId ? (
            <RootFolderPanelList
              rootFolderPanels={rootFolderPanels}
              selectedFolderId={selectedFolderId}
              openRowMenuId={dialogs.openRowMenuId}
              setOpenRowMenuId={dialogs.setOpenRowMenuId}
              onSelectFolder={(id) => {
                setActiveRootFolderId(id);
                onFolderSelect(id);
              }}
              handleCreateFolderAction={actions.handleCreateFolderAction}
              handleCreateCardAction={actions.handleCreateCardAction}
              handleDelete={actions.handleDelete}
              pinnedItems={pinnedItems}
              onPinItem={onPinItem}
              onUnpinItem={onUnpinItem}
              setEditingId={dialogs.setEditingId}
              setEditingName={dialogs.setEditingName}
              editingId={dialogs.editingId}
              editingName={dialogs.editingName}
              handleRenameConfirm={actions.handleRenameConfirm}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1">
                <FolderTreeArborist
                  data={scopedTreeData}
                  selectedId={selectedTreeId}
                  expandedIds={toExpandedTreeIds(expandedFolders)}
                  onSelect={handleTreeSelect}
                  onToggleExpand={onToggleExpand}
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
        open={dialogs.deleteFolderDialogOpen}
        onOpenChange={dialogs.handleDeleteFolderDialogOpenChange}
        folder={deleteTargetFolder}
        cardCount={deleteTargetCountsValue.cardCount}
        subfolderCount={deleteTargetCountsValue.subfolderCount}
        onConfirm={actions.handleConfirmDeleteFolder}
      />

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
}






