import { PlateDocumentEditor } from "./PlateDocumentEditor";
import type { Note } from "@/types";

type NoteDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

const NoteDocumentEditor = ({ note, onChange }: NoteDocumentEditorProps) => <PlateDocumentEditor key={note.id} note={note} onChange={onChange} />;

export { NoteDocumentEditor };
