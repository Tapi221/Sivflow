import type { CardSet } from "@/types";

type CardLike = {
  cardSetId?: string | null;
  folderId?: string | null;
};
type CardSetLike = Pick<CardSet, "id" | "folderId">;

const normalizeFolderId = (folderId: string | null | undefined) => {
  if (typeof folderId !== "string") return null;
  const trimmed = folderId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const buildCardSetById = (cardSets: readonly CardSetLike[]) => {
  const map = new Map<string, CardSetLike>();
  for (const cardSet of cardSets) {
    if (!cardSet?.id) continue;
    map.set(cardSet.id, cardSet);
  }
  return map;
};

export const resolveCardFolderId = (
  card: CardLike,
  cardSetById: ReadonlyMap<string, CardSetLike>,
) => {
  const cardSetId = typeof card.cardSetId === "string" ? card.cardSetId : "";
  if (cardSetId) {
    const cardSet = cardSetById.get(cardSetId);
    if (cardSet) {
      return normalizeFolderId(cardSet.folderId);
    }
  }

  // Legacy fallback: only for backward-compat data with unresolved CardSet linkage.
  return normalizeFolderId(card.folderId);
};

export const isCardInFolder = (
  card: CardLike,
  folderId: string | null | undefined,
  cardSetById: ReadonlyMap<string, CardSetLike>,
) => {
  const targetFolderId = normalizeFolderId(folderId);
  return resolveCardFolderId(card, cardSetById) === targetFolderId;
};

export const filterCardsByFolderId = <T extends CardLike>(
  cards: readonly T[],
  folderId: string | null | undefined,
  cardSetById: ReadonlyMap<string, CardSetLike>,
) => {
  const targetFolderId = normalizeFolderId(folderId);
  return cards.filter(
    (card) => resolveCardFolderId(card, cardSetById) === targetFolderId,
  );
};
