import type { CardSetCommandRepository, CardSetCreateDraft, CardSetDeleteRepository, CardSetQueryRepository } from "@core/usecases/cardSet";
import { ensureLegacyCardsBackfilled } from "@/services/legacyCardSetMigrationBackfill";
import { getLocalDb } from "@/services/localDB";
import type { Card, CardSet } from "@/types";

const generateCardSetId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const createWebCardSetRepository = (): CardSetCommandRepository<CardSet> & CardSetDeleteRepository<Card> & CardSetQueryRepository<CardSet> => ({
  generateCardSetId,
  listCardSets: async (userId) => {
    await ensureLegacyCardsBackfilled(userId);
    const db = await getLocalDb(userId);
    return db.cardSets.where("userId").equals(userId).toArray();
  },
  addCardSet: async (userId, cardSet) => {
    const db = await getLocalDb(userId);
    await db.cardSets.add(cardSet as CardSetCreateDraft as CardSet);
  },
  updateCardSet: async (userId, cardSetId, changes) => {
    const db = await getLocalDb(userId);
    await db.cardSets.update(cardSetId, changes);
  },
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
