import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import {
    createOptimisticId,
    DEFAULT_NEW_CARD_SET_NAME,
    DEFAULT_NEW_FOLDER_NAME,
    getFolderId,
    getParentFolderId,
    isSameFolder,
    normalizeFolderId,
} from "@/components/folder/explorer/model/utils";
import { useToast } from "@/contexts/ToastContext";
import type { Card, CardSet, SelectedExplorerItem } from "@/types";
import { useCallback, useRef } from "react";

const isSoftDeleted = (entity?: { isDeleted?: boolean; is_deleted?: boolean } | null) =>
  Boolean(entity?.isDeleted ?? entity?.is_deleted);

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

const isCreateCardResult = (value: unknown): value is { id?: string; cardId?: string } =>
  typeof value === "object" && value !== null;

interface UseFolderActionsParams {
  treeFolders: FolderTreeNode[];
  treeCardSets: CardSet[];
  onCreateFolder?: (name: string, parentId?: string) => Promise<string>;
  onUpdateFolder?: (folderId: string, data: unknown) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
  onCreateCardSet?: (
    name: string,
    folderId: string | null,
    opts?: { description?: string },
  ) => Promise<CardSet>;
  onUpdateCardSet?: (cardSetId: string, data: unknown) => Promise<void>;
  onDeleteCardSet?: (cardSetId: string) => Promise<void>;
  onCreateCard?: (data: unknown) => Promise<unknown>;
  onUpdateCard?: (cardId: string, data: unknown) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
  selectedCardSetId?: string | null;
  // dialog state
  editingIdRef: React.MutableRefObject<string | null>;
  editingNameRef: React.MutableRefObject<string>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
  closeRename: () => void;
  openDeleteFolderDialog: (folderId: string) => void;
  // optimistic state
  setOptimisticFolders: React.Dispatch<React.SetStateAction<FolderTreeNode[]>>;
  setOptimisticCards: React.Dispatch<React.SetStateAction<Card[]>>;
  setOptimisticCardSets: React.Dispatch<React.SetStateAction<CardSet[]>>;
  optimisticFolders: FolderTreeNode[];
  optimisticCards: Card[];
  optimisticCardSets: CardSet[];
  // expand / scroll
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingScrollId: React.Dispatch<React.SetStateAction<string | null>>;
  // callbacks
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  setNewlyCreatedCardId: React.Dispatch<React.SetStateAction<string | null>>;
  getNextOrderIndex: (folderId: string | null) => number;
  getUniqueFolderName: (parentId: string | null, defaultName: string) => string;
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
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  selectedCardSetId,
  editingIdRef,
  editingNameRef,
  renameCancelledRef,
  setEditingId,
  setEditingName,
  closeRename,
  openDeleteFolderDialog,
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
  setNewlyCreatedCardId,
  getNextOrderIndex,
  getUniqueFolderName,
}: UseFolderActionsParams) {
  const { error: toastError } = useToast();
  const inFlightRef = useRef(false);
  const optimisticFolderNameRef = useRef<Map<string, string>>(new Map());
  const optimisticCardNameRef = useRef<Map<string, string>>(new Map());
  const optimisticCardSetNameRef = useRef<Map<string, string>>(new Map());

  const handleCreateFolderAction = useCallback(
    async (parentId: string | null) => {
      if (!onCreateFolder) return;
      const name = getUniqueFolderName(parentId, DEFAULT_NEW_FOLDER_NAME);
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
      } as unknown as FolderTreeNode;

      setOptimisticFolders((prev) => [...prev, optimisticFolder]);
      if (parentId) setExpandedFolders((prev) => new Set(prev).add(parentId));
      onFolderSelect(tempId);
      setEditingId(tempId);
      setEditingName(name);
      editingIdRef.current = tempId;
      editingNameRef.current = name;
      renameCancelledRef.current = false;
      setPendingScrollId(tempId);

      try {
        const createdFolderId = await onCreateFolder(name, parentId ?? undefined);
        if (!createdFolderId) throw new Error("フォルダIDの取得に失敗しました");

        const finalName =
          (editingIdRef.current === tempId
            ? editingNameRef.current.trim()
            : optimisticFolderNameRef.current.get(tempId)) || name;

        setOptimisticFolders((prev) =>
          prev.filter((f) => getFolderId(f) !== tempId),
        );
        if (parentId) setExpandedFolders((prev) => new Set(prev).add(parentId));
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
          prev.filter((f) => getFolderId(f) !== tempId),
        );
        optimisticFolderNameRef.current.delete(tempId);
        setPendingScrollId((prev) => (prev === tempId ? null : prev));
        if (editingIdRef.current === tempId) closeRename();
        toastError?.(getErrorMessage(err, "フォルダの作成に失敗しました"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      onCreateFolder,
      onUpdateFolder,
      treeFolders,
      getUniqueFolderName,
      setOptimisticFolders,
      setExpandedFolders,
      setEditingId,
      setEditingName,
      setPendingScrollId,
      onFolderSelect,
      closeRename,
    ],
  );

  const handleCreateCardSetAction = useCallback(
    async (targetFolderId: string | null) => {
      if (!onCreateCardSet) return;
      const normalizedFolderId = normalizeFolderId(targetFolderId);
      const name = DEFAULT_NEW_CARD_SET_NAME;
      const tempId = createOptimisticId("folder");
      const now = new Date();

      optimisticCardSetNameRef.current.set(tempId, name);

      const siblingCount = treeCardSets.filter(
        (set) => !set.isDeleted && normalizeFolderId(set.folderId) === normalizedFolderId,
      ).length;

      const optimisticCardSet: CardSet = {
        id: tempId,
        userId: "",
        deviceId: "web",
        folderId: normalizedFolderId,
        name,
        orderIndex: siblingCount,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        __optimistic: true,
      } as CardSet & { __optimistic: boolean };

      setOptimisticCardSets((prev) => [...prev, optimisticCardSet]);
      if (targetFolderId) {
        setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
      }
      onItemSelect({ type: "cardSet", id: tempId });
      setEditingId(tempId);
      setEditingName(name);
      editingIdRef.current = tempId;
      editingNameRef.current = name;
      renameCancelledRef.current = false;
      setPendingScrollId(tempId);

      try {
        const created = await onCreateCardSet(name, normalizedFolderId);
        const createdCardSetId = created?.id ?? null;
        if (!createdCardSetId) throw new Error("カードセットIDの取得に失敗しました");

        const finalName =
          (editingIdRef.current === tempId
            ? editingNameRef.current.trim()
            : optimisticCardSetNameRef.current.get(tempId)) || name;

        setOptimisticCardSets((prev) => prev.filter((cs) => cs.id !== tempId));
        optimisticCardSetNameRef.current.delete(tempId);

        const isStillEditingTemp = editingIdRef.current === tempId;
        if (isStillEditingTemp) {
          const carriedName = editingNameRef.current || finalName || name;
          setEditingId(createdCardSetId);
          setEditingName(carriedName);
          editingIdRef.current = createdCardSetId;
          editingNameRef.current = carriedName;
        }

        onItemSelect({ type: "cardSet", id: createdCardSetId });
        if (!isStillEditingTemp && finalName !== name) {
          void onUpdateCardSet?.(createdCardSetId, { name: finalName });
        }
        setPendingScrollId(createdCardSetId);
      } catch (err: unknown) {
        setOptimisticCardSets((prev) => prev.filter((cs) => cs.id !== tempId));
        optimisticCardSetNameRef.current.delete(tempId);
        setPendingScrollId((prev) => (prev === tempId ? null : prev));
        if (editingIdRef.current === tempId) closeRename();
        toastError?.(getErrorMessage(err, "カードセットの作成に失敗しました"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      onCreateCardSet,
      onUpdateCardSet,
      treeCardSets,
      setOptimisticCardSets,
      setExpandedFolders,
      setPendingScrollId,
      onItemSelect,
      setEditingId,
      setEditingName,
      closeRename,
    ],
  );

  const handleCreateCardAction = useCallback(
    async (targetFolderId: string | null) => {
      if (!onCreateCard) return;
      const normalizedFolderId = normalizeFolderId(targetFolderId);
      const title = "";
      const tempId = createOptimisticId("card");
      optimisticCardNameRef.current.set(tempId, title);
      const now = new Date();

      const optimisticCard = {
        id: tempId,
        folderId: normalizedFolderId,
        cardSetId: selectedCardSetId ?? "",
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
        if (!selectedCardSetId) return;
        const createdCardRaw = await onCreateCard({
          folderId: normalizedFolderId,
          cardSetId: selectedCardSetId,
          title,
          blocks: [],
        });
        const createdCard = isCreateCardResult(createdCardRaw) ? createdCardRaw : null;
        const createdCardId = createdCard?.id ?? createdCard?.cardId ?? null;

        if (createdCardId) {
          setNewlyCreatedCardId(createdCardId);
          onItemSelect({ type: "card", id: createdCardId });
        }

        const finalName =
          (editingIdRef.current === tempId
            ? editingNameRef.current.trim()
            : optimisticCardNameRef.current.get(tempId)) || title;

        setOptimisticCards((prev) => prev.filter((c) => c.id !== tempId));
        optimisticCardNameRef.current.delete(tempId);

        if (!createdCardId) throw new Error("カードIDの取得に失敗しました");

        if (editingIdRef.current === tempId) closeRename();
        if (finalName !== title) void onUpdateCard?.(createdCardId, { title: finalName });
        setPendingScrollId(createdCardId);
      } catch (err: unknown) {
        setOptimisticCards((prev) => prev.filter((c) => c.id !== tempId));
        optimisticCardNameRef.current.delete(tempId);
        setPendingScrollId((prev) => (prev === tempId ? null : prev));
        if (editingIdRef.current === tempId) closeRename();
        toastError?.(getErrorMessage(err, "カードの作成に失敗しました"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      onCreateCard,
      onUpdateCard,
      selectedCardSetId,
      getNextOrderIndex,
      setOptimisticCards,
      setExpandedFolders,
      setPendingScrollId,
      onItemSelect,
      setNewlyCreatedCardId,
      closeRename,
    ],
  );

  const handleRenameConfirm = useCallback(async () => {
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
      if (!id || !nextName) { closeRename(); return; }

      if (id.startsWith("tmp-")) {
        const isOptimisticFolder = optimisticFolders.some(
          (f) => getFolderId(f) === id,
        );
        if (isOptimisticFolder) {
          optimisticFolderNameRef.current.set(id, nextName);
          setOptimisticFolders((prev) =>
            prev.map((f) =>
              getFolderId(f) === id
                ? { ...f, folderName: nextName, folder_name: nextName }
                : f,
            ),
          );
          closeRename();
          return;
        }
        const isOptimisticCard = optimisticCards.some((c) => c.id === id);
        if (isOptimisticCard) {
          optimisticCardNameRef.current.set(id, nextName);
          setOptimisticCards((prev) =>
            prev.map((c) => (c.id === id ? ({ ...c, title: nextName } as Card) : c)),
          );
          closeRename();
          return;
        }
        const isOptimisticCardSet = optimisticCardSets.some((cs) => cs.id === id);
        if (isOptimisticCardSet) {
          optimisticCardSetNameRef.current.set(id, nextName);
          setOptimisticCardSets((prev) =>
            prev.map((cs) => (cs.id === id ? { ...cs, name: nextName } : cs)),
          );
          closeRename();
          return;
        }
        closeRename();
        return;
      }

      const isFolder = treeFolders.some((f) => getFolderId(f) === id);
      if (isFolder) {
        await onUpdateFolder?.(id, { folderName: nextName });
      } else if (
        treeCardSets.some((cs) => cs.id === id) ||
        optimisticCardSets.some((cs) => cs.id === id)
      ) {
        await onUpdateCardSet?.(id, { name: nextName });
      } else {
        await onUpdateCard?.(id, { title: nextName });
      }
      closeRename();
    } catch (err: unknown) {
      toastError?.(getErrorMessage(err, "名前の変更に失敗しました"));
    } finally {
      inFlightRef.current = false;
    }
  }, [
    optimisticFolders,
    optimisticCards,
    treeFolders,
    treeCardSets,
    optimisticCardSets,
    onUpdateFolder,
    onUpdateCardSet,
    onUpdateCard,
    closeRename,
      setOptimisticFolders,
      setOptimisticCards,
      setOptimisticCardSets,
      editingIdRef,
    editingNameRef,
    renameCancelledRef,
    toastError,
  ]);

  const handleDelete = useCallback(
    async (id: string, type: "folder" | "card") => {
      const isOptimistic =
        type === "folder"
          ? optimisticFolders.some((f) => getFolderId(f) === id)
          : optimisticCards.some((c) => c.id === id);
      if (isOptimistic) return;

      if (type === "folder") {
        if (!onDeleteFolder) return;
        openDeleteFolderDialog(id);
        return;
      }

      const isCardSet = treeCardSets.some((cs) => cs.id === id);
      if (isCardSet) {
        if (!confirm("このカードセットを削除しますか? 配下のカードも削除されます。")) return;
        await onDeleteCardSet?.(id);
        return;
      }

      if (!confirm("このカードを削除しますか?")) return;
      await onDeleteCard?.(id);
    },
    [optimisticFolders, optimisticCards, onDeleteFolder, onDeleteCardSet, onDeleteCard, openDeleteFolderDialog, treeCardSets],
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

  return {
    handleCreateFolderAction,
    handleCreateCardSetAction,
    handleCreateCardAction,
    handleRenameConfirm,
    handleDelete,
    handleConfirmDeleteFolder,
  };
}