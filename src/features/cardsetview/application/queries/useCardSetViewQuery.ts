import { useMemo } from "react";

import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useFolders } from "@/hooks/folder/useFolders";
import type { Card, Folder } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

interface UseCardSetViewQueryOptions {
  folderId: string | null;
  cardSetId: string | null;
}

interface UseCardSetViewQueryResult {
  folders: Folder[];
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

const toTime = (value: unknown) => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    const millis = (value as { toMillis: () => unknown }).toMillis();
    return typeof millis === "number" && Number.isFinite(millis) ? millis : 0;
  }

  return 0;
};

const compareCards = (left: Card, right: Card) => {
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
  folderId,
  cardSetId,
}: UseCardSetViewQueryOptions): UseCardSetViewQueryResult => {
  const { folders, loading: foldersLoading } = useFolders();

  const {
    cardSets,
    loading: cardSetsLoading,
    updateCardSet,
  } = useCardSets(folderId ?? undefined);

  const {
    cards,
    loading: cardsLoading,
    createCard,
    updateCard,
  } = useCards(folderId ?? undefined, cardSetId ?? undefined, {
    enabled: Boolean(folderId || cardSetId),
  });

  const selectedCardSet = useMemo<CardSet | null>(() => {
    if (!cardSetId) {
      return null;
    }

    return (
      cardSets.find((cardSet: CardSet) => cardSet.id === cardSetId) ?? null
    );
  }, [cardSetId, cardSets]);

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
    selectedCardSet,
    sortedCards,
    cardIndexById,
    createCard: createCardForView,
    updateCard,
    updateCardSet,
    isLoading: foldersLoading || cardSetsLoading || cardsLoading,
  };
};
