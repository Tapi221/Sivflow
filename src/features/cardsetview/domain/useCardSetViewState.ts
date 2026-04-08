import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

type CardIndexMap = Map<string, number>;

type CardLike = Pick<Card, "id" | "cardSetId" | "folderId">;

type ResolveCurrentIndexBaseArgs = {
  pendingFocusIndex: number | null;
  currentIndex: number | null;
  targetResolvedIndex: number | null;
  initialIndex: number;
};

type ResolveCardsForPagerArgs = {
  sortedCards: Card[];
  selectedCard: Card | null;
  cardIndexById: CardIndexMap;
};

type ResolveCardMutationTargetArgs = {
  cardSetId: string | null;
  folderId: string | null;
  selectedCardSet: Pick<CardSet, "folderId"> | null;
  selectedCard: CardLike | null;
  currentCard: CardLike | null;
};

export const createCardSetViewSourceKey = (
  cardSetId: string | null,
  folderId: string | null,
) => {
  return `${cardSetId ?? ""}::${folderId ?? ""}`;
};

export const resolveCardIndexById = ({
  cardId,
  cardIndexById,
}: {
  cardId: string | null;
  cardIndexById: CardIndexMap;
}) => {
  if (!cardId) {
    return null;
  }

  const found = cardIndexById.get(cardId);
  return typeof found === "number" ? found : null;
};

export const resolveCurrentIndexBase = ({
  pendingFocusIndex,
  currentIndex,
  targetResolvedIndex,
  initialIndex,
}: ResolveCurrentIndexBaseArgs) => {
  return (
    pendingFocusIndex ?? currentIndex ?? targetResolvedIndex ?? initialIndex
  );
};

export const clampCardIndex = (index: number, cardCount: number) => {
  if (cardCount <= 0) {
    return 0;
  }

  const numericIndex = Number.isFinite(index) ? index : 0;
  const integerIndex = Math.trunc(numericIndex);

  return Math.min(Math.max(integerIndex, 0), cardCount - 1);
};

export const resolveCardsForPager = ({
  sortedCards,
  selectedCard,
  cardIndexById,
}: ResolveCardsForPagerArgs) => {
  if (!selectedCard) {
    return sortedCards;
  }

  const idx = cardIndexById.get(selectedCard.id);
  if (typeof idx !== "number" || idx < 0) {
    return sortedCards;
  }

  if (sortedCards[idx] === selectedCard) {
    return sortedCards;
  }

  const next = sortedCards.slice();
  next[idx] = selectedCard;
  return next;
};

export const toggleFlippedCardId = ({
  ids,
  cardId,
}: {
  ids: Set<string>;
  cardId: string | null;
}) => {
  const next = new Set(ids);

  if (!cardId) {
    return next;
  }

  if (next.has(cardId)) {
    next.delete(cardId);
  } else {
    next.add(cardId);
  }

  return next;
};

export const extractCreatedCardId = (created: unknown) => {
  if (typeof created === "string") {
    return created;
  }

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

export const resolveCardMutationTarget = ({
  cardSetId,
  folderId,
  selectedCardSet,
  selectedCard,
  currentCard,
}: ResolveCardMutationTargetArgs) => {
  const targetCardSetId =
    cardSetId ?? selectedCard?.cardSetId ?? currentCard?.cardSetId ?? null;

  const targetFolderId =
    folderId ??
    selectedCardSet?.folderId ??
    selectedCard?.folderId ??
    currentCard?.folderId ??
    "";

  return {
    targetCardSetId,
    targetFolderId,
  };
};