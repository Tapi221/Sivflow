import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCardEntity } from "@/hooks/card/useCardEntity";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

interface UseCardViewStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  folderId: string | null;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
  createCard: (cardData: Partial<Card> & { cardSetId: string }) => Promise<unknown>;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
  selectedCardSet: CardSet | null;
  isLoading: boolean;
  toastError: (msg: string) => void;
}

function extractCreatedId(created: unknown): string | null {
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
}

export function useCardViewState({
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
}: UseCardViewStateOptions) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [flippedCardIds, setFlippedCardIds] = useState<Set<string>>(new Set());
  const currentCardIdRef = useRef<string | null>(null);
  const [pendingFocusCardId, setPendingFocusCardId] = useState<string | null>(
    null,
  );
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);
  const [isMetaOpen, setIsMetaOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("card-view.meta-panel-open") !== "false";
  });

  const pendingExitAfterSaveRef = useRef(false);
  const pendingCreateCardAfterSaveRef = useRef(false);
  const suppressPagerSyncRef = useRef(false);
  const lockedIndexRef = useRef<number | null>(null);
  const suppressPagerUnlockTimerRef = useRef<number | null>(null);
  const autoInitializedCardSetIdsRef = useRef<Set<string>>(new Set());

  const clearSuppressPagerUnlockTimer = useCallback(() => {
    if (suppressPagerUnlockTimerRef.current != null) {
      window.clearTimeout(suppressPagerUnlockTimerRef.current);
      suppressPagerUnlockTimerRef.current = null;
    }
  }, []);

  // Persist meta panel open state
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("card-view.meta-panel-open", String(isMetaOpen));
  }, [isMetaOpen]);

  // Resolve targetCardId → index on load
  useEffect(() => {
    if (!targetCardId || sortedCards.length === 0) return;
    const found = cardIndexById.get(targetCardId);
    if (typeof found === "number") setCurrentIndex(found);
  }, [targetCardId, sortedCards.length, cardIndexById]);

  // カードセット・フォルダ切り替え時に flip 状態をリセット
  useEffect(() => {
    setFlippedCardIds(new Set());
  }, [cardSetId, folderId]);

  // Clamp index to valid range
  const safeCurrentIndex = useMemo(() => {
    if (sortedCards.length === 0) return 0;
    return Math.min(Math.max(currentIndex, 0), sortedCards.length - 1);
  }, [currentIndex, sortedCards.length]);

  useEffect(() => {
    if (safeCurrentIndex !== currentIndex) setCurrentIndex(safeCurrentIndex);
  }, [safeCurrentIndex, currentIndex]);

  // Resolve pending focus card id after card list updates
  useEffect(() => {
    if (!pendingFocusCardId) return;
    const nextIndex = cardIndexById.get(pendingFocusCardId);
    if (typeof nextIndex !== "number") return;

    setCurrentIndex(nextIndex);
    lockedIndexRef.current = nextIndex;
    setPendingFocusCardId(null);

    clearSuppressPagerUnlockTimer();
    suppressPagerUnlockTimerRef.current = window.setTimeout(() => {
      suppressPagerSyncRef.current = false;
      lockedIndexRef.current = null;
      suppressPagerUnlockTimerRef.current = null;
    }, 220);
  }, [pendingFocusCardId, cardIndexById, clearSuppressPagerUnlockTimer]);

  useEffect(
    () => () => {
      clearSuppressPagerUnlockTimer();
    },
    [clearSuppressPagerUnlockTimer],
  );

  // Broadcast editing-change to window
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("cardview:editing-change", { detail: isGlobalEditing }),
    );
  }, [isGlobalEditing]);

  // Derived card data
  const currentCard = sortedCards[safeCurrentIndex] ?? null;
  const { effectiveCard } = useCardEntity(currentCard?.id);

  const selectedCard = useMemo(() => {
    if (!currentCard) return null;
    if (effectiveCard && effectiveCard.id === currentCard.id) return effectiveCard;
    return currentCard;
  }, [currentCard, effectiveCard]);

  // stale closure 回避用の currentCardId ref
  currentCardIdRef.current = selectedCard?.id ?? currentCard?.id ?? null;

  const isFlipped = flippedCardIds.has(currentCardIdRef.current ?? "");

  const cardsForPager = useMemo(() => {
    if (!selectedCard) return sortedCards;
    const next = sortedCards.slice();
    const idx = next.findIndex((c) => c.id === selectedCard.id);
    if (idx >= 0) next[idx] = selectedCard;
    return next;
  }, [sortedCards, selectedCard]);

  // Auto-init empty card set with a first card
  useEffect(() => {
    if (!cardSetId || isLoading || sortedCards.length > 0) return;
    if (autoInitializedCardSetIdsRef.current.has(cardSetId)) return;
    autoInitializedCardSetIdsRef.current.add(cardSetId);
    setIsGlobalEditing(true);
    const targetFolderId = folderId ?? selectedCardSet?.folderId ?? "";
    void (async () => {
      try {
        const created = await createCard({ cardSetId, folderId: targetFolderId });
        const createdId = extractCreatedId(created);
        if (createdId) setPendingFocusCardId(createdId);
      } catch (error) {
        console.error("[CardView] Failed to bootstrap empty card set:", error);
      }
    })();
  }, [cardSetId, createCard, folderId, isLoading, selectedCardSet?.folderId, sortedCards.length]);

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
      setFlippedCardIds(new Set());
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
      setPendingFocusCardId(createdId);
      return true;
    } catch (error) {
      console.error("[CardView] Failed to create new card:", error);
      toastError(
        error instanceof Error ? error.message : "新規カードの作成に失敗しました",
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
    toastError,
  ]);

  const handleEdit = useCallback(() => setIsGlobalEditing(true), []);

  const handleFlip = useCallback(() => {
    const id = currentCardIdRef.current;
    if (!id) return;
    setFlippedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
    setPendingFocusCardId(targetId);
    suppressPagerSyncRef.current = true;
    lockedIndexRef.current =
      targetId != null ? (cardIndexById.get(targetId) ?? null) : null;
    setFlippedCardIds(new Set());
    if (isGlobalEditing) {
      pendingExitAfterSaveRef.current = true;
      setSaveSignal((prev) => prev + 1);
      return;
    }
    setIsGlobalEditing(true);
  }, [selectedCard?.id, cardIndexById, isGlobalEditing]);

  const handlePagerIndexChange = useCallback((idx: number) => {
    if (
      suppressPagerSyncRef.current &&
      lockedIndexRef.current != null &&
      idx !== lockedIndexRef.current
    ) {
      return;
    }
    setCurrentIndex(idx);
  }, []);

  return {
    currentIndex,
    setCurrentIndex,
    safeCurrentIndex,
    isFlipped,
    flippedCardIds,
    isGlobalEditing,
    setIsGlobalEditing,
    saveSignal,
    setSaveSignal,
    isMetaOpen,
    setIsMetaOpen,
    pendingExitAfterSaveRef,
    pendingCreateCardAfterSaveRef,
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
}
