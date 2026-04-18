import type { Card } from "@/types";
import {
  normalizeCardDisplayMode,
  type CardDisplayMode,
  type CardSet,
} from "@/types/domain/cardSet";

type UpdateCardSetInput = Partial<
  Pick<CardSet, "name" | "description" | "orderIndex" | "defaultDisplayMode">
>;

type CreateCardInput = Partial<Card> & { cardSetId: string };

interface SaveDefaultDisplayModeOptions {
  cardSetId: string;
  currentDisplayMode: CardDisplayMode;
  updateCardSet: (id: string, data: UpdateCardSetInput) => Promise<void>;
}

interface CreateAndFocusCardOptions {
  targetCardSetId: string;
  targetFolderId: string | null;
  createCard: (cardData: CreateCardInput) => Promise<unknown>;
}

interface BootstrapEmptyCardSetOptions {
  cardSetId: string;
  targetFolderId: string | null;
  createCard: (cardData: CreateCardInput) => Promise<unknown>;
}

interface ToggleCardFlagOptions {
  card: Card;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
}

const buildNewCardPayload = ({
  cardSetId,
  targetFolderId,
}: {
  cardSetId: string;
  targetFolderId: string | null;
}): CreateCardInput => {
  return {
    cardSetId,
    ...(targetFolderId ? { folderId: targetFolderId } : {}),
    title: "",
    isDraft: true,
    hasUncertainty: false,
    isBookmarked: false,
    isCompleted: false,
    isSilent: false,
  };
};

export const extractCreatedCardId = (created: unknown): string | null => {
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

export const createAndFocusCard = async ({
  targetCardSetId,
  targetFolderId,
  createCard,
}: CreateAndFocusCardOptions): Promise<string | null> => {
  const created = await createCard(
    buildNewCardPayload({
      cardSetId: targetCardSetId,
      targetFolderId,
    }),
  );

  return extractCreatedCardId(created);
};

export const bootstrapEmptyCardSet = async ({
  cardSetId,
  targetFolderId,
  createCard,
}: BootstrapEmptyCardSetOptions): Promise<string | null> => {
  return createAndFocusCard({
    targetCardSetId: cardSetId,
    targetFolderId,
    createCard,
  });
};

export const toggleCardUncertainty = async ({
  card,
  updateCard,
}: ToggleCardFlagOptions): Promise<void> => {
  await updateCard(card.id, {
    hasUncertainty: !card.hasUncertainty,
  });
};

export const toggleCardBookmark = async ({
  card,
  updateCard,
}: ToggleCardFlagOptions): Promise<void> => {
  await updateCard(card.id, {
    isBookmarked: !card.isBookmarked,
  });
};

export const saveDefaultDisplayMode = async ({
  cardSetId,
  currentDisplayMode,
  updateCardSet,
}: SaveDefaultDisplayModeOptions): Promise<void> => {
  await updateCardSet(cardSetId, {
    defaultDisplayMode: normalizeCardDisplayMode(currentDisplayMode),
  });
};
