import { useLiveQuery } from "dexie-react-hooks";

import { useAuthSession } from "@/contexts/AuthContext";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { getLocalDb } from "@/services/localDB";
import type { Folder } from "@/types/domain/folder";

const normalizeFolderId = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const useFolderLineage = (folderId: string | null) => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;

  const folders = useLiveQuery(
    async () => {
      if (!currentUserId || !folderId) {
        return [];
      }

      const db = await getLocalDb(currentUserId);
      const lineage: Folder[] = [];
      const visited = new Set<string>();

      let currentFolderId = normalizeFolderId(folderId);

      while (currentFolderId && !visited.has(currentFolderId)) {
        visited.add(currentFolderId);

        const row = await db.folders.get(currentFolderId);

        if (!row) {
          break;
        }

        const normalizedFolder = normalizeFolder(row);

        if (normalizedFolder.isDeleted) {
          break;
        }

        lineage.unshift(normalizedFolder);
        currentFolderId = normalizeFolderId(
          normalizedFolder.parentFolderId ?? null,
        );
      }

      return lineage;
    },
    [currentUserId, folderId],
    [],
  );

  return {
    folders: folders ?? [],
    loading: Boolean(currentUserId && folderId) && folders === undefined,
  };
};
