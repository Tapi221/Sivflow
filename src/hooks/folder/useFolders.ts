import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";
import { getLocalDb } from "@/services/localDB";
import { useAuthSession } from "@/contexts/AuthContext";
import type { Folder } from "@/types";
import { normalizeFolder } from "@/utils";

export function useFolders() {
  const { currentUser } = useAuthSession();

  const folders = useLiveQuery(async () => {
    if (!currentUser) return [];
    const db = await getLocalDb();
    const rawFolders = await db.folders.toArray();

    const filtered = rawFolders.filter(
      (f) => !((f as unknown).isDeleted ?? (f as unknown).is_deleted),
    );

    return filtered.map(normalizeFolder);
  }, [currentUser?.uid]);

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
    if (!currentUser) throw new Error("認証が必要です");

    const db = await getLocalDb();
    const color = options?.color;
    const cloudSyncEnabled = options?.cloudSyncEnabled ?? true;
    const normalizedParentId = parentId ?? null;

    const currentFolders = (await db.folders.toArray()).map(normalizeFolder);
    const siblings = currentFolders.filter(
      (f) => (f.parentFolderId ?? null) === normalizedParentId,
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

    // 1. ローカル側で一意IDを生成（Firestore オブジェクトを誤って渡すバグ回避）
    const folderId =
      options?.id ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : nanoid());

    // 2. LocalDBへ書き込み (Local First & Sync Queued)
    const localData = {
      ...folderData,
      id: folderId,
      folderId: folderId, // Ensure consistency
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    try {
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

      await db.addItem("folders", localData as unknown);
      return folderId;
    } catch (err) {
      console.error("[createFolder] ERROR during LocalDB add", {
        table: "folders",
        folderId,
        error: err,
      });
      throw err;
    }
  };

  const updateFolder = async (folderId: string, data: Partial<Folder>) => {
    if (!currentUser) throw new Error("認証が必要です");
    const payload = {
      ...data,
      updatedAt: new Date(),
    };

    // 1. LocalDB更新 (Local First & Sync Queued)
    const db = await getLocalDb();
    await db.updateItem("folders", folderId, payload);
  };

  const reorderFolders = async (folderIds: string[]) => {
    if (!currentUser) throw new Error("認証が必要です");

    // 1. LocalDB Updates (Sync Queued for each)
    const db = await getLocalDb();
    const updates = folderIds.map((folderId, index) => {
      return db.updateItem("folders", folderId, {
        orderIndex: index,
        updatedAt: new Date(),
      });
    });
    await Promise.all(updates);
  };

  const deleteFolder = async (folderId: string) => {
    if (!currentUser) throw new Error("認証が必要です");
    // 1. LocalDB softDelete (Sync Queued)
    const db = await getLocalDb();
    await db.softDelete("folders", folderId);

    // Recursive delete
    const currentFolders = folders || [];
    const subfolders = currentFolders.filter(
      (f) => f.parentFolderId === folderId,
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
        .filter((f) => f.parentFolderId === parentId)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .map((folder) => ({
          ...folder,
          children: buildTree(folder.folderId),
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
}
