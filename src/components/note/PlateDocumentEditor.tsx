import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import { Plate, PlateContainer, PlateContent, PlateElement, PlateLeaf, ParagraphPlugin, usePlateEditor, type PlateElementProps, type PlateLeafProps } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Note, NoteBlockContent } from "@/types";

type PlateDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

type PlateTextNode = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

type PlateNode = PlateTextNode | PlateElementNode;

type PlateElementNode = {
  type: string;
  children: PlateNode[];
};

type PlateChangePayload = unknown[] | {
  value?: unknown;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_VERSION = 2;
const EMPTY_TEXT_NODE: PlateTextNode = { text: "" };
const SUPPORTED_PLATE_BLOCK_TYPES = new Set(["p", "h1", "h2", "h3", "blockquote"]);
const NOTE_PLATE_PLUGINS = [ParagraphPlugin, BasicBlocksPlugin, BasicMarksPlugin];

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const createEmptyPlateValue = (): PlateElementNode[] => [{ type: "p", children: [{ ...EMPTY_TEXT_NODE }] }];

const isPlateTextNode = (value: unknown): value is PlateTextNode => isRecord(value) && typeof value.text === "string";

const isPlateElementNode = (value: unknown): value is PlateElementNode => isRecord(value) && typeof value.type === "string" && Array.isArray(value.children) && value.children.every(isPlateNode);

const isPlateNode = (value: unknown): value is PlateNode => isPlateTextNode(value) || isPlateElementNode(value);

const getTextFromInlineContent = (content: unknown): string => {
  if (!Array.isArray(content)) return "";

  return content.map((item) => isRecord(item) && typeof item.text === "string" ? item.text : "").join("");
};

const getLegacyHeadingBlockType = (block: Record<string, unknown>): string => {
  const props = isRecord(block.props) ? block.props : null;
  const level = typeof props?.level === "number" ? props.level : null;

  if (level === 1) return "h1";
  if (level === 2) return "h2";
  if (level === 3) return "h3";

  return "h2";
};

const getLegacyPlateBlockType = (block: unknown): string => {
  if (!isRecord(block) || typeof block.type !== "string") return "p";

  if (block.type === "heading") return getLegacyHeadingBlockType(block);
  if (block.type === "quote" || block.type === "blockquote") return "blockquote";

  return "p";
};

const toLegacyText = (block: unknown): string => {
  if (!isRecord(block)) return "";

  const inlineText = getTextFromInlineContent(block.content);
  if (inlineText) return inlineText;

  if (typeof block.text === "string") return block.text;

  return "";
};

const clonePlateNode = (node: PlateNode): PlateNode => {
  if (isPlateTextNode(node)) return { ...node };

  return normalizePlateElementNode(node);
};

const getNodeText = (node: unknown): string => {
  if (isPlateTextNode(node)) return node.text;
  if (!isRecord(node) || !Array.isArray(node.children)) return "";

  return node.children.map(getNodeText).join("");
};

const normalizePlateElementNode = (node: PlateElementNode): PlateElementNode => {
  if (SUPPORTED_PLATE_BLOCK_TYPES.has(node.type)) return { type: node.type, children: node.children.map(clonePlateNode) };

  const text = getNodeText(node);

  if (node.type === "code_block") return { type: "p", children: [{ text, code: true }] };
  if (node.type === "bulleted-list") return { type: "p", children: [{ text: text ? `• ${text}` : "• " }] };
  if (node.type === "numbered-list") return { type: "p", children: [{ text: text ? `1. ${text}` : "1. " }] };

  return { type: "p", children: [{ text }] };
};

const toPlateNode = (type: string, text: string): PlateElementNode => ({ type, children: [{ text }] });

const toInitialPlateValue = (content: NoteBlockContent | undefined): PlateElementNode[] => {
  if (!Array.isArray(content) || content.length === 0) return createEmptyPlateValue();

  if (content.every(isPlateElementNode)) return content.map(normalizePlateElementNode);

  const migratedNodes = content.map((block) => toPlateNode(getLegacyPlateBlockType(block), toLegacyText(block))).filter((node) => node.children.some((child) => getNodeText(child).trim().length > 0));

  return migratedNodes.length > 0 ? migratedNodes : createEmptyPlateValue();
};

const getPlainText = (nodes: unknown[]): string => nodes.map(getNodeText).filter(Boolean).join("\n");

const getChangeValue = (change: PlateChangePayload): unknown[] | null => {
  if (Array.isArray(change)) return change;
  if (isRecord(change) && Array.isArray(change.value)) return change.value;

  return null;
};

const ParagraphElement = (props: PlateElementProps) => <PlateElement {...props} as="p" className="my-2 min-h-[1.75rem] px-0 py-0 text-[17px] leading-8 text-[#202124]" />;

const H1Element = (props: PlateElementProps) => <PlateElement {...props} as="h1" className="mb-4 mt-8 text-[34px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]" />;

const H2Element = (props: PlateElementProps) => <PlateElement {...props} as="h2" className="mb-3 mt-7 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#202124]" />;

const H3Element = (props: PlateElementProps) => <PlateElement {...props} as="h3" className="mb-2 mt-6 text-[22px] font-semibold leading-snug tracking-[-0.03em] text-[#202124]" />;

const BlockquoteElement = (props: PlateElementProps) => <PlateElement {...props} as="blockquote" className="my-4 border-l-4 border-[#d1d5db] pl-4 text-[#4b5563]" />;

const StrongLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="strong" />;

const ItalicLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="em" />;

const UnderlineLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="u" />;

const StrikethroughLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="s" />;

const CodeLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="code" className="rounded-[5px] bg-[#f1f1f4] px-1 py-0.5 font-mono text-[0.92em] text-[#111827]" />;

const NOTE_PLATE_COMPONENTS = {
  blockquote: BlockquoteElement,
  bold: StrongLeaf,
  code: CodeLeaf,
  h1: H1Element,
  h2: H2Element,
  h3: H3Element,
  italic: ItalicLeaf,
  p: ParagraphElement,
  strikethrough: StrikethroughLeaf,
  underline: UnderlineLeaf,
};

const PlateDocumentEditor = ({ note, onChange }: PlateDocumentEditorProps) => {
  const initialValue = useMemo(() => toInitialPlateValue(note.content), [note.content]);
  const editor = usePlateEditor({ components: NOTE_PLATE_COMPONENTS, plugins: NOTE_PLATE_PLUGINS, value: initialValue });
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

    latestChangeRef.current = { content: value as NoteBlockContent, contentText: getPlainText(value), contentVersion: NOTE_CONTENT_VERSION, editor: "plate" };

    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(flushPendingChange, NOTE_SAVE_DEBOUNCE_MS);
  }, [flushPendingChange]);

  useEffect(() => () => {
    flushPendingChange();
  }, [flushPendingChange]);

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-white px-16 py-14 text-[#202124]">
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">Plate</p>
          <h1 className="truncate text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]">{note.title}</h1>
        </div>
        <Plate editor={editor} onChange={handleChange}>
          <PlateContainer className="relative w-full cursor-text select-text overflow-visible caret-[#202124] selection:bg-[#dbeafe]">
            <PlateContent className="min-h-[420px] w-full overflow-x-hidden whitespace-pre-wrap break-words rounded-none border-0 bg-transparent px-0 py-5 text-[17px] leading-8 text-[#202124] outline-none focus:outline-none [&_strong]:font-bold" disableDefaultStyles placeholder="本文を入力" spellCheck />
          </PlateContainer>
        </Plate>
      </div>
    </div>
  );
};

export { PlateDocumentEditor };
