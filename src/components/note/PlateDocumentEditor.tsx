import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import { AlignLeft, ArrowUpToLine, Baseline, Bold, ChevronDown, CircleSlash, Code2, File, FileAudio, Film, Highlighter, Image, Indent, Italic, Link, List, ListOrdered, ListTodo, MessageSquare, Minus, MoreHorizontal, Outdent, PaintBucket, Plus, Redo2, Smile, Strikethrough, Table, Underline, Undo2, WandSparkles } from "lucide-react";
import { Plate, PlateContainer, PlateContent, PlateElement, PlateLeaf, ParagraphPlugin, usePlateEditor, type PlateElementProps, type PlateLeafProps } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type MouseEvent, type ReactNode } from "react";
import { generateOllamaAnswer } from "@platform/ai/ollamaClient";
import type { Note, NoteBlockContent } from "@/types";

type PlateDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

type PlateAlignValue = "center" | "justify" | "left" | "right";

type PlateMediaType = "audio" | "file" | "image" | "video";

type PlateTextNode = {
  text: string;
  backgroundColor?: string;
  bold?: boolean;
  code?: boolean;
  color?: string;
  comment?: string;
  fontSize?: number;
  highlight?: boolean;
  italic?: boolean;
  link?: string;
  strikethrough?: boolean;
  underline?: boolean;
  [key: string]: unknown;
};

type PlateNode = PlateTextNode | PlateElementNode;

type PlateElementNode = {
  type: string;
  align?: PlateAlignValue;
  checked?: boolean;
  children: PlateNode[];
  indent?: number;
  lineHeight?: number;
  mimeType?: string;
  name?: string;
  src?: string;
  url?: string;
  [key: string]: unknown;
};

type PlateChangePayload = unknown[] | {
  value?: unknown;
};

type PlateEditor = ReturnType<typeof usePlateEditor>;

type PlateBlockType = "blockquote" | "h1" | "h2" | "h3" | "p";

type PlateMarkType = "bold" | "code" | "italic" | "strikethrough" | "underline";

type PlateCommandFallback = {
  command: string;
  value?: string;
};

type PlateToolbarButtonProps = {
  label: string;
  children: ReactNode;
  onPress: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
};

type PlateToolbarSelectProps = {
  editor: PlateEditor;
};

type AppRegionStyle = CSSProperties & {
  WebkitAppRegion?: "no-drag";
};

type PlateElementRendererProps = PlateElementProps & {
  children?: ReactNode;
  element?: unknown;
};

type PlateLeafRendererProps = PlateLeafProps & {
  leaf?: unknown;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_VERSION = 2;
const EMPTY_TEXT_NODE: PlateTextNode = { text: "" };
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 36;
const FONT_SIZE_STEP = 1;
const PLATE_INDENT_WIDTH_PX = 28;
const PLATE_HIGHLIGHT_COLOR = "#fef08a";
const PLATE_LINE_HEIGHT_OPTIONS = [1.5, 1.75, 2, 2.5] as const;
const PLATE_ALIGN_OPTIONS = ["left", "center", "right", "justify"] as const;
const SUPPORTED_PLATE_BLOCK_TYPES = new Set(["audio", "blockquote", "file", "h1", "h2", "h3", "hr", "image", "li", "ol", "p", "table", "td", "th", "todo", "tr", "ul", "video"]);
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
const PLATE_TOOLBAR_BUTTON_CLASS_NAME = "inline-flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-transparent px-1.5 text-sm font-medium text-[#18181b] outline-none transition-colors hover:bg-[#f4f4f5] hover:text-[#52525b] focus-visible:ring-2 focus-visible:ring-[#d4d4d8] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#18181b] [&_svg]:pointer-events-none [&_svg]:shrink-0";
const PLATE_TOOLBAR_SEPARATOR_CLASS_NAME = "mx-1.5 h-7 w-px shrink-0 bg-[#e4e4e7]";
const PLATE_TOOLBAR_NO_DRAG_STYLE: AppRegionStyle = { WebkitAppRegion: "no-drag" };
const PLATE_TOOLBAR_UNAVAILABLE_TITLE = "この操作は現在使用できません";

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
  if (SUPPORTED_PLATE_BLOCK_TYPES.has(node.type)) {
    const children = node.children.map(clonePlateNode);

    return { ...node, children: children.length > 0 ? children : [{ ...EMPTY_TEXT_NODE }] };
  }

  const text = getNodeText(node);

  if (node.type === "code_block") return { type: "p", children: [{ text, code: true }] };
  if (node.type === "bulleted-list") return { type: "ul", children: [{ type: "li", children: [{ text }] }] };
  if (node.type === "numbered-list") return { type: "ol", children: [{ type: "li", children: [{ text }] }] };

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
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;

  return document.execCommand(fallback.command, false, fallback.value);
};

const runPlateTransform = (editor: PlateEditor, transformName: string, args: unknown[], fallback?: PlateCommandFallback) => {
  focusPlateEditor(editor);

  const transform = getPlateTransform(editor, transformName);

  if (transform) {
    transform(...args);
    focusPlateEditor(editor);
    return true;
  }

  if (fallback) {
    const handled = runDocumentCommandFallback(fallback);
    focusPlateEditor(editor);
    return handled;
  }

  focusPlateEditor(editor);
  return false;
};

const togglePlateMark = (editor: PlateEditor, mark: PlateMarkType, fallback: PlateCommandFallback) => {
  runPlateTransform(editor, "toggleMark", [mark], fallback);
};

const setPlateMark = (editor: PlateEditor, mark: string, value: unknown, fallback?: PlateCommandFallback) => {
  focusPlateEditor(editor);

  const addMark = getPlateTransform(editor, "addMark");
  if (addMark) {
    addMark(mark, value);
    focusPlateEditor(editor);
    return true;
  }

  const setMarks = getPlateTransform(editor, "setMarks");
  if (setMarks) {
    setMarks({ [mark]: value });
    focusPlateEditor(editor);
    return true;
  }

  if (fallback) {
    const handled = runDocumentCommandFallback(fallback);
    focusPlateEditor(editor);
    return handled;
  }

  focusPlateEditor(editor);
  return false;
};

const removePlateMark = (editor: PlateEditor, mark: string) => {
  const removeMark = getPlateTransform(editor, "removeMark");
  if (!removeMark) return;

  removeMark(mark);
};

const setPlateBlockData = (editor: PlateEditor, data: Partial<PlateElementNode>, fallback?: PlateCommandFallback) => {
  runPlateTransform(editor, "setNodes", [data, { match: (node: unknown) => isRecord(node) && Array.isArray(node.children) }], fallback);
};

const setPlateBlockType = (editor: PlateEditor, blockType: PlateBlockType) => {
  setPlateBlockData(editor, { type: blockType }, { command: "formatBlock", value: blockType === "p" ? "p" : blockType });
};

const escapeHtml = (value: string): string => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (/^(blob:|data:|https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
};

const getPlateElementStyle = (element: unknown): CSSProperties | undefined => {
  if (!isRecord(element)) return undefined;

  const style: CSSProperties = {};
  const align = typeof element.align === "string" && PLATE_ALIGN_OPTIONS.includes(element.align as PlateAlignValue) ? element.align : null;

  if (align) style.textAlign = align as CSSProperties["textAlign"];
  if (typeof element.indent === "number" && element.indent > 0) style.marginLeft = `${Math.min(element.indent, 8) * PLATE_INDENT_WIDTH_PX}px`;
  if (typeof element.lineHeight === "number") style.lineHeight = String(element.lineHeight);

  return Object.keys(style).length > 0 ? style : undefined;
};

const getPlateLeafStyle = (leaf: unknown): CSSProperties | undefined => {
  if (!isRecord(leaf)) return undefined;

  const style: CSSProperties = {};

  if (typeof leaf.color === "string") style.color = leaf.color;
  if (typeof leaf.backgroundColor === "string") style.backgroundColor = leaf.backgroundColor;
  if (leaf.highlight === true && !style.backgroundColor) style.backgroundColor = PLATE_HIGHLIGHT_COLOR;
  if (typeof leaf.fontSize === "number") style.fontSize = `${Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, leaf.fontSize))}px`;
  if (typeof leaf.comment === "string" && leaf.comment.trim()) {
    style.borderBottom = "1px dotted currentColor";
    style.cursor = "help";
  }

  return Object.keys(style).length > 0 ? style : undefined;
};

const getLeafComment = (leaf: unknown): string | undefined => isRecord(leaf) && typeof leaf.comment === "string" ? leaf.comment : undefined;

const getLeafLink = (leaf: unknown): string | null => isRecord(leaf) && typeof leaf.link === "string" && leaf.link.trim() ? normalizeUrl(leaf.link) : null;

const serializeTextNodeToHtml = (node: PlateTextNode): string => {
  let html = escapeHtml(node.text);
  const style = getPlateLeafStyle(node);
  const styleValue = style ? Object.entries(style).map(([key, value]) => `${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}:${String(value)}`).join(";") : "";

  if (node.code) html = `<code>${html}</code>`;
  if (node.bold) html = `<strong>${html}</strong>`;
  if (node.italic) html = `<em>${html}</em>`;
  if (node.underline) html = `<u>${html}</u>`;
  if (node.strikethrough) html = `<s>${html}</s>`;
  if (styleValue) html = `<span style="${escapeHtml(styleValue)}">${html}</span>`;
  if (typeof node.link === "string" && node.link.trim()) html = `<a href="${escapeHtml(normalizeUrl(node.link))}">${html}</a>`;

  return html;
};

const serializePlateNodeToHtml = (node: PlateNode): string => {
  if (isPlateTextNode(node)) return serializeTextNodeToHtml(node);

  const children = node.children.map(serializePlateNodeToHtml).join("");
  const style = getPlateElementStyle(node);
  const styleValue = style ? Object.entries(style).map(([key, value]) => `${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}:${String(value)}`).join(";") : "";
  const styleAttribute = styleValue ? ` style="${escapeHtml(styleValue)}"` : "";

  if (node.type === "blockquote") return `<blockquote${styleAttribute}>${children}</blockquote>`;
  if (node.type === "h1") return `<h1${styleAttribute}>${children}</h1>`;
  if (node.type === "h2") return `<h2${styleAttribute}>${children}</h2>`;
  if (node.type === "h3") return `<h3${styleAttribute}>${children}</h3>`;
  if (node.type === "ul") return `<ul${styleAttribute}>${children}</ul>`;
  if (node.type === "ol") return `<ol${styleAttribute}>${children}</ol>`;
  if (node.type === "li") return `<li${styleAttribute}>${children}</li>`;
  if (node.type === "table") return `<table${styleAttribute}><tbody>${children}</tbody></table>`;
  if (node.type === "tr") return `<tr>${children}</tr>`;
  if (node.type === "td" || node.type === "th") return `<td>${children}</td>`;
  if (node.type === "hr") return "<hr />";
  if (typeof node.src === "string" && node.type === "image") return `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(typeof node.name === "string" ? node.name : "")}" />`;
  if (typeof node.src === "string" && node.type === "video") return `<video src="${escapeHtml(node.src)}" controls></video>`;
  if (typeof node.src === "string" && node.type === "audio") return `<audio src="${escapeHtml(node.src)}" controls></audio>`;
  if (typeof node.src === "string" && node.type === "file") return `<a href="${escapeHtml(node.src)}" download="${escapeHtml(typeof node.name === "string" ? node.name : "file")}">${escapeHtml(typeof node.name === "string" ? node.name : "file")}</a>`;

  return `<p${styleAttribute}>${children}</p>`;
};

const serializePlateNodesToHtml = (nodes: PlateElementNode[]): string => nodes.map(serializePlateNodeToHtml).join("");

const insertPlateNodes = (editor: PlateEditor, nodes: PlateElementNode | PlateElementNode[]) => {
  const nextNodes = Array.isArray(nodes) ? nodes : [nodes];

  return runPlateTransform(editor, "insertNodes", [Array.isArray(nodes) ? nextNodes : nextNodes[0]], { command: "insertHTML", value: serializePlateNodesToHtml(nextNodes) });
};

const insertPlateText = (editor: PlateEditor, text: string, marks?: Partial<PlateTextNode>) => {
  const markEntries = Object.entries(marks ?? {}).filter(([, value]) => value !== undefined && value !== null);
  const insertText = getPlateTransform(editor, "insertText");

  focusPlateEditor(editor);

  if (insertText) {
    markEntries.forEach(([mark, value]) => setPlateMark(editor, mark, value));
    insertText(text);
    markEntries.forEach(([mark]) => removePlateMark(editor, mark));
    focusPlateEditor(editor);
    return true;
  }

  if (markEntries.length > 0) {
    const node: PlateTextNode = { text, ...marks };
    runDocumentCommandFallback({ command: "insertHTML", value: serializeTextNodeToHtml(node) });
    focusPlateEditor(editor);
    return true;
  }

  const handled = runDocumentCommandFallback({ command: "insertText", value: text });
  focusPlateEditor(editor);
  return handled;
};

const hasExpandedPlateSelection = (editor: PlateEditor): boolean => {
  const api = (editor as { api?: { isExpanded?: () => boolean } }).api;
  const isExpanded = api?.isExpanded;

  if (typeof isExpanded === "function") return isExpanded();

  if (typeof window === "undefined") return false;

  return Boolean(window.getSelection()?.toString());
};

const clampFontSize = (value: number): number => Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, value));

const readPositiveInteger = (value: string | null, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 12) : fallback;
};

const parseTableDimensions = (value: string | null): { columns: number; rows: number } => {
  if (!value) return { columns: 3, rows: 3 };

  const [rowsValue, columnsValue] = value.toLowerCase().split(/[x×,\s]+/).filter(Boolean);

  return {
    columns: readPositiveInteger(columnsValue, 3),
    rows: readPositiveInteger(rowsValue, 3),
  };
};

const createListNode = (type: "ol" | "ul"): PlateElementNode => ({ type, children: [{ type: "li", children: [{ text: "List item" }] }] });

const createTodoNode = (): PlateElementNode => ({ type: "todo", checked: false, children: [{ text: "Todo" }] });

const createTableNode = (rows: number, columns: number): PlateElementNode => ({
  type: "table",
  children: Array.from({ length: rows }, () => ({
    type: "tr",
    children: Array.from({ length: columns }, () => ({ type: "td", children: [{ type: "p", children: [{ text: "" }] }] })),
  })),
});

const createMediaNode = (type: PlateMediaType, file: File, src: string): PlateElementNode => ({ type, children: [{ text: "" }], mimeType: file.type, name: file.name, src });

const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    if (typeof reader.result === "string") {
      resolve(reader.result);
      return;
    }

    reject(new Error("FILE_READER_RESULT_NOT_STRING"));
  });
  reader.addEventListener("error", () => reject(reader.error ?? new Error("FILE_READER_ERROR")));
  reader.readAsDataURL(file);
});

const getEditorValue = (editor: PlateEditor): unknown[] => {
  const children = (editor as { children?: unknown }).children;

  return Array.isArray(children) ? children : [];
};

const downloadTextFile = (filename: string, text: string, type: string) => {
  if (typeof document === "undefined") return;

  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const runLocalAiCommand = async (editor: PlateEditor) => {
  if (typeof window === "undefined") return;

  const question = window.prompt("AIに渡す指示を入力");
  const normalizedQuestion = question?.trim();
  if (!normalizedQuestion) return;

  try {
    const result = await generateOllamaAnswer({ question: normalizedQuestion });
    insertPlateNodes(editor, { type: "blockquote", children: [{ text: result.answer }] });
  } catch {
    window.alert("ローカルAIに接続できませんでした。Ollamaの起動状態とモデル設定を確認してください。");
  }
};

const exportPlateDocument = (editor: PlateEditor) => {
  const value = getEditorValue(editor);
  const payload = {
    content: value,
    contentText: getPlainText(value),
    contentVersion: NOTE_CONTENT_VERSION,
    editor: "plate",
  };

  downloadTextFile(`sivflow-note-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
};

const insertLink = (editor: PlateEditor) => {
  if (typeof window === "undefined") return;

  const rawUrl = window.prompt("リンクURL");
  if (!rawUrl?.trim()) return;

  const url = normalizeUrl(rawUrl);

  if (hasExpandedPlateSelection(editor)) {
    setPlateMark(editor, "link", url, { command: "createLink", value: url });
    return;
  }

  const text = window.prompt("リンク文字", rawUrl) ?? rawUrl;
  insertPlateText(editor, text, { link: url });
};

const setTextColor = (editor: PlateEditor) => {
  if (typeof window === "undefined") return;

  const color = window.prompt("文字色", "#18181b");
  if (!color?.trim()) return;

  setPlateMark(editor, "color", color.trim(), { command: "foreColor", value: color.trim() });
};

const setBackgroundColor = (editor: PlateEditor) => {
  if (typeof window === "undefined") return;

  const color = window.prompt("背景色", PLATE_HIGHLIGHT_COLOR);
  if (!color?.trim()) return;

  setPlateMark(editor, "backgroundColor", color.trim(), { command: "hiliteColor", value: color.trim() });
};

const addComment = (editor: PlateEditor) => {
  if (typeof window === "undefined") return;

  const comment = window.prompt("コメント");
  if (!comment?.trim()) return;

  setPlateMark(editor, "comment", comment.trim());
};

const clearFormatting = (editor: PlateEditor) => {
  ["backgroundColor", "bold", "code", "color", "comment", "fontSize", "highlight", "italic", "link", "strikethrough", "underline"].forEach((mark) => removePlateMark(editor, mark));
  setPlateBlockData(editor, { align: "left", indent: 0, lineHeight: PLATE_LINE_HEIGHT_OPTIONS[1], type: "p" }, { command: "removeFormat" });
};

const runMoreCommand = (editor: PlateEditor) => {
  if (typeof window === "undefined") return;

  const command = window.prompt("more: date / divider / clear / quote", "date")?.trim().toLowerCase();

  if (command === "date") {
    insertPlateText(editor, new Date().toLocaleString());
    return;
  }

  if (command === "divider") {
    insertPlateNodes(editor, { type: "hr", children: [{ text: "" }] });
    return;
  }

  if (command === "clear") {
    clearFormatting(editor);
    return;
  }

  if (command === "quote") {
    setPlateBlockType(editor, "blockquote");
  }
};

const ParagraphElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="p" className="my-2 min-h-[1.75rem] px-0 py-0 text-[17px] leading-8 text-[#18181b]" style={getPlateElementStyle(props.element)} />;

const H1Element = (props: PlateElementRendererProps) => <PlateElement {...props} as="h1" className="mb-4 mt-8 text-[34px] font-semibold leading-tight tracking-[-0.04em] text-[#09090b]" style={getPlateElementStyle(props.element)} />;

const H2Element = (props: PlateElementRendererProps) => <PlateElement {...props} as="h2" className="mb-3 mt-7 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#09090b]" style={getPlateElementStyle(props.element)} />;

const H3Element = (props: PlateElementRendererProps) => <PlateElement {...props} as="h3" className="mb-2 mt-6 text-[22px] font-semibold leading-snug tracking-[-0.03em] text-[#09090b]" style={getPlateElementStyle(props.element)} />;

const BlockquoteElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="blockquote" className="my-4 border-l-4 border-[#d4d4d8] pl-4 text-[#52525b]" style={getPlateElementStyle(props.element)} />;

const UnorderedListElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="ul" className="my-3 list-disc pl-7 text-[17px] leading-8 text-[#18181b]" style={getPlateElementStyle(props.element)} />;

const OrderedListElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="ol" className="my-3 list-decimal pl-7 text-[17px] leading-8 text-[#18181b]" style={getPlateElementStyle(props.element)} />;

const ListItemElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="li" className="pl-1" />;

const TodoElement = (props: PlateElementRendererProps) => {
  const checked = isRecord(props.element) && props.element.checked === true;

  return (
    <PlateElement {...props} as="div" className="my-2 flex items-start gap-2 text-[17px] leading-8 text-[#18181b]" style={getPlateElementStyle(props.element)}>
      <input type="checkbox" checked={checked} readOnly className="mt-[0.45rem] size-4 shrink-0 accent-[#18181b]" contentEditable={false} />
      <span className={checked ? "text-[#71717a] line-through" : undefined}>{props.children}</span>
    </PlateElement>
  );
};

const TableElement = (props: PlateElementRendererProps) => (
  <PlateElement {...props} as="table" className="my-4 w-full border-collapse text-left text-[15px] text-[#18181b]" style={getPlateElementStyle(props.element)}>
    <tbody>{props.children}</tbody>
  </PlateElement>
);

const TableRowElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="tr" className="border-b border-[#e4e4e7]" />;

const TableCellElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="td" className="min-w-24 border border-[#e4e4e7] px-3 py-2 align-top" />;

const HorizontalRuleElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="div" className="my-6 border-t border-[#d4d4d8]" contentEditable={false} />;

const ImageElement = (props: PlateElementRendererProps) => {
  const src = isRecord(props.element) && typeof props.element.src === "string" ? props.element.src : "";
  const name = isRecord(props.element) && typeof props.element.name === "string" ? props.element.name : "image";

  return (
    <PlateElement {...props} as="figure" className="my-4 rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-2">
      <div contentEditable={false}>
        {src ? <img src={src} alt={name} className="max-h-[420px] w-full rounded-md object-contain" /> : null}
        <figcaption className="mt-2 text-center text-xs text-[#71717a]">{name}</figcaption>
      </div>
      {props.children}
    </PlateElement>
  );
};

const VideoElement = (props: PlateElementRendererProps) => {
  const src = isRecord(props.element) && typeof props.element.src === "string" ? props.element.src : "";
  const name = isRecord(props.element) && typeof props.element.name === "string" ? props.element.name : "video";

  return (
    <PlateElement {...props} as="div" className="my-4 rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-2">
      <div contentEditable={false}>
        {src ? <video src={src} controls className="max-h-[420px] w-full rounded-md" /> : null}
        <div className="mt-2 text-center text-xs text-[#71717a]">{name}</div>
      </div>
      {props.children}
    </PlateElement>
  );
};

const AudioElement = (props: PlateElementRendererProps) => {
  const src = isRecord(props.element) && typeof props.element.src === "string" ? props.element.src : "";
  const name = isRecord(props.element) && typeof props.element.name === "string" ? props.element.name : "audio";

  return (
    <PlateElement {...props} as="div" className="my-4 rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-3">
      <div contentEditable={false}>
        <div className="mb-2 text-sm font-medium text-[#18181b]">{name}</div>
        {src ? <audio src={src} controls className="w-full" /> : null}
      </div>
      {props.children}
    </PlateElement>
  );
};

const FileElement = (props: PlateElementRendererProps) => {
  const src = isRecord(props.element) && typeof props.element.src === "string" ? props.element.src : "";
  const name = isRecord(props.element) && typeof props.element.name === "string" ? props.element.name : "file";

  return (
    <PlateElement {...props} as="div" className="my-4 rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-3">
      <div contentEditable={false}>
        {src ? <a href={src} download={name} className="inline-flex items-center gap-2 text-sm font-medium text-[#2563eb] underline underline-offset-4"><File className="size-4" />{name}</a> : <span className="text-sm text-[#71717a]">{name}</span>}
      </div>
      {props.children}
    </PlateElement>
  );
};

const StyledLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="span" style={getPlateLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;

const StrongLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="strong" style={getPlateLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;

const ItalicLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="em" style={getPlateLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;

const UnderlineLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="u" style={getPlateLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;

const StrikethroughLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="s" style={getPlateLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;

const CodeLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="code" className="rounded-[5px] bg-[#f4f4f5] px-1 py-0.5 font-mono text-[0.92em] text-[#18181b]" style={getPlateLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;

const LinkLeaf = (props: PlateLeafRendererProps) => {
  const href = getLeafLink(props.leaf);

  if (!href) return <StyledLeaf {...props} />;

  return <PlateLeaf {...props} as="a" href={href} target="_blank" rel="noreferrer" className="text-[#2563eb] underline underline-offset-4" style={getPlateLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;
};

const PlateToolbarButton = ({ label, children, onPress, className, disabled = false }: PlateToolbarButtonProps) => {
  const title = disabled ? `${label}: ${PLATE_TOOLBAR_UNAVAILABLE_TITLE}` : label;

  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (disabled) return;

    void onPress();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return;

    event.preventDefault();
    if (disabled) return;

    void onPress();
  };

  return (
    <button type="button" aria-label={label} title={title} className={`${PLATE_TOOLBAR_BUTTON_CLASS_NAME}${className ? ` ${className}` : ""}`} style={PLATE_TOOLBAR_NO_DRAG_STYLE} disabled={disabled} onMouseDown={handleMouseDown} onClick={handleClick}>
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

const PlateEditorToolbar = ({ editor }: { editor: PlateEditor }) => {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [alignIndex, setAlignIndex] = useState(0);
  const [lineHeightIndex, setLineHeightIndex] = useState(1);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateFontSize = (delta: number) => {
    const nextFontSize = clampFontSize(fontSize + delta);
    setFontSize(nextFontSize);
    setPlateMark(editor, "fontSize", nextFontSize, { command: "fontSize", value: String(nextFontSize) });
  };

  const applyNextAlign = () => {
    const nextIndex = (alignIndex + 1) % PLATE_ALIGN_OPTIONS.length;
    const align = PLATE_ALIGN_OPTIONS[nextIndex];
    setAlignIndex(nextIndex);
    setPlateBlockData(editor, { align }, { command: align === "left" ? "justifyLeft" : align === "center" ? "justifyCenter" : align === "right" ? "justifyRight" : "justifyFull" });
  };

  const applyNextLineHeight = () => {
    const nextIndex = (lineHeightIndex + 1) % PLATE_LINE_HEIGHT_OPTIONS.length;
    const lineHeight = PLATE_LINE_HEIGHT_OPTIONS[nextIndex];
    setLineHeightIndex(nextIndex);
    setPlateBlockData(editor, { lineHeight });
  };

  const handleFileInputChange = async (type: PlateMediaType, event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const src = await readFileAsDataUrl(file);
      insertPlateNodes(editor, createMediaNode(type, file, src));
    } finally {
      input.value = "";
    }
  };

  const handleTableInsert = () => {
    const dimensions = typeof window === "undefined" ? null : window.prompt("表のサイズ", "3x3");
    const { columns, rows } = parseTableDimensions(dimensions);
    insertPlateNodes(editor, createTableNode(rows, columns));
  };

  return (
    <div className="scrollbar-hide sticky left-0 top-0 z-50 flex min-h-10 w-full shrink-0 items-center justify-between overflow-x-auto rounded-t-lg border-b border-[#e4e4e7] bg-white/95 p-1 backdrop-blur-sm" style={PLATE_TOOLBAR_NO_DRAG_STYLE}>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleFileInputChange("image", event)} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(event) => void handleFileInputChange("video", event)} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void handleFileInputChange("audio", event)} />
      <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => void handleFileInputChange("file", event)} />

      <div className="flex min-w-max items-center">
        <div className="flex items-center">
          <PlateToolbarButton label="Undo" onPress={() => runPlateTransform(editor, "undo", [], { command: "undo" })}><Undo2 className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Redo" onPress={() => runPlateTransform(editor, "redo", [], { command: "redo" })}><Redo2 className="size-4" /></PlateToolbarButton>
        </div>

        <PlateToolbarSeparator />

        <div className="flex items-center">
          <PlateToolbarButton label="AI commands" onPress={() => runLocalAiCommand(editor)}><WandSparkles className="size-4" /></PlateToolbarButton>
        </div>

        <PlateToolbarSeparator />

        <div className="flex items-center">
          <PlateToolbarButton label="Export" onPress={() => exportPlateDocument(editor)}><ArrowUpToLine className="size-4" /></PlateToolbarButton>
        </div>

        <PlateToolbarSeparator />

        <div className="flex items-center">
          <PlateToolbarButton label="Insert paragraph" onPress={() => insertPlateNodes(editor, { type: "p", children: [{ text: "" }] })}><Plus className="size-4" /></PlateToolbarButton>
          <PlateToolbarBlockSelect editor={editor} />
          <PlateToolbarButton label="Decrease font size" onPress={() => updateFontSize(-FONT_SIZE_STEP)}><Minus className="size-4" /></PlateToolbarButton>
          <div className="flex h-8 min-w-10 shrink-0 items-center justify-center rounded-md px-2 text-sm font-medium text-[#18181b]" style={PLATE_TOOLBAR_NO_DRAG_STYLE}>{fontSize}</div>
          <PlateToolbarButton label="Increase font size" onPress={() => updateFontSize(FONT_SIZE_STEP)}><Plus className="size-4" /></PlateToolbarButton>
        </div>

        <PlateToolbarSeparator />

        <div className="flex items-center">
          {PLATE_MARK_OPTIONS.map((option) => <PlateToolbarButton key={option.mark} label={option.label} onPress={() => togglePlateMark(editor, option.mark, option.fallback)}>{option.icon}</PlateToolbarButton>)}
          <PlateToolbarButton label="Text color" onPress={() => setTextColor(editor)}><Baseline className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Background color" onPress={() => setBackgroundColor(editor)}><PaintBucket className="size-4" /></PlateToolbarButton>
        </div>

        <PlateToolbarSeparator />

        <div className="flex items-center">
          <PlateToolbarButton label="Align" onPress={applyNextAlign}><AlignLeft className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Numbered list" onPress={() => insertPlateNodes(editor, createListNode("ol"))}><ListOrdered className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Bulleted list" onPress={() => insertPlateNodes(editor, createListNode("ul"))}><List className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Todo list" onPress={() => insertPlateNodes(editor, createTodoNode())}><ListTodo className="size-4" /></PlateToolbarButton>
        </div>

        <PlateToolbarSeparator />

        <div className="flex items-center">
          <PlateToolbarButton label="Link" onPress={() => insertLink(editor)}><Link className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Table" onPress={handleTableInsert}><Table className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Emoji" onPress={() => insertPlateText(editor, typeof window === "undefined" ? "😊" : window.prompt("絵文字", "😊") ?? "😊")}><Smile className="size-4" /></PlateToolbarButton>
        </div>

        <PlateToolbarSeparator />

        <div className="flex items-center">
          <PlateToolbarButton label="Image" onPress={() => imageInputRef.current?.click()}><Image className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Video" onPress={() => videoInputRef.current?.click()}><Film className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Audio" onPress={() => audioInputRef.current?.click()}><FileAudio className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="File" onPress={() => fileInputRef.current?.click()}><File className="size-4" /></PlateToolbarButton>
        </div>

        <PlateToolbarSeparator />

        <div className="flex items-center">
          <PlateToolbarButton label="Highlight" onPress={() => setPlateMark(editor, "backgroundColor", PLATE_HIGHLIGHT_COLOR, { command: "hiliteColor", value: PLATE_HIGHLIGHT_COLOR })}><Highlighter className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Comment" onPress={() => addComment(editor)}><MessageSquare className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Line height" onPress={applyNextLineHeight}><CircleSlash className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Outdent" onPress={() => runPlateTransform(editor, "outdent", [], { command: "outdent" })}><Outdent className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="Indent" onPress={() => runPlateTransform(editor, "indent", [], { command: "indent" })}><Indent className="size-4" /></PlateToolbarButton>
          <PlateToolbarButton label="More" onPress={() => runMoreCommand(editor)}><MoreHorizontal className="size-4" /></PlateToolbarButton>
        </div>
      </div>
    </div>
  );
};

const NOTE_PLATE_COMPONENTS = {
  audio: AudioElement,
  backgroundColor: StyledLeaf,
  blockquote: BlockquoteElement,
  bold: StrongLeaf,
  code: CodeLeaf,
  color: StyledLeaf,
  comment: StyledLeaf,
  file: FileElement,
  fontSize: StyledLeaf,
  h1: H1Element,
  h2: H2Element,
  h3: H3Element,
  highlight: StyledLeaf,
  hr: HorizontalRuleElement,
  image: ImageElement,
  italic: ItalicLeaf,
  li: ListItemElement,
  link: LinkLeaf,
  ol: OrderedListElement,
  p: ParagraphElement,
  strikethrough: StrikethroughLeaf,
  table: TableElement,
  td: TableCellElement,
  th: TableCellElement,
  todo: TodoElement,
  tr: TableRowElement,
  ul: UnorderedListElement,
  underline: UnderlineLeaf,
  video: VideoElement,
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
