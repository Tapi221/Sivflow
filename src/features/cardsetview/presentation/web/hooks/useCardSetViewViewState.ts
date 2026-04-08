import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";

import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import {
  clampCardIndex,
  createCardSetViewSourceKey,
  resolveCardIndexById,
  resolveCardsForPager,
  resolveCurrentIndexBase,
  toggleFlippedCardId,
} from "@/features/cardsetview/domain/useCardSetViewState";
import { useCardEntity } from "@/hooks/card/useCardEntity";
import {
  resolveCardSetDisplayMode,
  setCardSetSessionDisplayMode,
} from "@/services/cardDisplayModeSession";
import type { Card } from "@/types";
import type { CardDisplayMode, CardSet } from "@/types/domain/cardSet";

interface UseCardSetViewViewStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  folderId: string | null;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
  selectedCardSet: CardSet | null;
}

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

const CARD_SET_VIEW_META_PANEL_OPEN_STORAGE_KEY = "cardsetview.meta-panel-open";
const LEGACY_CARD_VIEW_META_PANEL_OPEN_STORAGE_KEY =
  "card-view.meta-panel-open";

const resolveInitialMetaOpen = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const nextValue = window.localStorage.getItem(
    CARD_SET_VIEW_META_PANEL_OPEN_STORAGE_KEY,
  );

  if (nextValue != null) {
    return nextValue !== "false";
  }

  const legacyValue = window.localStorage.getItem(
    LEGACY_CARD_VIEW_META_PANEL_OPEN_STORAGE_KEY,
  );

  if (legacyValue != null) {
    return legacyValue !== "false";
  }

  return true;
};

export const useCardSetViewViewState = ({
  initialIndex,
  targetCardId,
  folderId,
  cardSetId,
  sortedCards,
  cardIndexById,
  selectedCardSet,
}: UseCardSetViewViewStateOptions) => {
  const sourceKey = createCardSetViewSourceKey(cardSetId, folderId);
  const defaultDisplayMode = selectedCardSet?.defaultDisplayMode;

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
  const [isMetaOpen, setIsMetaOpen] = useState(resolveInitialMetaOpen);
  const [currentDisplayMode, setCurrentDisplayModeState] =
    useState<CardDisplayMode>(() =>
      resolveCardSetDisplayMode(cardSetId, defaultDisplayMode),
    );
  const [activeSyncStatus, setActiveSyncStatus] =
    useState<CardSyncStatus | null>(null);

  const currentCardIdRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentDisplayModeState(
      resolveCardSetDisplayMode(cardSetId, defaultDisplayMode),
    );
  }, [cardSetId, defaultDisplayMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      CARD_SET_VIEW_META_PANEL_OPEN_STORAGE_KEY,
      String(isMetaOpen),
    );
  }, [isMetaOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("cardsetview:editing-change", {
        detail: isGlobalEditing,
      }),
    );
  }, [isGlobalEditing]);

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
    isGlobalEditing ? currentCard?.id ?? null : null,
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

  useEffect(() => {
    setActiveSyncStatus(null);
  }, [currentCardId, isGlobalEditing, sourceKey]);

  const isFlipped = flippedCardIds.has(currentCardId ?? "");

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

  const handleToggleViewMode = useCallback(() => {
    setPendingFocusCardId(selectedCard?.id ?? null);
    clearFlippedCards();
    setIsGlobalEditing((prev) => !prev);
  }, [clearFlippedCards, selectedCard?.id, setPendingFocusCardId]);

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

  const setCurrentDisplayMode = useCallback(
    (mode: CardDisplayMode) => {
      setCardSetSessionDisplayMode(cardSetId, mode);
      setCurrentDisplayModeState(mode);
    },
    [cardSetId],
  );

  const handleActiveSyncStatusChange = useCallback(
    (status: CardSyncStatus | null) => {
      setActiveSyncStatus(status);
    },
    [],
  );

  const handleRetryActiveSync = useCallback(async () => {
    await activeSyncStatus?.retry?.();
  }, [activeSyncStatus]);

  return {
    sourceKey,
    currentIndex: currentIndexBase,
    safeCurrentIndex,
    currentCard,
    currentCardId,
    selectedCard,
    cardsForPager,
    isFlipped,
    flippedCardIds,
    clearFlippedCards,
    handleFlip,
    pendingFocusCardId,
    setPendingFocusCardId,
    clearPendingFocusCardId,
    isGlobalEditing,
    setIsGlobalEditing,
    beginGlobalEditing,
    isMetaOpen,
    setIsMetaOpen,
    currentDisplayMode,
    setCurrentDisplayMode,
    setCurrentIndex,
    handleToggleViewMode,
    handlePagerIndexChange,
    activeSyncStatus,
    handleActiveSyncStatusChange,
    handleRetryActiveSync,
  };
};