import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

import { useCardSetViewActions } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewActions";
import { useCardSetViewViewState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewViewState";

interface UseCardSetViewStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  folderId: string | null;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
  createCard: (
    cardData: Partial<Card> & { cardSetId: string },
  ) => Promise<unknown>;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
  selectedCardSet: CardSet | null;
  isLoading: boolean;
  toastError: (msg: string) => void;
}

export const useCardSetViewState = ({
  initialIndex,
  targetCardId,
  folderId,
  cardSetId,
  sortedCards,
  cardIndexById,
  createCard,
  updateCard,
  selectedCardSet,
  isLoading,
  toastError,
}: UseCardSetViewStateOptions) => {
  const viewState = useCardSetViewViewState({
    initialIndex,
    targetCardId,
    folderId,
    cardSetId,
    sortedCards,
    cardIndexById,
    selectedCardSet,
  });

  const actions = useCardSetViewActions({
    cardSetId,
    folderId,
    selectedCardSet,
    selectedCard: viewState.selectedCard,
    currentCard: viewState.currentCard,
    isLoading,
    sortedCardsLength: sortedCards.length,
    createCard,
    updateCard,
    toastError,
    beginGlobalEditing: viewState.beginGlobalEditing,
    setPendingFocusCardId: viewState.setPendingFocusCardId,
    clearFlippedCards: viewState.clearFlippedCards,
  });

  return {
    currentIndex: viewState.currentIndex,
    currentDisplayMode: viewState.currentDisplayMode,
    setCurrentDisplayMode: viewState.setCurrentDisplayMode,
    setCurrentIndex: viewState.setCurrentIndex,
    safeCurrentIndex: viewState.safeCurrentIndex,
    isFlipped: viewState.isFlipped,
    flippedCardIds: viewState.flippedCardIds,
    isGlobalEditing: viewState.isGlobalEditing,
    setIsGlobalEditing: viewState.setIsGlobalEditing,
    isMetaOpen: viewState.isMetaOpen,
    setIsMetaOpen: viewState.setIsMetaOpen,
    activeSyncStatus: viewState.activeSyncStatus,
    handleActiveSyncStatusChange: viewState.handleActiveSyncStatusChange,
    handleRetryActiveSync: viewState.handleRetryActiveSync,
    selectedCard: viewState.selectedCard,
    cardsForPager: viewState.cardsForPager,
    createAndFocusCard: actions.createAndFocusCard,
    handleEdit: actions.handleEdit,
    handleFlip: viewState.handleFlip,
    handleToggleUncertainty: actions.handleToggleUncertainty,
    handleToggleBookmark: actions.handleToggleBookmark,
    handleToggleViewMode: viewState.handleToggleViewMode,
    handlePagerIndexChange: viewState.handlePagerIndexChange,
  };
};
