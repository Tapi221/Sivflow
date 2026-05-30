import type { TrashCardBase, TrashFolderBase, TrashItemIds, TrashItems, TrashUseCaseInput } from "./trashTypes";

const getDeletedItems = <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
>({
  folders,
  cards,
  resolveCardFolderId,
}: {
  folders: TFolder[];
  cards: TCard[];
  resolveCardFolderId: (card: TCard) => string | null | undefined;
}): TrashItems<TFolder, TCard> => {
  const deletedFolders = folders.filter((folder) => folder.isDeleted === true);
  const deletedFolderIdSet = new Set(deletedFolders.map((folder) => folder.id));
  const deletedCards = cards.filter((card) => {
    const folderId = resolveCardFolderId(card);

    return card.isDeleted === true || (folderId ? deletedFolderIdSet.has(folderId) : false);
  });

  return {
    folders: deletedFolders,
    cards: deletedCards,
  };
};

export const getTrashItems = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
>({
  userId,
  repository,
}: TrashUseCaseInput<TFolder, TCard>): Promise<TrashItems<TFolder, TCard>> => {
  const context = await repository.loadContext(userId);

  return getDeletedItems(context);
};

export const restoreFolderWithParents = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
>({
  userId,
  folderId,
  repository,
}: TrashUseCaseInput<TFolder, TCard> & {
  folderId: string;
}): Promise<void> => {
  const { folders } = await repository.loadContext(userId);
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const folder = folderById.get(folderId);

  if (!folder) {
    throw new Error(`Folder not found: ${folderId}`);
  }

  if (folder.parentFolderId) {
    const parentFolder = folderById.get(folder.parentFolderId);

    if (parentFolder?.isDeleted) {
      await restoreFolderWithParents({
        userId,
        folderId: folder.parentFolderId,
        repository,
      });
    }
  }

  await repository.restoreFolder(userId, folderId);
};

export const restoreTrashItems = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
>({
  userId,
  repository,
  folderIds = [],
  cardIds = [],
}: TrashUseCaseInput<TFolder, TCard> & TrashItemIds): Promise<void> => {
  const { folders, cards, resolveCardFolderId } = await repository.loadContext(userId);
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const parentFolderIdsToRestore = new Set<string>();

  for (const cardId of cardIds) {
    const card = cardById.get(cardId);
    if (!card) continue;

    const folderId = resolveCardFolderId(card);
    if (!folderId) continue;

    const folder = folderById.get(folderId);
    if (folder?.isDeleted) {
      parentFolderIdsToRestore.add(folderId);
    }
  }

  for (const parentFolderId of parentFolderIdsToRestore) {
    await restoreFolderWithParents({
      userId,
      folderId: parentFolderId,
      repository,
    });
  }

  for (const folderId of folderIds) {
    await restoreFolderWithParents({
      userId,
      folderId,
      repository,
    });
  }

  for (const cardId of cardIds) {
    await repository.restoreCard(userId, cardId);
  }
};

export const permanentlyDeleteTrashItems = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
>({
  userId,
  repository,
  folderIds = [],
  cardIds = [],
}: TrashUseCaseInput<TFolder, TCard> & TrashItemIds): Promise<void> => {
  for (const folderId of folderIds) {
    await repository.purgeFolder(userId, folderId);
  }

  for (const cardId of cardIds) {
    await repository.purgeCard(userId, cardId);
  }
};

export const emptyTrash = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
>({
  userId,
  repository,
}: TrashUseCaseInput<TFolder, TCard>): Promise<void> => {
  const { folders, cards } = await getTrashItems({ userId, repository });

  await permanentlyDeleteTrashItems({
    userId,
    repository,
    folderIds: folders.map((folder) => folder.id),
    cardIds: cards.map((card) => card.id),
  });
};
