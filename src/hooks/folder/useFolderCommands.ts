import { nanoid } from "nanoid";
import { deleteFolderCascade } from "@core/usecases/folder";
import { createWebFolderRepository } from "@platform/storage/folderRepository.web";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { Folder } from "@/types";

type CreateFolderOptions = {
  color?: string;
  cloudSyncEnabled?: boolean;
  id?: string;
  orderIndex?: number;
};

const toNullableParentId = (parentId?: string | null) => parentId ?? null;

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
