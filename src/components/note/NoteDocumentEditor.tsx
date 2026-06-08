import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Note, NoteBlockContent } from "@/types";

type NoteDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

type NoteTextBlock = {
  type: "paragraph";
  text: string;
};

type NoteTextRecord = {
  type: "sivflow-text-document";
  blocks: NoteTextBlock[];
  text: string;
  updatedAt: string;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_TYPE = "sivflow-text-document";
const NOTE_EDITOR_HINT = "本文をクリックして入力。変更は自動保存されます。";
const NOTE_EDITOR_PLACEHOLDER = "ここにノートを書き始める";
const NOTE_EDITOR_SAVED_LABEL = "自動保存";
const NOTE_EDITOR_KIND_LABEL = "テキストノート";
const NOTE_EDITOR_ROOT_CLASS_NAME = "h-full min-h-0 w-full overflow-y-auto bg-white px-16 py-14 text-[#202124]";
const NOTE_EDITOR_SHELL_CLASS_NAME = "mx-auto flex min-h-full w-full max-w-[820px] flex-col";
const NOTE_EDITOR_TITLE_CLASS_NAME = "mb-4 truncate text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]";
const NOTE_EDITOR_HELPER_BAR_CLASS_NAME = "mb-7 flex flex-wrap items-center gap-2 text-[12px] font-medium leading-none tracking-[-0.01em] text-[#8a8a8a]";
const NOTE_EDITOR_BADGE_CLASS_NAME = "rounded-full border border-[#e3e1dc] bg-[#f7f6f3] px-2.5 py-1 text-[#6f6b66]";
const NOTE_EDITOR_STATUS_CLASS_NAME = "rounded-full bg-[#f0f7ef] px-2.5 py-1 text-[#5f7f58]";
const NOTE_EDITOR_BODY_CLASS_NAME = "min-h-[480px] flex-1 whitespace-pre-wrap break-words rounded-[18px] border border-transparent px-1 py-2 text-[16px] leading-7 tracking-[-0.01em] text-[#202124] outline-none transition-colors empty:before:pointer-events-none empty:before:text-[#a8a8a8] empty:before:content-[attr(data-placeholder)] hover:border-[#f0efeb] focus:border-[#ebe9e4] focus:outline-none";

const getTextBlocks = (text: string): NoteTextBlock[] => {
  const lines = text.split("\n");
  return lines.length > 0 ? lines.map((line) => ({ type: "paragraph", text: line })) : [{ type: "paragraph", text: "" }];
};

const getInitialText = (content: NoteBlockContent | undefined): string => {
  const record = Array.isArray(content) ? content[0] : null;
  if (!record || typeof record !== "object") return "";
  if (record.type !== NOTE_CONTENT_TYPE) return "";
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.blocks)) return "";
  return record.blocks.map((block) => block && typeof block === "object" && "text" in block ? String((block as { text?: unknown }).text ?? "") : "").join("\n");
};

const toNoteContent = (text: string): NoteBlockContent => [{ type: NOTE_CONTENT_TYPE, blocks: getTextBlocks(text), text, updatedAt: new Date().toISOString() } satisfies NoteTextRecord];

const NoteDocumentEditor = ({ note, onChange }: NoteDocumentEditorProps) => {
  const initialText = useMemo(() => getInitialText(note.content), [note.id]);
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
    <div className={NOTE_EDITOR_ROOT_CLASS_NAME}>
      <div className={NOTE_EDITOR_SHELL_CLASS_NAME}>
        <h1 className={NOTE_EDITOR_TITLE_CLASS_NAME}>{note.title}</h1>
        <div className={NOTE_EDITOR_HELPER_BAR_CLASS_NAME}>
          <span className={NOTE_EDITOR_BADGE_CLASS_NAME}>{NOTE_EDITOR_KIND_LABEL}</span>
          <span className={NOTE_EDITOR_STATUS_CLASS_NAME}>{NOTE_EDITOR_SAVED_LABEL}</span>
          <span>{NOTE_EDITOR_HINT}</span>
        </div>
        <div ref={editorRef} contentEditable role="textbox" aria-label="ノート本文" data-placeholder={NOTE_EDITOR_PLACEHOLDER} suppressContentEditableWarning onInput={handleInput} onBlur={handleInput} className={NOTE_EDITOR_BODY_CLASS_NAME} />
      </div>
    </div>
  );
};

export { NoteDocumentEditor };
