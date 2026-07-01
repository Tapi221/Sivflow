import { useCallback, useEffect, useMemo, useState } from "react";
import type { SetStateAction } from "react";
import { useCardEntity } from "@/components/card/hooks/useCardEntity";
import { clampCardIndex, createCardSetViewSourceKey, resolveCardIndexById, resolveCardsForPager, toggleFlippedCardId } from "@/features/cardsetview/domain/cardSetViewState";
import { getCardSetViewFlippedCardIds, setCardSetViewFlippedCardIds } from "@/services/cardSetViewFlippedFacePreferences";
import type { Card } from "@/types";



type KeyedNumberState = {
  sourceKey: string;
  value: number | null;
};
type KeyedStringState = {
  sourceKey: string;
  value: string | null;
};
type KeyedFlipState = {
  sourceKey: string;
  ids: Set<string>;
};
type CardFace = "question" | "answer";
type CardSetViewInteractionMode = "view" | "edit";
interface UseCardSetViewSelectionStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  deviceScope: string;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
}



const useCardSetViewSelectionState = ({ initialIndex, targetCardId, deviceScope, cardSetId, sortedCards, cardIndexById }: UseCardSetViewSelectionStateOptions) => {
  const sourceKey = useMemo(() => createCardSetViewSourceKey(cardSetId), [cardSetId]);
  const [currentIndexState, setCurrentIndexState] = useState<KeyedNumberState>(() => ({ sourceKey, value: null }));
  const [pendingFocusCardIdState, setPendingFocusCardIdState] = useState<KeyedStringState>(() => ({ sourceKey, value: null }));
  const [flippedCardIdsState, setFlippedCardIdsState] = useState<KeyedFlipState>(() => ({ sourceKey, ids: getCardSetViewFlippedCardIds({ deviceScope, cardSetId }) }));
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);

  const currentIndexValue = currentIndexState.sourceKey === sourceKey ? currentIndexState.value : null;
  const pendingFocusCardId = pendingFocusCardIdState.sourceKey === sourceKey ? pendingFocusCardIdState.value : null;

  const targetResolvedIndex = useMemo(() => {
    return resolveCardIndexById({ cardId: targetCardId, cardIndexById });
  }, [cardIndexById, targetCardId]);

  const pendingFocusIndex = useMemo(() => {
    return resolveCardIndexById({ cardId: pendingFocusCardId, cardIndexById });
  }, [cardIndexById, pendingFocusCardId]);

  const currentIndex = pendingFocusIndex ?? currentIndexValue ?? targetResolvedIndex ?? initialIndex;
  const safeCurrentIndex = clampCardIndex(currentIndex, sortedCards.length);
  const currentCard = sortedCards[safeCurrentIndex] ?? null;
  const currentCardId = currentCard?.id ?? null;
  const { effectiveCard } = useCardEntity(currentCardId);
  const selectedCard = effectiveCard ?? currentCard;

  const cardsForPager = useMemo(() => {
    return resolveCardsForPager({ sortedCards, selectedCard, cardIndexById });
  }, [cardIndexById, selectedCard, sortedCards]);

  const flippedCardIds = useMemo(() => {
    if (flippedCardIdsState.sourceKey === sourceKey) {
      return flippedCardIdsState.ids;
    }

    return getCardSetViewFlippedCardIds({ deviceScope, cardSetId });
  }, [cardSetId, deviceScope, flippedCardIdsState.ids, flippedCardIdsState.sourceKey, sourceKey]);

  const isFlipped = currentCardId ? flippedCardIds.has(currentCardId) : false;

  const updateFlippedCardIds = useCallback((resolveNextIds: (currentIds: Set<string>) => Set<string>) => {
    setFlippedCardIdsState((currentState) => {
      const currentIds = currentState.sourceKey === sourceKey ? currentState.ids : getCardSetViewFlippedCardIds({ deviceScope, cardSetId });
      const nextIds = resolveNextIds(currentIds);

      setCardSetViewFlippedCardIds({ deviceScope, cardSetId, ids: nextIds });

      return { sourceKey, ids: nextIds };
    });
  }, [cardSetId, deviceScope, sourceKey]);

  const setCurrentIndex = useCallback((action: SetStateAction<number>) => {
    setPendingFocusCardIdState({ sourceKey, value: null });
    setCurrentIndexState((currentState) => {
      const currentValue = currentState.sourceKey === sourceKey ? currentState.value : null;
      const resolvedValue = currentValue ?? targetResolvedIndex ?? initialIndex;
      const nextValue = typeof action === "function" ? action(resolvedValue) : action;

      return {
        sourceKey,
        value: clampCardIndex(nextValue, sortedCards.length),
      };
    });
  }, [initialIndex, sourceKey, sortedCards.length, targetResolvedIndex]);

  const setPendingFocusCardId = useCallback((cardId: string | null) => {
    setPendingFocusCardIdState({ sourceKey, value: cardId });
  }, [sourceKey]);

  const beginGlobalEditing = useCallback(() => {
    setIsGlobalEditing(true);
  }, []);

  const setInteractionMode = useCallback((mode: CardSetViewInteractionMode) => {
    setIsGlobalEditing(mode === "edit");
  }, []);

  const clearFlippedCards = useCallback(() => {
    const nextIds = new Set<string>();

    setFlippedCardIdsState({ sourceKey, ids: nextIds });
    setCardSetViewFlippedCardIds({ deviceScope, cardSetId, ids: nextIds });
  }, [cardSetId, deviceScope, sourceKey]);

  const handleFlipCard = useCallback((cardId: string | null) => {
    updateFlippedCardIds((currentIds) => toggleFlippedCardId({ ids: currentIds, cardId }));
  }, [updateFlippedCardIds]);

  const handleFlip = useCallback(() => {
    handleFlipCard(currentCardId);
  }, [currentCardId, handleFlipCard]);

  const setCurrentCardFace = useCallback((face: CardFace) => {
    updateFlippedCardIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (!currentCardId) {
        return nextIds;
      }

      if (face === "answer") {
        nextIds.add(currentCardId);
      } else {
        nextIds.delete(currentCardId);
      }

      return nextIds;
    });
  }, [currentCardId, updateFlippedCardIds]);

  const handleToggleViewMode = useCallback(() => {
    setIsGlobalEditing((current) => !current);
  }, []);

  const handlePagerIndexChange = useCallback((nextIndex: number) => {
    setCurrentIndex(nextIndex);
  }, [setCurrentIndex]);

  useEffect(() => {
    setFlippedCardIdsState((currentState) => {
      if (currentState.sourceKey === sourceKey) {
        return currentState;
      }

      return {
        sourceKey,
        ids: getCardSetViewFlippedCardIds({ deviceScope, cardSetId }),
      };
    });
  }, [cardSetId, deviceScope, sourceKey]);

  useEffect(() => {
    if (!pendingFocusCardId || (pendingFocusIndex === null || pendingFocusIndex === undefined)) {
      return;
    }

    setCurrentIndexState({
      sourceKey,
      value: clampCardIndex(pendingFocusIndex, sortedCards.length),
    });
    setPendingFocusCardIdState({ sourceKey, value: null });
  }, [pendingFocusCardId, pendingFocusIndex, sourceKey, sortedCards.length]);

  return {
    currentIndex,
    setCurrentIndex,
    safeCurrentIndex,
    isFlipped,
    flippedCardIds,
    isGlobalEditing,
    setIsGlobalEditing,
    setInteractionMode,
    beginGlobalEditing,
    selectedCard,
    currentCard,
    cardsForPager,
    setCurrentCardFace,
    setPendingFocusCardId,
    clearFlippedCards,
    handleFlip,
    handleFlipCard,
    handleToggleViewMode,
    handlePagerIndexChange,
  };
};



export { useCardSetViewSelectionState };
