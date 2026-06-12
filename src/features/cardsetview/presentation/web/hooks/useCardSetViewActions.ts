import { useCallback } from "react";
import { resolveCardMutationTarget } from "@/features/cardsetview/application/cardSetViewMutationTarget";
import { createAndFocusCard as createAndFocusCardUseCase, toggleCardBookmark, toggleCardUncertainty } from "@/features/cardsetview/application/cardSetViewUseCases";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";



interface UseCardSetViewActionsOptions {
  cardSetId: string | null;
  cardSetById: ReadonlyMap<string, Pick<CardSet, "id" | "folderId">>;
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  currentCard: Card | null;
  createCard: (
    cardData: Partial<Card> & { cardSetId: string; },
  ) => Promise<unknown>;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
  toastError: (msg: string) => void;
  beginGlobalEditing: () => void;
  setPendingFocusCardId: (cardId: string | null) => void;
  clearFlippedCards: () => void;
}



const useCardSetViewActions = ({ cardSetId, cardSetById, selectedCardSet, selectedCard, currentCard, createCard, updateCard, toastError, beginGlobalEditing, setPendingFocusCardId, clearFlippedCards }: UseCardSetViewActionsOptions) => {
  const createAndFocusCard = useCallback(async (): Promise<boolean> => {
    const { targetCardSetId, targetFolderId } = resolveCardMutationTarget({ cardSetId, cardSetById, selectedCardSet, selectedCard, currentCard });

    if (!targetCardSetId) {
      toastError("新規カードの追加先カードセットが見つかりません");
      return false;
    }

    try {
      clearFlippedCards();
      beginGlobalEditing();

      const createdId = await createAndFocusCardUseCase({
        targetCardSetId,
        targetFolderId,
        createCard,
      });

      if (!createdId) {
        toastError("新規カードの作成結果を取得できませんでした");
        return false;
      }

      setPendingFocusCardId(createdId);

      return true;
    } catch (error) {
      console.error("[CardSetView] Failed to create new card:", error);
      toastError(
        error instanceof Error
          ? error.message
          : "新規カードの作成に失敗しました",
      );
      return false;
    }
  }, [
    beginGlobalEditing,
    cardSetId,
    clearFlippedCards,
    createCard,
    currentCard,
    cardSetById,
    selectedCard,
    selectedCardSet,
    setPendingFocusCardId,
    toastError,
  ]);

  const handleEdit = useCallback(() => {
    beginGlobalEditing();
  }, [beginGlobalEditing]);

  const handleToggleUncertainty = useCallback(
    async (card: Card) => {
      await toggleCardUncertainty({
        card,
        updateCard,
      });
    },
    [updateCard],
  );

  const handleToggleBookmark = useCallback(
    async (card: Card) => {
      await toggleCardBookmark({
        card,
        updateCard,
      });
    },
    [updateCard],
  );

  return {
    createAndFocusCard,
    handleEdit,
    handleToggleUncertainty,
    handleToggleBookmark,
  };
};



export { useCardSetViewActions };
