import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import {
  buildCardSetById,
  resolveCardFolderIdStrict,
} from "@/domain/card/selectors/cardFolder";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { firestoreDb } from "@/services/firebase";
import {
  cardDocPathSegments,
  folderDocPathSegments,
} from "@/services/firestorePaths";
import { getLocalDb } from "@/services/localDB";
import type { Card, Folder } from "@/types";
import { deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";

export type TrashItems = {
  folders: Folder[];
  cards: Card[];
};

export type TrashItemIds = {
  folderIds?: string[];
  cardIds?: string[];
};

const maybeUpdateFirestoreDeletedState = async ({
  pathSegments,
  isDeleted,
}: {
  pathSegments: string[];
  isDeleted: boolean;
}): Promise<void> => {
  if (!firestoreDb) return;

  const targetRef = doc(firestoreDb, ...pathSegments);

  await updateDoc(targetRef, {
    isDeleted,
    deletedAt: isDeleted ? Timestamp.now() : null,
    updatedAt: Timestamp.now(),
  });
};

const maybeDeleteFirestoreDoc = async (
  pathSegments: string[],
): Promise<void> => {
  if (!firestoreDb) return;

  const targetRef = doc(firestoreDb, ...pathSegments);
  await deleteDoc(targetRef);
};

const loadTrashContext = async (userId: string) => {
  const db = await getLocalDb(userId);

  const [rawFolders, rawCards, rawCardSets] = await Promise.all([
    db.getAllFolders(),
    db.getAllCards(),
    db.cardSets.where("userId").equals(userId).toArray(),
  ]);

  const folders = rawFolders.map(normalizeFolder);
  const cards = rawCards.map(normalizeCard);
  const cardSetById = buildCardSetById(
    rawCardSets.filter((cardSet) => !cardSet.isDeleted),
  );

  const deletedFolders = folders.filter((folder) => folder.isDeleted === true);
  const deletedFolderIdSet = new Set(
    deletedFolders.map((folder) => folder.id),
  );

  const deletedCards = cards.filter((card) => {
    const folderId = resolveCardFolderIdStrict(card, cardSetById);

    return (
      card.isDeleted === true ||
      (folderId ? deletedFolderIdSet.has(folderId) : false)
    );
  });

  return {
    db,
    folders,
    cards,
    cardSetById,
    deletedFolders,
    deletedCards,
  };
};

export const getTrashItems = async (userId: string): Promise<TrashItems> => {
  const { deletedFolders, deletedCards } = await loadTrashContext(userId);

  return {
    folders: deletedFolders,
    cards: deletedCards,
  };
};

export const restoreFolderWithParents = async ({
  userId,
  folderId,
}: {
  userId: string;
  folderId: string;
}): Promise<void> => {
  const db = await getLocalDb(userId);
  const rawFolder = await db.getItem("folders", folderId);

  if (!rawFolder) {
    throw new Error(`Folder not found: ${folderId}`);
  }

  const folder = normalizeFolder(rawFolder);

  if (folder.parentFolderId) {
    const rawParentFolder = await db.getItem("folders", folder.parentFolderId);

    if (rawParentFolder) {
      const parentFolder = normalizeFolder(rawParentFolder);

      if (parentFolder.isDeleted) {
        await restoreFolderWithParents({
          userId,
          folderId: folder.parentFolderId,
        });
      }
    }
  }

  await db.restore("folders", folderId);

  await maybeUpdateFirestoreDeletedState({
    pathSegments: folderDocPathSegments(userId, folderId),
    isDeleted: false,
  });
};

export const restoreTrashItems = async ({
  userId,
  folderIds = [],
  cardIds = [],
}: {
  userId: string;
} & TrashItemIds): Promise<void> => {
  const { db, folders, cards, cardSetById } = await loadTrashContext(userId);

  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const parentFolderIdsToRestore = new Set<string>();

  for (const cardId of cardIds) {
    const card = cardById.get(cardId);
    if (!card) continue;

    const folderId = resolveCardFolderIdStrict(card, cardSetById);
    if (!folderId) continue;

    const folder = folderById.get(folderId);
    if (folder?.isDeleted) {
      parentFolderIdsToRestore.add(folderId);
    }
  }

  for (const folderId of parentFolderIdsToRestore) {
    await restoreFolderWithParents({
      userId,
      folderId,
    });
  }

  for (const folderId of folderIds) {
    await restoreFolderWithParents({
      userId,
      folderId,
    });
  }

  for (const cardId of cardIds) {
    await db.restore("cards", cardId);

    await maybeUpdateFirestoreDeletedState({
      pathSegments: cardDocPathSegments(userId, cardId),
      isDeleted: false,
    });
  }
};

export const permanentlyDeleteTrashItems = async ({
  userId,
  folderIds = [],
  cardIds = [],
}: {
  userId: string;
} & TrashItemIds): Promise<void> => {
  const db = await getLocalDb(userId);

  for (const folderId of folderIds) {
    await db.purge("folders", folderId);

    try {
      await maybeDeleteFirestoreDoc(folderDocPathSegments(userId, folderId));
    } catch (error) {
      console.warn(`Firestore delete failed for folder ${folderId}:`, error);
    }
  }

  for (const cardId of cardIds) {
    await db.purge("cards", cardId);

    try {
      await maybeDeleteFirestoreDoc(cardDocPathSegments(userId, cardId));
    } catch (error) {
      console.warn(`Firestore delete failed for card ${cardId}:`, error);
    }
  }
};

export const emptyTrash = async (userId: string): Promise<void> => {
  const { folders, cards } = await getTrashItems(userId);

  await permanentlyDeleteTrashItems({
    userId,
    folderIds: folders.map((folder) => folder.id),
    cardIds: cards.map((card) => card.id),
  });
};
