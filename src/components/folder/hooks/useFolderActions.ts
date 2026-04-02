import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  getFolderId,
  normalizeFolderId,
  type FolderTreeNode,
} from "@/components/folder/explorer/model/utils";
import type { Card, CardSet, SelectedExplorerItem } from "@/types";

type RenameTargetKind = "folder" | "cardSet" | "card" | "document";

type DeleteLikeTarget =
  | {
      type?: RenameTargetKind | null;
      id?: string | null;
    }
  | null
  | undefined;

type FolderUpdateInput = Record<string, unknown>;
type CardSetUpdateInput = Record<string, unknown>;
type CardCreateInput = Record<string, unknown>;
type CardUpdateInput = Record<string, unknown>;

type UseFolderActionsParams = {
  treeFolders: FolderTreeNode[];
  treeCardSets: CardSet[];

  onCreateFolder?: (name: string, parentId?: string) => Promise<string>;
  onUpdateFolder?: (folderId: string, data: FolderUpdateInput) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;

  onCreateCardSet?: (
    name: string,
    folderId: string,
    opts?: { description?: string },
  ) => Promise<CardSet>;
  onUpdateCardSet?: (
    cardSetId: string,
    data: CardSetUpdateInput,
  ) => Promise<void>;
  onDeleteCardSet?: (cardSetId: string) => Promise<void>;

  onCreateCard?: (data: CardCreateInput) => Promise<unknown>;
  onUpdateCard?: (cardId: string, data: CardUpdateInput) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;

  selectedCardSetId?: string | null;

  editingIdRef: MutableRefObject<string | null>;
  editingNameRef: MutableRefObject<string>;
  renameCancelledRef: MutableRefObject<boolean>;

  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  closeRename: () => void;
  openDeleteFolderDialog: (folderId: string) => void;

  setOptimisticFolders: Dispatch<SetStateAction<FolderTreeNode[]>>;
  setOptimisticCards: Dispatch<SetStateAction<Card[]>>;
  setOptimisticCardSets: Dispatch<SetStateAction<CardSet[]>>;

  optimisticFolders: FolderTreeNode[];
  optimisticCards: Card[];
  optimisticCardSets: CardSet[];

  setExpandedFolders: Dispatch<SetStateAction<Set<string>>>;
  setPendingScrollId: (id: string | null) => void;

  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  setNewlyCreatedCardId: (id: string | null) => void;

  getNextOrderIndex?: (folderId: string | null) => number;
  getUniqueFolderName?: (baseName: string, parentId: string | null) => string;
};

const DEFAULT_NEW_FOLDER_NAME = "新規フォルダ";
const DEFAULT_NEW_CARDSET_NAME = "新規カードセット";

function parseTarget(
  target: DeleteLikeTarget,
  fallbackId: string | null,
): { type: RenameTargetKind | null; id: string | null } {
  if (target?.id) {
    return {
      type: target.type ?? null,
      id: target.id,
    };
  }

  return {
    type: null,
    id: fallbackId,
  };
}

function isCardSetId(cardSets: CardSet[], id: string): boolean {
  return cardSets.some((cardSet) => cardSet.id === id);
}

function makeTempFolder(
  id: string,
  name: string,
  parentFolderId: string | null,
  orderIndex: number,
): FolderTreeNode {
  const now = new Date();

  return {
    id,
    folderName: name,
    parentFolderId,
    orderIndex,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  } as FolderTreeNode;
}

function makeTempCardSet(
  id: string,
  name: string,
  folderId: string,
  orderIndex: number,
): CardSet {
  const now = new Date();

  return {
    id,
    userId: "",
    deviceId: "web",
    folderId,
    name,
    description: undefined,
    orderIndex,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function useFolderActions({
  treeFolders,
  treeCardSets,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateCardSet,
  onUpdateCardSet,
  onDeleteCardSet,
  onDeleteCard,
  editingIdRef,
  editingNameRef,
  renameCancelledRef,
  setEditingId,
  setEditingName,
  closeRename,
  openDeleteFolderDialog,
  setOptimisticFolders,
  setOptimisticCardSets,
  setExpandedFolders,
  setPendingScrollId,
  onFolderSelect,
  onItemSelect,
  getNextOrderIndex,
  getUniqueFolderName,
}: UseFolderActionsParams) {
  const handleCreateFolderAction = useCallback(
    async (parentFolderId: string | null) => {
      const normalizedParentId = normalizeFolderId(parentFolderId);
      const nextName = getUniqueFolderName
        ? getUniqueFolderName(DEFAULT_NEW_FOLDER_NAME, normalizedParentId)
        : DEFAULT_NEW_FOLDER_NAME;

      const tempId = `temp-folder-${crypto.randomUUID()}`;
      const nextOrderIndex = getNextOrderIndex
        ? getNextOrderIndex(normalizedParentId)
        : 0;

      const tempFolder = makeTempFolder(
        tempId,
        nextName,
        normalizedParentId,
        nextOrderIndex,
      );

      setOptimisticFolders((prev) => [...prev, tempFolder]);

      if (normalizedParentId) {
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          next.add(normalizedParentId);
          return next;
        });
      }

      setEditingId(tempId);
      setEditingName(nextName);
      editingIdRef.current = tempId;
      editingNameRef.current = nextName;
      renameCancelledRef.current = false;
      setPendingScrollId(tempId);

      try {
        if (!onCreateFolder) return;

        const createdFolderId = await onCreateFolder(
          nextName,
          normalizedParentId ?? undefined,
        );

        setOptimisticFolders((prev) =>
          prev.filter((folder) => getFolderId(folder) !== tempId),
        );

        setEditingId(createdFolderId);
        editingIdRef.current = createdFolderId;
        setPendingScrollId(createdFolderId);
        onFolderSelect(createdFolderId);
      } catch (error) {
        console.error("[useFolderActions] create folder failed:", error);
        setOptimisticFolders((prev) =>
          prev.filter((folder) => getFolderId(folder) !== tempId),
        );
        closeRename();
      }
    },
    [
      closeRename,
      editingIdRef,
      editingNameRef,
      getNextOrderIndex,
      getUniqueFolderName,
      onCreateFolder,
      onFolderSelect,
      renameCancelledRef,
      setEditingId,
      setEditingName,
      setExpandedFolders,
      setOptimisticFolders,
      setPendingScrollId,
    ],
  );

  const handleCreateCardSetAction = useCallback(
    async (folderId: string | null) => {
      const normalizedFolderId = normalizeFolderId(folderId);
      if (!normalizedFolderId || !onCreateCardSet) return;

      const tempId = `temp-cardset-${crypto.randomUUID()}`;
      const siblingOrderIndex =
        treeCardSets
          .filter(
            (cardSet) =>
              !cardSet.isDeleted && cardSet.folderId === normalizedFolderId,
          )
          .reduce((max, cardSet) => Math.max(max, cardSet.orderIndex ?? 0), -1) +
        1;

      const tempCardSet = makeTempCardSet(
        tempId,
        DEFAULT_NEW_CARDSET_NAME,
        normalizedFolderId,
        siblingOrderIndex,
      );

      setOptimisticCardSets((prev) => [...prev, tempCardSet]);
      setEditingId(tempId);
      setEditingName(DEFAULT_NEW_CARDSET_NAME);
      editingIdRef.current = tempId;
      editingNameRef.current = DEFAULT_NEW_CARDSET_NAME;
      renameCancelledRef.current = false;
      setPendingScrollId(tempId);

      try {
        const created = await onCreateCardSet(
          DEFAULT_NEW_CARDSET_NAME,
          normalizedFolderId,
        );

        setOptimisticCardSets((prev) =>
          prev.filter((cardSet) => cardSet.id !== tempId),
        );

        setEditingId(created.id);
        editingIdRef.current = created.id;
        setPendingScrollId(created.id);
        onFolderSelect(normalizedFolderId);
        onItemSelect({ type: "cardSet", id: created.id });
      } catch (error) {
        console.error("[useFolderActions] create card set failed:", error);
        setOptimisticCardSets((prev) =>
          prev.filter((cardSet) => cardSet.id !== tempId),
        );
        closeRename();
      }
    },
    [
      closeRename,
      editingIdRef,
      editingNameRef,
      onCreateCardSet,
      onFolderSelect,
      onItemSelect,
      renameCancelledRef,
      setEditingId,
      setEditingName,
      setOptimisticCardSets,
      setPendingScrollId,
      treeCardSets,
    ],
  );

  const handleDelete = useCallback(
    async (target?: DeleteLikeTarget) => {
      const { id, type } = parseTarget(target, editingIdRef.current);
      if (!id) return;

      const resolvedType: RenameTargetKind | null =
        type ?? (isCardSetId(treeCardSets, id) ? "cardSet" : "folder");

      if (resolvedType === "folder") {
        openDeleteFolderDialog(id);
        return;
      }

      if (resolvedType === "cardSet") {
        await onDeleteCardSet?.(id);
        return;
      }

      if (resolvedType === "card") {
        await onDeleteCard?.(id);
      }
    },
    [editingIdRef, onDeleteCard, onDeleteCardSet, openDeleteFolderDialog, treeCardSets],
  );

  const handleRenameConfirm = useCallback(
    async (target?: DeleteLikeTarget) => {
      const fallbackId = editingIdRef.current;
      const { id, type } = parseTarget(target, fallbackId);
      const nextName = editingNameRef.current.trim();

      if (!id || !nextName) {
        closeRename();
        return;
      }

      const resolvedType: RenameTargetKind | null =
        type ?? (isCardSetId(treeCardSets, id) ? "cardSet" : "folder");

      try {
        if (resolvedType === "cardSet") {
          await onUpdateCardSet?.(id, { name: nextName });
        } else if (resolvedType === "folder") {
          await onUpdateFolder?.(id, { folderName: nextName, name: nextName });
        }

        closeRename();
      } catch (error) {
        console.error("[useFolderActions] rename failed:", error);
      }
    },
    [
      closeRename,
      editingIdRef,
      editingNameRef,
      onUpdateCardSet,
      onUpdateFolder,
      treeCardSets,
    ],
  );

  const handleConfirmDeleteFolder = useCallback(
    async (folderId?: string) => {
      const targetId = folderId ?? editingIdRef.current;
      if (!targetId) return;
      await onDeleteFolder?.(targetId);
    },
    [editingIdRef, onDeleteFolder],
  );

  return {
    handleCreateFolderAction,
    handleCreateCardSetAction,
    handleDelete,
    handleRenameConfirm,
    handleConfirmDeleteFolder,
  };
}
