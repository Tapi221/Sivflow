import { useLiveQuery } from "dexie-react-hooks";

import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";

import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";

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

export const useFoldersRead = () => {
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
          "[useFoldersRead] Closed DB detected. Returning empty result.",
          {
            userId,
          },
        );
        return [];
      }

      throw error;
    }
  }, [userId]);

  return {
    folders: folders || [],
    loading: folders === undefined,
    error: null as string | null,
  };
};
