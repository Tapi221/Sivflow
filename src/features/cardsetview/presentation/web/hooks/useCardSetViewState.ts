import { useCardSetViewActions } from "./useCardSetViewActions";
import { useCardSetViewViewState } from "./useCardSetViewViewState";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";



type ReorderCardsInCardSet = (cardSetId: string, cardIds: string[]) => Promise<void>;
interface UseCardSetViewStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  cardSetId: string | null;
  cardSetById: ReadonlyMap<string, Pick<CardSet, "id" | "folderId">>;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
  createCard: (
    cardData: Partial<Card> & { cardSetId: string; },
  ) => Promise<unknown>;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
  reorderCardsInCardSet: ReorderCardsInCardSet;
  selectedCardSet: CardSet | null;
  toastError: (msg: string) => void;
  deviceScope: string;
}



const useCardSetViewState = ({ initialIndex, targetCardId, cardSetId, cardSetById, sortedCards, cardIndexById, createCard, updateCard, reorderCardsInCardSet, selectedCardSet, toastError, deviceScope }: UseCardSetViewStateOptions) => {
  const viewState = useCardSetViewViewState({ initialIndex, targetCardId, cardSetId, sortedCards, cardIndexById, selectedCardSet, deviceScope });

  const actions = useCardSetViewActions({
    cardSetId,
    cardSetById,
    selectedCardSet,
    selectedCard: viewState.selectedCard,
    currentCard: viewState.currentCard,
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
    currentCardLayoutMode: viewState.currentCardLayoutMode,
    setCurrentCardLayoutMode: viewState.setCurrentCardLayoutMode,
    setCurrentIndex: viewState.setCurrentIndex,
    safeCurrentIndex: viewState.safeCurrentIndex,
    isFlipped: viewState.isFlipped,
    flippedCardIds: viewState.flippedCardIds,
    isGlobalEditing: viewState.isGlobalEditing,
    setIsGlobalEditing: viewState.setIsGlobalEditing,
    setInteractionMode: viewState.setInteractionMode,
    selectedCard: viewState.selectedCard,
    cardsForPager: viewState.cardsForPager,
    reorderCardsInCardSet,
    createAndFocusCard: actions.createAndFocusCard,
    setCurrentCardFace: viewState.setCurrentCardFace,
    handleEdit: actions.handleEdit,
    handleFlip: viewState.handleFlip,
    handleToggleUncertainty: actions.handleToggleUncertainty,
    handleToggleBookmark: actions.handleToggleBookmark,
    handleToggleViewMode: viewState.handleToggleViewMode,
    handlePagerIndexChange: viewState.handlePagerIndexChange,
  };
};



export { useCardSetViewState };
