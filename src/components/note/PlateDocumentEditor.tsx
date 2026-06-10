import { FontBackgroundColorPlugin, FontColorPlugin, FontSizePlugin, TextAlignPlugin } from "@platejs/basic-styles/react";
import { LinkPlugin } from "@platejs/link/react";
import { Plate, PlateController, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BasicNodesKit } from "@/registry/components/editor/plugins/basic-nodes-kit";
import { ListKit } from "@/registry/components/editor/plugins/list-kit";
import { TableKit } from "@/registry/components/editor/plugins/table-kit";
import { AlignToolbarButton } from "@/registry/ui/align-toolbar-button";
import { Editor, EditorContainer } from "@/registry/ui/editor";
import { FixedToolbar } from "@/registry/ui/fixed-toolbar";
import { FontColorToolbarButton } from "@/registry/ui/font-color-toolbar-button";
import { FontSizeToolbarButton } from "@/registry/ui/font-size-toolbar-button";
import { LinkToolbarButton } from "@/registry/ui/link-toolbar-button";
import { BulletedListToolbarButton, NumberedListToolbarButton, TodoListToolbarButton } from "@/registry/ui/list-toolbar-button";
import { MarkToolbarButton } from "@/registry/ui/mark-toolbar-button";
import { TableToolbarButton } from "@/registry/ui/table-toolbar-button";
import { ToolbarSeparator } from "@/registry/ui/toolbar";
import { TurnIntoToolbarButton } from "@/registry/ui/turn-into-toolbar-button";
import type { Note, NoteBlockContent } from "@/types";

type PlateDocumentEditorProps = {
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

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_VERSION = 2;
const NOTE_PLATE_PLUGINS = [
  ...BasicNodesKit,
  ...ListKit,
  ...TableKit,
  LinkPlugin,
  TextAlignPlugin,
  FontColorPlugin,
  FontBackgroundColorPlugin,
  FontSizePlugin,
];

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isPlateTextNode = (value: unknown): value is PlateTextNode => isRecord(value) && typeof value.text === "string";

const isPlateElementNode = (value: unknown): value is PlateElementNode => isRecord(value) && typeof value.type === "string" && Array.isArray(value.children);

const createEmptyValue = (): PlateElementNode[] => [{ type: "p", children: [{ text: "" }] }];

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

const NotePlateToolbar = () => (
  <FixedToolbar>
    <div className="flex min-w-max items-center">
      <TurnIntoToolbarButton />
      <ToolbarSeparator />
      <MarkToolbarButton nodeType="bold" tooltip="Bold">
        <span className="text-sm font-semibold">B</span>
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="italic" tooltip="Italic">
        <span className="font-serif text-sm italic">I</span>
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="underline" tooltip="Underline">
        <span className="text-sm underline underline-offset-2">U</span>
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="strikethrough" tooltip="Strikethrough">
        <span className="text-sm line-through">S</span>
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="code" tooltip="Code">
        <span className="font-mono text-xs">{"<>"}</span>
      </MarkToolbarButton>
      <ToolbarSeparator />
      <FontSizeToolbarButton />
      <FontColorToolbarButton nodeType="color" tooltip="Text color">
        <span className="text-sm font-semibold">A</span>
      </FontColorToolbarButton>
      <FontColorToolbarButton nodeType="backgroundColor" tooltip="Background color">
        <span className="rounded bg-yellow-200 px-1 text-sm font-semibold text-neutral-900">A</span>
      </FontColorToolbarButton>
      <ToolbarSeparator />
      <AlignToolbarButton />
      <BulletedListToolbarButton />
      <NumberedListToolbarButton />
      <TodoListToolbarButton />
      <ToolbarSeparator />
      <LinkToolbarButton />
      <TableToolbarButton />
    </div>
  </FixedToolbar>
);

const MountedNotePlateToolbar = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <NotePlateToolbar /> : null;
};

const PlateDocumentEditor = ({ note, onChange }: PlateDocumentEditorProps) => {
  const initialValue = useMemo(() => toInitialValue(note.content), [note.content]);
  const editor = usePlateEditor({
    plugins: NOTE_PLATE_PLUGINS,
    value: initialValue,
  });
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

  const handleChange = useCallback((change: PlateChangePayload) => {
    const value = getChangeValue(change);
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
    <div className="h-full min-h-0 w-full overflow-y-auto bg-white text-[#18181b]">
      <PlateController>
        <Plate editor={editor} onChange={handleChange} primary>
          <div className="px-4 py-10 lg:px-8">
            <div className="mx-auto min-h-[650px] w-full max-w-[1120px] overflow-hidden rounded-xl border border-[#e4e4e7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <MountedNotePlateToolbar />
              <EditorContainer className="h-[650px]">
                <Editor placeholder="本文を入力" spellCheck />
              </EditorContainer>
            </div>
          </div>
        </Plate>
      </PlateController>
    </div>
  );
};

export { PlateDocumentEditor };
