import { useCallback, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  getFolderId,
  normalizeFolderId,
  type FolderTreeNode,
} from "@/components/folder/explorer/model/utils";
import type { CardSet, SelectedExplorerItem } from "@/types";

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
type DocumentUpdateInput = Record<string, unknown>;

type FolderDraft = {
  parentFolderId: string | null;
  orderIndex: number;
};

type CardSetDraft = {
  folderId: string;
  orderIndex: number;
};

type UseFolderActionsParams = {
  treeFolders: FolderTreeNode[];
  treeCardSets: CardSet[];

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
  onUpdateFolder?: (folderId: string, data: FolderUpdateInput) => Promise<void>;
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
  onUpdateCardSet?: (
    cardSetId: string,
    data: CardSetUpdateInput,
  ) => Promise<void>;
  onDeleteCardSet?: (cardSetId: string) => Promise<void>;

  onDeleteCard?: (cardId: string) => Promise<void>;
  onUpdateDocument?: (
    documentId: string,
    data: DocumentUpdateInput,
  ) => Promise<void>;
  onDeleteDocument?: (documentId: string) => Promise<void>;

  editingIdRef: MutableRefObject<string | null>;
  editingNameRef: MutableRefObject<string>;
  renameCancelledRef: MutableRefObject<boolean>;

  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  closeRename: () => void;

  setOptimisticFolders: Dispatch<SetStateAction<FolderTreeNode[]>>;
  setOptimisticCardSets: Dispatch<SetStateAction<CardSet[]>>;
  setHiddenFolderIds: Dispatch<SetStateAction<Set<string>>>;
  setHiddenCardSetIds: Dispatch<SetStateAction<Set<string>>>;

  optimisticFolders: FolderTreeNode[];
  optimisticCardSets: CardSet[];

  setExpandedFolders: Dispatch<SetStateAction<Set<string>>>;
  setPendingScrollId: (id: string | null) => void;

  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onSelectCardSet?: (
    cardSetId: string,
    folderId: string,
    label: string,
  ) => void;
  setNewlyCreatedCardId: (id: string | null) => void;

  getUniqueFolderName?: (parentId: string | null, baseName: string) => string;
};

const DEFAULT_NEW_FOLDER_NAME = "新規フォルダ";
const DEFAULT_NEW_CARDSET_NAME = "新規カードセット";

const parseTarget = (target: DeleteLikeTarget, fallbackId: string | null) => {
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
};

const isCardSetId = (cardSets: CardSet[], id: string) => {
  return cardSets.some((cardSet) => cardSet.id === id);
};

const createEntityId = (prefix: "folder" | "cardSet") => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const makeTempFolder = (
  id: string,
  name: string,
  parentFolderId: string | null,
  orderIndex: number,
) => {
  const now = new Date();

  return {
    id,
    folderId: id,
    folderName: name,
    folder_name: name,
    parentFolderId,
    parent_folder_id: parentFolderId,
    orderIndex,
    order_index: orderIndex,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    __optimistic: true,
    __draft: true,
  } as FolderTreeNode;
};

const makeTempCardSet = (
  id: string,
  name: string,
  folderId: string,
  orderIndex: number,
) => {
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
    __optimistic: true,
    __draft: true,
  } as CardSet & { __optimistic?: boolean; __draft?: boolean };
};

const getFolderParentId = (folder: FolderTreeNode) => {
  return normalizeFolderId(
    (
      folder as {
        parentFolderId?: string | null;
        parent_folder_id?: string | null;
      }
    ).parentFolderId ??
      (
        folder as {
          parentFolderId?: string | null;
          parent_folder_id?: string | null;
        }
      ).parent_folder_id,
  );
};

const getFolderOrderIndex = (folder: FolderTreeNode) => {
  return (
    (
      folder as {
        orderIndex?: number;
        order_index?: number;
      }
    ).orderIndex ??
    (
      folder as {
        orderIndex?: number;
        order_index?: number;
      }
    ).order_index ??
    0
  );
};

const nextOrderIndexForFolder = (
  folders: FolderTreeNode[],
  parentFolderId: string | null,
) => {
  const siblingIndexes = folders
    .filter((folder) => getFolderParentId(folder) === parentFolderId)
    .map(getFolderOrderIndex)
    .filter((orderIndex) => Number.isFinite(orderIndex));

  return siblingIndexes.length > 0 ? Math.min(...siblingIndexes) - 1 : 0;
};

const nextOrderIndexForCardSet = (cardSets: CardSet[], folderId: string) => {
  const siblingIndexes = cardSets
    .filter((cardSet) => cardSet.folderId === folderId)
    .map((cardSet) => cardSet.orderIndex ?? 0)
    .filter((orderIndex) => Number.isFinite(orderIndex));

  return siblingIndexes.length > 0 ? Math.min(...siblingIndexes) - 1 : 0;
};

export const useFolderActions = ({
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
  editingIdRef,
  editingNameRef,
  renameCancelledRef,
  setEditingId,
  setEditingName,
  closeRename,
  setOptimisticFolders,
  setOptimisticCardSets,
  setHiddenFolderIds,
  setHiddenCardSetIds,
  optimisticFolders: _optimisticFolders,
  optimisticCardSets: _optimisticCardSets,
  setExpandedFolders,
  setPendingScrollId,
  onFolderSelect: _onFolderSelect,
  onItemSelect: _onItemSelect,
  onSelectCardSet: _onSelectCardSet,
  setNewlyCreatedCardId: _setNewlyCreatedCardId,
  getUniqueFolderName,
}: UseFolderActionsParams) => {
  const pendingFolderDraftsRef = useRef(new Map<string, FolderDraft>());
  const pendingCardSetDraftsRef = useRef(new Map<string, CardSetDraft>());
  const pendingFolderDeleteRequestsRef = useRef(new Set<string>());
  const pendingCardSetDeleteRequestsRef = useRef(new Set<string>());

  const resolveTargetKind = useCallback(
    (id: string, type?: RenameTargetKind | null): RenameTargetKind => {
      if (type) return type;
      if (
        pendingCardSetDraftsRef.current.has(id) ||
        isCardSetId(treeCardSets, id)
      ) {
        return "cardSet";
      }
      return "folder";
    },
    [treeCardSets],
  );

  const updateOptimisticFolderName = useCallback(
    (id: string, nextName: string) => {
      setOptimisticFolders((prev) =>
        prev.map((folder) =>
          getFolderId(folder) === id
            ? {
                ...folder,
                folderName: nextName,
                folder_name: nextName,
                updatedAt: new Date(),
              }
            : folder,
        ),
      );
    },
    [setOptimisticFolders],
  );

  const updateOptimisticCardSetName = useCallback(
    (id: string, nextName: string) => {
      setOptimisticCardSets((prev) =>
        prev.map((cardSet) =>
          cardSet.id === id
            ? {
                ...cardSet,
                name: nextName,
                updatedAt: new Date(),
              }
            : cardSet,
        ),
      );
    },
    [setOptimisticCardSets],
  );

  const removeOptimisticFolder = useCallback(
    (id: string) => {
      setOptimisticFolders((prev) =>
        prev.filter((folder) => getFolderId(folder) !== id),
      );
    },
    [setOptimisticFolders],
  );

  const removeOptimisticCardSet = useCallback(
    (id: string) => {
      setOptimisticCardSets((prev) =>
        prev.filter((cardSet) => cardSet.id !== id),
      );
    },
    [setOptimisticCardSets],
  );

  const hideFolder = useCallback(
    (id: string) => {
      setHiddenFolderIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [setHiddenFolderIds],
  );

  const unhideFolder = useCallback(
    (id: string) => {
      setHiddenFolderIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [setHiddenFolderIds],
  );

  const hideCardSet = useCallback(
    (id: string) => {
      setHiddenCardSetIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [setHiddenCardSetIds],
  );

  const unhideCardSet = useCallback(
    (id: string) => {
      setHiddenCardSetIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [setHiddenCardSetIds],
  );

  const closeRenameIfEditingTarget = useCallback(
    (id: string) => {
      if (editingIdRef.current !== id) return;
      closeRename();
    },
    [closeRename, editingIdRef],
  );

  const clearFolderDraft = useCallback(
    (id: string) => {
      pendingFolderDraftsRef.current.delete(id);
      removeOptimisticFolder(id);
      if (editingIdRef.current === id) {
        closeRename();
      }
    },
    [closeRename, editingIdRef, removeOptimisticFolder],
  );

  const clearCardSetDraft = useCallback(
    (id: string) => {
      pendingCardSetDraftsRef.current.delete(id);
      removeOptimisticCardSet(id);
      if (editingIdRef.current === id) {
        closeRename();
      }
    },
    [closeRename, editingIdRef, removeOptimisticCardSet],
  );

  const handleCreateFolderAction = useCallback(
    (parentFolderId: string | null) => {
      const normalizedParentId = normalizeFolderId(parentFolderId);
      const nextName = getUniqueFolderName
        ? getUniqueFolderName(normalizedParentId, DEFAULT_NEW_FOLDER_NAME)
        : DEFAULT_NEW_FOLDER_NAME;
      const folderId = createEntityId("folder");
      const orderIndex = nextOrderIndexForFolder(treeFolders, normalizedParentId);

      if (normalizedParentId) {
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          next.add(normalizedParentId);
          return next;
        });
      }

      pendingFolderDraftsRef.current.set(folderId, {
        parentFolderId: normalizedParentId,
        orderIndex,
      });
      setOptimisticFolders((prev) => [
        makeTempFolder(folderId, nextName, normalizedParentId, orderIndex),
        ...prev,
      ]);
      setEditingId(folderId);
      setEditingName(nextName);
      editingIdRef.current = folderId;
      editingNameRef.current = nextName;
      renameCancelledRef.current = false;

      return folderId;
    },
    [
      editingIdRef,
      editingNameRef,
      getUniqueFolderName,
      renameCancelledRef,
      setEditingId,
      setEditingName,
      setExpandedFolders,
      setOptimisticFolders,
      setPendingScrollId,
      treeFolders,
    ],
  );

  const handleCreateCardSetAction = useCallback(
    (folderId: string | null) => {
      const normalizedFolderId = normalizeFolderId(folderId);
      if (!normalizedFolderId) return null;

      const cardSetId = createEntityId("cardSet");
      const orderIndex = nextOrderIndexForCardSet(treeCardSets, normalizedFolderId);

      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(normalizedFolderId);
        return next;
      });
      pendingCardSetDraftsRef.current.set(cardSetId, {
        folderId: normalizedFolderId,
        orderIndex,
      });
      setOptimisticCardSets((prev) => [
        makeTempCardSet(cardSetId, DEFAULT_NEW_CARDSET_NAME, normalizedFolderId, orderIndex),
        ...prev,
      ]);
      setPendingScrollId(cardSetId);
      setEditingId(cardSetId);
      setEditingName(DEFAULT_NEW_CARDSET_NAME);
      editingIdRef.current = cardSetId;
      editingNameRef.current = DEFAULT_NEW_CARDSET_NAME;
      renameCancelledRef.current = false;

      return cardSetId;
    },
    [
      editingIdRef,
      editingNameRef,
      renameCancelledRef,
      setEditingId,
      setEditingName,
      setExpandedFolders,
      setOptimisticCardSets,
      setPendingScrollId,
      treeCardSets,
    ],
  );

  const handleDelete = useCallback(
    async (target?: DeleteLikeTarget) => {
      const { id, type } = parseTarget(target, editingIdRef.current);
      if (!id) return;

      if (pendingFolderDraftsRef.current.has(id)) {
        clearFolderDraft(id);
        return;
      }

      if (pendingCardSetDraftsRef.current.has(id)) {
        clearCardSetDraft(id);
        return;
      }

      const resolvedType = resolveTargetKind(id, type);

      if (resolvedType === "folder") {
        const deleteFolder = onDeleteFolder;
        if (!deleteFolder) return;

        closeRenameIfEditingTarget(id);
        hideFolder(id);
        removeOptimisticFolder(id);

        try {
          await deleteFolder(id);
        } catch (error) {
          unhideFolder(id);
          throw error;
        }

        return;
      }

      if (resolvedType === "cardSet") {
        const deleteCardSet = onDeleteCardSet;
        if (!deleteCardSet) return;

        closeRenameIfEditingTarget(id);
        hideCardSet(id);
        removeOptimisticCardSet(id);

        try {
          await deleteCardSet(id);
        } catch (error) {
          unhideCardSet(id);
          throw error;
        }

        return;
      }

      if (resolvedType === "document") {
        const deleteDocument = onDeleteDocument;
        if (!deleteDocument) return;
        await deleteDocument(id);
        return;
      }

      if (resolvedType === "card") {
        const deleteCard = onDeleteCard;
        if (!deleteCard) return;
        await deleteCard(id);
      }
    },
    [
      clearCardSetDraft,
      clearFolderDraft,
      closeRenameIfEditingTarget,
      editingIdRef,
      hideCardSet,
      hideFolder,
      onDeleteCard,
      onDeleteCardSet,
      onDeleteDocument,
      onDeleteFolder,
      removeOptimisticCardSet,
      removeOptimisticFolder,
      resolveTargetKind,
      unhideCardSet,
      unhideFolder,
    ],
  );

  const handleRenameConfirm = useCallback(
    async (target?: DeleteLikeTarget) => {
      const fallbackId = editingIdRef.current;
      const { id, type } = parseTarget(target, fallbackId);

      if (!id) {
        closeRename();
        return;
      }

      if (renameCancelledRef.current) {
        renameCancelledRef.current = false;
        if (pendingFolderDraftsRef.current.has(id)) {
          clearFolderDraft(id);
          return;
        }
        if (pendingCardSetDraftsRef.current.has(id)) {
          clearCardSetDraft(id);
          return;
        }
        closeRename();
        return;
      }

      const nextName = editingNameRef.current.trim();
      const folderDraft = pendingFolderDraftsRef.current.get(id);
      if (folderDraft) {
        if (!nextName) {
          clearFolderDraft(id);
          return;
        }

        const createFolder = onCreateFolder;
        if (!createFolder) {
          clearFolderDraft(id);
          return;
        }

        pendingFolderDraftsRef.current.delete(id);
        updateOptimisticFolderName(id, nextName);
        closeRename();

        try {
          await createFolder(nextName, folderDraft.parentFolderId || undefined, {
            id,
            orderIndex: folderDraft.orderIndex,
          });
        } catch (error) {
          console.error("[useFolderActions] create folder failed:", error);
          removeOptimisticFolder(id);
        }

        return;
      }

      const cardSetDraft = pendingCardSetDraftsRef.current.get(id);
      if (cardSetDraft) {
        if (!nextName) {
          clearCardSetDraft(id);
          return;
        }

        const createCardSet = onCreateCardSet;
        if (!createCardSet) {
          clearCardSetDraft(id);
          return;
        }

        pendingCardSetDraftsRef.current.delete(id);
        updateOptimisticCardSetName(id, nextName);
        closeRename();

        try {
          await createCardSet(nextName, cardSetDraft.folderId, {
            id,
            orderIndex: cardSetDraft.orderIndex,
          });
        } catch (error) {
          console.error("[useFolderActions] create card set failed:", error);
          removeOptimisticCardSet(id);
        }

        return;
      }

      if (!nextName) {
        closeRename();
        return;
      }

      const resolvedType = resolveTargetKind(id, type);

      if (resolvedType === "folder") {
        const updateFolder = onUpdateFolder;
        if (!updateFolder) {
          closeRename();
          return;
        }

        if (pendingFolderDeleteRequestsRef.current.has(id)) {
          closeRename();
          return;
        }

        updateOptimisticFolderName(id, nextName);
        closeRename();

        try {
          await updateFolder(id, { folderName: nextName, name: nextName });
        } catch (error) {
          console.error("[useFolderActions] rename failed:", error);
        }

        return;
      }

      if (resolvedType === "cardSet") {
        const updateCardSet = onUpdateCardSet;
        if (!updateCardSet) {
          closeRename();
          return;
        }

        if (pendingCardSetDeleteRequestsRef.current.has(id)) {
          closeRename();
          return;
        }

        updateOptimisticCardSetName(id, nextName);
        closeRename();

        try {
          await updateCardSet(id, { name: nextName });
        } catch (error) {
          console.error("[useFolderActions] rename failed:", error);
        }

        return;
      }

      if (resolvedType === "document") {
        const updateDocument = onUpdateDocument;
        if (!updateDocument) {
          closeRename();
          return;
        }

        closeRename();

        try {
          await updateDocument(id, { title: nextName });
        } catch (error) {
          console.error("[useFolderActions] rename failed:", error);
        }
      }
    },
    [
      clearCardSetDraft,
      clearFolderDraft,
      closeRename,
      editingIdRef,
      editingNameRef,
      onCreateCardSet,
      onCreateFolder,
      onUpdateCardSet,
      onUpdateDocument,
      onUpdateFolder,
      removeOptimisticCardSet,
      removeOptimisticFolder,
      renameCancelledRef,
      resolveTargetKind,
      updateOptimisticCardSetName,
      updateOptimisticFolderName,
    ],
  );

  return {
    handleCreateFolderAction,
    handleCreateCardSetAction,
    handleDelete,
    handleRenameConfirm,
  };
};
