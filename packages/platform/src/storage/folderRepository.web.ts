import type { FolderDeleteRepository } from "@core/usecases/folder";
import { buildCardSetById, resolveCardFolderId } from "@/domain/card/selectors/cardFolder";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { getLocalDb } from "@/services/localDB";
import type { Card, CardSet, Document, Folder } from "@/types";

export const createWebFolderRepository = (): FolderDeleteRepository<Folder, CardSet, Card, Document> => ({
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
