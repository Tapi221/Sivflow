import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useEffectiveLocalUserId } from "@/contexts/auth/useEffectiveLocalUserId";
import { getLocalDb } from "@/services/localdb";
import type { Note, NoteBlockContent } from "@/types";



type UseNotesOptions = {
  enabled?: boolean;
};
type CreateNoteOptions = {
  id?: string;
  orderIndex?: number;
};
type DateLike = Date | {
  toMillis?: () => number;
  toDate?: () => Date;
} | null | undefined;



const DEFAULT_NOTE_CONTENT: NoteBlockContent = [];



const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
const isDeletedNote = (note: Note & { isDeleted?: boolean; is_deleted?: boolean; }): boolean => Boolean(note.isDeleted ?? note.is_deleted);
const getNoteOrderIndex = (note: Note & { order_index?: number; }): number => note.orderIndex ?? note.order_index ?? 0;
const getDateTime = (value: DateLike): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  return 0;
};
const sortNotes = (notes: Note[]): Note[] => [...notes].sort((left, right) => {
  const orderDiff = getNoteOrderIndex(left) - getNoteOrderIndex(right);
  if (orderDiff !== 0) return orderDiff;
  return getDateTime(right.updatedAt) - getDateTime(left.updatedAt);
});
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};
const useNotes = (folderId?: string | null, options?: UseNotesOptions) => {
  const { currentUser } = useAuthSession();
  const userId = useEffectiveLocalUserId();
  const enabled = options?.enabled ?? true;

  const notes = useLiveQuery(async () => {
    try {
      if (!enabled || !userId) return [];

      const db = await getLocalDb(userId);
      const allNotes = await db.notes.where("userId").equals(userId).toArray();
      const activeNotes = allNotes.filter((note) => !isDeletedNote(note));
      const folderNotes = folderId === undefined ? activeNotes : activeNotes.filter((note) => note.folderId === folderId);
      return sortNotes(folderNotes);
    } catch (error) {
      console.error(`[useNotes] Error: ${getErrorMessage(error)}`, error);
      return [];
    }
  }, [enabled, folderId, userId]);

  const createNote = useCallback(async (title: string, targetFolderId: string, opts?: CreateNoteOptions): Promise<Note> => {
    if (!currentUser) throw new Error("認証が必要です");

    const now = new Date();
    const note: Note = {
      id: opts?.id ?? createId(),
      userId: currentUser.uid,
      deviceId: "web",
      folderId: targetFolderId,
      orderIndex: opts?.orderIndex ?? 0,
      title,
      content: DEFAULT_NOTE_CONTENT,
      contentText: "",
      contentVersion: 2,
      editor: "plate",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getLocalDb(currentUser.uid);
    await db.upsert("notes", note);
    return note;
  }, [currentUser]);

  const updateNote = useCallback(async (noteId: string, changes: Partial<Pick<Note, "title" | "content" | "contentText" | "contentVersion" | "editor" | "orderIndex">>): Promise<void> => {
    if (!currentUser) throw new Error("認証が必要です");

    const db = await getLocalDb(currentUser.uid);
    await db.notes.update(noteId, { ...changes, updatedAt: new Date() });
  }, [currentUser]);

  const deleteNote = useCallback(async (noteId: string): Promise<void> => {
    if (!currentUser) throw new Error("認証が必要です");

    const db = await getLocalDb(currentUser.uid);
    await db.notes.update(noteId, { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() });
  }, [currentUser]);

  return {
    notes: notes ?? [],
    loading: enabled && notes === undefined,
    createNote,
    updateNote,
    deleteNote,
  };
};



export { useNotes };
