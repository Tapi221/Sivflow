import { useCallback, useMemo, useState } from "react";
import { emptyTrash, getTrashItems, permanentlyDeleteTrashItems, purgeExpiredTrashItems, restoreTrashItems } from "@core/usecases/trash";
import { createWebTrashRepository } from "@platform/storage/trashRepository.web";
import type { Card, CardSet, Document, Folder } from "@/types";

export type TrashLoadState = "idle" | "loading" | "ready" | "error";

export type TrashItemsState = {
  folders: Folder[];
  cards: Card[];
  cardSets: CardSet[];
  documents: Document[];
};

export type TrashItemIdInput = {
  folderIds?: string[];
  cardIds?: string[];
  cardSetIds?: string[];
  documentIds?: string[];
};

const EMPTY_TRASH_ITEMS: TrashItemsState = {
  folders: [],
  cards: [],
  cardSets: [],
  documents: [],
};

export const useTrashItems = (userId: string | null | undefined) => {
  const repository = useMemo(() => createWebTrashRepository(), []);
  const [items, setItems] = useState<TrashItemsState>(EMPTY_TRASH_ITEMS);
  const [status, setStatus] = useState<TrashLoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems(EMPTY_TRASH_ITEMS);
      setStatus("ready");
      setErrorMessage(null);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      await purgeExpiredTrashItems({ userId, repository });
      const nextItems = await getTrashItems({ userId, repository });
      setItems(nextItems);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "ゴミ箱の読み込みに失敗しました。");
    }
  }, [repository, userId]);

  const restore = useCallback(async ({ folderIds = [], cardIds = [], cardSetIds = [], documentIds = [] }: TrashItemIdInput) => {
    if (!userId) return;

    await restoreTrashItems({ userId, repository, folderIds, cardIds, cardSetIds, documentIds });
    await refresh();
  }, [refresh, repository, userId]);

  const permanentlyDelete = useCallback(async ({ folderIds = [], cardIds = [], cardSetIds = [], documentIds = [] }: TrashItemIdInput) => {
    if (!userId) return;

    await permanentlyDeleteTrashItems({ userId, repository, folderIds, cardIds, cardSetIds, documentIds });
    await refresh();
  }, [refresh, repository, userId]);

  const empty = useCallback(async () => {
    if (!userId) return;

    await emptyTrash({ userId, repository });
    await refresh();
  }, [refresh, repository, userId]);

  return {
    items,
    status,
    errorMessage,
    refresh,
    restore,
    permanentlyDelete,
    empty,
  };
};
