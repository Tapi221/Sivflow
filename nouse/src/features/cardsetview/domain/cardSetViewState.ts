import type { Card } from "@/types";



type CardIndexMap = Map<string, number>;
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



const createCardSetViewSourceKey = (cardSetId: string | null) => {
  return `${cardSetId ?? ""}`;
};
const resolveCardIndexById = ({ cardId, cardIndexById }: { cardId: string | null;
  cardIndexById: CardIndexMap;
}) => {
  if (!cardId) {
    return null;
  }

  const found = cardIndexById.get(cardId);
  return typeof found === "number" ? found : null;
};
const resolveCurrentIndexBase = ({ pendingFocusIndex, currentIndex, targetResolvedIndex, initialIndex }: ResolveCurrentIndexBaseArgs) => {
  return (pendingFocusIndex ?? currentIndex ?? targetResolvedIndex ?? initialIndex);
};
const clampCardIndex = (index: number, cardCount: number) => {
  if (cardCount <= 0) {
    return 0;
  }

  const numericIndex = Number.isFinite(index) ? index : 0;
  const integerIndex = Math.trunc(numericIndex);

  return Math.min(Math.max(integerIndex, 0), cardCount - 1);
};
const resolveCardsForPager = ({ sortedCards, selectedCard, cardIndexById }: ResolveCardsForPagerArgs) => {
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
const toggleFlippedCardId = ({ ids, cardId }: { ids: Set<string>;
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



export { createCardSetViewSourceKey, resolveCardIndexById, resolveCurrentIndexBase, clampCardIndex, resolveCardsForPager, toggleFlippedCardId };
