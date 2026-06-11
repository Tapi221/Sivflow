import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Value } from "platejs";
import { PlateEditor } from "@/components/editor/plate-editor";
import type { Note, NoteBlockContent } from "@/types";

type NoteDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};
type PlateTextNode = {
  text: string;
  [key: string]: unknown;
};
type PlateElementNode = {
  type: string;
  children: PlateNode[];
  [key: string]: unknown;
};
type PlateNode = PlateElementNode | PlateTextNode;
type PlateChangePayload = unknown[] | {
  value?: unknown;
};

const EMPTY_NOTE_TITLE_LABEL = "無題";
const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_VERSION = 2;

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isPlateTextNode = (value: unknown): value is PlateTextNode => isRecord(value) && typeof value.text === "string";
const isPlateElementNode = (value: unknown): value is PlateElementNode => isRecord(value) && typeof value.type === "string" && Array.isArray(value.children);
const createEmptyValue = (): PlateElementNode[] => [{ type: "p", children: [{ text: "" }] }];
const getVisibleNoteTitle = (note: Note): string => note.title.trim() || EMPTY_NOTE_TITLE_LABEL;
const getTextFromLegacyContent = (content: unknown): string => Array.isArray(content) ? content.map((item) => isRecord(item) && typeof item.text === "string" ? item.text : "").join("") : "";
const getNodeText = (node: unknown): string => {
  if (isPlateTextNode(node)) return node.text;
  if (!isRecord(node) || !Array.isArray(node.children)) return "";
  return node.children.map(getNodeText).join("");
};
const getPlainText = (nodes: unknown[]): string => nodes.map(getNodeText).filter(Boolean).join("\n");
const toInitialValue = (content: NoteBlockContent | undefined): PlateElementNode[] => {
  if (!Array.isArray(content) || content.length === 0) return createEmptyValue();
  if (content.every(isPlateElementNode)) return content as PlateElementNode[];

  const migrated = content.map((block) => {
    const text = isRecord(block) ? getTextFromLegacyContent(block.content) || (typeof block.text === "string" ? block.text : "") : "";
    return { type: "p", children: [{ text }] };
  }).filter((node) => getNodeText(node).trim().length > 0);

  return migrated.length > 0 ? migrated : createEmptyValue();
};
const getChangeValue = (change: PlateChangePayload): unknown[] | null => {
  if (Array.isArray(change)) return change;
  if (isRecord(change) && Array.isArray(change.value)) return change.value;
  return null;
};

const NoteDocumentEditor = ({ note, onChange }: NoteDocumentEditorProps) => {
  const initialValue = useMemo(() => toInitialValue(note.content), [note.content]);
  const latestChangeRef = useRef<Pick<Note, "content" | "contentText" | "contentVersion" | "editor"> | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const flushPendingChange = useCallback(() => {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const changes = latestChangeRef.current;
    latestChangeRef.current = null;
    if (changes) void onChange(changes);
  }, [onChange]);

  const handleChange = useCallback((change: unknown) => {
    const value = getChangeValue(change as PlateChangePayload);
    if (!value) return;

    latestChangeRef.current = {
      content: value as NoteBlockContent,
      contentText: getPlainText(value),
      contentVersion: NOTE_CONTENT_VERSION,
      editor: "plate",
    };

    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(flushPendingChange, NOTE_SAVE_DEBOUNCE_MS);
  }, [flushPendingChange]);

  useEffect(() => () => {
    flushPendingChange();
  }, [flushPendingChange]);

  return (
    <div className="h-full min-h-0 w-full bg-white text-[#18181b]">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1120px] flex-col px-4 py-10 lg:px-8">
        <h1 className="mb-7 truncate text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]" title={getVisibleNoteTitle(note)}>{getVisibleNoteTitle(note)}</h1>
        <div className="min-h-0 flex-1">
          <PlateEditor key={note.id} initialValue={initialValue as Value} onChange={handleChange} />
        </div>
      </div>
    </div>
  );
};

export { NoteDocumentEditor };
