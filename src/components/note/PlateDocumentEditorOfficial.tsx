import { AlignLeft, ArrowUpToLine, Baseline, Bold, ChevronDown, CircleSlash, Code2, File, FileAudio, Film, Highlighter, Image, Indent, Italic, Link, List, ListOrdered, ListTodo, MessageSquare, Minus, MoreHorizontal, Outdent, PaintBucket, Plus, Redo2, Smile, Strikethrough, Table, Underline, Undo2, WandSparkles } from "lucide-react";
import { Plate, PlateContainer, PlateContent, PlateElement, PlateLeaf, usePlateEditor, type PlateElementProps, type PlateLeafProps } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { generateOllamaAnswer } from "@platform/ai/ollamaClient";
import type { Note, NoteBlockContent } from "@/types";
import { NOTE_PLATE_PLUGINS, PLATE_AUDIO_TYPE, PLATE_BACKGROUND_COLOR_MARK, PLATE_BULLETED_LIST_TYPE, PLATE_COLOR_MARK, PLATE_COMMENT_MARK, PLATE_FILE_TYPE, PLATE_FONT_SIZE_MARK, PLATE_IMAGE_TYPE, PLATE_LINK_TYPE, PLATE_LIST_ITEM_TYPE, PLATE_NUMBERED_LIST_TYPE, PLATE_TABLE_CELL_TYPE, PLATE_TABLE_HEADER_CELL_TYPE, PLATE_TABLE_ROW_TYPE, PLATE_TABLE_TYPE, PLATE_TODO_TYPE, PLATE_VIDEO_TYPE } from "./plateDocumentEditorOfficialPlugins";

type PlateDocumentEditorProps = { note: Note; onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void> };
type PlateTextNode = { text: string; [key: string]: unknown };
type PlateElementNode = { type: string; children: PlateNode[]; align?: string; checked?: boolean; indent?: number; lineHeight?: number; mimeType?: string; name?: string; url?: string; [key: string]: unknown };
type PlateNode = PlateTextNode | PlateElementNode;
type PlateEditor = ReturnType<typeof usePlateEditor>;
type PlateBlockType = "blockquote" | "h1" | "h2" | "h3" | "p";
type PlateMarkType = "bold" | "code" | "italic" | "strikethrough" | "underline";
type PlateMediaType = "audio" | "file" | "image" | "video";
type PlateChangePayload = unknown[] | { value?: unknown };
type PlateToolbarButtonProps = { label: string; children: ReactNode; onPress: () => Promise<void> | void; disabled?: boolean };
type AppRegionStyle = CSSProperties & { WebkitAppRegion?: "no-drag" };
type PlateElementRendererProps = PlateElementProps & { children?: ReactNode; element?: unknown };
type PlateLeafRendererProps = PlateLeafProps & { leaf?: unknown };

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_VERSION = 2;
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 36;
const FONT_SIZE_STEP = 1;
const PLATE_HIGHLIGHT_COLOR = "#fef08a";
const PLATE_ALIGN_VALUES = ["left", "center", "right", "justify"] as const;
const PLATE_LINE_HEIGHT_VALUES = [1.5, 1.75, 2, 2.5] as const;
const PLATE_BLOCK_OPTIONS: readonly { label: string; value: PlateBlockType }[] = [{ label: "Text", value: "p" }, { label: "Heading 1", value: "h1" }, { label: "Heading 2", value: "h2" }, { label: "Heading 3", value: "h3" }, { label: "Quote", value: "blockquote" }];
const PLATE_MARK_OPTIONS: readonly { icon: ReactNode; label: string; mark: PlateMarkType }[] = [{ icon: <Bold className="size-4" />, label: "Bold", mark: "bold" }, { icon: <Italic className="size-4" />, label: "Italic", mark: "italic" }, { icon: <Underline className="size-4" />, label: "Underline", mark: "underline" }, { icon: <Strikethrough className="size-4" />, label: "Strikethrough", mark: "strikethrough" }, { icon: <Code2 className="size-4" />, label: "Code", mark: "code" }];
const TOOLBAR_BUTTON_CLASS_NAME = "inline-flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-transparent px-1.5 text-sm font-medium text-[#18181b] outline-none transition-colors hover:bg-[#f4f4f5] hover:text-[#52525b] focus-visible:ring-2 focus-visible:ring-[#d4d4d8] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#18181b] [&_svg]:pointer-events-none [&_svg]:shrink-0";
const TOOLBAR_NO_DRAG_STYLE: AppRegionStyle = { WebkitAppRegion: "no-drag" };
const TOOLBAR_UNAVAILABLE_TITLE = "この操作は現在使用できません";

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isPlateTextNode = (value: unknown): value is PlateTextNode => isRecord(value) && typeof value.text === "string";
const isPlateElementNode = (value: unknown): value is PlateElementNode => isRecord(value) && typeof value.type === "string" && Array.isArray(value.children);
const createEmptyValue = (): PlateElementNode[] => [{ type: "p", children: [{ text: "" }] }];
const getNodeText = (node: unknown): string => isPlateTextNode(node) ? node.text : isRecord(node) && Array.isArray(node.children) ? node.children.map(getNodeText).join("") : "";
const getPlainText = (nodes: unknown[]): string => nodes.map(getNodeText).filter(Boolean).join("\n");
const getChangeValue = (change: PlateChangePayload): unknown[] | null => Array.isArray(change) ? change : isRecord(change) && Array.isArray(change.value) ? change.value : null;
const toInitialValue = (content: NoteBlockContent | undefined): PlateElementNode[] => Array.isArray(content) && content.every(isPlateElementNode) ? content as PlateElementNode[] : createEmptyValue();
const getTransform = (editor: PlateEditor, name: string): ((...args: unknown[]) => unknown) | null => {
  const transform = (editor as { tf?: Record<string, unknown> }).tf?.[name];
  return typeof transform === "function" ? transform as (...args: unknown[]) => unknown : null;
};
const focusEditor = (editor: PlateEditor) => {
  getTransform(editor, "focus")?.();
};
const runTransform = (editor: PlateEditor, name: string, args: unknown[] = []) => {
  focusEditor(editor);
  const transform = getTransform(editor, name);
  if (!transform) return false;
  transform(...args);
  focusEditor(editor);
  return true;
};
const insertNodes = (editor: PlateEditor, nodes: PlateElementNode | PlateElementNode[]) => runTransform(editor, "insertNodes", [nodes]);
const insertText = (editor: PlateEditor, text: string) => runTransform(editor, "insertText", [text]);
const setBlockData = (editor: PlateEditor, data: Partial<PlateElementNode>) => runTransform(editor, "setNodes", [data, { match: (node: unknown) => isRecord(node) && Array.isArray(node.children) }]);
const setMark = (editor: PlateEditor, mark: string, value: unknown) => runTransform(editor, "addMark", [mark, value]) || runTransform(editor, "setMarks", [{ [mark]: value }]);
const removeMark = (editor: PlateEditor, mark: string) => runTransform(editor, "removeMark", [mark]);
const clampFontSize = (value: number): number => Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, value));
const normalizeUrl = (value: string): string => /^(blob:|data:|https?:\/\/|mailto:)/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
const parseTableDimensions = (value: string | null): { columns: number; rows: number } => {
  const [rowsValue, columnsValue] = value?.toLowerCase().split(/[x×,\s]+/).filter(Boolean) ?? [];
  const rows = Number.parseInt(rowsValue ?? "", 10);
  const columns = Number.parseInt(columnsValue ?? "", 10);
  return { columns: Number.isFinite(columns) && columns > 0 ? Math.min(columns, 12) : 3, rows: Number.isFinite(rows) && rows > 0 ? Math.min(rows, 12) : 3 };
};
const readFileAsDataUrl = (file: globalThis.File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener("load", () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("FILE_READER_RESULT_NOT_STRING")));
  reader.addEventListener("error", () => reject(reader.error ?? new Error("FILE_READER_ERROR")));
  reader.readAsDataURL(file);
});
const createListNode = (type: string): PlateElementNode => ({ type, children: [{ type: PLATE_LIST_ITEM_TYPE, children: [{ text: "List item" }] }] });
const createTodoNode = (): PlateElementNode => ({ type: PLATE_TODO_TYPE, checked: false, children: [{ text: "Todo" }] });
const createTableNode = (rows: number, columns: number): PlateElementNode => ({ type: PLATE_TABLE_TYPE, children: Array.from({ length: rows }, () => ({ type: PLATE_TABLE_ROW_TYPE, children: Array.from({ length: columns }, () => ({ type: PLATE_TABLE_CELL_TYPE, children: [{ type: "p", children: [{ text: "" }] }] })) })) });
const createMediaNode = (type: PlateMediaType, file: globalThis.File, url: string): PlateElementNode => ({ type: type === "image" ? PLATE_IMAGE_TYPE : type === "video" ? PLATE_VIDEO_TYPE : type === "audio" ? PLATE_AUDIO_TYPE : PLATE_FILE_TYPE, children: [{ text: "" }], mimeType: file.type, name: file.name, url });
const getElementUrl = (element: unknown): string => isRecord(element) && typeof element.url === "string" ? element.url : "";
const getElementName = (element: unknown, fallback: string): string => isRecord(element) && typeof element.name === "string" ? element.name : fallback;
const getElementStyle = (element: unknown): CSSProperties | undefined => {
  if (!isRecord(element)) return undefined;
  const style: CSSProperties = {};
  if (typeof element.align === "string") style.textAlign = element.align as CSSProperties["textAlign"];
  if (typeof element.indent === "number" && element.indent > 0) style.marginLeft = `${Math.min(element.indent, 8) * 28}px`;
  if (typeof element.lineHeight === "number") style.lineHeight = String(element.lineHeight);
  return Object.keys(style).length > 0 ? style : undefined;
};
const getLeafStyle = (leaf: unknown): CSSProperties | undefined => {
  if (!isRecord(leaf)) return undefined;
  const style: CSSProperties = {};
  if (typeof leaf[PLATE_COLOR_MARK] === "string") style.color = leaf[PLATE_COLOR_MARK];
  if (typeof leaf[PLATE_BACKGROUND_COLOR_MARK] === "string") style.backgroundColor = leaf[PLATE_BACKGROUND_COLOR_MARK];
  if (typeof leaf[PLATE_FONT_SIZE_MARK] === "number") style.fontSize = `${clampFontSize(leaf[PLATE_FONT_SIZE_MARK])}px`;
  if (typeof leaf[PLATE_COMMENT_MARK] === "string" && leaf[PLATE_COMMENT_MARK].trim()) style.borderBottom = "1px dotted currentColor";
  return Object.keys(style).length > 0 ? style : undefined;
};
const getLeafComment = (leaf: unknown): string | undefined => isRecord(leaf) && typeof leaf[PLATE_COMMENT_MARK] === "string" ? leaf[PLATE_COMMENT_MARK] : undefined;
const runLocalAiCommand = async (editor: PlateEditor) => {
  const question = window.prompt("AIに渡す指示を入力")?.trim();
  if (!question) return;
  try {
    const result = await generateOllamaAnswer({ question });
    insertNodes(editor, { type: "blockquote", children: [{ text: result.answer }] });
  } catch {
    window.alert("ローカルAIに接続できませんでした。Ollamaの起動状態とモデル設定を確認してください。");
  }
};
const exportPlateDocument = (editor: PlateEditor) => {
  const value = Array.isArray((editor as { children?: unknown }).children) ? (editor as { children: unknown[] }).children : [];
  const blobUrl = URL.createObjectURL(new Blob([JSON.stringify({ content: value, contentText: getPlainText(value), contentVersion: NOTE_CONTENT_VERSION, editor: "plate" }, null, 2)], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = `sivflow-note-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
};
const insertLink = (editor: PlateEditor) => {
  const url = window.prompt("リンクURL")?.trim();
  if (!url) return;
  insertNodes(editor, { type: PLATE_LINK_TYPE, url: normalizeUrl(url), children: [{ text: window.prompt("リンク文字", url) ?? url }] });
};
const clearFormatting = (editor: PlateEditor) => {
  [PLATE_BACKGROUND_COLOR_MARK, PLATE_COLOR_MARK, PLATE_COMMENT_MARK, PLATE_FONT_SIZE_MARK, "bold", "code", "highlight", "italic", "strikethrough", "underline"].forEach((mark) => removeMark(editor, mark));
  setBlockData(editor, { align: "left", indent: 0, lineHeight: PLATE_LINE_HEIGHT_VALUES[1], type: "p" });
};

const ParagraphElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="p" className="my-2 min-h-[1.75rem] px-0 py-0 text-[17px] leading-8 text-[#18181b]" style={getElementStyle(props.element)} />;
const H1Element = (props: PlateElementRendererProps) => <PlateElement {...props} as="h1" className="mb-4 mt-8 text-[34px] font-semibold leading-tight tracking-[-0.04em] text-[#09090b]" style={getElementStyle(props.element)} />;
const H2Element = (props: PlateElementRendererProps) => <PlateElement {...props} as="h2" className="mb-3 mt-7 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#09090b]" style={getElementStyle(props.element)} />;
const H3Element = (props: PlateElementRendererProps) => <PlateElement {...props} as="h3" className="mb-2 mt-6 text-[22px] font-semibold leading-snug tracking-[-0.03em] text-[#09090b]" style={getElementStyle(props.element)} />;
const BlockquoteElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="blockquote" className="my-4 border-l-4 border-[#d4d4d8] pl-4 text-[#52525b]" style={getElementStyle(props.element)} />;
const ListElement = (props: PlateElementRendererProps) => <PlateElement {...props} as={isRecord(props.element) && props.element.type === PLATE_NUMBERED_LIST_TYPE ? "ol" : "ul"} className="my-3 list-inside text-[17px] leading-8 text-[#18181b]" style={getElementStyle(props.element)} />;
const ListItemElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="li" className="pl-1" />;
const TodoElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="div" className="my-2 flex items-start gap-2 text-[17px] leading-8 text-[#18181b]" style={getElementStyle(props.element)}><input type="checkbox" checked={isRecord(props.element) && props.element.checked === true} readOnly className="mt-[0.45rem] size-4 shrink-0 accent-[#18181b]" contentEditable={false} /><span>{props.children}</span></PlateElement>;
const TableElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="table" className="my-4 w-full border-collapse text-left text-[15px] text-[#18181b]" style={getElementStyle(props.element)}><tbody>{props.children}</tbody></PlateElement>;
const TableRowElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="tr" className="border-b border-[#e4e4e7]" />;
const TableCellElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="td" className="min-w-24 border border-[#e4e4e7] px-3 py-2 align-top" />;
const HrElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="div" className="my-6 border-t border-[#d4d4d8]" contentEditable={false} />;
const LinkElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="span" className="text-[#2563eb] underline underline-offset-4" title={getElementUrl(props.element)} />;
const ImageElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="figure" className="my-4 rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-2"><div contentEditable={false}>{getElementUrl(props.element) ? <img src={getElementUrl(props.element)} alt={getElementName(props.element, "image")} className="max-h-[420px] w-full rounded-md object-contain" /> : null}<figcaption className="mt-2 text-center text-xs text-[#71717a]">{getElementName(props.element, "image")}</figcaption></div>{props.children}</PlateElement>;
const VideoElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="div" className="my-4 rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-2"><div contentEditable={false}>{getElementUrl(props.element) ? <video src={getElementUrl(props.element)} controls className="max-h-[420px] w-full rounded-md" /> : null}<div className="mt-2 text-center text-xs text-[#71717a]">{getElementName(props.element, "video")}</div></div>{props.children}</PlateElement>;
const AudioElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="div" className="my-4 rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-3"><div contentEditable={false}><div className="mb-2 text-sm font-medium text-[#18181b]">{getElementName(props.element, "audio")}</div>{getElementUrl(props.element) ? <audio src={getElementUrl(props.element)} controls className="w-full" /> : null}</div>{props.children}</PlateElement>;
const FileElement = (props: PlateElementRendererProps) => <PlateElement {...props} as="div" className="my-4 rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-3"><div contentEditable={false}><span className="inline-flex items-center gap-2 text-sm font-medium text-[#2563eb]"><File className="size-4" />{getElementName(props.element, "file")}</span></div>{props.children}</PlateElement>;
const StyledLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="span" style={getLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;
const StrongLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="strong" style={getLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;
const ItalicLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="em" style={getLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;
const UnderlineLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="u" style={getLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;
const StrikethroughLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="s" style={getLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;
const CodeLeaf = (props: PlateLeafRendererProps) => <PlateLeaf {...props} as="code" className="rounded-[5px] bg-[#f4f4f5] px-1 py-0.5 font-mono text-[0.92em] text-[#18181b]" style={getLeafStyle(props.leaf)} title={getLeafComment(props.leaf)} />;
const ToolbarButton = ({ label, children, onPress, disabled = false }: PlateToolbarButtonProps) => {
  const title = disabled ? `${label}: ${TOOLBAR_UNAVAILABLE_TITLE}` : label;
  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!disabled) void onPress();
  };
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return;
    event.preventDefault();
    if (!disabled) void onPress();
  };
  return <button type="button" aria-label={label} title={title} className={TOOLBAR_BUTTON_CLASS_NAME} style={TOOLBAR_NO_DRAG_STYLE} disabled={disabled} onMouseDown={handleMouseDown} onClick={handleClick}>{children}</button>;
};
const ToolbarSeparator = () => <div className="mx-1.5 h-7 w-px shrink-0 bg-[#e4e4e7]" />;
const Toolbar = ({ editor }: { editor: PlateEditor }) => {
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
    setMark(editor, PLATE_FONT_SIZE_MARK, nextFontSize);
  };
  const updateAlign = () => {
    const nextIndex = (alignIndex + 1) % PLATE_ALIGN_VALUES.length;
    setAlignIndex(nextIndex);
    setBlockData(editor, { align: PLATE_ALIGN_VALUES[nextIndex] });
  };
  const updateLineHeight = () => {
    const nextIndex = (lineHeightIndex + 1) % PLATE_LINE_HEIGHT_VALUES.length;
    setLineHeightIndex(nextIndex);
    setBlockData(editor, { lineHeight: PLATE_LINE_HEIGHT_VALUES[nextIndex] });
  };
  const handleFileInputChange = async (type: PlateMediaType, event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      insertNodes(editor, createMediaNode(type, file, await readFileAsDataUrl(file)));
    } finally {
      input.value = "";
    }
  };
  return <div className="scrollbar-hide sticky left-0 top-0 z-50 flex min-h-10 w-full shrink-0 items-center justify-between overflow-x-auto rounded-t-lg border-b border-[#e4e4e7] bg-white/95 p-1 backdrop-blur-sm" style={TOOLBAR_NO_DRAG_STYLE}><input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleFileInputChange("image", event)} /><input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(event) => void handleFileInputChange("video", event)} /><input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void handleFileInputChange("audio", event)} /><input ref={fileInputRef} type="file" className="hidden" onChange={(event) => void handleFileInputChange("file", event)} /><div className="flex min-w-max items-center"><ToolbarButton label="Undo" onPress={() => runTransform(editor, "undo")}><Undo2 className="size-4" /></ToolbarButton><ToolbarButton label="Redo" onPress={() => runTransform(editor, "redo")}><Redo2 className="size-4" /></ToolbarButton><ToolbarSeparator /><ToolbarButton label="AI commands" onPress={() => runLocalAiCommand(editor)}><WandSparkles className="size-4" /></ToolbarButton><ToolbarSeparator /><ToolbarButton label="Export" onPress={() => exportPlateDocument(editor)}><ArrowUpToLine className="size-4" /></ToolbarButton><ToolbarSeparator /><ToolbarButton label="Insert paragraph" onPress={() => insertNodes(editor, { type: "p", children: [{ text: "" }] })}><Plus className="size-4" /></ToolbarButton><div className="relative flex h-8 shrink-0 items-center rounded-md hover:bg-[#f4f4f5]" style={TOOLBAR_NO_DRAG_STYLE}><select className="h-8 w-[132px] appearance-none rounded-md border border-transparent bg-transparent px-3 pr-7 text-sm font-medium text-[#18181b] outline-none" defaultValue="p" aria-label="Turn into" onChange={(event) => setBlockData(editor, { type: event.target.value as PlateBlockType })}>{PLATE_BLOCK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-[#71717a]" /></div><ToolbarButton label="Decrease font size" onPress={() => updateFontSize(-FONT_SIZE_STEP)}><Minus className="size-4" /></ToolbarButton><div className="flex h-8 min-w-10 shrink-0 items-center justify-center rounded-md px-2 text-sm font-medium text-[#18181b]" style={TOOLBAR_NO_DRAG_STYLE}>{fontSize}</div><ToolbarButton label="Increase font size" onPress={() => updateFontSize(FONT_SIZE_STEP)}><Plus className="size-4" /></ToolbarButton><ToolbarSeparator />{PLATE_MARK_OPTIONS.map((option) => <ToolbarButton key={option.mark} label={option.label} onPress={() => runTransform(editor, "toggleMark", [option.mark])}>{option.icon}</ToolbarButton>)}<ToolbarButton label="Text color" onPress={() => { const color = window.prompt("文字色", "#18181b")?.trim(); if (color) setMark(editor, PLATE_COLOR_MARK, color); }}><Baseline className="size-4" /></ToolbarButton><ToolbarButton label="Background color" onPress={() => { const color = window.prompt("背景色", PLATE_HIGHLIGHT_COLOR)?.trim(); if (color) setMark(editor, PLATE_BACKGROUND_COLOR_MARK, color); }}><PaintBucket className="size-4" /></ToolbarButton><ToolbarSeparator /><ToolbarButton label="Align" onPress={updateAlign}><AlignLeft className="size-4" /></ToolbarButton><ToolbarButton label="Numbered list" onPress={() => insertNodes(editor, createListNode(PLATE_NUMBERED_LIST_TYPE))}><ListOrdered className="size-4" /></ToolbarButton><ToolbarButton label="Bulleted list" onPress={() => insertNodes(editor, createListNode(PLATE_BULLETED_LIST_TYPE))}><List className="size-4" /></ToolbarButton><ToolbarButton label="Todo list" onPress={() => insertNodes(editor, createTodoNode())}><ListTodo className="size-4" /></ToolbarButton><ToolbarSeparator /><ToolbarButton label="Link" onPress={() => insertLink(editor)}><Link className="size-4" /></ToolbarButton><ToolbarButton label="Table" onPress={() => { const { columns, rows } = parseTableDimensions(window.prompt("表のサイズ", "3x3")); insertNodes(editor, createTableNode(rows, columns)); }}><Table className="size-4" /></ToolbarButton><ToolbarButton label="Emoji" onPress={() => insertText(editor, window.prompt("絵文字", "😊") ?? "😊")}><Smile className="size-4" /></ToolbarButton><ToolbarSeparator /><ToolbarButton label="Image" onPress={() => imageInputRef.current?.click()}><Image className="size-4" /></ToolbarButton><ToolbarButton label="Video" onPress={() => videoInputRef.current?.click()}><Film className="size-4" /></ToolbarButton><ToolbarButton label="Audio" onPress={() => audioInputRef.current?.click()}><FileAudio className="size-4" /></ToolbarButton><ToolbarButton label="File" onPress={() => fileInputRef.current?.click()}><File className="size-4" /></ToolbarButton><ToolbarSeparator /><ToolbarButton label="Highlight" onPress={() => setMark(editor, PLATE_BACKGROUND_COLOR_MARK, PLATE_HIGHLIGHT_COLOR)}><Highlighter className="size-4" /></ToolbarButton><ToolbarButton label="Comment" onPress={() => { const comment = window.prompt("コメント")?.trim(); if (comment) setMark(editor, PLATE_COMMENT_MARK, comment); }}><MessageSquare className="size-4" /></ToolbarButton><ToolbarButton label="Line height" onPress={updateLineHeight}><CircleSlash className="size-4" /></ToolbarButton><ToolbarButton label="Outdent" onPress={() => runTransform(editor, "outdent")}><Outdent className="size-4" /></ToolbarButton><ToolbarButton label="Indent" onPress={() => runTransform(editor, "indent")}><Indent className="size-4" /></ToolbarButton><ToolbarButton label="More" onPress={() => { const command = window.prompt("more: date / divider / clear", "date")?.trim(); if (command === "date") insertText(editor, new Date().toLocaleString()); if (command === "divider") insertNodes(editor, { type: "hr", children: [{ text: "" }] }); if (command === "clear") clearFormatting(editor); }}><MoreHorizontal className="size-4" /></ToolbarButton></div></div>;
};

const NOTE_PLATE_COMPONENTS = { [PLATE_AUDIO_TYPE]: AudioElement, [PLATE_BACKGROUND_COLOR_MARK]: StyledLeaf, [PLATE_BULLETED_LIST_TYPE]: ListElement, [PLATE_COLOR_MARK]: StyledLeaf, [PLATE_COMMENT_MARK]: StyledLeaf, [PLATE_FILE_TYPE]: FileElement, [PLATE_FONT_SIZE_MARK]: StyledLeaf, [PLATE_IMAGE_TYPE]: ImageElement, [PLATE_LINK_TYPE]: LinkElement, [PLATE_LIST_ITEM_TYPE]: ListItemElement, [PLATE_NUMBERED_LIST_TYPE]: ListElement, [PLATE_TABLE_CELL_TYPE]: TableCellElement, [PLATE_TABLE_HEADER_CELL_TYPE]: TableCellElement, [PLATE_TABLE_ROW_TYPE]: TableRowElement, [PLATE_TABLE_TYPE]: TableElement, [PLATE_TODO_TYPE]: TodoElement, [PLATE_VIDEO_TYPE]: VideoElement, blockquote: BlockquoteElement, bold: StrongLeaf, code: CodeLeaf, h1: H1Element, h2: H2Element, h3: H3Element, highlight: StyledLeaf, hr: HrElement, italic: ItalicLeaf, p: ParagraphElement, strikethrough: StrikethroughLeaf, underline: UnderlineLeaf };

const PlateDocumentEditor = ({ note, onChange }: PlateDocumentEditorProps) => {
  const initialValue = useMemo(() => toInitialValue(note.content), [note.content]);
  const editor = usePlateEditor({ components: NOTE_PLATE_COMPONENTS, plugins: NOTE_PLATE_PLUGINS as never, value: initialValue });
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
  return <div className="h-full min-h-0 w-full overflow-y-auto bg-white text-[#18181b]"><Plate editor={editor} onChange={handleChange}><div className="px-4 py-10 lg:px-8"><div className="mx-auto min-h-[650px] w-full max-w-[1120px] overflow-hidden rounded-xl border border-[#e4e4e7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"><Toolbar editor={editor} /><div className="h-[650px] overflow-y-auto"><PlateContainer className="relative h-full w-full cursor-text select-text overflow-visible caret-[#18181b] selection:bg-[#bfdbfe]"><PlateContent className="h-full w-full overflow-x-hidden whitespace-pre-wrap break-words rounded-none border-0 bg-transparent px-16 pb-72 pt-4 text-base leading-8 text-[#18181b] outline-none focus:outline-none sm:px-[max(64px,calc(50%-350px))] [&_strong]:font-bold" disableDefaultStyles placeholder="本文を入力" spellCheck /></PlateContainer></div></div></div></Plate></div>;
};

export { PlateDocumentEditor };
