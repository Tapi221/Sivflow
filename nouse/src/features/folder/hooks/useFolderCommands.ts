import { createFolderUseCase, deleteFolderCascade, reorderFoldersUseCase, updateFolderUseCase } from "@core/usecases/folder";
import { createWebFolderRepository } from "@platform/storage/folderRepository.web";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import type { Folder } from "@/types";



type CreateFolderOptions = {
  color?: string;
  cloudSyncEnabled?: boolean;
  id?: string;
  orderIndex?: number;
};



const useFolderCommands = () => {
  const { currentUser } = useAuthSession();

  const createFolder = async (
    name: string,
    parentId?: string,
    options?: CreateFolderOptions,
  ) => {
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    return createFolderUseCase({
      userId: currentUser.uid,
      name,
      parentId,
      options,
      repository: createWebFolderRepository(),
    });
  };

  const updateFolder = async (folderId: string, data: Partial<Folder>) => {
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    await updateFolderUseCase({
      userId: currentUser.uid,
      folderId,
      data,
      repository: createWebFolderRepository(),
    });
  };

  const reorderFolders = async (folderIds: string[]) => {
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    await reorderFoldersUseCase({
      userId: currentUser.uid,
      folderIds,
      repository: createWebFolderRepository(),
    });
  };

  const deleteFolder = async (folderId: string) => {
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    await deleteFolderCascade({
      userId: currentUser.uid,
      folderId,
      repository: createWebFolderRepository(),
    });
  };

  return {
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
  };
};



export { useFolderCommands };
