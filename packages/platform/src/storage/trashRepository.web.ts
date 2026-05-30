import { deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";
import type { TrashRepository } from "@core/usecases/trash";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { buildCardSetById, resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { firestoreDb } from "@/services/firebase";
import { cardDocPathSegments, folderDocPathSegments } from "@/services/firestorePaths";
import { getLocalDb } from "@/services/localDB";
import type { Card, Folder } from "@/types";

const maybeUpdateFirestoreDeletedState = async ({
  pathSegments,
  isDeleted,
}: {
  pathSegments: string[];
  isDeleted: boolean;
}): Promise<void> => {
  if (!firestoreDb || pathSegments.length === 0) return;

  const [collectionPath, documentPath, ...nestedPathSegments] = pathSegments;
  const targetRef = doc(firestoreDb, collectionPath, documentPath, ...nestedPathSegments);

  await updateDoc(targetRef, {
    isDeleted,
    deletedAt: isDeleted ? Timestamp.now() : null,
    updatedAt: Timestamp.now(),
  });
};

const maybeDeleteFirestoreDoc = async (pathSegments: string[]): Promise<void> => {
  if (!firestoreDb || pathSegments.length === 0) return;

  const [collectionPath, documentPath, ...nestedPathSegments] = pathSegments;
  const targetRef = doc(firestoreDb, collectionPath, documentPath, ...nestedPathSegments);
  await deleteDoc(targetRef);
};

export const createWebTrashRepository = (): TrashRepository<Folder, Card> => ({
  loadContext: async (userId) => {
    const db = await getLocalDb(userId);
    const [rawFolders, rawCards, rawCardSets] = await Promise.all([
      db.getAllFolders(),
      db.getAllCards(),
      db.cardSets.where("userId").equals(userId).toArray(),
    ]);
    const folders = rawFolders.map(normalizeFolder);
    const cards = rawCards.map(normalizeCard);
    const cardSetById = buildCardSetById(rawCardSets.filter((cardSet) => !cardSet.isDeleted));

    return {
      folders,
      cards,
      resolveCardFolderId: (card) => resolveCardFolderIdStrict(card, cardSetById),
    };
  },
  restoreFolder: async (userId, folderId) => {
    const db = await getLocalDb(userId);
    await db.restore("folders", folderId);
    await maybeUpdateFirestoreDeletedState({
      pathSegments: folderDocPathSegments(userId, folderId),
      isDeleted: false,
    });
  },
  restoreCard: async (userId, cardId) => {
    const db = await getLocalDb(userId);
    await db.restore("cards", cardId);
    await maybeUpdateFirestoreDeletedState({
      pathSegments: cardDocPathSegments(userId, cardId),
      isDeleted: false,
    });
  },
  purgeFolder: async (userId, folderId) => {
    const db = await getLocalDb(userId);
    await db.purge("folders", folderId);

    try {
      await maybeDeleteFirestoreDoc(folderDocPathSegments(userId, folderId));
    } catch (error) {
      console.warn(`Firestore delete failed for folder ${folderId}:`, error);
    }
  },
  purgeCard: async (userId, cardId) => {
    const db = await getLocalDb(userId);
    await db.purge("cards", cardId);

    try {
      await maybeDeleteFirestoreDoc(cardDocPathSegments(userId, cardId));
    } catch (error) {
      console.warn(`Firestore delete failed for card ${cardId}:`, error);
    }
  },
});
