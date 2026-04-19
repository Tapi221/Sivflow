import { useCallback, useMemo } from "react";

import { useCards } from "@/hooks/card/useCards";
import { useCardSetById } from "@/hooks/cardSet/useCardSetById";
import { useFolderLineage } from "@/hooks/folder/useFolderLineage";
import type { Card, Folder } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

interface UseCardSetViewQueryOptions {
  cardSetId: string | null;
}

interface UseCardSetViewQueryResult {
  folders: Folder[];
  cardSetById: ReadonlyMap<string, Pick<CardSet, "id" | "folderId">>;
  selectedCardSet: CardSet | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
  createCard: (
    cardData: Partial<Card> & { cardSetId: string },
  ) => Promise<unknown>;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
  updateCardSet: (
    id: string,
    data: Partial<
      Pick<
        CardSet,
        "name" | "description" | "orderIndex" | "defaultDisplayMode"
      >
    >,
  ) => Promise<void>;
  isLoading: boolean;
}

export const useCardSetViewQuery = ({
  cardSetId,
}: UseCardSetViewQueryOptions): UseCardSetViewQueryResult => {
  const {
    cardSet: selectedCardSet,
    loading: cardSetLoading,
    updateCardSet,
  } = useCardSetById(cardSetId);

  const { folders, loading: foldersLoading } = useFolderLineage(
    selectedCardSet?.folderId ?? null,
  );

  const cardSetById = useMemo<
    ReadonlyMap<string, Pick<CardSet, "id" | "folderId">>
  >(() => {
    if (!selectedCardSet) {
      return new Map();
    }

    return new Map([
      [
        selectedCardSet.id,
        {
          id: selectedCardSet.id,
          folderId: selectedCardSet.folderId,
        },
      ],
    ]);
  }, [selectedCardSet]);

  const {
    cards,
    loading: cardsLoading,
    createCard,
    updateCard,
  } = useCards(selectedCardSet?.folderId ?? undefined, cardSetId ?? undefined, {
    enabled: Boolean(cardSetId && selectedCardSet),
  });

  const sortedCards = cards;

  const cardIndexById = useMemo<Map<string, number>>(() => {
    return new Map(
      sortedCards.map((card: Card, index: number): [string, number] => [
        card.id,
        index,
      ]),
    );
  }, [sortedCards]);

  const createCardForView = useCallback(
    async (cardData: Partial<Card> & { cardSetId: string }) => {
      return createCard(cardData);
    },
    [createCard],
  );

  return {
    folders: folders as Folder[],
    cardSetById,
    selectedCardSet,
    sortedCards,
    cardIndexById,
    createCard: createCardForView,
    updateCard,
    updateCardSet,
    isLoading: cardSetLoading || foldersLoading || cardsLoading,
  };
};
