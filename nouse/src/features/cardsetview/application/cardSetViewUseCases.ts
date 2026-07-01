import type { Card } from "@/types";
import type { CardDisplayMode, CardSet } from "@/types/domain/cardSet";
import { normalizeCardDisplayMode } from "@/types/domain/cardSet";



type UpdateCardSetInput = Partial<
  Pick<CardSet, "name" | "description" | "orderIndex" | "defaultDisplayMode">
>;
type CreateCardInput = Partial<Card> & { cardSetId: string; };
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
const extractCreatedCardId = (created: unknown): string | null => {
  if (typeof created === "string") {
    return created;
  }

  if (
    typeof created === "object" &&
    created !== null &&
    "id" in created &&
    typeof (created as { id?: unknown; }).id === "string"
  ) {
    return (created as { id: string; }).id;
  }

  if (
    typeof created === "object" &&
    created !== null &&
    "cardId" in created &&
    typeof (created as { cardId?: unknown; }).cardId === "string"
  ) {
    return (created as { cardId: string; }).cardId;
  }

  return null;
};
const createAndFocusCard = async ({ targetCardSetId, targetFolderId, createCard }: CreateAndFocusCardOptions): Promise<string | null> => {
  const created = await createCard(buildNewCardPayload({ cardSetId: targetCardSetId, targetFolderId }));

  return extractCreatedCardId(created);
};
const toggleCardUncertainty = async ({ card, updateCard }: ToggleCardFlagOptions): Promise<void> => {
  await updateCard(card.id, { hasUncertainty: !card.hasUncertainty });
};
const toggleCardBookmark = async ({ card, updateCard }: ToggleCardFlagOptions): Promise<void> => {
  await updateCard(card.id, { isBookmarked: !card.isBookmarked });
};
const saveDefaultDisplayMode = async ({ cardSetId, currentDisplayMode, updateCardSet }: SaveDefaultDisplayModeOptions): Promise<void> => {
  await updateCardSet(cardSetId, { defaultDisplayMode: normalizeCardDisplayMode(currentDisplayMode) });
};



export { extractCreatedCardId, createAndFocusCard, toggleCardUncertainty, toggleCardBookmark, saveDefaultDisplayMode };
