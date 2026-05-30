export type FolderDeleteEntity = {
  id: string;
  isDeleted?: boolean;
  parentFolderId?: string | null;
};

export type FolderDeleteCardSet = {
  id: string;
  isDeleted?: boolean;
  folderId?: string | null;
};

export type FolderDeleteCard = {
  id: string;
  isDeleted?: boolean;
};

export type FolderDeleteDocument = {
  id: string;
  isDeleted?: boolean;
  folderId: string;
};

export type FolderDeleteContext<
  TFolder extends FolderDeleteEntity = FolderDeleteEntity,
  TCardSet extends FolderDeleteCardSet = FolderDeleteCardSet,
  TCard extends FolderDeleteCard = FolderDeleteCard,
  TDocument extends FolderDeleteDocument = FolderDeleteDocument,
> = {
  folders: TFolder[];
  cardSets: TCardSet[];
  cards: TCard[];
  documents: TDocument[];
  resolveCardFolderId: (card: TCard, cardSets: TCardSet[]) => string | null | undefined;
};

export type FolderDeleteRepository<
  TFolder extends FolderDeleteEntity = FolderDeleteEntity,
  TCardSet extends FolderDeleteCardSet = FolderDeleteCardSet,
  TCard extends FolderDeleteCard = FolderDeleteCard,
  TDocument extends FolderDeleteDocument = FolderDeleteDocument,
> = {
  loadDeleteContext: (userId: string) => Promise<FolderDeleteContext<TFolder, TCardSet, TCard, TDocument>>;
  softDeleteFolder: (userId: string, folderId: string) => Promise<void>;
  softDeleteCardSet: (userId: string, cardSetId: string) => Promise<void>;
  softDeleteCard: (userId: string, cardId: string) => Promise<void>;
  softDeleteDocument: (userId: string, documentId: string) => Promise<void>;
};

const buildChildFolderMap = <TFolder extends FolderDeleteEntity>(folders: TFolder[]) => {
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
    if (!currentFolderId || visited.has(currentFolderId)) continue;

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

const collectCardSetsInFolders = <TCardSet extends FolderDeleteCardSet>({
  cardSets,
  folderIds,
}: {
  cardSets: TCardSet[];
  folderIds: ReadonlySet<string>;
}) => {
  return cardSets.filter((cardSet) => {
    if (cardSet.isDeleted) return false;
    return cardSet.folderId ? folderIds.has(cardSet.folderId) : false;
  });
};

const collectCardsInFolders = <
  TCardSet extends FolderDeleteCardSet,
  TCard extends FolderDeleteCard,
>({
  cards,
  cardSets,
  folderIds,
  resolveCardFolderId,
}: {
  cards: TCard[];
  cardSets: TCardSet[];
  folderIds: ReadonlySet<string>;
  resolveCardFolderId: (card: TCard, cardSets: TCardSet[]) => string | null | undefined;
}) => {
  return cards.filter((card) => {
    if (card.isDeleted) return false;

    const folderId = resolveCardFolderId(card, cardSets);
    return folderId ? folderIds.has(folderId) : false;
  });
};

const collectDocumentsInFolders = <TDocument extends FolderDeleteDocument>({
  documents,
  folderIds,
}: {
  documents: TDocument[];
  folderIds: ReadonlySet<string>;
}) => {
  return documents.filter((document) => {
    if (document.isDeleted) return false;
    return folderIds.has(document.folderId);
  });
};

export const deleteFolderCascade = async <
  TFolder extends FolderDeleteEntity,
  TCardSet extends FolderDeleteCardSet,
  TCard extends FolderDeleteCard,
  TDocument extends FolderDeleteDocument,
>({
  userId,
  folderId,
  repository,
}: {
  userId: string;
  folderId: string;
  repository: FolderDeleteRepository<TFolder, TCardSet, TCard, TDocument>;
}): Promise<void> => {
  const context = await repository.loadDeleteContext(userId);
  const childFolderIdsByParentId = buildChildFolderMap(context.folders);
  const folderIdsToDelete = collectDescendantFolderIds(childFolderIdsByParentId, folderId);
  const folderIdSet = new Set(folderIdsToDelete);
  const cardSetsToDelete = collectCardSetsInFolders({
    cardSets: context.cardSets,
    folderIds: folderIdSet,
  });
  const cardsToDelete = collectCardsInFolders({
    cards: context.cards,
    cardSets: context.cardSets,
    folderIds: folderIdSet,
    resolveCardFolderId: context.resolveCardFolderId,
  });
  const documentsToDelete = collectDocumentsInFolders({
    documents: context.documents,
    folderIds: folderIdSet,
  });

  for (const targetFolderId of folderIdsToDelete) {
    await repository.softDeleteFolder(userId, targetFolderId);
  }

  for (const cardSet of cardSetsToDelete) {
    await repository.softDeleteCardSet(userId, cardSet.id);
  }

  for (const card of cardsToDelete) {
    await repository.softDeleteCard(userId, card.id);
  }

  for (const document of documentsToDelete) {
    await repository.softDeleteDocument(userId, document.id);
  }
};
