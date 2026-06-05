import type { TrashCardBase, TrashCardSetBase, TrashDocumentBase, TrashEntityBase, TrashFolderBase, TrashItemIds, TrashItems, TrashUseCaseInput } from "./trashTypes";

export const TRASH_RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getDeletedAtTime = (value: unknown): number | null => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const timestamp = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
    if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
    if (typeof timestamp._seconds === "number") return timestamp._seconds * 1000;
  }
  return null;
};

const getStringField = (item: TrashEntityBase, key: string): string | null => {
  const value = item[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const getFolderId = (item: TrashEntityBase): string | null => getStringField(item, "folderId") ?? getStringField(item, "folder_id");

const getCardSetId = (item: TrashEntityBase): string | null => getStringField(item, "cardSetId") ?? getStringField(item, "card_set_id");

const isExpiredTrashItem = (item: TrashEntityBase, retentionDays: number, now: number): boolean => {
  if (item.isDeleted !== true) return false;
  const deletedAt = getDeletedAtTime(item.deletedAt);
  if (deletedAt === null) return false;
  return deletedAt <= now - retentionDays * MS_PER_DAY;
};

const getDeletedItems = <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
  TCardSet extends TrashCardSetBase,
  TDocument extends TrashDocumentBase,
>({
  folders,
  cards,
  cardSets,
  documents,
  resolveCardFolderId,
}: {
  folders: TFolder[];
  cards: TCard[];
  cardSets: TCardSet[];
  documents: TDocument[];
  resolveCardFolderId: (card: TCard) => string | null | undefined;
}): TrashItems<TFolder, TCard, TCardSet, TDocument> => {
  const deletedFolders = folders.filter((folder) => folder.isDeleted === true);
  const deletedFolderIdSet = new Set(deletedFolders.map((folder) => folder.id));
  const deletedCardSets = cardSets.filter((cardSet) => {
    const folderId = getFolderId(cardSet);
    return cardSet.isDeleted === true || (folderId ? deletedFolderIdSet.has(folderId) : false);
  });
  const deletedCardSetIdSet = new Set(deletedCardSets.map((cardSet) => cardSet.id));
  const deletedCards = cards.filter((card) => {
    const folderId = resolveCardFolderId(card);
    const cardSetId = getCardSetId(card);

    return card.isDeleted === true || (folderId ? deletedFolderIdSet.has(folderId) : false) || (cardSetId ? deletedCardSetIdSet.has(cardSetId) : false);
  });
  const deletedDocuments = documents.filter((document) => {
    const folderId = getFolderId(document);
    return document.isDeleted === true || (folderId ? deletedFolderIdSet.has(folderId) : false);
  });

  return {
    folders: deletedFolders,
    cards: deletedCards,
    cardSets: deletedCardSets,
    documents: deletedDocuments,
  };
};

export const getTrashItems = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
  TCardSet extends TrashCardSetBase,
  TDocument extends TrashDocumentBase,
>({
  userId,
  repository,
}: TrashUseCaseInput<TFolder, TCard, TCardSet, TDocument>): Promise<TrashItems<TFolder, TCard, TCardSet, TDocument>> => {
  const context = await repository.loadContext(userId);

  return getDeletedItems(context);
};

export const restoreFolderWithParents = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
  TCardSet extends TrashCardSetBase,
  TDocument extends TrashDocumentBase,
>({
  userId,
  folderId,
  repository,
}: TrashUseCaseInput<TFolder, TCard, TCardSet, TDocument> & {
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
  TCardSet extends TrashCardSetBase,
  TDocument extends TrashDocumentBase,
>({
  userId,
  repository,
  folderIds = [],
  cardIds = [],
  cardSetIds = [],
  documentIds = [],
}: TrashUseCaseInput<TFolder, TCard, TCardSet, TDocument> & TrashItemIds): Promise<void> => {
  const { folders, cards, cardSets, documents, resolveCardFolderId } = await repository.loadContext(userId);
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const cardSetById = new Map(cardSets.map((cardSet) => [cardSet.id, cardSet]));
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const parentFolderIdsToRestore = new Set<string>();

  for (const cardId of cardIds) {
    const card = cardById.get(cardId);
    if (!card) continue;

    const folderId = resolveCardFolderId(card);
    if (!folderId) continue;

    const folder = folderById.get(folderId);
    if (folder?.isDeleted) parentFolderIdsToRestore.add(folderId);
  }

  for (const cardSetId of cardSetIds) {
    const cardSet = cardSetById.get(cardSetId);
    if (!cardSet) continue;

    const folderId = getFolderId(cardSet);
    if (!folderId) continue;

    const folder = folderById.get(folderId);
    if (folder?.isDeleted) parentFolderIdsToRestore.add(folderId);
  }

  for (const documentId of documentIds) {
    const document = documentById.get(documentId);
    if (!document) continue;

    const folderId = getFolderId(document);
    if (!folderId) continue;

    const folder = folderById.get(folderId);
    if (folder?.isDeleted) parentFolderIdsToRestore.add(folderId);
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

  for (const cardSetId of cardSetIds) {
    await repository.restoreCardSet(userId, cardSetId);
  }

  for (const documentId of documentIds) {
    await repository.restoreDocument(userId, documentId);
  }

  for (const cardId of cardIds) {
    await repository.restoreCard(userId, cardId);
  }
};

export const permanentlyDeleteTrashItems = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
  TCardSet extends TrashCardSetBase,
  TDocument extends TrashDocumentBase,
>({
  userId,
  repository,
  folderIds = [],
  cardIds = [],
  cardSetIds = [],
  documentIds = [],
}: TrashUseCaseInput<TFolder, TCard, TCardSet, TDocument> & TrashItemIds): Promise<void> => {
  for (const folderId of folderIds) {
    await repository.purgeFolder(userId, folderId);
  }

  for (const cardSetId of cardSetIds) {
    await repository.purgeCardSet(userId, cardSetId);
  }

  for (const documentId of documentIds) {
    await repository.purgeDocument(userId, documentId);
  }

  for (const cardId of cardIds) {
    await repository.purgeCard(userId, cardId);
  }
};

export const purgeExpiredTrashItems = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
  TCardSet extends TrashCardSetBase,
  TDocument extends TrashDocumentBase,
>({
  userId,
  repository,
  retentionDays = TRASH_RETENTION_DAYS,
  now = Date.now(),
}: TrashUseCaseInput<TFolder, TCard, TCardSet, TDocument> & {
  retentionDays?: number;
  now?: number;
}): Promise<TrashItems<TFolder, TCard, TCardSet, TDocument>> => {
  const context = await repository.loadContext(userId);
  const { folders, cards, cardSets, documents } = getDeletedItems(context);
  const expiredFolders = folders.filter((folder) => isExpiredTrashItem(folder, retentionDays, now));
  const expiredFolderIdSet = new Set(expiredFolders.map((folder) => folder.id));
  const expiredCardSets = cardSets.filter((cardSet) => {
    const folderId = getFolderId(cardSet);
    return isExpiredTrashItem(cardSet, retentionDays, now) || (folderId ? expiredFolderIdSet.has(folderId) : false);
  });
  const expiredCardSetIdSet = new Set(expiredCardSets.map((cardSet) => cardSet.id));
  const expiredDocuments = documents.filter((document) => {
    const folderId = getFolderId(document);
    return isExpiredTrashItem(document, retentionDays, now) || (folderId ? expiredFolderIdSet.has(folderId) : false);
  });
  const expiredCards = cards.filter((card) => {
    const folderId = context.resolveCardFolderId(card);
    const cardSetId = getCardSetId(card);
    return isExpiredTrashItem(card, retentionDays, now) || (folderId ? expiredFolderIdSet.has(folderId) : false) || (cardSetId ? expiredCardSetIdSet.has(cardSetId) : false);
  });

  await permanentlyDeleteTrashItems({
    userId,
    repository,
    folderIds: expiredFolders.map((folder) => folder.id),
    cardIds: expiredCards.map((card) => card.id),
    cardSetIds: expiredCardSets.map((cardSet) => cardSet.id),
    documentIds: expiredDocuments.map((document) => document.id),
  });

  return {
    folders: expiredFolders,
    cards: expiredCards,
    cardSets: expiredCardSets,
    documents: expiredDocuments,
  };
};

export const emptyTrash = async <
  TFolder extends TrashFolderBase,
  TCard extends TrashCardBase,
  TCardSet extends TrashCardSetBase,
  TDocument extends TrashDocumentBase,
>({
  userId,
  repository,
}: TrashUseCaseInput<TFolder, TCard, TCardSet, TDocument>): Promise<void> => {
  const { folders, cards, cardSets, documents } = await getTrashItems({ userId, repository });

  await permanentlyDeleteTrashItems({
    userId,
    repository,
    folderIds: folders.map((folder) => folder.id),
    cardIds: cards.map((card) => card.id),
    cardSetIds: cardSets.map((cardSet) => cardSet.id),
    documentIds: documents.map((document) => document.id),
  });
};
