import { type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clampCardIndex, createCardSetViewSourceKey, resolveCardIndexById, resolveCardsForPager, toggleFlippedCardId } from "@/features/cardsetview/domain/cardSetViewState";
import { useCardEntity } from "@/components/card/hooks/useCardEntity";
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

interface UseCardSetViewSelectionStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  deviceScope: string;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
}

const resolveSetStateAction = <T,>(action: SetStateAction<T>, previousValue: T) => {
  return typeof action === "function" ? (action as (currentValue: T) => T)(previousValue) : action;
};

const buildScopedFlippedStateKey = ({ deviceScope, sourceKey }: { deviceScope: string; sourceKey: string }) => {
  return [deviceScope, sourceKey].join("::");
};

export const useCardSetViewSelectionState = ({
  initialIndex,
  targetCardId,
  deviceScope,
  cardSetId,
  sortedCards,
  cardIndexById,
}: UseCardSetViewSelectionStateOptions) => {
  const sourceKey = useMemo(() => createCardSetViewSourceKey(cardSetId), [cardSetId]);
  const flippedSourceKey = useMemo(() => buildScopedFlippedStateKey({ deviceScope, sourceKey }), [deviceScope, sourceKey]);
  const appliedTargetRequestKeyRef = useRef<string | null>(null);

  const [currentIndexState, setCurrentIndexState] = useState<KeyedNumberState>(() => ({
    sourceKey,
    value: null,
  }));
  const [pendingFocusCardIdState, setPendingFocusCardIdState] = useState<KeyedStringState>(() => ({
    sourceKey,
    value: null,
  }));
  const [flippedCardIdsState, setFlippedCardIdsState] = useState<KeyedFlipState>(() => ({
    sourceKey: flippedSourceKey,
    ids: getCardSetViewFlippedCardIds({ deviceScope, cardSetId }),
  }));
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);

  const currentIndex = currentIndexState.sourceKey === sourceKey ? currentIndexState.value : null;
  const pendingFocusCardId = pendingFocusCardIdState.sourceKey === sourceKey ? pendingFocusCardIdState.value : null;

  const storedFlippedCardIds = useMemo(() => getCardSetViewFlippedCardIds({ deviceScope, cardSetId }), [deviceScope, cardSetId]);
  const flippedCardIds = flippedCardIdsState.sourceKey === flippedSourceKey ? flippedCardIdsState.ids : storedFlippedCardIds;

  const targetResolvedIndex = useMemo(() => resolveCardIndexById({ cardId: targetCardId, cardIndexById }), [targetCardId, cardIndexById]);
  const pendingFocusIndex = useMemo(() => resolveCardIndexById({ cardId: pendingFocusCardId, cardIndexById }), [pendingFocusCardId, cardIndexById]);

  const currentIndexBase = pendingFocusIndex ?? currentIndex ?? targetResolvedIndex ?? initialIndex;
  const safeCurrentIndex = useMemo(() => clampCardIndex(currentIndexBase, sortedCards.length), [currentIndexBase, sortedCards.length]);

  const currentCardFromList = sortedCards[safeCurrentIndex] ?? null;
  const { effectiveCard } = useCardEntity(currentCardFromList?.id ?? null);

  const selectedCard = effectiveCard ?? currentCardFromList;
  const selectedCardId = selectedCard?.id ?? null;

  const cardsForPager = useMemo(() => resolveCardsForPager({ sortedCards, selectedCard, cardIndexById }), [sortedCards, selectedCard, cardIndexById]);
  const isFlipped = selectedCardId ? flippedCardIds.has(selectedCardId) : false;

  const persistFlippedCardIds = useCallback((ids: Set<string>) => {
    setFlippedCardIdsState({
      sourceKey: flippedSourceKey,
      ids,
    });
    setCardSetViewFlippedCardIds({
      deviceScope,
      cardSetId,
      ids,
    });
  }, [cardSetId, deviceScope, flippedSourceKey]);

  const setCurrentIndex = useCallback((action: SetStateAction<number>) => {
    setPendingFocusCardIdState((previousState) => {
      if (previousState.sourceKey === sourceKey && previousState.value === null) {
        return previousState;
      }

      return {
        sourceKey,
        value: null,
      };
    });
    setCurrentIndexState((previousState) => {
      const previousValue = previousState.sourceKey === sourceKey && previousState.value !== null ? previousState.value : safeCurrentIndex;
      const nextValue = resolveSetStateAction(action, previousValue);

      return {
        sourceKey,
        value: clampCardIndex(nextValue, sortedCards.length),
      };
    });
  }, [safeCurrentIndex, sortedCards.length, sourceKey]);

  const setPendingFocusCardId = useCallback((cardId: string | null) => {
    setPendingFocusCardIdState({
      sourceKey,
      value: cardId,
    });
  }, [sourceKey]);

  const clearFlippedCards = useCallback(() => {
    persistFlippedCardIds(new Set<string>());
  }, [persistFlippedCardIds]);

  const setCurrentCardFace = useCallback((face: CardFace) => {
    if (!selectedCardId) return;

    const nextIds = new Set(flippedCardIds);
    if (face === "answer") {
      nextIds.add(selectedCardId);
    } else {
      nextIds.delete(selectedCardId);
    }

    persistFlippedCardIds(nextIds);
  }, [flippedCardIds, persistFlippedCardIds, selectedCardId]);

  const handleFlip = useCallback(() => {
    persistFlippedCardIds(toggleFlippedCardId({ ids: flippedCardIds, cardId: selectedCardId }));
  }, [flippedCardIds, persistFlippedCardIds, selectedCardId]);

  const beginGlobalEditing = useCallback(() => {
    setIsGlobalEditing(true);
  }, []);

  const setInteractionMode = useCallback((interactionMode: "view" | "edit") => {
    setIsGlobalEditing(interactionMode === "edit");
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setIsGlobalEditing((currentValue) => !currentValue);
  }, []);

  const handlePagerIndexChange = useCallback((nextIndex: number) => {
    setCurrentIndex(nextIndex);
  }, [setCurrentIndex]);

  useEffect(() => {
    setFlippedCardIdsState({
      sourceKey: flippedSourceKey,
      ids: getCardSetViewFlippedCardIds({ deviceScope, cardSetId }),
    });
  }, [cardSetId, deviceScope, flippedSourceKey]);

  useEffect(() => {
    if (!targetCardId || targetResolvedIndex === null) return;

    const targetRequestKey = [sourceKey, targetCardId].join("::");
    if (appliedTargetRequestKeyRef.current === targetRequestKey) return;

    appliedTargetRequestKeyRef.current = targetRequestKey;
    setCurrentIndexState({
      sourceKey,
      value: clampCardIndex(targetResolvedIndex, sortedCards.length),
    });
  }, [sortedCards.length, sourceKey, targetCardId, targetResolvedIndex]);

  useEffect(() => {
    if (pendingFocusCardId === null || pendingFocusIndex === null) return;

    setCurrentIndexState({
      sourceKey,
      value: clampCardIndex(pendingFocusIndex, sortedCards.length),
    });
    setPendingFocusCardIdState({
      sourceKey,
      value: null,
    });
  }, [pendingFocusCardId, pendingFocusIndex, sortedCards.length, sourceKey]);

  useEffect(() => {
    if (currentIndex === null) return;

    const clampedIndex = clampCardIndex(currentIndex, sortedCards.length);
    if (clampedIndex === currentIndex) return;

    setCurrentIndexState({
      sourceKey,
      value: clampedIndex,
    });
  }, [currentIndex, sortedCards.length, sourceKey]);

  return {
    currentIndex: safeCurrentIndex,
    setCurrentIndex,
    safeCurrentIndex,
    isFlipped,
    flippedCardIds,
    isGlobalEditing,
    setIsGlobalEditing,
    setInteractionMode,
    selectedCard,
    currentCard: selectedCard,
    cardsForPager,
    beginGlobalEditing,
    setPendingFocusCardId,
    clearFlippedCards,
    setCurrentCardFace,
    handleFlip,
    handleToggleViewMode,
    handlePagerIndexChange,
  };
};