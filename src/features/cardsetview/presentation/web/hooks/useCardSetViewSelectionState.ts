import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";

import {
  clampCardIndex,
  createCardSetViewSourceKey,
  resolveCardIndexById,
  resolveCardsForPager,
  resolveCurrentIndexBase,
  toggleFlippedCardId,
} from "@/features/cardsetview/domain/cardSetViewState";
import { useCardEntity } from "@/hooks/card/useCardEntity";
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

interface UseCardSetViewSelectionStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  folderId: string | null;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
}

export const useCardSetViewSelectionState = ({
  initialIndex,
  targetCardId,
  folderId,
  cardSetId,
  sortedCards,
  cardIndexById,
}: UseCardSetViewSelectionStateOptions) => {
  const sourceKey = createCardSetViewSourceKey(cardSetId, folderId);

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

  const [pendingFocusState, setPendingFocusState] = useState<KeyedStringState>(
    () => ({
      sourceKey,
      value: null,
    }),
  );

  const [flippedState, setFlippedState] = useState<KeyedFlipState>(() => ({
    sourceKey,
    ids: new Set<string>(),
  }));

  const [isGlobalEditing, setIsGlobalEditing] = useState(false);

  const currentCardIdRef = useRef<string | null>(null);

  const currentIndex =
    currentIndexState.sourceKey === sourceKey ? currentIndexState.value : null;

  const pendingFocusCardId =
    pendingFocusState.sourceKey === sourceKey ? pendingFocusState.value : null;

  const pendingFocusIndex = useMemo(() => {
    return resolveCardIndexById({
      cardId: pendingFocusCardId,
      cardIndexById,
    });
  }, [pendingFocusCardId, cardIndexById]);

  const currentIndexBase = resolveCurrentIndexBase({
    pendingFocusIndex,
    currentIndex,
    targetResolvedIndex,
    initialIndex,
  });

  const safeCurrentIndex = useMemo(() => {
    return clampCardIndex(currentIndexBase, sortedCards.length);
  }, [currentIndexBase, sortedCards.length]);

  const flippedCardIds = useMemo(() => {
    if (flippedState.sourceKey === sourceKey) {
      return flippedState.ids;
    }

    return new Set<string>();
  }, [flippedState, sourceKey]);

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

  const cardsForPager = useMemo(() => {
    return resolveCardsForPager({
      sortedCards,
      selectedCard,
      cardIndexById,
    });
  }, [cardIndexById, selectedCard, sortedCards]);

  const setCurrentIndex = useCallback(
    (next: SetStateAction<number>) => {
      setPendingFocusState({
        sourceKey,
        value: null,
      });

      setCurrentIndexState((prev) => {
        const prevValue =
          prev.sourceKey === sourceKey && typeof prev.value === "number"
            ? prev.value
            : (targetResolvedIndex ?? initialIndex);

        const resolved =
          typeof next === "function"
            ? (next as (prevState: number) => number)(prevValue)
            : next;

        return {
          sourceKey,
          value: resolved,
        };
      });
    },
    [initialIndex, sourceKey, targetResolvedIndex],
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

  const handleFlip = useCallback(() => {
    const id = currentCardIdRef.current;

    if (!id) {
      return;
    }

    setFlippedState((prev) => {
      const baseIds =
        prev.sourceKey === sourceKey ? prev.ids : new Set<string>();

      return {
        sourceKey,
        ids: toggleFlippedCardId({
          ids: baseIds,
          cardId: id,
        }),
      };
    });
  }, [sourceKey]);

  const beginGlobalEditing = useCallback(() => {
    setIsGlobalEditing(true);
  }, []);

  const setInteractionMode = useCallback(
    (mode: "view" | "edit") => {
      if ((mode === "edit") === isGlobalEditing) {
        return;
      }

      setPendingFocusCardId(selectedCard?.id ?? null);
      clearFlippedCards();
      setIsGlobalEditing(mode === "edit");
    },
    [clearFlippedCards, isGlobalEditing, selectedCard?.id, setPendingFocusCardId],
  );

  const handleToggleViewMode = useCallback(() => {
    setInteractionMode(isGlobalEditing ? "view" : "edit");
  }, [isGlobalEditing, setInteractionMode]);

  const handlePagerIndexChange = useCallback(
    (idx: number) => {
      clearPendingFocusCardId();

      setCurrentIndexState({
        sourceKey,
        value: idx,
      });
    },
    [clearPendingFocusCardId, sourceKey],
  );

  return {
    sourceKey,
    currentIndex: currentIndexBase,
    safeCurrentIndex,
    currentCard,
    currentCardId,
    selectedCard,
    cardsForPager,
    isFlipped: flippedCardIds.has(currentCardId ?? ""),
    flippedCardIds,
    clearFlippedCards,
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
