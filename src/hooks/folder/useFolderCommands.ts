import { nanoid } from "nanoid";
import { buildCardSetById, resolveCardFolderId } from "@/domain/card/selectors/cardFolder";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { Card, CardSet, Document, Folder } from "@/types";

type CreateFolderOptions = {
  color?: string;
  cloudSyncEnabled?: boolean;
  id?: string;
  orderIndex?: number;
};

const toNullableParentId = (parentId?: string | null) => parentId ?? null;

const buildChildFolderMap = (folders: Folder[]) => {
  const childFolderIdsByParentId = new Map<string | null, string[]>();

  folders
    .filter((folder) => !folder.isDeleted)
    .forEach((folder) => {
      const parentId = folder.parentFolderId ?? null;
      const nextSiblingIds = childFolderIdsByParentId.get(parentId) ?? [];
      nextSiblingIds.push(folder.id);
      childFolderIdsByParentId.set(parentId, nextSiblingIds);
    });

  return childFolderIdsByParentId;
};

const collectDescendantFolderIds = (
  childFolderIdsByParentId: ReadonlyMap<string | null, string[]>,
  rootFolderId: string,
) => {
  const visited = new Set<string>();
  const orderedFolderIds: string[] = [];
  const stack = [rootFolderId];

  while (stack.length > 0) {
    const currentFolderId = stack.pop();
    if (!currentFolderId || visited.has(currentFolderId)) {
      continue;
    }

    visited.add(currentFolderId);
    orderedFolderIds.push(currentFolderId);

    const childFolderIds = childFolderIdsByParentId.get(currentFolderId) ?? [];
    for (let index = childFolderIds.length - 1; index >= 0; index -= 1) {
      const childFolderId = childFolderIds[index];
      if (typeof childFolderId === "string" && childFolderId.length > 0) {
        stack.push(childFolderId);
      }
    }
  }

  return orderedFolderIds;
};

const collectCardSetsInFolders = ({
  cardSets,
  folderIds,
}: {
  cardSets: CardSet[];
  folderIds: ReadonlySet<string>;
}) => {
  return cardSets.filter((cardSet) => {
    if (cardSet.isDeleted) return false;
    return cardSet.folderId ? folderIds.has(cardSet.folderId) : false;
  });
};

const collectCardsInFolders = ({
  cards,
  cardSets,
  folderIds,
}: {
  cards: Card[];
  cardSets: CardSet[];
  folderIds: ReadonlySet<string>;
}) => {
  const activeCardSetById = buildCardSetById(cardSets.filter((cardSet) => !cardSet.isDeleted));

  return cards.filter((card) => {
    if (card.isDeleted) return false;

    const resolvedFolderId = resolveCardFolderId(card, activeCardSetById);
    return resolvedFolderId ? folderIds.has(resolvedFolderId) : false;
  });
};

const collectDocumentsInFolders = ({
  documents,
  folderIds,
}: {
  documents: Document[];
  folderIds: ReadonlySet<string>;
}) => {
  return documents.filter((document) => {
    if (document.isDeleted) return false;
    return folderIds.has(document.folderId);
  });
};

export const useFolderCommands = () => {
  const { currentUser } = useAuthSession();

  const createFolder = async (
    name: string,
    parentId?: string,
    options?: CreateFolderOptions,
  ) => {
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    const db = await getLocalDb(currentUser.uid);
    const color = options?.color;
    const cloudSyncEnabled = options?.cloudSyncEnabled ?? true;
    const normalizedParentId = toNullableParentId(parentId);

    const currentFolders = (await db.folders.toArray()).map(normalizeFolder);
    const siblings = currentFolders.filter(
      (folder) =>
        !folder.isDeleted &&
        (folder.parentFolderId ?? null) === normalizedParentId,
    );

    const orderIndex = options?.orderIndex ?? 0;

    const folderData = {
      userId: currentUser.uid,
      folderName: name,
      parentFolderId: normalizedParentId,
      isDeleted: false,
      folderColor: color || null,
      cloudSyncEnabled,
      orderIndex,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const folderId =
      options?.id ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : nanoid());

    const localData = {
      ...folderData,
      id: folderId,
      folderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (orderIndex === 0 && siblings.length > 0) {
      await Promise.all(
        siblings.map((sibling) =>
          db.updateItem("folders", sibling.id, {
            orderIndex: (sibling.orderIndex ?? 0) + 1,
            updatedAt: new Date(),
          }),
        ),
      );
    }

    try {
      await db.addItem("folders", localData as unknown);
      return folderId;
    } catch (error) {
      console.error("[useFolderCommands.createFolder] LocalDB add failed", {
        folderId,
        error,
      });
      throw error;
    }
  };

  const updateFolder = async (folderId: string, data: Partial<Folder>) => {
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    const db = await getLocalDb(currentUser.uid);

    await db.updateItem("folders", folderId, {
      ...data,
      updatedAt: new Date(),
    });
  };

  const reorderFolders = async (folderIds: string[]) => {
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    const db = await getLocalDb(currentUser.uid);

    await Promise.all(
      folderIds.map((folderId, index) =>
        db.updateItem("folders", folderId, {
          orderIndex: index,
          updatedAt: new Date(),
        }),
      ),
    );
  };

  const deleteFolder = async (folderId: string) => {
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    const db = await getLocalDb(currentUser.uid);
    const folders = (await db.folders.toArray()).map(normalizeFolder);
    const childFolderIdsByParentId = buildChildFolderMap(folders);
    const folderIdsToDelete = collectDescendantFolderIds(
      childFolderIdsByParentId,
      folderId,
    );
    const folderIdSet = new Set(folderIdsToDelete);
    const [cardSets, cards, documents] = await Promise.all([
      db.cardSets.where("userId").equals(currentUser.uid).toArray(),
      db.getAllCards(),
      db.documents.where("userId").equals(currentUser.uid).toArray(),
    ]);
    const cardSetsToDelete = collectCardSetsInFolders({
      cardSets,
      folderIds: folderIdSet,
    });
    const cardsToDelete = collectCardsInFolders({
      cards,
      cardSets,
      folderIds: folderIdSet,
    });
    const documentsToDelete = collectDocumentsInFolders({
      documents,
      folderIds: folderIdSet,
    });

    for (const targetFolderId of folderIdsToDelete) {
      await db.softDelete("folders", targetFolderId);
    }

    for (const cardSet of cardSetsToDelete) {
      await db.softDelete("cardSets", cardSet.id);
    }

    for (const card of cardsToDelete) {
      await db.softDelete("cards", card.id);
    }

    for (const document of documentsToDelete) {
      await db.softDelete("documents", document.id);
    }
  };

  return {
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
  };
};
