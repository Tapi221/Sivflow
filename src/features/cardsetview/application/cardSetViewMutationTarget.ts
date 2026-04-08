import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

interface ResolveCardMutationTargetOptions {
  cardSetId: string | null;
  folderId: string | null;
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  currentCard: Card | null;
}

interface CardMutationTarget {
  targetCardSetId: string | null;
  targetFolderId: string | null;
}

export const resolveCardMutationTarget = ({
  cardSetId,
  folderId,
  selectedCardSet,
  selectedCard,
  currentCard,
}: ResolveCardMutationTargetOptions): CardMutationTarget => {
  const targetCardSetId =
    selectedCard?.cardSetId ??
    currentCard?.cardSetId ??
    selectedCardSet?.id ??
    cardSetId ??
    null;

  const targetFolderId =
    selectedCard?.folderId ??
    currentCard?.folderId ??
    selectedCardSet?.folderId ??
    folderId ??
    null;

  return {
    targetCardSetId,
    targetFolderId,
  };
};
