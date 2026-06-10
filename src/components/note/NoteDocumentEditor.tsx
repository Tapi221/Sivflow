import { lazy, Suspense } from "react";
import type { Note } from "@/types";

type NoteDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

const EMPTY_NOTE_TITLE_LABEL = "無題";
const PlateDocumentEditor = lazy(() => import("./PlateDocumentEditor").then((module) => ({ default: module.PlateDocumentEditor })));

const getVisibleNoteTitle = (note: Note): string => note.title.trim() || EMPTY_NOTE_TITLE_LABEL;

const NoteDocumentEditor = ({ note, onChange }: NoteDocumentEditorProps) => (
  <div className="h-full min-h-0 w-full bg-white text-[#18181b]">
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1120px] flex-col px-4 py-10 lg:px-8">
      <h1 className="mb-7 truncate text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]" title={getVisibleNoteTitle(note)}>{getVisibleNoteTitle(note)}</h1>
      <div className="min-h-0 flex-1">
        <Suspense fallback={<div className="h-full w-full rounded-xl border border-[#e4e4e7] bg-white" />}>
          <PlateDocumentEditor key={note.id} note={note} onChange={onChange} />
        </Suspense>
      </div>
    </div>
  </div>
);

export { NoteDocumentEditor };
