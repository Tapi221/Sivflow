import { useCallback, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  getFolderId,
  normalizeFolderId,
  type FolderTreeNode,
} from "@/components/folder/explorer/model/utils";
import { createOrderedOptimistically } from "@/hooks/shared/useOrderedOptimisticCreate";
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
type DocumentUpdateInput = Record<string, unknown>;

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

  onCreateCard?: (data: CardCreateInput) => Promise<unknown>;
  onUpdateCard?: (cardId: string, data: CardUpdateInput) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
  onUpdateDocument?: (
    documentId: string,
    data: DocumentUpdateInput,
  ) => Promise<void>;
  onDeleteDocument?: (documentId: string) => Promise<void>;

  selectedCardSetId?: string | null;

  editingIdRef: MutableRefObject<string | null>;
  editingNameRef: MutableRefObject<string>;
  renameCancelledRef: MutableRefObject<boolean>;

  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  closeRename: () => void;

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
    parentFolderId,
    orderIndex,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    __optimistic: true,
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
  };
};

const setFolderOrderIndex = (folder: FolderTreeNode, orderIndex: number) => {
  return {
    ...folder,
    orderIndex,
    order_index: orderIndex,
    updatedAt: new Date(),
  } as FolderTreeNode;
};

const setCardSetOrderIndex = (cardSet: CardSet, orderIndex: number) => {
  return {
    ...cardSet,
    orderIndex,
    updatedAt: new Date(),
  };
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

export const useFolderActions = ({
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
  editingIdRef,
  editingNameRef,
  renameCancelledRef,
  setEditingId,
  setEditingName,
  closeRename,
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
  getUniqueFolderName,
}: UseFolderActionsParams) => {
  const pendingFolderCreatesRef = useRef(new Map<string, Promise<void>>());
  const pendingCardSetCreatesRef = useRef(new Map<string, Promise<void>>());

  const resolveTargetKind = useCallback(
    (id: string, type?: RenameTargetKind | null): RenameTargetKind => {
      if (type) return type;
      if (
        pendingCardSetCreatesRef.current.has(id) ||
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

  const handleCreateFolderAction = useCallback(
    (parentFolderId: string | null) => {
      const normalizedParentId = normalizeFolderId(parentFolderId);
      const nextName = getUniqueFolderName
        ? getUniqueFolderName(normalizedParentId, DEFAULT_NEW_FOLDER_NAME)
        : DEFAULT_NEW_FOLDER_NAME;

      const folderId = createEntityId("folder");
      if (normalizedParentId) {
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          next.add(normalizedParentId);
          return next;
        });
      }
      setPendingScrollId(folderId);

      setEditingId(folderId);
      setEditingName(nextName);
      editingIdRef.current = folderId;
      editingNameRef.current = nextName;
      renameCancelledRef.current = false;

      const persistTask = (async () => {
        try {
          await createOrderedOptimistically({
            entities: treeFolders,
            setOptimisticEntities: setOptimisticFolders,
            getEntityId: getFolderId,
            getParentId: getFolderParentId,
            getOrderIndex: getFolderOrderIndex,
            setOrderIndex: setFolderOrderIndex,
            createTempEntity: ({ id, name, parentId, orderIndex }) =>
              makeTempFolder(id, name, parentId, orderIndex),
            persistCreate: async ({ id, name, parentId, orderIndex }) => {
              if (!onCreateFolder) return;
              await onCreateFolder(name, parentId || undefined, {
                id,
                orderIndex,
              });
            },
            targetParentId: normalizedParentId,
            newEntityName: nextName,
            newEntityId: folderId,
          });
        } catch (error) {
          console.error("[useFolderActions] create folder failed:", error);
          if (editingIdRef.current === folderId) {
            closeRename();
          }
        } finally {
          pendingFolderCreatesRef.current.delete(folderId);
        }
      })();

      if (onCreateFolder) {
        pendingFolderCreatesRef.current.set(folderId, persistTask);
      }

      return folderId;
    },
    [
      closeRename,
      editingIdRef,
      editingNameRef,
      getUniqueFolderName,
      onCreateFolder,
      renameCancelledRef,
      setEditingId,
      setEditingName,
      setPendingScrollId,
      setExpandedFolders,
      setOptimisticFolders,
      treeFolders,
    ],
  );

  const handleCreateCardSetAction = useCallback(
    (folderId: string | null) => {
      const normalizedFolderId = normalizeFolderId(folderId);
      if (!normalizedFolderId) return null;

      const cardSetId = createEntityId("cardSet");
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(normalizedFolderId);
        return next;
      });
      setPendingScrollId(cardSetId);
      setEditingId(cardSetId);
      setEditingName(DEFAULT_NEW_CARDSET_NAME);
      editingIdRef.current = cardSetId;
      editingNameRef.current = DEFAULT_NEW_CARDSET_NAME;
      renameCancelledRef.current = false;
      const persistTask = (async () => {
        try {
          await createOrderedOptimistically({
            entities: treeCardSets,
            setOptimisticEntities: setOptimisticCardSets,
            getEntityId: (cardSet) => cardSet.id,
            getParentId: (cardSet) => cardSet.folderId,
            getOrderIndex: (cardSet) => cardSet.orderIndex,
            setOrderIndex: setCardSetOrderIndex,
            createTempEntity: ({ id, name, parentId, orderIndex }) =>
              makeTempCardSet(id, name, parentId ?? "", orderIndex),
            persistCreate: async ({ id, name, parentId, orderIndex }) => {
              if (!parentId) {
                throw new Error("カードセットの親フォルダがありません");
              }
              if (!onCreateCardSet) return;
              await onCreateCardSet(name, parentId, {
                id,
                orderIndex,
              });
            },
            targetParentId: normalizedFolderId,
            newEntityName: DEFAULT_NEW_CARDSET_NAME,
            newEntityId: cardSetId,
          });
        } catch (error) {
          console.error("[useFolderActions] create card set failed:", error);
          if (editingIdRef.current === cardSetId) {
            closeRename();
          }
        } finally {
          pendingCardSetCreatesRef.current.delete(cardSetId);
        }
      })();

      if (onCreateCardSet) {
        pendingCardSetCreatesRef.current.set(cardSetId, persistTask);
      }

      return cardSetId;
    },
    [
      closeRename,
      editingIdRef,
      editingNameRef,
      onCreateCardSet,
      renameCancelledRef,
      setEditingId,
      setEditingName,
      setExpandedFolders,
      setPendingScrollId,
      setOptimisticCardSets,
    ],
  );

  const handleDelete = useCallback(
    async (target?: DeleteLikeTarget) => {
      const { id, type } = parseTarget(target, editingIdRef.current);
      if (!id) return;

      const resolvedType = resolveTargetKind(id, type);

      if (resolvedType === "folder") {
        await onDeleteFolder?.(id);
        return;
      }

      if (resolvedType === "cardSet") {
        await onDeleteCardSet?.(id);
        return;
      }

      if (resolvedType === "document") {
        await onDeleteDocument?.(id);
        return;
      }

      if (resolvedType === "card") {
        await onDeleteCard?.(id);
      }
    },
    [
      editingIdRef,
      onDeleteCard,
      onDeleteCardSet,
      onDeleteDocument,
      onDeleteFolder,
      resolveTargetKind,
    ],
  );

  const handleRenameConfirm = useCallback(
    async (target?: DeleteLikeTarget) => {
      if (renameCancelledRef.current) {
        renameCancelledRef.current = false;
        closeRename();
        return;
      }

      const fallbackId = editingIdRef.current;
      const { id, type } = parseTarget(target, fallbackId);
      const nextName = editingNameRef.current.trim();

      if (!id || !nextName) {
        closeRename();
        return;
      }

      const resolvedType = resolveTargetKind(id, type);

      if (resolvedType === "cardSet") {
        updateOptimisticCardSetName(id, nextName);
      } else if (resolvedType === "folder") {
        updateOptimisticFolderName(id, nextName);
      }

      closeRename();

      try {
        if (resolvedType === "cardSet") {
          await pendingCardSetCreatesRef.current.get(id);
          await onUpdateCardSet?.(id, { name: nextName });
          return;
        }

        if (resolvedType === "document") {
          await onUpdateDocument?.(id, { title: nextName });
          return;
        }

        await pendingFolderCreatesRef.current.get(id);
        await onUpdateFolder?.(id, { folderName: nextName, name: nextName });
      } catch (error) {
        console.error("[useFolderActions] rename failed:", error);
      }
    },
    [
      closeRename,
      editingIdRef,
      editingNameRef,
      onUpdateCardSet,
      onUpdateDocument,
      onUpdateFolder,
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
