import { useMemo } from "react";
import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useFolders } from "@/hooks/folder/useFolders";

interface UseCardViewDataOptions {
  folderId: string | null;
  cardSetId: string | null;
}

export function useCardViewData({ folderId, cardSetId }: UseCardViewDataOptions) {
  const {
    cards = [],
    loading: isLoading,
    createCard,
    updateCard,
  } = useCards(folderId || undefined, cardSetId || undefined);
  const { cardSets } = useCardSets();
  const { folders = [] } = useFolders();

  const sortedCards = useMemo(
    () =>
      [...cards].sort(
        (a, b) =>
          (a.orderIndex ?? a.order_index ?? 0) -
          (b.orderIndex ?? b.order_index ?? 0),
      ),
    [cards],
  );

  const cardIndexById = useMemo(() => {
    const map = new Map<string, number>();
    sortedCards.forEach((card, index) => map.set(card.id, index));
    return map;
  }, [sortedCards]);

  const selectedCardSet = useMemo(
    () => (cardSetId ? (cardSets.find((s) => s.id === cardSetId) ?? null) : null),
    [cardSetId, cardSets],
  );

  return {
    cards,
    isLoading,
    createCard,
    updateCard,
    sortedCards,
    cardIndexById,
    cardSets,
    selectedCardSet,
    folders,
  };
}
