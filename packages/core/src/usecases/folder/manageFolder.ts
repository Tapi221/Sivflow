export type FolderCommandEntity = {
  id: string;
  isDeleted?: boolean;
  parentFolderId?: string | null;
  orderIndex?: number;
};

export type CreateFolderOptions = {
  color?: string;
  cloudSyncEnabled?: boolean;
  id?: string;
  orderIndex?: number;
};

export type FolderCreateDraft = {
  userId: string;
  id: string;
  folderId: string;
  folderName: string;
  parentFolderId: string | null;
  isDeleted: false;
  folderColor: string | null;
  cloudSyncEnabled: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
};

export type FolderCommandRepository<TFolder extends FolderCommandEntity = FolderCommandEntity> = {
  generateFolderId: () => string;
  listFolders: (userId: string) => Promise<TFolder[]>;
  addFolder: (userId: string, folder: FolderCreateDraft) => Promise<void>;
  updateFolder: (userId: string, folderId: string, changes: Record<string, unknown>) => Promise<void>;
};

const toNullableParentId = (parentId?: string | null) => parentId ?? null;

export const createFolderUseCase = async <TFolder extends FolderCommandEntity>({
  userId,
  name,
  parentId,
  options,
  repository,
}: {
  userId: string;
  name: string;
  parentId?: string;
  options?: CreateFolderOptions;
  repository: FolderCommandRepository<TFolder>;
}): Promise<string> => {
  const normalizedParentId = toNullableParentId(parentId);
  const currentFolders = await repository.listFolders(userId);
  const siblings = currentFolders.filter(
    (folder) =>
      !folder.isDeleted &&
      (folder.parentFolderId ?? null) === normalizedParentId,
  );
  const folderId = options?.id ?? repository.generateFolderId();
  const now = new Date();
  const orderIndex = options?.orderIndex ?? 0;

  if (orderIndex === 0 && siblings.length > 0) {
    for (const sibling of siblings) {
      await repository.updateFolder(userId, sibling.id, {
        orderIndex: (sibling.orderIndex ?? 0) + 1,
        updatedAt: now,
      });
    }
  }

  await repository.addFolder(userId, {
    userId,
    id: folderId,
    folderId,
    folderName: name,
    parentFolderId: normalizedParentId,
    isDeleted: false,
    folderColor: options?.color || null,
    cloudSyncEnabled: options?.cloudSyncEnabled ?? true,
    orderIndex,
    createdAt: now,
    updatedAt: now,
  });

  return folderId;
};

export const updateFolderUseCase = async <TFolder extends FolderCommandEntity>({
  userId,
  folderId,
  data,
  repository,
}: {
  userId: string;
  folderId: string;
  data: Record<string, unknown>;
  repository: FolderCommandRepository<TFolder>;
}): Promise<void> => {
  await repository.updateFolder(userId, folderId, {
    ...data,
    updatedAt: new Date(),
  });
};

export const reorderFoldersUseCase = async <TFolder extends FolderCommandEntity>({
  userId,
  folderIds,
  repository,
}: {
  userId: string;
  folderIds: string[];
  repository: FolderCommandRepository<TFolder>;
}): Promise<void> => {
  const now = new Date();

  for (const [index, folderId] of folderIds.entries()) {
    await repository.updateFolder(userId, folderId, {
      orderIndex: index,
      updatedAt: now,
    });
  }
};
