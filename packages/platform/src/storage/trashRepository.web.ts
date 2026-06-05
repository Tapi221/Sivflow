import { deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";
import type { TrashRepository } from "@core/usecases/trash";
import { COLLECTION_BY_TYPE } from "@/application/usecases/cloudSyncEntityMetadata";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { buildCardSetById, resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { firestoreDb } from "@/services/firebase";
import { cardDocPathSegments, folderDocPathSegments } from "@/services/firestorePaths";
import { getLocalDb } from "@/services/localDB";
import type { Card, CardSet, Document, Folder } from "@/types";

type CloudCollectionEntity = "cardSet" | "document";

const getCloudEntityPathSegments = (userId: string, entity: CloudCollectionEntity, id: string): [string, string, string, string] => ["users", userId, COLLECTION_BY_TYPE[entity], id];

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

export const createWebTrashRepository = (): TrashRepository<Folder, Card, CardSet, Document> => ({
  loadContext: async (userId) => {
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
  restoreCardSet: async (userId, cardSetId) => {
    const db = await getLocalDb(userId);
    await db.restore("cardSets", cardSetId);
    await maybeUpdateFirestoreDeletedState({
      pathSegments: getCloudEntityPathSegments(userId, "cardSet", cardSetId),
      isDeleted: false,
    });
  },
  restoreDocument: async (userId, documentId) => {
    const db = await getLocalDb(userId);
    await db.restore("documents", documentId);
    await maybeUpdateFirestoreDeletedState({
      pathSegments: getCloudEntityPathSegments(userId, "document", documentId),
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
  purgeCardSet: async (userId, cardSetId) => {
    const db = await getLocalDb(userId);
    await db.purge("cardSets", cardSetId);

    try {
      await maybeDeleteFirestoreDoc(getCloudEntityPathSegments(userId, "cardSet", cardSetId));
    } catch (error) {
      console.warn(`Firestore delete failed for card set ${cardSetId}:`, error);
    }
  },
  purgeDocument: async (userId, documentId) => {
    const db = await getLocalDb(userId);
    await db.purge("documents", documentId);

    try {
      await maybeDeleteFirestoreDoc(getCloudEntityPathSegments(userId, "document", documentId));
    } catch (error) {
      console.warn(`Firestore delete failed for document ${documentId}:`, error);
    }
  },
});
