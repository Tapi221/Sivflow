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
  bootstrapEmptyCardSet,
  createAndFocusCard as createAndFocusCardUseCase,
  toggleCardBookmark,
  toggleCardUncertainty,
} from "@/features/cardsetview/application/cardSetViewUseCases";
import {
  clampCardIndex,
  createCardSetViewSourceKey,
  resolveCardIndexById,
  resolveCardMutationTarget,
  resolveCardsForPager,
  resolveCurrentIndexBase,
  toggleFlippedCardId,
} from "@/features/cardsetview/domain/cardSetViewState";
import { useCardEntity } from "@/hooks/card/useCardEntity";
import {
  resolveCardSetDisplayMode,
  setCardSetSessionDisplayMode,
} from "@/services/cardDisplayModeSession";
import type { Card } from "@/types";
import type { CardDisplayMode, CardSet } from "@/types/domain/cardSet";

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

  const [flippedState, setFlippedState] = useState<KeyedFlipState>(() => ({
    sourceKey,
    ids: new Set<string>(),
  }));

  const [pendingFocusState, setPendingFocusState] = useState<KeyedStringState>(
    () => ({
      sourceKey,
      value: null,
    }),
  );

  const currentCardIdRef = useRef<string | null>(null);
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [isMetaOpen, setIsMetaOpen] = useState(resolveInitialMetaOpen);
  const autoInitializedCardSetIdsRef = useRef<Set<string>>(new Set());
  const [currentDisplayMode, setCurrentDisplayModeState] =
    useState<CardDisplayMode>(() =>
      resolveCardSetDisplayMode(cardSetId, defaultDisplayMode),
    );
  const [activeSyncStatus, setActiveSyncStatus] =
    useState<CardSyncStatus | null>(null);

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

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("cardsetview:editing-change", {
        detail: isGlobalEditing,
      }),
    );
  }, [isGlobalEditing]);

  const flippedCardIds = useMemo(() => {
    if (flippedState.sourceKey === sourceKey) {
      return flippedState.ids;
    }

    return new Set<string>();
  }, [flippedState, sourceKey]);

  const currentCard = sortedCards[safeCurrentIndex] ?? null;
  const { effectiveCard } = useCardEntity(
    isGlobalEditing ? currentCard?.id : null,
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
  }, [cardIndexById, sortedCards, selectedCard]);

  useEffect(() => {
    if (!cardSetId || isLoading || sortedCards.length > 0) {
      return;
    }

    if (autoInitializedCardSetIdsRef.current.has(cardSetId)) {
      return;
    }

    autoInitializedCardSetIdsRef.current.add(cardSetId);

    void (async () => {
      try {
        setIsGlobalEditing(true);

        const createdId = await bootstrapEmptyCardSet({
          cardSetId,
          folderId: folderId ?? selectedCardSet?.folderId ?? "",
          createCard,
        });

        if (createdId) {
          setPendingFocusState({
            sourceKey,
            value: createdId,
          });
        }
      } catch (error) {
        console.error(
          "[CardSetView] Failed to bootstrap empty card set:",
          error,
        );
      }
    })();
  }, [
    cardSetId,
    createCard,
    folderId,
    isLoading,
    selectedCardSet?.folderId,
    sortedCards.length,
    sourceKey,
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
      setFlippedState({
        sourceKey,
        ids: new Set<string>(),
      });

      setIsGlobalEditing(true);

      const createdId = await createAndFocusCardUseCase({
        targetCardSetId,
        targetFolderId,
        createCard,
      });

      if (!createdId) {
        toastError("新規カードの作成結果を取得できませんでした");
        return false;
      }

      setPendingFocusState({
        sourceKey,
        value: createdId,
      });

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
    cardSetId,
    createCard,
    currentCard,
    folderId,
    selectedCard,
    selectedCardSet,
    sourceKey,
    toastError,
  ]);

  const handleEdit = useCallback(() => {
    setIsGlobalEditing(true);
  }, []);

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

  const handleToggleViewMode = useCallback(() => {
    const targetId = selectedCard?.id ?? null;

    setPendingFocusState({
      sourceKey,
      value: targetId,
    });

    setFlippedState({
      sourceKey,
      ids: new Set<string>(),
    });

    setIsGlobalEditing((prev) => !prev);
  }, [selectedCard?.id, sourceKey]);

  const handlePagerIndexChange = useCallback(
    (idx: number) => {
      setPendingFocusState({
        sourceKey,
        value: null,
      });

      setCurrentIndexState({
        sourceKey,
        value: idx,
      });
    },
    [sourceKey],
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
    currentIndex: currentIndexBase,
    currentDisplayMode,
    setCurrentDisplayMode,
    setCurrentIndex,
    safeCurrentIndex,
    isFlipped,
    flippedCardIds,
    isGlobalEditing,
    setIsGlobalEditing,
    isMetaOpen,
    setIsMetaOpen,
    activeSyncStatus,
    handleActiveSyncStatusChange,
    handleRetryActiveSync,
    selectedCard,
    cardsForPager,
    createAndFocusCard,
    handleEdit,
    handleFlip,
    handleToggleUncertainty,
    handleToggleBookmark,
    handleToggleViewMode,
    handlePagerIndexChange,
  };
};
