import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import { Plate, PlateContainer, PlateContent, PlateElement, PlateLeaf, ParagraphPlugin, usePlateEditor, type PlateElementProps, type PlateLeafProps } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef, type ChangeEvent, type MouseEvent } from "react";
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
  children: string;
  onPress: () => void;
  className?: string;
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
const PLATE_MARK_OPTIONS: readonly { fallback: PlateCommandFallback; label: string; mark: PlateMarkType; text: string }[] = [
  { fallback: { command: "bold" }, label: "太字", mark: "bold", text: "B" },
  { fallback: { command: "italic" }, label: "斜体", mark: "italic", text: "I" },
  { fallback: { command: "underline" }, label: "下線", mark: "underline", text: "U" },
  { fallback: { command: "strikeThrough" }, label: "取り消し線", mark: "strikethrough", text: "S" },
  { fallback: { command: "formatBlock", value: "pre" }, label: "コード", mark: "code", text: "</>" },
];
const PLATE_TOOLBAR_BUTTON_CLASS_NAME = "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md px-2 text-[15px] font-medium leading-none text-[#18181b] transition-colors hover:bg-[#f4f4f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4d4d8]";
const PLATE_TOOLBAR_SEPARATOR_CLASS_NAME = "mx-1 h-7 w-px shrink-0 bg-[#e4e4e7]";

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
  document.execCommand(fallback.command, false, fallback.value);
};

const runPlateTransform = (editor: PlateEditor, transformName: string, args: unknown[], fallback: PlateCommandFallback) => {
  const transform = getPlateTransform(editor, transformName);

  if (transform) {
    transform(...args);
    focusPlateEditor(editor);
    return;
  }

  runDocumentCommandFallback(fallback);
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

  return (
    <button type="button" aria-label={label} title={label} className={`${PLATE_TOOLBAR_BUTTON_CLASS_NAME}${className ? ` ${className}` : ""}`} onMouseDown={handleMouseDown}>
      {children}
    </button>
  );
};

const PlateEditorToolbar = ({ editor }: { editor: PlateEditor }) => {
  const handleBlockTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPlateBlockType(editor, event.target.value as PlateBlockType);
  };

  return (
    <div className="sticky top-0 z-30 flex min-h-11 w-full shrink-0 items-center border-b border-[#e4e4e7] bg-white/95 px-3 backdrop-blur-xl">
      <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1.5">
        <PlateToolbarButton label="元に戻す" onPress={() => runPlateTransform(editor, "undo", [], { command: "undo" })}>↶</PlateToolbarButton>
        <PlateToolbarButton label="やり直す" onPress={() => runPlateTransform(editor, "redo", [], { command: "redo" })}>↷</PlateToolbarButton>

        <div className={PLATE_TOOLBAR_SEPARATOR_CLASS_NAME} />

        <PlateToolbarButton label="AI編集" onPress={() => focusPlateEditor(editor)}>⌘</PlateToolbarButton>
        <PlateToolbarButton label="ダウンロード" onPress={() => focusPlateEditor(editor)}>↓</PlateToolbarButton>

        <div className={PLATE_TOOLBAR_SEPARATOR_CLASS_NAME} />

        <PlateToolbarButton label="追加" onPress={() => focusPlateEditor(editor)}>＋</PlateToolbarButton>
        <select className="h-9 w-[132px] shrink-0 rounded-md border border-transparent bg-white px-3 text-[15px] font-medium text-[#18181b] outline-none transition-colors hover:bg-[#f4f4f5] focus:border-[#d4d4d8]" defaultValue="p" aria-label="ブロックタイプ" onChange={handleBlockTypeChange}>
          {PLATE_BLOCK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <div className={PLATE_TOOLBAR_SEPARATOR_CLASS_NAME} />

        <PlateToolbarButton label="文字サイズを下げる" onPress={() => focusPlateEditor(editor)}>−</PlateToolbarButton>
        <div className="flex h-9 min-w-11 shrink-0 items-center justify-center rounded-md px-2 text-[15px] font-medium text-[#18181b]">16</div>
        <PlateToolbarButton label="文字サイズを上げる" onPress={() => focusPlateEditor(editor)}>＋</PlateToolbarButton>

        <div className={PLATE_TOOLBAR_SEPARATOR_CLASS_NAME} />

        {PLATE_MARK_OPTIONS.map((option) => (
          <PlateToolbarButton key={option.mark} label={option.label} className={option.mark === "italic" ? "italic" : option.mark === "underline" ? "underline" : option.mark === "strikethrough" ? "line-through" : ""} onPress={() => togglePlateMark(editor, option.mark, option.fallback)}>
            {option.text}
          </PlateToolbarButton>
        ))}

        <PlateToolbarButton label="文字色" onPress={() => focusPlateEditor(editor)}>A</PlateToolbarButton>
        <PlateToolbarButton label="ハイライト" onPress={() => focusPlateEditor(editor)}>◒</PlateToolbarButton>

        <div className={PLATE_TOOLBAR_SEPARATOR_CLASS_NAME} />

        <PlateToolbarButton label="左揃え" onPress={() => focusPlateEditor(editor)}>☰</PlateToolbarButton>
        <PlateToolbarButton label="リスト" onPress={() => focusPlateEditor(editor)}>≡</PlateToolbarButton>
        <PlateToolbarButton label="チェックリスト" onPress={() => focusPlateEditor(editor)}>☑</PlateToolbarButton>
        <PlateToolbarButton label="インデント" onPress={() => focusPlateEditor(editor)}>☷</PlateToolbarButton>

        <div className={PLATE_TOOLBAR_SEPARATOR_CLASS_NAME} />

        <PlateToolbarButton label="リンク" onPress={() => focusPlateEditor(editor)}>↗</PlateToolbarButton>
        <PlateToolbarButton label="表" onPress={() => focusPlateEditor(editor)}>▦</PlateToolbarButton>
        <PlateToolbarButton label="絵文字" onPress={() => focusPlateEditor(editor)}>☺</PlateToolbarButton>

        <div className={PLATE_TOOLBAR_SEPARATOR_CLASS_NAME} />

        <PlateToolbarButton label="引用" onPress={() => setPlateBlockType(editor, "blockquote")}>❝</PlateToolbarButton>
        <PlateToolbarButton label="見出し1" onPress={() => setPlateBlockType(editor, "h1")}>H1</PlateToolbarButton>
        <PlateToolbarButton label="見出し2" onPress={() => setPlateBlockType(editor, "h2")}>H2</PlateToolbarButton>
        <PlateToolbarButton label="見出し3" onPress={() => setPlateBlockType(editor, "h3")}>H3</PlateToolbarButton>
      </div>
    </div>
  );
};

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
        <div className="px-6 py-12 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-1 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a1a1aa]">Plate</p>
              <h1 className="truncate text-[28px] font-semibold leading-tight tracking-[-0.035em] text-[#09090b]">{note.title}</h1>
            </div>
            <div className="min-h-[680px] overflow-hidden rounded-xl border border-[#e4e4e7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <PlateEditorToolbar editor={editor} />
              <div className="px-8 py-16 md:px-16 lg:px-24">
                <div className="mx-auto w-full max-w-[760px]">
                  <PlateContainer className="relative w-full cursor-text select-text overflow-visible caret-[#18181b] selection:bg-[#bfdbfe]">
                    <PlateContent className="min-h-[480px] w-full overflow-x-hidden whitespace-pre-wrap break-words rounded-none border-0 bg-transparent px-0 py-0 text-[17px] leading-8 text-[#18181b] outline-none focus:outline-none [&_strong]:font-bold" disableDefaultStyles placeholder="本文を入力" spellCheck />
                  </PlateContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Plate>
    </div>
  );
};

export { PlateDocumentEditor };
