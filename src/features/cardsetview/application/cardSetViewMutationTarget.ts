import { resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";



interface ResolveCardMutationTargetOptions {
  cardSetId: string | null;
  cardSetById: ReadonlyMap<string, Pick<CardSet, "id" | "folderId">>;
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  currentCard: Card | null;
}
interface CardMutationTarget {
  targetCardSetId: string | null;
  targetFolderId: string | null;
}



const resolveCardMutationTarget = ({ cardSetId, cardSetById, selectedCardSet, selectedCard, currentCard }: ResolveCardMutationTargetOptions): CardMutationTarget => {
  const resolveTargetFolderId = (card: Card | null) => {
    if (!card) return null;
    return resolveCardFolderIdStrict(card, cardSetById);
  };

  const targetCardSetId =
    selectedCard?.cardSetId ??
    currentCard?.cardSetId ??
    selectedCardSet?.id ??
    cardSetId ??
    null;

  const targetFolderId =
    resolveTargetFolderId(selectedCard) ??
    resolveTargetFolderId(currentCard) ??
    selectedCardSet?.folderId ??
    null;

  return {
    targetCardSetId,
    targetFolderId,
  };
};



export { resolveCardMutationTarget };
