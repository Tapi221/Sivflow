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

export type TrashItems<
  TFolder extends TrashFolderBase = TrashFolderBase,
  TCard extends TrashCardBase = TrashCardBase,
> = {
  folders: TFolder[];
  cards: TCard[];
};

export type TrashContext<
  TFolder extends TrashFolderBase = TrashFolderBase,
  TCard extends TrashCardBase = TrashCardBase,
> = {
  folders: TFolder[];
  cards: TCard[];
  resolveCardFolderId: (card: TCard) => string | null | undefined;
};

export type TrashItemIds = {
  folderIds?: string[];
  cardIds?: string[];
};

export type TrashRepository<
  TFolder extends TrashFolderBase = TrashFolderBase,
  TCard extends TrashCardBase = TrashCardBase,
> = {
  loadContext: (userId: string) => Promise<TrashContext<TFolder, TCard>>;
  restoreFolder: (userId: string, folderId: string) => Promise<void>;
  restoreCard: (userId: string, cardId: string) => Promise<void>;
  purgeFolder: (userId: string, folderId: string) => Promise<void>;
  purgeCard: (userId: string, cardId: string) => Promise<void>;
};

export type TrashUseCaseInput<
  TFolder extends TrashFolderBase = TrashFolderBase,
  TCard extends TrashCardBase = TrashCardBase,
> = {
  userId: string;
  repository: TrashRepository<TFolder, TCard>;
};
