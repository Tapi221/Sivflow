import { useCallback, useState } from "react";
import { NoteDocumentEditor } from "@/components/note/NoteDocumentEditor";
import type { Note } from "@/types";

const createSandboxNote = (): Note => ({
  id: "sandbox-note",
  userId: "sandbox",
  deviceId: "web",
  folderId: "sandbox",
  orderIndex: 0,
  title: "Note Sandbox",
  content: [],
  contentText: "",
  contentVersion: 2,
  editor: "affine",
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const AffineSandboxPage = () => {
  const [note, setNote] = useState<Note>(createSandboxNote);

  const handleChange = useCallback((changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => {
    setNote((currentNote) => ({ ...currentNote, ...changes, updatedAt: new Date() }));
  }, []);

  return <NoteDocumentEditor note={note} onChange={handleChange} />;
};

export { AffineSandboxPage };
