export type CardSetCommandEntity = {
  id: string;
  folderId: string | null;
  isDeleted?: boolean;
  orderIndex?: number;
  updatedAt?: Date | unknown;
  createdAt?: Date | unknown;
  name?: string;
};

export type CreateCardSetOptions = {
  description?: string;
  id?: string;
  orderIndex?: number;
};

export type CardSetCreateDraft = {
  id: string;
  userId: string;
  deviceId: string;
  folderId: string;
  name: string;
  description?: string;
  orderIndex: number;
  defaultDisplayMode: string;
  isDeleted: false;
  createdAt: Date;
  updatedAt: Date;
};

export type CardSetCommandRepository<TCardSet extends CardSetCommandEntity = CardSetCommandEntity> = {
  generateCardSetId: () => string;
  listCardSets: (userId: string) => Promise<TCardSet[]>;
  addCardSet: (userId: string, cardSet: CardSetCreateDraft) => Promise<void>;
  updateCardSet: (userId: string, cardSetId: string, changes: Record<string, unknown>) => Promise<void>;
};

const isDeletedEntity = (entity: { isDeleted?: boolean; is_deleted?: boolean }) => {
  return Boolean(entity.isDeleted ?? entity.is_deleted);
};

export const createCardSetUseCase = async <TCardSet extends CardSetCommandEntity>({
  userId,
  name,
  targetFolderId,
  options,
  defaultDisplayMode,
  repository,
}: {
  userId: string;
  name: string;
  targetFolderId?: string | null;
  options?: CreateCardSetOptions;
  defaultDisplayMode: string;
  repository: CardSetCommandRepository<TCardSet>;
}): Promise<TCardSet> => {
  if (!targetFolderId) {
    throw new Error("カードセットはフォルダ配下にのみ作成できます");
  }

  const existingSets = await repository.listCardSets(userId);
  const siblingSets = existingSets.filter(
    (cardSet) => !isDeletedEntity(cardSet) && cardSet.folderId === targetFolderId,
  );
  const now = new Date();
  const orderIndex = options?.orderIndex ?? 0;
  const cardSet = {
    id: options?.id ?? repository.generateCardSetId(),
    userId,
    deviceId: "web",
    folderId: targetFolderId,
    name,
    description: options?.description,
    orderIndex,
    defaultDisplayMode,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  } satisfies CardSetCreateDraft;

  if (orderIndex === 0 && siblingSets.length > 0) {
    for (const sibling of siblingSets) {
      await repository.updateCardSet(userId, sibling.id, {
        orderIndex: (sibling.orderIndex ?? 0) + 1,
        updatedAt: now,
      });
    }
  }

  await repository.addCardSet(userId, cardSet);

  return cardSet as unknown as TCardSet;
};

export const updateCardSetUseCase = async <TCardSet extends CardSetCommandEntity>({
  userId,
  cardSetId,
  data,
  repository,
}: {
  userId: string;
  cardSetId: string;
  data: Record<string, unknown>;
  repository: CardSetCommandRepository<TCardSet>;
}): Promise<void> => {
  await repository.updateCardSet(userId, cardSetId, {
    ...data,
    updatedAt: new Date(),
  });
};

export const moveCardSetToFolderUseCase = async <TCardSet extends CardSetCommandEntity>({
  userId,
  cardSetId,
  targetFolderId,
  repository,
}: {
  userId: string;
  cardSetId: string;
  targetFolderId?: string | null;
  repository: CardSetCommandRepository<TCardSet>;
}): Promise<void> => {
  if (!targetFolderId) {
    throw new Error("カードセットをルート直下へ移動することはできません");
  }

  const cardSets = await repository.listCardSets(userId);
  const siblingSets = cardSets.filter(
    (cardSet) => !isDeletedEntity(cardSet) && cardSet.folderId === targetFolderId,
  );
  const maxOrder = siblingSets.reduce(
    (max, cardSet) => Math.max(max, cardSet.orderIndex ?? 0),
    -1,
  );

  await repository.updateCardSet(userId, cardSetId, {
    folderId: targetFolderId,
    orderIndex: maxOrder + 1,
    updatedAt: new Date(),
  });
};
