import { useAuth } from "@/contexts/AuthContext";
import { normalizeCard } from "@/hooks/utils";
import { getLocalDb } from "@/services/localDB";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";

/**
 * 指定されたフォルダとその全子孫フォルダに含まれる全てのカードを取得するフック
 */
export function useAllDescendantCards(rootFolderId?: string) {
  const { currentUser } = useAuth();

  // 1. 全フォルダを取得
  const allFolders = useLiveQuery(async () => {
    if (!currentUser) return [];
    const db = await getLocalDb();
    return await db.folders.where("userId").equals(currentUser.uid).toArray();
  }, [currentUser]);

  // 2. 全カードを取得
  const rawCards = useLiveQuery(async () => {
    if (!currentUser) return [];
    const db = await getLocalDb();
    return await db.getAllCards();
  }, [currentUser]);

  // 3. 再帰的に対象フォルダIDをリストアップし、カードをフィルタリング
  const descendantCards = useMemo(() => {
    // データロード中は空配列を返すが、loadingフラグで制御させる
    if (!allFolders || !rawCards) return [];
    if (!rootFolderId) return [];

    // 再帰的に子孫フォルダIDを取得
    const getDescendantIds = (parentId: string): string[] => {
      const children = allFolders.filter((f) => {
        const folder = f as {
          parentFolderId?: string;
          parent_folder_id?: string;
          isDeleted?: boolean;
          is_deleted?: boolean;
        };
        const pid = folder.parentFolderId ?? folder.parent_folder_id;
        const isDel = folder.isDeleted ?? folder.is_deleted;
        return pid === parentId && !isDel;
      });

      let ids = [parentId]; // 自分自身も含める
      children.forEach((child) => {
        const childId = child.id ?? child.folderId;
        if (childId) {
          ids = [...ids, ...getDescendantIds(childId)];
        }
      });
      return ids;
    };

    const targetFolderIds = getDescendantIds(rootFolderId);

    // フィルタリングと正規化
    const filtered = rawCards.map(normalizeCard).filter((c) => {
      const isDel = c.isDeleted ?? (c as { is_deleted?: boolean }).is_deleted;
      // c.folderId が targetFolderIds に含まれているか
      return !isDel && targetFolderIds.includes(c.folderId);
    });

    // デバッグログ: 必要に応じて有効化
    console.log(
      `[Diagnostic] useAllDescendantCards: Root=${rootFolderId}, Folders=${allFolders.length}, TargetIDs=${targetFolderIds.length}, HitCards=${filtered.length}`,
    );

    return filtered;
  }, [rootFolderId, allFolders, rawCards]);

  // useLiveQueryはロード中 undefined を返す
  const loading = allFolders === undefined || rawCards === undefined;

  return {
    cards: descendantCards,
    loading,
  };
}




