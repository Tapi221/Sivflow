import {
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  clampCardIndex,
  createCardSetViewSourceKey,
  resolveCardIndexById,
  resolveCardsForPager,
  toggleFlippedCardId,
} from "@/features/cardsetview/domain/cardSetViewState";

import { useCardEntity } from "@/hooks/card/useCardEntity";
import {
  getCardSetViewFlippedCardIds,
  setCardSetViewFlippedCardIds,
} from "@/services/cardSetViewFlippedFacePreferences";
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

export const useCardSetViewSelectionState = ({
  initialIndex,
  targetCardId,
  deviceScope,
  cardSetId,
  sortedCards,
  cardIndexById,
}: UseCardSetViewSelectionStateOptions) => {
  const sourceKey = createCardSetViewSourceKey(cardSetId);

  const targetResolvedIndex = useMemo(() => {
    return resolveCardIndexById({
      cardId: targetCardId,
      cardIndexById,
    });
  }, [targetCardId, cardIndexById]);

  const [currentIndexState, setCurrentIndexState] = useState<KeyedNumberState>(
    () => ({
      sourceKey,
      value: null,
    }),
  );

  const [selectedCardIdState, setSelectedCardIdState] =
    useState<KeyedStringState>(() => ({
      sourceKey,
      value: null,
    }));

  const [pendingFocusState, setPendingFocusState] = useState<KeyedStringState>(
    () => ({
      sourceKey,
      value: null,
    }),
  );

  const [flippedState, setFlippedState] = useState<KeyedFlipState>(() => ({
    sourceKey,
    ids: getCardSetViewFlippedCardIds({
      deviceScope,
      cardSetId,
    }),
  }));

  const [isGlobalEditing, setIsGlobalEditing] = useState(false);

  const currentCardIdRef = useRef<string | null>(null);

  const currentIndex =
    currentIndexState.sourceKey === sourceKey ? currentIndexState.value : null;

  const selectedCardId =
    selectedCardIdState.sourceKey === sourceKey
      ? selectedCardIdState.value
      : null;

  const pendingFocusCardId =
    pendingFocusState.sourceKey === sourceKey ? pendingFocusState.value : null;

  const pendingFocusIndex = useMemo(() => {
    return resolveCardIndexById({
      cardId: pendingFocusCardId,
      cardIndexById,
    });
  }, [pendingFocusCardId, cardIndexById]);

  const selectedCardIndex = useMemo(() => {
    return resolveCardIndexById({
      cardId: selectedCardId,
      cardIndexById,
    });
  }, [selectedCardId, cardIndexById]);

  const currentIndexBase =
    pendingFocusIndex ??
    selectedCardIndex ??
    targetResolvedIndex ??
    currentIndex ??
    initialIndex;

  const safeCurrentIndex = useMemo(() => {
    return clampCardIndex(currentIndexBase, sortedCards.length);
  }, [currentIndexBase, sortedCards.length]);

  const currentCard = sortedCards[safeCurrentIndex] ?? null;

  const { effectiveCard } = useCardEntity(
    isGlobalEditing ? (currentCard?.id ?? null) : null,
  );

  const selectedCard = useMemo(() => {
    if (!currentCard) {
      return null;
    }

    if (effectiveCard && effectiveCard.id === currentCard.id) {
      return effectiveCard;
    }

    return currentCard;
  }, [currentCard, effectiveCard]);

  const currentCardId = selectedCard?.id ?? currentCard?.id ?? null;

  useEffect(() => {
    currentCardIdRef.current = currentCardId;
  }, [currentCardId]);

  const persistedFlippedCardIds = useMemo(() => {
    return getCardSetViewFlippedCardIds({
      deviceScope,
      cardSetId,
    });
  }, [cardSetId, deviceScope]);

  const flippedCardIds = useMemo(() => {
    if (flippedState.sourceKey === sourceKey) {
      return flippedState.ids;
    }

    return persistedFlippedCardIds;
  }, [flippedState, persistedFlippedCardIds, sourceKey]);

  useEffect(() => {
    if (flippedState.sourceKey !== sourceKey) {
      return;
    }

    setCardSetViewFlippedCardIds({
      deviceScope,
      cardSetId,
      ids: flippedState.ids,
    });
  }, [cardSetId, deviceScope, flippedState, sourceKey]);

  const cardsForPager = useMemo(() => {
    return resolveCardsForPager({
      sortedCards,
      selectedCard,
      cardIndexById,
    });
  }, [cardIndexById, selectedCard, sortedCards]);

  const selectCardIndex = useCallback(
    (index: number) => {
      const nextIndex = clampCardIndex(index, sortedCards.length);
      const nextCard = sortedCards[nextIndex] ?? null;

      setPendingFocusState({
        sourceKey,
        value: null,
      });

      setCurrentIndexState({
        sourceKey,
        value: nextIndex,
      });

      setSelectedCardIdState({
        sourceKey,
        value: nextCard?.id ?? null,
      });
    },
    [sortedCards, sourceKey],
  );

  const setCurrentIndex = useCallback(
    (next: SetStateAction<number>) => {
      const prevValue = safeCurrentIndex;
      const resolved =
        typeof next === "function"
          ? (next as (prevState: number) => number)(prevValue)
          : next;

      selectCardIndex(resolved);
    },
    [safeCurrentIndex, selectCardIndex],
  );

  const setPendingFocusCardId = useCallback(
    (cardId: string | null) => {
      setPendingFocusState({
        sourceKey,
        value: cardId,
      });
    },
    [sourceKey],
  );

  const clearPendingFocusCardId = useCallback(() => {
    setPendingFocusState({
      sourceKey,
      value: null,
    });
  }, [sourceKey]);

  const clearFlippedCards = useCallback(() => {
    setFlippedState({
      sourceKey,
      ids: new Set<string>(),
    });
  }, [sourceKey]);

  const setCurrentCardFace = useCallback(
    (face: CardFace) => {
      const id = currentCardIdRef.current;

      if (!id) {
        return;
      }

      setFlippedState((prev) => {
        const baseIds =
          prev.sourceKey === sourceKey ? prev.ids : persistedFlippedCardIds;
        const nextIds = new Set(baseIds);

        if (face === "answer") {
          nextIds.add(id);
        } else {
          nextIds.delete(id);
        }

        return {
          sourceKey,
          ids: nextIds,
        };
      });
    },
    [persistedFlippedCardIds, sourceKey],
  );

  const handleFlip = useCallback(() => {
    const id = currentCardIdRef.current;

    if (!id) {
      return;
    }

    setFlippedState((prev) => {
      const baseIds =
        prev.sourceKey === sourceKey ? prev.ids : persistedFlippedCardIds;

      return {
        sourceKey,
        ids: toggleFlippedCardId({
          ids: baseIds,
          cardId: id,
        }),
      };
    });
  }, [persistedFlippedCardIds, sourceKey]);

  const beginGlobalEditing = useCallback(() => {
    setIsGlobalEditing(true);
  }, []);

  const setInteractionMode = useCallback(
    (mode: "view" | "edit") => {
      if ((mode === "edit") === isGlobalEditing) {
        return;
      }

      setPendingFocusCardId(selectedCard?.id ?? null);
      setIsGlobalEditing(mode === "edit");
    },
    [isGlobalEditing, selectedCard?.id, setPendingFocusCardId],
  );

  const handleToggleViewMode = useCallback(() => {
    setInteractionMode(isGlobalEditing ? "view" : "edit");
  }, [isGlobalEditing, setInteractionMode]);

  const handlePagerIndexChange = useCallback(
    (idx: number) => {
      selectCardIndex(idx);
    },
    [selectCardIndex],
  );

  return {
    sourceKey,
    currentIndex: safeCurrentIndex,
    safeCurrentIndex,
    currentCard,
    currentCardId,
    selectedCard,
    cardsForPager,
    isFlipped: flippedCardIds.has(currentCardId ?? ""),
    flippedCardIds,
    clearFlippedCards,
    setCurrentCardFace,
    handleFlip,
    pendingFocusCardId,
    setPendingFocusCardId,
    clearPendingFocusCardId,
    isGlobalEditing,
    setIsGlobalEditing,
    beginGlobalEditing,
    setInteractionMode,
    setCurrentIndex,
    handleToggleViewMode,
    handlePagerIndexChange,
  };
};
