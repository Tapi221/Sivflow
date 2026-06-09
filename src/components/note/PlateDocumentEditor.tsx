import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type JSX, type KeyboardEvent, type ReactNode } from "react";
import type { Note, NoteBlockContent } from "@/types";

type PlateDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

type MarkKey = "bold" | "italic" | "underline" | "strikethrough" | "code";

type PlateBlockType = "p" | "h1" | "h2" | "h3" | "blockquote" | "code_block" | "bulleted-list" | "numbered-list";

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

type PlateRuntimeEditor = {
  addMark?: (key: string, value: unknown) => void;
  api?: {
    marks?: () => Record<string, unknown> | null;
  };
  insertText?: (text: string) => void;
  marks?: Record<string, unknown> | null;
  onChange?: () => void;
  removeMark?: (key: string) => void;
  tf?: {
    insertNodes?: (nodes: unknown | unknown[]) => void;
    setNodes?: (props: Record<string, unknown>) => void;
  };
};

type PlateRenderAttributes = Record<string, unknown>;

type PlateElementRenderProps = {
  attributes: PlateRenderAttributes;
  children: ReactNode;
  element: unknown;
};

type PlateLeafRenderProps = {
  attributes: PlateRenderAttributes;
  children: ReactNode;
  leaf: unknown;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_VERSION = 2;
const TOOLBAR_BUTTON_CLASS_NAME = "flex h-8 min-w-8 items-center justify-center rounded-[7px] px-2 text-[12px] font-semibold leading-none text-[#4b5563] transition hover:bg-[#efeeee] hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9c9ce]";
const TOOLBAR_BUTTON_ACTIVE_CLASS_NAME = "bg-[#e8e8ea] text-[#111827]";
const TOOLBAR_DIVIDER_CLASS_NAME = "mx-1 h-5 w-px bg-[#dedee3]";
const EMPTY_TEXT_NODE: PlateTextNode = { text: "" };
const MARK_OPTIONS: Array<{ key: MarkKey; label: string; title: string }> = [
  { key: "bold", label: "B", title: "太字" },
  { key: "italic", label: "I", title: "斜体" },
  { key: "underline", label: "U", title: "下線" },
  { key: "strikethrough", label: "S", title: "取り消し線" },
  { key: "code", label: "<>", title: "インラインコード" },
];
const BLOCK_OPTIONS: Array<{ type: PlateBlockType; label: string; title: string }> = [
  { type: "p", label: "本文", title: "段落" },
  { type: "h1", label: "H1", title: "見出し1" },
  { type: "h2", label: "H2", title: "見出し2" },
  { type: "h3", label: "H3", title: "見出し3" },
  { type: "blockquote", label: "引用", title: "引用" },
  { type: "code_block", label: "Code", title: "コードブロック" },
  { type: "bulleted-list", label: "• List", title: "箇条書き" },
  { type: "numbered-list", label: "1. List", title: "番号付きリスト" },
];
const BLOCK_FORMAT_TAGS: Partial<Record<PlateBlockType, string>> = {
  blockquote: "blockquote",
  code_block: "pre",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  p: "p",
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const createEmptyPlateValue = (): PlateElementNode[] => [{ type: "p", children: [{ ...EMPTY_TEXT_NODE }] }];

const isPlateTextNode = (value: unknown): value is PlateTextNode => isRecord(value) && typeof value.text === "string";

const isPlateElementNode = (value: unknown): value is PlateElementNode => isRecord(value) && typeof value.type === "string" && Array.isArray(value.children) && value.children.every(isPlateNode);

const isPlateNode = (value: unknown): value is PlateNode => isPlateTextNode(value) || isPlateElementNode(value);

const clonePlateNode = (node: PlateNode): PlateNode => {
  if (isPlateTextNode(node)) return { ...node };

  return { ...node, children: node.children.map(clonePlateNode) };
};

const clonePlateElementNode = (node: PlateElementNode): PlateElementNode => {
  const cloned = clonePlateNode(node);

  return isPlateElementNode(cloned) ? cloned : { type: "p", children: [{ ...EMPTY_TEXT_NODE }] };
};

const getTextFromInlineContent = (content: unknown): string => {
  if (!Array.isArray(content)) return "";

  return content.map((item) => isRecord(item) && typeof item.text === "string" ? item.text : "").join("");
};

const getLegacyHeadingBlockType = (block: Record<string, unknown>): PlateBlockType => {
  const props = isRecord(block.props) ? block.props : null;
  const level = typeof props?.level === "number" ? props.level : null;

  if (level === 1) return "h1";
  if (level === 2) return "h2";
  if (level === 3) return "h3";

  return "h2";
};

const getLegacyPlateBlockType = (block: unknown): PlateBlockType => {
  if (!isRecord(block) || typeof block.type !== "string") return "p";

  if (block.type === "heading") return getLegacyHeadingBlockType(block);
  if (block.type === "bulletListItem") return "bulleted-list";
  if (block.type === "numberedListItem") return "numbered-list";
  if (block.type === "codeBlock") return "code_block";
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

const toTextNode = (text: string): PlateTextNode => ({ text });

const toPlateNode = (type: PlateBlockType, text: string): PlateElementNode => ({ type, children: [toTextNode(text)] });

const toParagraphNode = (text: string): PlateElementNode => toPlateNode("p", text);

const getNodeText = (node: unknown): string => {
  if (isPlateTextNode(node)) return node.text;
  if (!isRecord(node) || !Array.isArray(node.children)) return "";

  return node.children.map(getNodeText).join("");
};

const toInitialPlateValue = (content: NoteBlockContent | undefined): PlateElementNode[] => {
  if (!Array.isArray(content) || content.length === 0) return createEmptyPlateValue();

  if (content.every(isPlateElementNode)) return content.map(clonePlateElementNode);

  const migratedNodes = content.map((block) => toPlateNode(getLegacyPlateBlockType(block), toLegacyText(block))).filter((node) => node.children.some((child) => getNodeText(child).trim().length > 0));

  return migratedNodes.length > 0 ? migratedNodes : createEmptyPlateValue();
};

const getPlainText = (nodes: unknown[]): string => nodes.map(getNodeText).filter(Boolean).join("\n");

const getChangeValue = (change: PlateChangePayload): unknown[] | null => {
  if (Array.isArray(change)) return change;
  if (isRecord(change) && Array.isArray(change.value)) return change.value;

  return null;
};

const toRuntimeEditor = (editor: unknown): PlateRuntimeEditor => isRecord(editor) ? editor as PlateRuntimeEditor : {};

const getEditorMarks = (editor: unknown): Record<string, unknown> | null => {
  const runtimeEditor = toRuntimeEditor(editor);
  const apiMarks = runtimeEditor.api?.marks?.();

  return apiMarks ?? runtimeEditor.marks ?? null;
};

const isEditorMarkActive = (editor: unknown, mark: MarkKey): boolean => Boolean(getEditorMarks(editor)?.[mark]);

const notifyEditorChange = (editor: unknown) => {
  toRuntimeEditor(editor).onChange?.();
};

const toggleEditorMark = (editor: unknown, mark: MarkKey) => {
  const runtimeEditor = toRuntimeEditor(editor);

  if (isEditorMarkActive(editor, mark)) {
    runtimeEditor.removeMark?.(mark);
  } else {
    runtimeEditor.addMark?.(mark, true);
  }

  notifyEditorChange(editor);
};

const setEditorBlockType = (editor: unknown, type: PlateBlockType) => {
  const runtimeEditor = toRuntimeEditor(editor);

  if (runtimeEditor.tf?.setNodes) {
    runtimeEditor.tf.setNodes({ type });
    notifyEditorChange(editor);
    return;
  }

  const fallbackTagName = BLOCK_FORMAT_TAGS[type];
  if (fallbackTagName && typeof document !== "undefined") {
    document.execCommand("formatBlock", false, fallbackTagName);
  }
};

const insertPlateNodes = (editor: unknown, nodes: PlateElementNode[]): boolean => {
  const runtimeEditor = toRuntimeEditor(editor);

  if (!runtimeEditor.tf?.insertNodes) return false;

  runtimeEditor.tf.insertNodes(nodes);
  notifyEditorChange(editor);
  return true;
};

const getElementRenderProps = (props: unknown): PlateElementRenderProps => {
  if (!isRecord(props)) return { attributes: {}, children: null, element: null };

  return {
    attributes: isRecord(props.attributes) ? props.attributes : {},
    children: props.children as ReactNode,
    element: props.element,
  };
};

const getLeafRenderProps = (props: unknown): PlateLeafRenderProps => {
  if (!isRecord(props)) return { attributes: {}, children: null, leaf: null };

  return {
    attributes: isRecord(props.attributes) ? props.attributes : {},
    children: props.children as ReactNode,
    leaf: props.leaf,
  };
};

const asElementProps = <ElementName extends keyof JSX.IntrinsicElements>(attributes: PlateRenderAttributes): JSX.IntrinsicElements[ElementName] => attributes as JSX.IntrinsicElements[ElementName];

const getElementType = (element: unknown): string => isRecord(element) && typeof element.type === "string" ? element.type : "p";

const renderPlateElement = (props: unknown) => {
  const { attributes, children, element } = getElementRenderProps(props);
  const type = getElementType(element);

  if (type === "h1") return <h1 {...asElementProps<"h1">(attributes)} className="mb-4 mt-8 text-[34px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]">{children}</h1>;
  if (type === "h2") return <h2 {...asElementProps<"h2">(attributes)} className="mb-3 mt-7 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#202124]">{children}</h2>;
  if (type === "h3") return <h3 {...asElementProps<"h3">(attributes)} className="mb-2 mt-6 text-[22px] font-semibold leading-snug tracking-[-0.03em] text-[#202124]">{children}</h3>;
  if (type === "blockquote") return <blockquote {...asElementProps<"blockquote">(attributes)} className="my-4 border-l-4 border-[#d1d5db] pl-4 text-[#4b5563]">{children}</blockquote>;
  if (type === "code_block") return <pre {...asElementProps<"pre">(attributes)} className="my-4 overflow-x-auto rounded-[12px] bg-[#f5f5f7] px-4 py-3 font-mono text-[14px] leading-6 text-[#1f2937]"><code>{children}</code></pre>;
  if (type === "bulleted-list") return <ul {...asElementProps<"ul">(attributes)} className="my-2 list-disc pl-7"><li>{children}</li></ul>;
  if (type === "numbered-list") return <ol {...asElementProps<"ol">(attributes)} className="my-2 list-decimal pl-7"><li>{children}</li></ol>;

  return <p {...asElementProps<"p">(attributes)} className="my-2 min-h-[1.75rem]">{children}</p>;
};

const renderPlateLeaf = (props: unknown) => {
  const { attributes, children: initialChildren, leaf } = getLeafRenderProps(props);
  const leafRecord = isRecord(leaf) ? leaf : {};
  let children = initialChildren;

  if (leafRecord.bold) children = <strong>{children}</strong>;
  if (leafRecord.italic) children = <em>{children}</em>;
  if (leafRecord.underline) children = <u>{children}</u>;
  if (leafRecord.strikethrough) children = <s>{children}</s>;
  if (leafRecord.code) children = <code className="rounded-[5px] bg-[#f1f1f4] px-1 py-0.5 font-mono text-[0.92em] text-[#111827]">{children}</code>;

  return <span {...asElementProps<"span">(attributes)}>{children}</span>;
};

const hasMarkdownBlockSyntax = (text: string): boolean => text.split("\n").some((line) => /^(#{1,3}|>|[-*]|\d+\.)\s/.test(line.trim()) || line.trim().startsWith("```") );

const deserializeMarkdownToPlateNodes = (markdown: string): PlateElementNode[] => {
  const nodes: PlateElementNode[] = [];
  const codeLines: string[] = [];
  let isInCodeBlock = false;

  for (const line of markdown.replaceAll("\r\n", "\n").split("\n")) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```")) {
      if (isInCodeBlock) {
        nodes.push(toPlateNode("code_block", codeLines.join("\n")));
        codeLines.length = 0;
      }

      isInCodeBlock = !isInCodeBlock;
      continue;
    }

    if (isInCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (trimmedLine.startsWith("### ")) {
      nodes.push(toPlateNode("h3", trimmedLine.slice(4)));
      continue;
    }

    if (trimmedLine.startsWith("## ")) {
      nodes.push(toPlateNode("h2", trimmedLine.slice(3)));
      continue;
    }

    if (trimmedLine.startsWith("# ")) {
      nodes.push(toPlateNode("h1", trimmedLine.slice(2)));
      continue;
    }

    if (trimmedLine.startsWith("> ")) {
      nodes.push(toPlateNode("blockquote", trimmedLine.slice(2)));
      continue;
    }

    if (/^[-*]\s+/.test(trimmedLine)) {
      nodes.push(toPlateNode("bulleted-list", trimmedLine.replace(/^[-*]\s+/, "")));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmedLine)) {
      nodes.push(toPlateNode("numbered-list", trimmedLine.replace(/^\d+\.\s+/, "")));
      continue;
    }

    nodes.push(toParagraphNode(line));
  }

  if (codeLines.length > 0) nodes.push(toPlateNode("code_block", codeLines.join("\n")));

  return nodes.length > 0 ? nodes : createEmptyPlateValue();
};

const getToolbarButtonClassName = (isActive: boolean): string => [TOOLBAR_BUTTON_CLASS_NAME, isActive ? TOOLBAR_BUTTON_ACTIVE_CLASS_NAME : ""].filter(Boolean).join(" ");

const PlateDocumentEditor = ({ note, onChange }: PlateDocumentEditorProps) => {
  const initialValue = useMemo(() => toInitialPlateValue(note.content), [note.content]);
  const editor = usePlateEditor({ value: initialValue });
  const latestChangeRef = useRef<Pick<Note, "content" | "contentText" | "contentVersion" | "editor"> | null>(null);
  const [saveRevision, setSaveRevision] = useState(0);
  const [toolbarRevision, setToolbarRevision] = useState(0);
  const activeMarkKeys = useMemo(() => new Set(MARK_OPTIONS.filter((option) => isEditorMarkActive(editor, option.key)).map((option) => option.key)), [editor, toolbarRevision]);

  const requestToolbarRefresh = useCallback(() => {
    setToolbarRevision((revision) => revision + 1);
  }, []);

  const flushPendingChange = useCallback(() => {
    const changes = latestChangeRef.current;
    latestChangeRef.current = null;
    if (changes) void onChange(changes);
  }, [onChange]);

  const handleChange = useCallback((change: PlateChangePayload) => {
    const value = getChangeValue(change);
    if (!value) return;

    latestChangeRef.current = { content: value as NoteBlockContent, contentText: getPlainText(value), contentVersion: NOTE_CONTENT_VERSION, editor: "plate" };
    setSaveRevision((revision) => revision + 1);
    requestToolbarRefresh();
  }, [requestToolbarRefresh]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;

    const key = event.key.toLowerCase();

    if (key === "b" || key === "i" || key === "u") {
      event.preventDefault();
      toggleEditorMark(editor, key === "b" ? "bold" : key === "i" ? "italic" : "underline");
      requestToolbarRefresh();
      return;
    }

    if (!event.altKey) return;

    const blockType = key === "0" ? "p" : key === "1" ? "h1" : key === "2" ? "h2" : key === "3" ? "h3" : null;
    if (!blockType) return;

    event.preventDefault();
    setEditorBlockType(editor, blockType);
    requestToolbarRefresh();
  }, [editor, requestToolbarRefresh]);

  const handlePaste = useCallback((event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text || !hasMarkdownBlockSyntax(text)) return;

    const nodes = deserializeMarkdownToPlateNodes(text);
    if (!insertPlateNodes(editor, nodes)) return;

    event.preventDefault();
    requestToolbarRefresh();
  }, [editor, requestToolbarRefresh]);

  useEffect(() => {
    if (!latestChangeRef.current) return;

    const timeoutId = window.setTimeout(flushPendingChange, NOTE_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [flushPendingChange, saveRevision]);

  useEffect(() => () => {
    flushPendingChange();
  }, [flushPendingChange]);

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-white px-16 py-14 text-[#202124]">
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">Plate editor</p>
            <h1 className="truncate text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]">{note.title}</h1>
          </div>
          <span className="mt-2 rounded-full bg-[#f5f5f7] px-3 py-1 text-[11px] font-semibold text-[#6b7280]">v{NOTE_CONTENT_VERSION}</span>
        </div>
        <Plate editor={editor} onChange={handleChange}>
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-y border-[#ededf0] bg-white/95 py-2 backdrop-blur">
            {BLOCK_OPTIONS.map((option) => (
              <button key={option.type} type="button" className={getToolbarButtonClassName(false)} title={option.title} onMouseDown={(event) => { event.preventDefault(); setEditorBlockType(editor, option.type); requestToolbarRefresh(); }}>
                {option.label}
              </button>
            ))}
            <span className={TOOLBAR_DIVIDER_CLASS_NAME} />
            {MARK_OPTIONS.map((option) => {
              const isActive = activeMarkKeys.has(option.key);

              return (
                <button key={option.key} type="button" className={getToolbarButtonClassName(isActive)} title={option.title} aria-pressed={isActive} onMouseDown={(event) => { event.preventDefault(); toggleEditorMark(editor, option.key); requestToolbarRefresh(); }}>
                  {option.label}
                </button>
              );
            })}
          </div>
          <PlateContent className="min-h-[420px] rounded-none border-0 bg-transparent px-0 py-5 text-[17px] leading-8 text-[#202124] outline-none focus:outline-none" placeholder="本文を入力" renderElement={renderPlateElement} renderLeaf={renderPlateLeaf} spellCheck onKeyDown={handleKeyDown} onKeyUp={() => requestToolbarRefresh()} onPaste={handlePaste} onSelect={() => requestToolbarRefresh()} />
        </Plate>
      </div>
    </div>
  );
};

export { PlateDocumentEditor };
