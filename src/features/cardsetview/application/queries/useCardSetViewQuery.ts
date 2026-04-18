import { useMemo } from "react";

import { buildCardSetById } from "@/domain/card/selectors/cardFolder";
import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useFolders } from "@/hooks/folder/useFolders";
import type { Card, Folder } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";
import { toMillis } from "@/utils/toMillis";

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

const toTime = (value: unknown): number => {
  return toMillis(value);
};

const compareCards = (left: Card, right: Card): number => {
  const leftOrder = left.orderIndex ?? 0;
  const rightOrder = right.orderIndex ?? 0;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  const leftUpdatedAt = toTime(left.updatedAt);
  const rightUpdatedAt = toTime(right.updatedAt);

  if (leftUpdatedAt !== rightUpdatedAt) {
    return leftUpdatedAt - rightUpdatedAt;
  }

  const leftCreatedAt = toTime(left.createdAt);
  const rightCreatedAt = toTime(right.createdAt);

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  return left.id.localeCompare(right.id);
};

export const useCardSetViewQuery = ({
  cardSetId,
}: UseCardSetViewQueryOptions): UseCardSetViewQueryResult => {
  const { folders, loading: foldersLoading } = useFolders();

  const { cardSets, loading: cardSetsLoading, updateCardSet } = useCardSets();

  const activeCardSets = useMemo(
    () => cardSets.filter((cardSet) => !cardSet.isDeleted),
    [cardSets],
  );

  const cardSetById = useMemo(() => {
    return buildCardSetById(activeCardSets);
  }, [activeCardSets]);

  const selectedCardSet = useMemo<CardSet | null>(() => {
    if (!cardSetId) {
      return null;
    }

    return (
      activeCardSets.find((cardSet: CardSet) => cardSet.id === cardSetId) ??
      null
    );
  }, [activeCardSets, cardSetId]);

  const {
    cards,
    loading: cardsLoading,
    createCard,
    updateCard,
  } = useCards(selectedCardSet?.folderId ?? undefined, cardSetId ?? undefined, {
    enabled: Boolean(cardSetId && selectedCardSet),
  });

  const sortedCards = useMemo<Card[]>(() => {
    return [...cards].sort(compareCards);
  }, [cards]);

  const cardIndexById = useMemo<Map<string, number>>(() => {
    return new Map(
      sortedCards.map((card: Card, index: number): [string, number] => [
        card.id,
        index,
      ]),
    );
  }, [sortedCards]);

  const createCardForView = async (
    cardData: Partial<Card> & { cardSetId: string },
  ) => {
    return createCard(cardData);
  };

  return {
    folders: folders as Folder[],
    cardSetById,
    selectedCardSet,
    sortedCards,
    cardIndexById,
    createCard: createCardForView,
    updateCard,
    updateCardSet,
    isLoading: foldersLoading || cardSetsLoading || cardsLoading,
  };
};
