import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";

import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { Folder } from "@/types";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";

const isDatabaseClosedError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { name?: unknown; message?: unknown };

  return (
    candidate.name === "DatabaseClosedError" ||
    (typeof candidate.message === "string" &&
      candidate.message.includes("DatabaseClosedError"))
  );
};

export const useFolders = () => {
  const { currentUser } = useAuthSession();
  const userId = currentUser?.uid ?? null;

  const folders = useLiveQuery(async () => {
    if (!userId) {
      return [];
    }

    try {
      const db = await getLocalDb(userId);
      const rawFolders = await db.folders.toArray();

      const filtered = rawFolders.filter(
        (folder) =>
          !(
            (folder as unknown as { isDeleted?: boolean; is_deleted?: boolean })
              .isDeleted ??
            (folder as unknown as { isDeleted?: boolean; is_deleted?: boolean })
              .is_deleted
          ),
      );

      return filtered.map(normalizeFolder);
    } catch (error) {
      if (isDatabaseClosedError(error)) {
        console.warn(
          "[useFolders] Closed DB detected. Returning empty result.",
          {
            userId,
          },
        );
        return [];
      }

      throw error;
    }
  }, [userId]);

  const createFolder = async (
    name: string,
    parentId?: string,
    options?: {
      color?: string;
      cloudSyncEnabled?: boolean;
      id?: string;
      orderIndex?: number;
    },
  ) => {
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    const db = await getLocalDb(currentUser.uid);
    const color = options?.color;
    const cloudSyncEnabled = options?.cloudSyncEnabled ?? true;
    const normalizedParentId = parentId ?? null;

    const currentFolders = (await db.folders.toArray()).map(normalizeFolder);
    const siblings = currentFolders.filter(
      (folder) => (folder.parentFolderId ?? null) === normalizedParentId,
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
      console.error("[useFolders.createFolder] LocalDB add failed", {
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
    await db.softDelete("folders", folderId);

    const currentFolders = folders || [];
    const subfolders = currentFolders.filter(
      (folder) => folder.parentFolderId === folderId,
    );

    for (const subfolder of subfolders) {
      await deleteFolder(subfolder.id);
    }
  };

  const getFolderTree = () => {
    const currentFolders = folders || [];

    const buildTree = (
      parentId: string | null,
    ): (Folder & { children: Folder[] })[] => {
      return currentFolders
        .filter((folder) => folder.parentFolderId === parentId)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .map((folder) => ({
          ...folder,
          children: buildTree(folder.id),
        }));
    };

    return buildTree(null);
  };

  return {
    folders: folders || [],
    loading: folders === undefined,
    error: null,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
    getFolderTree,
  };
};
