import { useMemo } from "react";
import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useFolders } from "@/hooks/folder/useFolders";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

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

  const { cardSets = [], updateCardSet } = useCardSets();
  const { folders = [] } = useFolders();

  const sortedCards: Card[] = cards as Card[];
  const typedCardSets: CardSet[] = cardSets as CardSet[];

  const cardIndexById = useMemo(() => {
    const map = new Map<string, number>();
    sortedCards.forEach((card: Card, index: number) => map.set(card.id, index));
    return map;
  }, [sortedCards]);

  const selectedCardSet = useMemo<CardSet | null>(
    () =>
      cardSetId
        ? (typedCardSets.find((s: CardSet) => s.id === cardSetId) ?? null)
        : null,
    [cardSetId, typedCardSets],
  );

  return {
    cards: sortedCards,
    isLoading,
    createCard,
    updateCard,
    updateCardSet,
    sortedCards,
    cardIndexById,
    cardSets: typedCardSets,
    selectedCardSet,
    folders,
  };
};