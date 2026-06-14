import type { TrashRepository } from "@core/usecases/trash";
import type { DeleteEntity } from "@/application/usecases/syncQueuePayloadGuards";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { buildCardSetById, resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { getLocalDb } from "@/services/localdb";
import type { Card, CardSet, Document, Folder } from "@/types";



type LocalFirstTrashDb = Awaited<ReturnType<typeof getLocalDb>> & {
  updateItem: (table: "folders" | "cards" | "cardSets" | "documents", id: string, changes: Record<string, unknown>) => Promise<number>;
  queueDeleteSync: (args: { entity: DeleteEntity; targetId: string; priority?: "critical" | "high" | "medium" | "low"; }) => Promise<void>;
};
type TrashTable = "folders" | "cards" | "cardSets" | "documents";



const DELETE_ENTITY_BY_TABLE: Record<TrashTable, DeleteEntity> = {
  folders: "folder",
  cards: "card",
  cardSets: "cardSet",
  documents: "document",
};



const restoreLocalTrashRecord = async (userId: string, table: TrashTable, id: string): Promise<void> => {
  const db = await getLocalDb(userId);
  const localFirstDb = db as LocalFirstTrashDb;
  await localFirstDb.updateItem(table, id, { isDeleted: false, deletedAt: null, updatedAt: new Date() });
};
const purgeLocalTrashRecord = async (userId: string, table: TrashTable, id: string): Promise<void> => {
  const db = await getLocalDb(userId);
  const localFirstDb = db as LocalFirstTrashDb;
  await db.purge(table, id);
  await localFirstDb.queueDeleteSync({ entity: DELETE_ENTITY_BY_TABLE[table], targetId: id, priority: "high" });
};
const createWebTrashRepository = (): TrashRepository<Folder, Card, CardSet, Document> => ({ loadContext: async (userId) => {
  const db = await getLocalDb(userId);
  const [rawFolders, rawCards, rawCardSets, rawDocuments] = await Promise.all([
    db.getAllFolders(),
    db.getAllCards(),
    db.cardSets.where("userId").equals(userId).toArray(),
    db.documents.where("userId").equals(userId).toArray(),
  ]);
  const folders = rawFolders.map(normalizeFolder);
  const cards = rawCards.map(normalizeCard);
  const cardSetById = buildCardSetById(rawCardSets.filter((cardSet) => !cardSet.isDeleted));

  return {
    folders,
    cards,
    cardSets: rawCardSets,
    documents: rawDocuments,
    resolveCardFolderId: (card) => resolveCardFolderIdStrict(card, cardSetById),
  };
},
restoreFolder: async (userId, folderId) => {
  await restoreLocalTrashRecord(userId, "folders", folderId);
},
restoreCard: async (userId, cardId) => {
  await restoreLocalTrashRecord(userId, "cards", cardId);
},
restoreCardSet: async (userId, cardSetId) => {
  await restoreLocalTrashRecord(userId, "cardSets", cardSetId);
},
restoreDocument: async (userId, documentId) => {
  await restoreLocalTrashRecord(userId, "documents", documentId);
},
purgeFolder: async (userId, folderId) => {
  await purgeLocalTrashRecord(userId, "folders", folderId);
},
purgeCard: async (userId, cardId) => {
  await purgeLocalTrashRecord(userId, "cards", cardId);
},
purgeCardSet: async (userId, cardSetId) => {
  await purgeLocalTrashRecord(userId, "cardSets", cardSetId);
},
purgeDocument: async (userId, documentId) => {
  await purgeLocalTrashRecord(userId, "documents", documentId);
},
});



export { createWebTrashRepository };
