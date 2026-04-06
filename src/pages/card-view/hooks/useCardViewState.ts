import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";

import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import { useCardEntity } from "@/hooks/card/useCardEntity";
import {
  resolveCardSetDisplayMode,
  setCardSetSessionDisplayMode,
} from "@/services/cardDisplayModeSession";
import type { Card } from "@/types";
import type { CardDisplayMode, CardSet } from "@/types/domain/cardSet";

interface UseCardViewStateOptions {
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

const extractCreatedId = (created: unknown) => {
  if (typeof created === "string") return created;
  if (
    typeof created === "object" &&
    created !== null &&
    "id" in created &&
    typeof (created as { id?: unknown }).id === "string"
  ) {
    return (created as { id: string }).id;
  }
  if (
    typeof created === "object" &&
    created !== null &&
    "cardId" in created &&
    typeof (created as { cardId?: unknown }).cardId === "string"
  ) {
    return (created as { cardId: string }).cardId;
  }
  return null;
};

export const useCardViewState = ({
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
}: UseCardViewStateOptions) => {
  const sourceKey = `${cardSetId ?? ""}::${folderId ?? ""}`;
  const defaultDisplayMode = selectedCardSet?.defaultDisplayMode;

  const targetResolvedIndex = useMemo(() => {
    if (!targetCardId) return null;
    const found = cardIndexById.get(targetCardId);
    return typeof found === "number" ? found : null;
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
  const [isMetaOpen, setIsMetaOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("card-view.meta-panel-open") !== "false";
  });
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
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "card-view.meta-panel-open",
      String(isMetaOpen),
    );
  }, [isMetaOpen]);

  const currentIndex =
    currentIndexState.sourceKey === sourceKey ? currentIndexState.value : null;

  const pendingFocusCardId =
    pendingFocusState.sourceKey === sourceKey ? pendingFocusState.value : null;

  const pendingFocusIndex = useMemo(() => {
    if (!pendingFocusCardId) return null;
    const found = cardIndexById.get(pendingFocusCardId);
    return typeof found === "number" ? found : null;
  }, [cardIndexById, pendingFocusCardId]);

  const currentIndexBase =
    pendingFocusIndex ?? currentIndex ?? targetResolvedIndex ?? initialIndex;

  const safeCurrentIndex = useMemo(() => {
    if (sortedCards.length === 0) return 0;
    const numericIndex = Number.isFinite(currentIndexBase)
      ? currentIndexBase
      : 0;
    const integerIndex = Math.trunc(numericIndex);
    return Math.min(Math.max(integerIndex, 0), sortedCards.length - 1);
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
      new CustomEvent("cardview:editing-change", { detail: isGlobalEditing }),
    );
  }, [isGlobalEditing]);

  const flippedCardIds = useMemo(() => {
    if (flippedState.sourceKey === sourceKey) return flippedState.ids;
    return new Set<string>();
  }, [flippedState, sourceKey]);

  const currentCard = sortedCards[safeCurrentIndex] ?? null;
  const { effectiveCard } = useCardEntity(
    isGlobalEditing ? currentCard?.id : null,
  );

  const selectedCard = useMemo(() => {
    if (!currentCard) return null;
    if (effectiveCard && effectiveCard.id === currentCard.id)
      return effectiveCard;
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
    if (!selectedCard) return sortedCards;
    const idx = cardIndexById.get(selectedCard.id);
    if (typeof idx !== "number") return sortedCards;
    if (idx < 0) return sortedCards;
    if (sortedCards[idx] === selectedCard) return sortedCards;

    const next = sortedCards.slice();
    next[idx] = selectedCard;
    return next;
  }, [cardIndexById, sortedCards, selectedCard]);

  useEffect(() => {
    if (!cardSetId || isLoading || sortedCards.length > 0) return;
    if (autoInitializedCardSetIdsRef.current.has(cardSetId)) return;

    autoInitializedCardSetIdsRef.current.add(cardSetId);

    void (async () => {
      try {
        setIsGlobalEditing(true);

        const targetFolderId = folderId ?? selectedCardSet?.folderId ?? "";
        const created = await createCard({
          cardSetId,
          folderId: targetFolderId,
        });
        const createdId = extractCreatedId(created);

        if (createdId) {
          setPendingFocusState({
            sourceKey,
            value: createdId,
          });
        }
      } catch (error) {
        console.error("[CardView] Failed to bootstrap empty card set:", error);
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
    const targetCardSetId =
      cardSetId ?? selectedCard?.cardSetId ?? currentCard?.cardSetId ?? null;
    const targetFolderId =
      folderId ??
      selectedCardSet?.folderId ??
      selectedCard?.folderId ??
      currentCard?.folderId ??
      "";

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

      const created = await createCard({
        cardSetId: targetCardSetId,
        folderId: targetFolderId,
      });

      const createdId = extractCreatedId(created);
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
      console.error("[CardView] Failed to create new card:", error);
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
    currentCard?.cardSetId,
    currentCard?.folderId,
    folderId,
    selectedCard?.cardSetId,
    selectedCard?.folderId,
    selectedCardSet?.folderId,
    sourceKey,
    toastError,
  ]);

  const handleEdit = useCallback(() => setIsGlobalEditing(true), []);

  const handleFlip = useCallback(() => {
    const id = currentCardIdRef.current;
    if (!id) return;

    setFlippedState((prev) => {
      const baseIds =
        prev.sourceKey === sourceKey ? prev.ids : new Set<string>();
      const next = new Set(baseIds);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return {
        sourceKey,
        ids: next,
      };
    });
  }, [sourceKey]);

  const handleToggleUncertainty = useCallback(
    async (card: Card) => {
      const current = card.hasUncertainty ?? card.has_uncertainty ?? false;
      await updateCard(card.id, { hasUncertainty: !current });
    },
    [updateCard],
  );

  const handleToggleBookmark = useCallback(
    async (card: Card) => {
      const current = card.isBookmarked ?? card.is_bookmarked ?? false;
      await updateCard(card.id, { isBookmarked: !current });
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
