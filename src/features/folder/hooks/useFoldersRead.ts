import { useLiveQuery } from "dexie-react-hooks";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { useEffectiveLocalUserId } from "@/hooks/auth/useEffectiveLocalUserId";
import { getLocalDb } from "@/services/localDB";
import type { Folder } from "@/types";

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
  const userId = useEffectiveLocalUserId();

  const folders = useLiveQuery(async () => {
    if (!userId) {
      return undefined;
    }

    try {
      const db = await getLocalDb(userId);
      const rawFolders = await db.folders.toArray();
      return normalizeVisibleFolders(rawFolders);
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

export const normalizeVisibleFolders = (rawFolders: unknown[]): Folder[] =>
  rawFolders.map(normalizeFolder).filter((folder) => !folder.isDeleted);
