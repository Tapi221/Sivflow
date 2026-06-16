import { createCardSetUseCase, deleteCardSetWithCards, listCardSetsForFolder, moveCardSetToFolderUseCase, updateCardSetUseCase } from "@core/usecases/cardSet";
import { createWebCardSetRepository } from "@platform/storage/cardSetRepository.web";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useEffectiveLocalUserId } from "@/contexts/auth/useEffectiveLocalUserId";
import type { CardSet } from "@/types";
import { DEFAULT_CARD_DISPLAY_MODE } from "@/types/domain/cardSet";



type UseCardSetsOptions = {
  enabled?: boolean;
};



const useCardSets = (folderId?: string | null, options?: UseCardSetsOptions) => {
  const { currentUser } = useAuthSession();
  const userId = useEffectiveLocalUserId();
  const enabled = options?.enabled ?? true;

  const cardSets = useLiveQuery(async () => {
    if (!enabled) return [];
    if (!userId) return [];

    try {
      return listCardSetsForFolder({
        userId,
        folderId,
        repository: createWebCardSetRepository(),
      });
    } catch (err) {
      console.error("[useCardSets] Error:", err);
      return [];
    }
  }, [enabled, folderId, userId]);

  const loading = enabled && cardSets === undefined;

  const createCardSet = async (
    name: string,
    targetFolderId?: string | null,
    opts?: {
      description?: string;
      id?: string;
      orderIndex?: number;
    },
  ): Promise<CardSet> => {
    if (!currentUser) throw new Error("認証が必要です");

    return createCardSetUseCase({
      userId: currentUser.uid,
      name,
      targetFolderId,
      options: opts,
      defaultDisplayMode: DEFAULT_CARD_DISPLAY_MODE,
      repository: createWebCardSetRepository(),
    });
  };

  const updateCardSet = async (
    id: string,
    data: Partial<
      Pick<
        CardSet,
        "name" | "description" | "orderIndex" | "defaultDisplayMode"
      >
    >,
  ): Promise<void> => {
    if (!currentUser) throw new Error("認証が必要です");

    await updateCardSetUseCase({
      userId: currentUser.uid,
      cardSetId: id,
      data,
      repository: createWebCardSetRepository(),
    });
  };

  const moveCardSetToFolder = async (
    cardSetId: string,
    targetFolderId?: string | null,
  ): Promise<void> => {
    if (!currentUser) throw new Error("認証が必要です");

    await moveCardSetToFolderUseCase({
      userId: currentUser.uid,
      cardSetId,
      targetFolderId,
      repository: createWebCardSetRepository(),
    });
  };

  const deleteCardSet = async (id: string): Promise<void> => {
    if (!currentUser) throw new Error("認証が必要です");

    await deleteCardSetWithCards({
      userId: currentUser.uid,
      cardSetId: id,
      repository: createWebCardSetRepository(),
    });
  };

  return {
    cardSets: cardSets ?? [],
    loading,
    createCardSet,
    updateCardSet,
    moveCardSetToFolder,
    deleteCardSet,
  };
};



export { useCardSets };
