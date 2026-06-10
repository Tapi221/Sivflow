import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import { Bold, ChevronDown, Code2, Italic, Redo2, Strikethrough, Underline, Undo2 } from "lucide-react";
import { Plate, PlateContainer, PlateContent, PlateElement, PlateLeaf, ParagraphPlugin, usePlateEditor, type PlateElementProps, type PlateLeafProps } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type ChangeEvent, type MouseEvent, type ReactNode } from "react";
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

type PlateEditor = ReturnType<typeof usePlateEditor>;

type PlateBlockType = "p" | "h1" | "h2" | "h3" | "blockquote";

type PlateMarkType = "bold" | "italic" | "underline" | "strikethrough" | "code";

type PlateCommandFallback = {
  command: string;
  value?: string;
};

type PlateToolbarButtonProps = {
  label: string;
  children: ReactNode;
  onPress: () => void;
  className?: string;
};

type PlateToolbarSelectProps = {
  editor: PlateEditor;
};

type AppRegionStyle = CSSProperties & {
  WebkitAppRegion?: "no-drag";
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_VERSION = 2;
const EMPTY_TEXT_NODE: PlateTextNode = { text: "" };
const SUPPORTED_PLATE_BLOCK_TYPES = new Set(["p", "h1", "h2", "h3", "blockquote"]);
const NOTE_PLATE_PLUGINS = [ParagraphPlugin, BasicBlocksPlugin, BasicMarksPlugin];
const PLATE_BLOCK_OPTIONS: readonly { label: string; value: PlateBlockType }[] = [
  { label: "Text", value: "p" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
  { label: "Quote", value: "blockquote" },
];
const PLATE_MARK_OPTIONS: readonly { fallback: PlateCommandFallback; icon: ReactNode; label: string; mark: PlateMarkType }[] = [
  { fallback: { command: "bold" }, icon: <Bold className="size-4" />, label: "Bold", mark: "bold" },
  { fallback: { command: "italic" }, icon: <Italic className="size-4" />, label: "Italic", mark: "italic" },
  { fallback: { command: "underline" }, icon: <Underline className="size-4" />, label: "Underline", mark: "underline" },
  { fallback: { command: "strikeThrough" }, icon: <Strikethrough className="size-4" />, label: "Strikethrough", mark: "strikethrough" },
  { fallback: { command: "formatBlock", value: "pre" }, icon: <Code2 className="size-4" />, label: "Code", mark: "code" },
];
const PLATE_TOOLBAR_BUTTON_CLASS_NAME = "inline-flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-transparent px-1.5 text-sm font-medium text-[#18181b] outline-none transition-colors hover:bg-[#f4f4f5] hover:text-[#52525b] focus-visible:ring-2 focus-visible:ring-[#d4d4d8] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";
const PLATE_TOOLBAR_SEPARATOR_CLASS_NAME = "mx-1.5 h-7 w-px shrink-0 bg-[#e4e4e7]";
const PLATE_TOOLBAR_NO_DRAG_STYLE: AppRegionStyle = { WebkitAppRegion: "no-drag" };

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

const getPlateTransform = (editor: PlateEditor, transformName: string): ((...args: unknown[]) => unknown) | null => {
  const transformTarget = editor as { tf?: Record<string, unknown> };
  const transform = transformTarget.tf?.[transformName];

  return typeof transform === "function" ? transform as (...args: unknown[]) => unknown : null;
};

const focusPlateEditor = (editor: PlateEditor) => {
  getPlateTransform(editor, "focus")?.();
};

const runDocumentCommandFallback = (fallback: PlateCommandFallback) => {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return;

  document.execCommand(fallback.command, false, fallback.value);
};

const runPlateTransform = (editor: PlateEditor, transformName: string, args: unknown[], fallback: PlateCommandFallback) => {
  focusPlateEditor(editor);

  const transform = getPlateTransform(editor, transformName);

  if (transform) {
    transform(...args);
    focusPlateEditor(editor);
    return;
  }

  runDocumentCommandFallback(fallback);
  focusPlateEditor(editor);
};

const togglePlateMark = (editor: PlateEditor, mark: PlateMarkType, fallback: PlateCommandFallback) => {
  runPlateTransform(editor, "toggleMark", [mark], fallback);
};

const setPlateBlockType = (editor: PlateEditor, blockType: PlateBlockType) => {
  runPlateTransform(editor, "setNodes", [{ type: blockType }, { match: (node: unknown) => isRecord(node) && Array.isArray(node.children) }], { command: "formatBlock", value: blockType === "p" ? "p" : blockType });
};

const ParagraphElement = (props: PlateElementProps) => <PlateElement {...props} as="p" className="my-2 min-h-[1.75rem] px-0 py-0 text-[17px] leading-8 text-[#18181b]" />;

const H1Element = (props: PlateElementProps) => <PlateElement {...props} as="h1" className="mb-4 mt-8 text-[34px] font-semibold leading-tight tracking-[-0.04em] text-[#09090b]" />;

const H2Element = (props: PlateElementProps) => <PlateElement {...props} as="h2" className="mb-3 mt-7 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#09090b]" />;

const H3Element = (props: PlateElementProps) => <PlateElement {...props} as="h3" className="mb-2 mt-6 text-[22px] font-semibold leading-snug tracking-[-0.03em] text-[#09090b]" />;

const BlockquoteElement = (props: PlateElementProps) => <PlateElement {...props} as="blockquote" className="my-4 border-l-4 border-[#d4d4d8] pl-4 text-[#52525b]" />;

const StrongLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="strong" />;

const ItalicLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="em" />;

const UnderlineLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="u" />;

const StrikethroughLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="s" />;

const CodeLeaf = (props: PlateLeafProps) => <PlateLeaf {...props} as="code" className="rounded-[5px] bg-[#f4f4f5] px-1 py-0.5 font-mono text-[0.92em] text-[#18181b]" />;

const PlateToolbarButton = ({ label, children, onPress, className }: PlateToolbarButtonProps) => {
  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onPress();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return;

    event.preventDefault();
    onPress();
  };

  return (
    <button type="button" aria-label={label} title={label} className={`${PLATE_TOOLBAR_BUTTON_CLASS_NAME}${className ? ` ${className}` : ""}`} style={PLATE_TOOLBAR_NO_DRAG_STYLE} onMouseDown={handleMouseDown} onClick={handleClick}>
      {children}
    </button>
  );
};

const PlateToolbarSeparator = () => <div className={PLATE_TOOLBAR_SEPARATOR_CLASS_NAME} />;

const PlateToolbarBlockSelect = ({ editor }: PlateToolbarSelectProps) => {
  const handleBlockTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPlateBlockType(editor, event.target.value as PlateBlockType);
  };

  return (
    <div className="relative flex h-8 shrink-0 items-center rounded-md hover:bg-[#f4f4f5]" style={PLATE_TOOLBAR_NO_DRAG_STYLE}>
      <select className="h-8 w-[132px] appearance-none rounded-md border border-transparent bg-transparent px-3 pr-7 text-sm font-medium text-[#18181b] outline-none" defaultValue="p" aria-label="Turn into" onChange={handleBlockTypeChange}>
        {PLATE_BLOCK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-[#71717a]" />
    </div>
  );
};

const PlateEditorToolbar = ({ editor }: { editor: PlateEditor }) => (
  <div className="scrollbar-hide sticky left-0 top-0 z-50 flex min-h-10 w-full shrink-0 items-center overflow-x-auto rounded-t-lg border-b border-[#e4e4e7] bg-white/95 p-1 backdrop-blur-sm" style={PLATE_TOOLBAR_NO_DRAG_STYLE}>
    <div className="flex min-w-max items-center">
      <div className="flex items-center">
        <PlateToolbarButton label="Undo" onPress={() => runPlateTransform(editor, "undo", [], { command: "undo" })}><Undo2 className="size-4" /></PlateToolbarButton>
        <PlateToolbarButton label="Redo" onPress={() => runPlateTransform(editor, "redo", [], { command: "redo" })}><Redo2 className="size-4" /></PlateToolbarButton>
      </div>

      <PlateToolbarSeparator />

      <div className="flex items-center">
        <PlateToolbarBlockSelect editor={editor} />
      </div>

      <PlateToolbarSeparator />

      <div className="flex items-center">
        {PLATE_MARK_OPTIONS.map((option) => <PlateToolbarButton key={option.mark} label={option.label} onPress={() => togglePlateMark(editor, option.mark, option.fallback)}>{option.icon}</PlateToolbarButton>)}
      </div>
    </div>
  </div>
);

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
    <div className="h-full min-h-0 w-full overflow-y-auto bg-white text-[#18181b]">
      <Plate editor={editor} onChange={handleChange}>
        <div className="px-4 py-10 lg:px-8">
          <div className="mx-auto min-h-[650px] w-full max-w-[1120px] overflow-hidden rounded-xl border border-[#e4e4e7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <PlateEditorToolbar editor={editor} />
            <div className="h-[650px] overflow-y-auto">
              <PlateContainer className="relative h-full w-full cursor-text select-text overflow-visible caret-[#18181b] selection:bg-[#bfdbfe]">
                <PlateContent className="h-full w-full overflow-x-hidden whitespace-pre-wrap break-words rounded-none border-0 bg-transparent px-16 pb-72 pt-4 text-base leading-8 text-[#18181b] outline-none focus:outline-none sm:px-[max(64px,calc(50%-350px))] [&_strong]:font-bold" disableDefaultStyles placeholder="本文を入力" spellCheck />
              </PlateContainer>
            </div>
          </div>
        </div>
      </Plate>
    </div>
  );
};

export { PlateDocumentEditor };
