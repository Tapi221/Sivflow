import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Note, NoteBlockContent } from "@/types";

type AffineDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

type AffineTextBlock = {
  type: "paragraph";
  text: string;
};

type AffineTextRecord = {
  type: "affine-document";
  blocks: AffineTextBlock[];
  text: string;
  updatedAt: string;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const AFFINE_CONTENT_TYPE = "affine-document";

const getTextBlocks = (text: string): AffineTextBlock[] => {
  const lines = text.split("\n");
  return lines.length > 0 ? lines.map((line) => ({ type: "paragraph", text: line })) : [{ type: "paragraph", text: "" }];
};

const getInitialText = (content: NoteBlockContent | undefined): string => {
  const record = Array.isArray(content) ? content[0] : null;
  if (!record || typeof record !== "object") return "";
  if (record.type !== AFFINE_CONTENT_TYPE) return "";
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.blocks)) return "";
  return record.blocks.map((block) => block && typeof block === "object" && "text" in block ? String((block as { text?: unknown }).text ?? "") : "").join("\n");
};

const toNoteContent = (text: string): NoteBlockContent => [{ type: AFFINE_CONTENT_TYPE, blocks: getTextBlocks(text), text, updatedAt: new Date().toISOString() } satisfies AffineTextRecord];

const AffineDocumentEditor = ({ note, onChange }: AffineDocumentEditorProps) => {
  const initialText = useMemo(() => getInitialText(note.content), [note.id, note.content]);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const latestChangeRef = useRef<Pick<Note, "content" | "contentText" | "contentVersion" | "editor"> | null>(null);
  const [saveRevision, setSaveRevision] = useState(0);

  const handleInput = useCallback(() => {
    const contentText = editorRef.current?.textContent ?? "";
    latestChangeRef.current = { content: toNoteContent(contentText), contentText, contentVersion: 2, editor: "affine" };
    setSaveRevision((revision) => revision + 1);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.textContent = initialText;
  }, [initialText, note.id]);

  useEffect(() => {
    if (!latestChangeRef.current) return;

    const timeoutId = window.setTimeout(() => {
      const changes = latestChangeRef.current;
      latestChangeRef.current = null;
      if (changes) void onChange(changes);
    }, NOTE_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [onChange, saveRevision]);

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-white px-16 py-14 text-[#202124]">
      <div className="mx-auto flex min-h-full w-full max-w-[820px] flex-col">
        <h1 className="mb-7 truncate text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]">{note.title}</h1>
        <div ref={editorRef} contentEditable role="textbox" aria-label="ノート本文" suppressContentEditableWarning onInput={handleInput} className="min-h-[480px] flex-1 whitespace-pre-wrap break-words rounded-[18px] px-1 py-2 text-[16px] leading-7 tracking-[-0.01em] text-[#202124] outline-none focus:outline-none" />
      </div>
    </div>
  );
};

export { AffineDocumentEditor };
