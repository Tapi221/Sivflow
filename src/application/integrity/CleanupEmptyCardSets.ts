import type { LocalDB } from "@/services/localdb/LocalDB";
import type { Card, CardSet } from "@/types";

export type CleanupEmptyCardSetsResult = {
  deletedCardSetIds: string[];
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

export const cleanupEmptyCardSets = async (
  db: LocalDB,
  userId: string,
): Promise<CleanupEmptyCardSetsResult> => {
  const [cards, cardSets] = await Promise.all([
    db.listCardsByUser(userId),
    db.listCardSetsByUser(userId),
  ]);

  const activeCardSetIds = new Set<string>();
  for (const card of cards) {
    const cardSetId = getActiveCardSetId(card);
    if (cardSetId) activeCardSetIds.add(cardSetId);
  }

  const candidates = cardSets.filter((cardSet) =>
    shouldDeleteCardSet(cardSet, activeCardSetIds),
  );

  if (candidates.length === 0) return { deletedCardSetIds: [] };

  const now = new Date();
  const deletedCardSetIds: string[] = [];

  await db.runSyncTransaction(async () => {
    for (const cardSet of candidates) {
      const currentCardSet = await db.cardSets.get(cardSet.id);
      if (!currentCardSet || !shouldDeleteCardSet(currentCardSet, activeCardSetIds)) {
        continue;
      }

      if (await hasActiveCardsInCardSet(db, cardSet.id)) {
        continue;
      }

      await db.cardSets.update(cardSet.id, {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
      await db.queueDeleteSync({
        entity: "cardSet",
        targetId: cardSet.id,
        priority: "high",
      });
      deletedCardSetIds.push(cardSet.id);
    }
  });

  return { deletedCardSetIds };
};
