import { useCallback, useEffect, useRef } from "react";

import {
  bootstrapEmptyCardSet,
  createAndFocusCard as createAndFocusCardUseCase,
  toggleCardBookmark,
  toggleCardUncertainty,
} from "@/features/cardsetview/application/cardSetViewUseCases";
import { resolveCardMutationTarget } from "@/features/cardsetview/domain/useCardSetViewState";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

interface UseCardSetViewActionsOptions {
  cardSetId: string | null;
  folderId: string | null;
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  currentCard: Card | null;
  isLoading: boolean;
  sortedCardsLength: number;
  createCard: (
    cardData: Partial<Card> & { cardSetId: string },
  ) => Promise<unknown>;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
  toastError: (msg: string) => void;
  beginGlobalEditing: () => void;
  setPendingFocusCardId: (cardId: string | null) => void;
  clearFlippedCards: () => void;
}

export const useCardSetViewActions = ({
  cardSetId,
  folderId,
  selectedCardSet,
  selectedCard,
  currentCard,
  isLoading,
  sortedCardsLength,
  createCard,
  updateCard,
  toastError,
  beginGlobalEditing,
  setPendingFocusCardId,
  clearFlippedCards,
}: UseCardSetViewActionsOptions) => {
  const autoInitializedCardSetIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!cardSetId || isLoading || sortedCardsLength > 0) {
      return;
    }

    if (autoInitializedCardSetIdsRef.current.has(cardSetId)) {
      return;
    }

    autoInitializedCardSetIdsRef.current.add(cardSetId);

    void (async () => {
      try {
        beginGlobalEditing();

        const createdId = await bootstrapEmptyCardSet({
          cardSetId,
          folderId: folderId ?? selectedCardSet?.folderId ?? "",
          createCard,
        });

        if (createdId) {
          setPendingFocusCardId(createdId);
        }
      } catch (error) {
        console.error(
          "[CardSetView] Failed to bootstrap empty card set:",
          error,
        );
        toastError("空のカードセット初期化に失敗しました");
      }
    })();
  }, [
    beginGlobalEditing,
    cardSetId,
    createCard,
    folderId,
    isLoading,
    selectedCardSet?.folderId,
    setPendingFocusCardId,
    sortedCardsLength,
    toastError,
  ]);

  const createAndFocusCard = useCallback(async (): Promise<boolean> => {
    const { targetCardSetId, targetFolderId } = resolveCardMutationTarget({
      cardSetId,
      folderId,
      selectedCardSet,
      selectedCard,
      currentCard,
    });

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
    folderId,
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
