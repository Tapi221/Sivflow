import type { Card } from "@/types";
import type { CardDisplayMode, CardSet } from "@/types/domain/cardSet";

import { extractCreatedCardId } from "@/features/cardsetview/domain/cardSetViewState";

type CreateCardInput = Partial<Card> & { cardSetId: string };
type CreateCardPort = (cardData: CreateCardInput) => Promise<unknown>;
type UpdateCardPort = (id: string, data: Partial<Card>) => Promise<unknown>;
type UpdateCardSetPort = (
  id: string,
  data: Partial<CardSet>,
) => Promise<unknown>;

type LegacyCardFlags = {
  has_uncertainty?: boolean;
  is_bookmarked?: boolean;
};

export const bootstrapEmptyCardSet = async ({
  cardSetId,
  folderId,
  createCard,
}: {
  cardSetId: string;
  folderId: string;
  createCard: CreateCardPort;
}) => {
  const created = await createCard({
    cardSetId,
    folderId,
  });

  return extractCreatedCardId(created);
};

export const createAndFocusCard = async ({
  targetCardSetId,
  targetFolderId,
  createCard,
}: {
  targetCardSetId: string;
  targetFolderId: string;
  createCard: CreateCardPort;
}) => {
  const created = await createCard({
    cardSetId: targetCardSetId,
    folderId: targetFolderId,
  });

  return extractCreatedCardId(created);
};

export const toggleCardUncertainty = async ({
  card,
  updateCard,
}: {
  card: Card;
  updateCard: UpdateCardPort;
}) => {
  const current =
    card.hasUncertainty ??
    (card as Card & LegacyCardFlags).has_uncertainty ??
    false;

  await updateCard(card.id, {
    hasUncertainty: !current,
  });
};

export const toggleCardBookmark = async ({
  card,
  updateCard,
}: {
  card: Card;
  updateCard: UpdateCardPort;
}) => {
  const current =
    card.isBookmarked ??
    (card as Card & LegacyCardFlags).is_bookmarked ??
    false;

  await updateCard(card.id, {
    isBookmarked: !current,
  });
};

export const saveDefaultDisplayMode = async ({
  cardSetId,
  currentDisplayMode,
  updateCardSet,
}: {
  cardSetId: string;
  currentDisplayMode: CardDisplayMode;
  updateCardSet: UpdateCardSetPort;
}) => {
  await updateCardSet(cardSetId, {
    defaultDisplayMode: currentDisplayMode,
  });
};