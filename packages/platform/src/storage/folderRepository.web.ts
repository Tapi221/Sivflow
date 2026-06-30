import type { FolderCommandRepository, FolderCreateDraft, FolderDeleteRepository } from "@core/usecases/folder";
import { buildCardSetById, resolveCardFolderId } from "@/domain/card/selectors/cardFolder";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { getLocalDb } from "@/services/localdb";
import type { Card, CardSet, Document, Folder } from "@/types";



const generateFolderId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};
const createWebFolderRepository = (): FolderCommandRepository<Folder> & FolderDeleteRepository<Folder, CardSet, Card, Document> => ({ generateFolderId, listFolders: async (userId) => {
  const db = await getLocalDb(userId);
  return (await db.folders.toArray()).map(normalizeFolder);
},
addFolder: async (userId, folder) => {
  const db = await getLocalDb(userId);
  await db.addItem("folders", folder as FolderCreateDraft as unknown);
},
updateFolder: async (userId, folderId, changes) => {
  const db = await getLocalDb(userId);
  await db.updateItem("folders", folderId, changes);
},
loadDeleteContext: async (userId) => {
  const db = await getLocalDb(userId);
  const [folders, cardSets, cards, documents] = await Promise.all([
    db.folders.toArray(),
    db.cardSets.where("userId").equals(userId).toArray(),
    db.getAllCards(),
    db.documents.where("userId").equals(userId).toArray(),
  ]);

  return {
    folders: folders.map(normalizeFolder),
    cardSets,
    cards,
    documents,
    resolveCardFolderId: (card, candidateCardSets) => {
      const activeCardSetById = buildCardSetById(candidateCardSets.filter((cardSet) => !cardSet.isDeleted));
      return resolveCardFolderId(card, activeCardSetById);
    },
  };
},
softDeleteFolder: async (userId, folderId) => {
  const db = await getLocalDb(userId);
  await db.softDelete("folders", folderId);
},
softDeleteCardSet: async (userId, cardSetId) => {
  const db = await getLocalDb(userId);
  await db.softDelete("cardSets", cardSetId);
},
softDeleteCard: async (userId, cardId) => {
  const db = await getLocalDb(userId);
  await db.softDelete("cards", cardId);
},
softDeleteDocument: async (userId, documentId) => {
  const db = await getLocalDb(userId);
  await db.softDelete("documents", documentId);
},
});



export { createWebFolderRepository };
