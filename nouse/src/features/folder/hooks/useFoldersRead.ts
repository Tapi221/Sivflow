import { useLiveQuery } from "dexie-react-hooks";
import { useEffectiveLocalUserId } from "@/contexts/auth/useEffectiveLocalUserId";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { getLocalDb } from "@/services/localdb";
import type { Folder } from "@/types";



const isDatabaseClosedError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { name?: unknown; message?: unknown; };

  return (
    candidate.name === "DatabaseClosedError" ||
    (typeof candidate.message === "string" &&
      candidate.message.includes("DatabaseClosedError"))
  );
};
const normalizeVisibleFolders = (rawFolders: unknown[]): Folder[] => rawFolders.map(normalizeFolder).filter((folder) => !folder.isDeleted);
const useFoldersRead = () => {
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
      const message = error instanceof Error ? error.message : String(error);
      const logMethod = isDatabaseClosedError(error) ? console.warn : console.error;

      logMethod(
        "[useFoldersRead] IndexedDB read failed. Returning empty result.",
        {
          error: message,
          userId,
        },
      );
      return [];
    }
  }, [userId]);

  return {
    folders: folders ?? [],
    loading: folders === undefined,
    error: null as string | null,
  };
};



export { useFoldersRead, normalizeVisibleFolders };
