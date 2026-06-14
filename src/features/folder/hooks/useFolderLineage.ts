import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { getLocalDb } from "@/services/localdb";
import type { Folder } from "@/types/domain/folder";



const normalizeFolderId = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const useFolderLineage = (folderId: string | null) => {
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
        const rawFolder = await db.folders.get(currentFolderId);
        if (!rawFolder) break;

        const folder = normalizeFolder(rawFolder);
        lineage.unshift(folder);
        currentFolderId = normalizeFolderId(folder.parentFolderId);
      }

      return lineage;
    },
    [currentUserId, folderId],
    [],
  );

  return folders ?? [];
};



export { useFolderLineage };
