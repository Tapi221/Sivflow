import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { Note } from "@/types";

type NoteWithLegacyDelete = Note & {
  is_deleted?: boolean;
};

type UseNotesReadOptions = {
  enabled?: boolean;
};

export const useNotesRead = (
  folderId?: string | null,
  options?: UseNotesReadOptions,
) => {
  const { currentUser } = useAuthSession();
  const userId = currentUser?.uid ?? null;
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;

  const rawNotes = useLiveQuery(async () => {
    try {
      if (!enabled) return [];
      if (!userId) return [];
      const db = await getLocalDb(userId);
      return db.notes.toArray();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[useNotesRead] Error: ${message}`);
      setError(message);
      return [];
    }
  }, [enabled, userId]);

  const notes = useMemo(() => {
    if (!rawNotes) return [];

    let filtered = rawNotes.filter((note) => {
      const nextNote = note as NoteWithLegacyDelete;
      return !(nextNote.isDeleted ?? nextNote.is_deleted ?? false);
    });

    if (folderId) {
      filtered = filtered.filter((note) => note.folderId === folderId);
    }

    return filtered.sort(
      (left, right) =>
        (Number(left.orderIndex) || 0) - (Number(right.orderIndex) || 0),
    );
  }, [rawNotes, folderId]);

  return {
    notes,
    loading: enabled && rawNotes === undefined,
    error,
  };
};
