import { useMemo } from "react";
import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useFolders } from "@/hooks/folder/useFolders";

interface UseCardSetViewDataOptions {
  folderId: string | null;
  cardSetId: string | null;
}

export const useCardSetViewData = ({
  folderId,
  cardSetId,
}: UseCardSetViewDataOptions) => {
  const {
    cards = [],
    loading: isLoading,
    createCard,
    updateCard,
  } = useCards(folderId || undefined, cardSetId || undefined);
  const { cardSets, updateCardSet } = useCardSets();
  const { folders = [] } = useFolders();

  // useCards が orderIndex 順に正規化済み配列を返すため、ここでは再ソートしない。
  const sortedCards = cards;

  const cardIndexById = useMemo(() => {
    const map = new Map<string, number>();
    sortedCards.forEach((card, index) => map.set(card.id, index));
    return map;
  }, [sortedCards]);

  const selectedCardSet = useMemo(
    () =>
      cardSetId ? (cardSets.find((s) => s.id === cardSetId) ?? null) : null,
    [cardSetId, cardSets],
  );

  return {
    cards,
    isLoading,
    createCard,
    updateCard,
    updateCardSet,
    sortedCards,
    cardIndexById,
    cardSets,
    selectedCardSet,
    folders,
  };
};
