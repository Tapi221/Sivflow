import type { CardSetDeleteRepository } from "@core/usecases/cardSet";
import { getLocalDb } from "@/services/localDB";
import type { Card } from "@/types";

export const createWebCardSetRepository = (): CardSetDeleteRepository<Card> => ({
  listCardsByCardSetId: async (userId, cardSetId) => {
    const db = await getLocalDb(userId);
    return db.cards.where("cardSetId").equals(cardSetId).toArray();
  },
  softDeleteCard: async (userId, cardId) => {
    const db = await getLocalDb(userId);
    await db.softDelete("cards", cardId);
  },
  softDeleteCardSet: async (userId, cardSetId) => {
    const db = await getLocalDb(userId);
    await db.softDelete("cardSets", cardSetId);
  },
});
