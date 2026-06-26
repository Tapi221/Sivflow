import type { CardSetCommandRepository, CardSetCreateDraft, CardSetDeleteRepository, CardSetQueryRepository } from "@core/usecases/cardSet";
import { ensureLegacyCardsBackfilled } from "@/services/legacyCardSetMigrationBackfill";
import { getLocalDb } from "@/services/localdb";
import type { Card, CardSet } from "@/types";



type LocalFirstCardSetDb = Awaited<ReturnType<typeof getLocalDb>> & {
  addItem: (table: "cardSets", item: Record<string, unknown>) => Promise<string>;
  updateItem: (table: "cardSets", id: string, changes: Record<string, unknown>) => Promise<number>;
};



const generateCardSetId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};
const createWebCardSetRepository = (): CardSetCommandRepository<CardSet> & CardSetDeleteRepository<Card> & CardSetQueryRepository<CardSet> => ({ generateCardSetId, listCardSets: async (userId) => {
  await ensureLegacyCardsBackfilled(userId);
  const db = await getLocalDb(userId);
  return db.cardSets.where("userId").equals(userId).toArray();
},
addCardSet: async (userId, cardSet) => {
  const db = (await getLocalDb(userId)) as LocalFirstCardSetDb;
  await db.addItem("cardSets", cardSet as CardSetCreateDraft as unknown as Record<string, unknown>);
},
updateCardSet: async (userId, cardSetId, changes) => {
  const db = (await getLocalDb(userId)) as LocalFirstCardSetDb;
  await db.updateItem("cardSets", cardSetId, changes);
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



export { createWebCardSetRepository };
