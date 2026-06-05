export type TrashEntityBase = {
  [key: string]: unknown;
  id: string;
  isDeleted?: boolean;
  deletedAt?: unknown;
};

export type TrashFolderBase = TrashEntityBase & {
  parentFolderId?: string | null;
};

export type TrashCardBase = TrashEntityBase;

export type TrashCardSetBase = TrashEntityBase;

export type TrashDocumentBase = TrashEntityBase;

export type TrashItems<
  TFolder extends TrashFolderBase = TrashFolderBase,
  TCard extends TrashCardBase = TrashCardBase,
  TCardSet extends TrashCardSetBase = TrashCardSetBase,
  TDocument extends TrashDocumentBase = TrashDocumentBase,
> = {
  folders: TFolder[];
  cards: TCard[];
  cardSets: TCardSet[];
  documents: TDocument[];
};

export type TrashContext<
  TFolder extends TrashFolderBase = TrashFolderBase,
  TCard extends TrashCardBase = TrashCardBase,
  TCardSet extends TrashCardSetBase = TrashCardSetBase,
  TDocument extends TrashDocumentBase = TrashDocumentBase,
> = {
  folders: TFolder[];
  cards: TCard[];
  cardSets: TCardSet[];
  documents: TDocument[];
  resolveCardFolderId: (card: TCard) => string | null | undefined;
};

export type TrashItemIds = {
  folderIds?: string[];
  cardIds?: string[];
  cardSetIds?: string[];
  documentIds?: string[];
};

export type TrashRepository<
  TFolder extends TrashFolderBase = TrashFolderBase,
  TCard extends TrashCardBase = TrashCardBase,
  TCardSet extends TrashCardSetBase = TrashCardSetBase,
  TDocument extends TrashDocumentBase = TrashDocumentBase,
> = {
  loadContext: (userId: string) => Promise<TrashContext<TFolder, TCard, TCardSet, TDocument>>;
  restoreFolder: (userId: string, folderId: string) => Promise<void>;
  restoreCard: (userId: string, cardId: string) => Promise<void>;
  restoreCardSet: (userId: string, cardSetId: string) => Promise<void>;
  restoreDocument: (userId: string, documentId: string) => Promise<void>;
  purgeFolder: (userId: string, folderId: string) => Promise<void>;
  purgeCard: (userId: string, cardId: string) => Promise<void>;
  purgeCardSet: (userId: string, cardSetId: string) => Promise<void>;
  purgeDocument: (userId: string, documentId: string) => Promise<void>;
};

export type TrashUseCaseInput<
  TFolder extends TrashFolderBase = TrashFolderBase,
  TCard extends TrashCardBase = TrashCardBase,
  TCardSet extends TrashCardSetBase = TrashCardSetBase,
  TDocument extends TrashDocumentBase = TrashDocumentBase,
> = {
  userId: string;
  repository: TrashRepository<TFolder, TCard, TCardSet, TDocument>;
};
