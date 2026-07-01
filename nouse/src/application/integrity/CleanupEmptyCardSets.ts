import { createWebTrashRepository } from "@platform/storage/trashRepository.web";
import type { LocalDB } from "@/services/localdb/LocalDB";
import type { Card, CardSet } from "@/types";



type CleanupEmptyCardSetsResult = {
  deletedCardSetIds: string[];
  skippedCardSetIds: string[];
};
type DeletableRecord = {
  isDeleted?: boolean;
  is_deleted?: boolean;
};



const isActiveRecord = (record: DeletableRecord): boolean => {
  return !(record.isDeleted ?? record.is_deleted ?? false);
};
const getActiveCardSetId = (card: Card): string | null => {
  if (!isActiveRecord(card)) return null;
  const cardSetId = typeof card.cardSetId === "string" ? card.cardSetId.trim() : "";
  return cardSetId.length > 0 ? cardSetId : null;
};
const shouldDeleteCardSet = (
  cardSet: CardSet,
  activeCardSetIds: ReadonlySet<string>,
): boolean => {
  if (!isActiveRecord(cardSet)) return false;
  return !activeCardSetIds.has(cardSet.id);
};
const hasActiveCardsInCardSet = async (
  db: LocalDB,
  cardSetId: string,
): Promise<boolean> => {
  const cards = await db.cards.where("cardSetId").equals(cardSetId).toArray();
  return cards.some(isActiveRecord);
};
const isCardSetStillEmpty = async (
  db: LocalDB,
  cardSetId: string,
  activeCardSetIds: ReadonlySet<string>,
): Promise<boolean> => {
  const currentCardSet = await db.cardSets.get(cardSetId);
  if (!currentCardSet || !shouldDeleteCardSet(currentCardSet, activeCardSetIds)) {
    return false;
  }

  return !(await hasActiveCardsInCardSet(db, cardSetId));
};
const cleanupEmptyCardSets = async (db: LocalDB, userId: string): Promise<CleanupEmptyCardSetsResult> => {
  const [cards, cardSets] = await Promise.all([db.listCardsByUser(userId), db.listCardSetsByUser(userId)]);

  const activeCardSetIds = new Set<string>();
  for (const card of cards) {
    const cardSetId = getActiveCardSetId(card);
    if (cardSetId) activeCardSetIds.add(cardSetId);
  }

  const candidates = cardSets.filter((cardSet) =>
    shouldDeleteCardSet(cardSet, activeCardSetIds),
  );

  if (candidates.length === 0) {
    return { deletedCardSetIds: [], skippedCardSetIds: [] };
  }

  const trashRepository = createWebTrashRepository();
  const deletedCardSetIds: string[] = [];
  const skippedCardSetIds: string[] = [];

  for (const cardSet of candidates) {
    if (!(await isCardSetStillEmpty(db, cardSet.id, activeCardSetIds))) {
      skippedCardSetIds.push(cardSet.id);
      continue;
    }

    await trashRepository.purgeCardSet(userId, cardSet.id);
    await db.syncQueue.where("targetId").equals(cardSet.id).delete();
    deletedCardSetIds.push(cardSet.id);
  }

  return { deletedCardSetIds, skippedCardSetIds };
};



export { cleanupEmptyCardSets };


export type { CleanupEmptyCardSetsResult };
