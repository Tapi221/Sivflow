import { AlignLeft, ArrowUpToLine, Baseline, Bold, ChevronDown, CircleSlash, Code2, File, FileAudio, Film, Highlighter, Image, Indent, Italic, Link, List, ListOrdered, ListTodo, MessageSquare, Minus, MoreHorizontal, Outdent, PaintBucket, Plus, Redo2, Smile, Strikethrough, Table, Underline, Undo2, WandSparkles } from "lucide-react";
import { Plate, PlateContainer, PlateContent, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { generateOllamaAnswer } from "@platform/ai/ollamaClient";
import type { Note, NoteBlockContent } from "@/types";
import { NOTE_PLATE_PLUGINS, PLATE_AUDIO_TYPE, PLATE_BACKGROUND_COLOR_MARK, PLATE_BULLETED_LIST_TYPE, PLATE_COLOR_MARK, PLATE_COMMENT_MARK, PLATE_FILE_TYPE, PLATE_FONT_SIZE_MARK, PLATE_IMAGE_TYPE, PLATE_LINK_TYPE, PLATE_LIST_ITEM_TYPE, PLATE_NUMBERED_LIST_TYPE, PLATE_TABLE_CELL_TYPE, PLATE_TABLE_ROW_TYPE, PLATE_TABLE_TYPE, PLATE_TODO_TYPE, PLATE_VIDEO_TYPE } from "./plateDocumentEditorOfficialPlugins";

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
  checked?: boolean;
  mimeType?: string;
  name?: string;
  url?: string;
  [key: string]: unknown;
};

type PlateNode = PlateElementNode | PlateTextNode;

type PlateChangePayload = unknown[] | {
  value?: unknown;
};

type PlateEditor = ReturnType<typeof usePlateEditor>;

type PlateBlockType = "blockquote" | "h1" | "h2" | "h3" | "p";

type PlateMediaType = "audio" | "file" | "image" | "video";

type PlateMarkType = "bold" | "code" | "italic" | "strikethrough" | "underline";

type ToolbarButtonProps = {
  label: string;
  children: ReactNode;
  onPress: () => Promise<void> | void;
};

type AppRegionStyle = CSSProperties & {
  WebkitAppRegion?: "no-drag";
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_VERSION = 2;
const DEFAULT_FONT_SIZE = 16;
const FONT_SIZE_STEP = 1;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 36;
const PLATE_HIGHLIGHT_COLOR = "#fef08a";
const TOOLBAR_NO_DRAG_STYLE: AppRegionStyle = { WebkitAppRegion: "no-drag" };
const TOOLBAR_BUTTON_CLASS_NAME = "inline-flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-transparent px-1.5 text-sm font-medium text-[#18181b] outline-none transition-colors hover:bg-[#f4f4f5] hover:text-[#52525b] focus-visible:ring-2 focus-visible:ring-[#d4d4d8] [&_svg]:pointer-events-none [&_svg]:shrink-0";
const BLOCK_OPTIONS: readonly { label: string; value: PlateBlockType }[] = [{ label: "Text", value: "p" }, { label: "Heading 1", value: "h1" }, { label: "Heading 2", value: "h2" }, { label: "Heading 3", value: "h3" }, { label: "Quote", value: "blockquote" }];
const MARK_OPTIONS: readonly { icon: ReactNode; label: string; mark: PlateMarkType }[] = [{ icon: <Bold className="size-4" />, label: "Bold", mark: "bold" }, { icon: <Italic className="size-4" />, label: "Italic", mark: "italic" }, { icon: <Underline className="size-4" />, label: "Underline", mark: "underline" }, { icon: <Strikethrough className="size-4" />, label: "Strikethrough", mark: "strikethrough" }, { icon: <Code2 className="size-4" />, label: "Code", mark: "code" }];
const ALIGN_VALUES = ["left", "center", "right", "justify"] as const;
const LINE_HEIGHT_VALUES = [1.5, 1.75, 2, 2.5] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isPlateTextNode = (value: unknown): value is PlateTextNode => isRecord(value) && typeof value.text === "string";

const isPlateElementNode = (value: unknown): value is PlateElementNode => isRecord(value) && typeof value.type === "string" && Array.isArray(value.children);

const getTextFromLegacyContent = (content: unknown): string => Array.isArray(content) ? content.map((item) => isRecord(item) && typeof item.text === "string" ? item.text : "").join("") : "";

const getNodeText = (node: unknown): string => {
  if (isPlateTextNode(node)) return node.text;
  if (!isRecord(node) || !Array.isArray(node.children)) return "";
  return node.children.map(getNodeText).join("");
};

const getPlainText = (nodes: unknown[]): string => nodes.map(getNodeText).filter(Boolean).join("\n");

const createEmptyValue = (): PlateElementNode[] => [{ type: "p", children: [{ text: "" }] }];

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

const getTransform = (editor: PlateEditor, name: string): ((...args: unknown[]) => unknown) | null => {
  const transform = (editor as { tf?: Record<string, unknown> }).tf?.[name];
  return typeof transform === "function" ? transform as (...args: unknown[]) => unknown : null;
};

const runTransform = (editor: PlateEditor, name: string, args: unknown[] = []) => {
  getTransform(editor, "focus")?.();
  const transform = getTransform(editor, name);
  if (!transform) return false;
  transform(...args);
  getTransform(editor, "focus")?.();
  return true;
};

const addMark = (editor: PlateEditor, mark: string, value: unknown) => runTransform(editor, "addMark", [mark, value]) || runTransform(editor, "setMarks", [{ [mark]: value }]);

const removeMark = (editor: PlateEditor, mark: string) => runTransform(editor, "removeMark", [mark]);

const setBlock = (editor: PlateEditor, data: Partial<PlateElementNode>) => runTransform(editor, "setNodes", [data, { match: (node: unknown) => isRecord(node) && Array.isArray(node.children) }]);

const insertNodes = (editor: PlateEditor, nodes: PlateElementNode | PlateElementNode[]) => runTransform(editor, "insertNodes", [nodes]);

const insertText = (editor: PlateEditor, text: string) => runTransform(editor, "insertText", [text]);

const clampFontSize = (value: number) => Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, value));

const normalizeUrl = (url: string) => /^(blob:|data:|https?:\/\/|mailto:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;

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

const getEditorValue = (editor: PlateEditor): unknown[] => Array.isArray((editor as { children?: unknown }).children) ? (editor as { children: unknown[] }).children : [];

const exportPlateDocument = (editor: PlateEditor) => {
  const value = getEditorValue(editor);
  const url = URL.createObjectURL(new Blob([JSON.stringify({ content: value, contentText: getPlainText(value), contentVersion: NOTE_CONTENT_VERSION, editor: "plate" }, null, 2)], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `sivflow-note-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const createListNode = (type: string): PlateElementNode => ({ type, children: [{ type: PLATE_LIST_ITEM_TYPE, children: [{ text: "List item" }] }] });

const createTodoNode = (): PlateElementNode => ({ type: PLATE_TODO_TYPE, checked: false, children: [{ text: "Todo" }] });

const createTableNode = (rows: number, columns: number): PlateElementNode => ({ type: PLATE_TABLE_TYPE, children: Array.from({ length: rows }, () => ({ type: PLATE_TABLE_ROW_TYPE, children: Array.from({ length: columns }, () => ({ type: PLATE_TABLE_CELL_TYPE, children: [{ type: "p", children: [{ text: "" }] }] })) })) });

const createMediaNode = (type: PlateMediaType, file: globalThis.File, url: string): PlateElementNode => ({ type: type === "image" ? PLATE_IMAGE_TYPE : type === "video" ? PLATE_VIDEO_TYPE : type === "audio" ? PLATE_AUDIO_TYPE : PLATE_FILE_TYPE, children: [{ text: "" }], mimeType: file.type, name: file.name, url });

const runAiCommand = async (editor: PlateEditor) => {
  const question = window.prompt("AIに渡す指示を入力")?.trim();
  if (!question) return;
  try {
    const result = await generateOllamaAnswer({ question });
    insertNodes(editor, { type: "blockquote", children: [{ text: result.answer }] });
  } catch {
    window.alert("ローカルAIに接続できませんでした。Ollamaの起動状態とモデル設定を確認してください。");
  }
};

const ToolbarButton = ({ label, children, onPress }: ToolbarButtonProps) => {
  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    void onPress();
  };
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return;
    event.preventDefault();
    void onPress();
  };
  return <button type="button" aria-label={label} title={label} className={TOOLBAR_BUTTON_CLASS_NAME} style={TOOLBAR_NO_DRAG_STYLE} onMouseDown={handleMouseDown} onClick={handleClick}>{children}</button>;
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
    const next = clampFontSize(fontSize + delta);
    setFontSize(next);
    addMark(editor, PLATE_FONT_SIZE_MARK, next);
  };

  const updateAlign = () => {
    const next = (alignIndex + 1) % ALIGN_VALUES.length;
    setAlignIndex(next);
    setBlock(editor, { align: ALIGN_VALUES[next] });
  };

  const updateLineHeight = () => {
    const next = (lineHeightIndex + 1) % LINE_HEIGHT_VALUES.length;
    setLineHeightIndex(next);
    setBlock(editor, { lineHeight: LINE_HEIGHT_VALUES[next] });
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

  return (
    <div className="scrollbar-hide sticky left-0 top-0 z-50 flex min-h-10 w-full shrink-0 items-center justify-between overflow-x-auto rounded-t-lg border-b border-[#e4e4e7] bg-white/95 p-1 backdrop-blur-sm" style={TOOLBAR_NO_DRAG_STYLE}>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleFileInputChange("image", event)} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(event) => void handleFileInputChange("video", event)} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void handleFileInputChange("audio", event)} />
      <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => void handleFileInputChange("file", event)} />
      <div className="flex min-w-max items-center">
        <ToolbarButton label="Undo" onPress={() => runTransform(editor, "undo")}><Undo2 className="size-4" /></ToolbarButton>
        <ToolbarButton label="Redo" onPress={() => runTransform(editor, "redo")}><Redo2 className="size-4" /></ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton label="AI commands" onPress={() => runAiCommand(editor)}><WandSparkles className="size-4" /></ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton label="Export" onPress={() => exportPlateDocument(editor)}><ArrowUpToLine className="size-4" /></ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton label="Insert paragraph" onPress={() => insertNodes(editor, { type: "p", children: [{ text: "" }] })}><Plus className="size-4" /></ToolbarButton>
        <div className="relative flex h-8 shrink-0 items-center rounded-md hover:bg-[#f4f4f5]" style={TOOLBAR_NO_DRAG_STYLE}>
          <select className="h-8 w-[132px] appearance-none rounded-md border border-transparent bg-transparent px-3 pr-7 text-sm font-medium text-[#18181b] outline-none" defaultValue="p" aria-label="Turn into" onChange={(event) => setBlock(editor, { type: event.target.value as PlateBlockType })}>
            {BLOCK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-[#71717a]" />
        </div>
        <ToolbarButton label="Decrease font size" onPress={() => updateFontSize(-FONT_SIZE_STEP)}><Minus className="size-4" /></ToolbarButton>
        <div className="flex h-8 min-w-10 shrink-0 items-center justify-center rounded-md px-2 text-sm font-medium text-[#18181b]" style={TOOLBAR_NO_DRAG_STYLE}>{fontSize}</div>
        <ToolbarButton label="Increase font size" onPress={() => updateFontSize(FONT_SIZE_STEP)}><Plus className="size-4" /></ToolbarButton>
        <ToolbarSeparator />
        {MARK_OPTIONS.map((option) => <ToolbarButton key={option.mark} label={option.label} onPress={() => runTransform(editor, "toggleMark", [option.mark])}>{option.icon}</ToolbarButton>)}
        <ToolbarButton label="Text color" onPress={() => { const color = window.prompt("文字色", "#18181b")?.trim(); if (color) addMark(editor, PLATE_COLOR_MARK, color); }}><Baseline className="size-4" /></ToolbarButton>
        <ToolbarButton label="Background color" onPress={() => { const color = window.prompt("背景色", PLATE_HIGHLIGHT_COLOR)?.trim(); if (color) addMark(editor, PLATE_BACKGROUND_COLOR_MARK, color); }}><PaintBucket className="size-4" /></ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton label="Align" onPress={updateAlign}><AlignLeft className="size-4" /></ToolbarButton>
        <ToolbarButton label="Numbered list" onPress={() => insertNodes(editor, createListNode(PLATE_NUMBERED_LIST_TYPE))}><ListOrdered className="size-4" /></ToolbarButton>
        <ToolbarButton label="Bulleted list" onPress={() => insertNodes(editor, createListNode(PLATE_BULLETED_LIST_TYPE))}><List className="size-4" /></ToolbarButton>
        <ToolbarButton label="Todo list" onPress={() => insertNodes(editor, createTodoNode())}><ListTodo className="size-4" /></ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton label="Link" onPress={() => { const url = window.prompt("リンクURL")?.trim(); if (url) insertNodes(editor, { type: PLATE_LINK_TYPE, url: normalizeUrl(url), children: [{ text: window.prompt("リンク文字", url) ?? url }] }); }}><Link className="size-4" /></ToolbarButton>
        <ToolbarButton label="Table" onPress={() => { const { columns, rows } = parseTableDimensions(window.prompt("表のサイズ", "3x3")); insertNodes(editor, createTableNode(rows, columns)); }}><Table className="size-4" /></ToolbarButton>
        <ToolbarButton label="Emoji" onPress={() => insertText(editor, window.prompt("絵文字", "😊") ?? "😊")}><Smile className="size-4" /></ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton label="Image" onPress={() => imageInputRef.current?.click()}><Image className="size-4" /></ToolbarButton>
        <ToolbarButton label="Video" onPress={() => videoInputRef.current?.click()}><Film className="size-4" /></ToolbarButton>
        <ToolbarButton label="Audio" onPress={() => audioInputRef.current?.click()}><FileAudio className="size-4" /></ToolbarButton>
        <ToolbarButton label="File" onPress={() => fileInputRef.current?.click()}><File className="size-4" /></ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton label="Highlight" onPress={() => addMark(editor, PLATE_BACKGROUND_COLOR_MARK, PLATE_HIGHLIGHT_COLOR)}><Highlighter className="size-4" /></ToolbarButton>
        <ToolbarButton label="Comment" onPress={() => { const comment = window.prompt("コメント")?.trim(); if (comment) addMark(editor, PLATE_COMMENT_MARK, comment); }}><MessageSquare className="size-4" /></ToolbarButton>
        <ToolbarButton label="Line height" onPress={updateLineHeight}><CircleSlash className="size-4" /></ToolbarButton>
        <ToolbarButton label="Outdent" onPress={() => runTransform(editor, "outdent")}><Outdent className="size-4" /></ToolbarButton>
        <ToolbarButton label="Indent" onPress={() => runTransform(editor, "indent")}><Indent className="size-4" /></ToolbarButton>
        <ToolbarButton label="More" onPress={() => { [PLATE_BACKGROUND_COLOR_MARK, PLATE_COLOR_MARK, PLATE_COMMENT_MARK, PLATE_FONT_SIZE_MARK, "bold", "code", "highlight", "italic", "strikethrough", "underline"].forEach((mark) => removeMark(editor, mark)); }}><MoreHorizontal className="size-4" /></ToolbarButton>
      </div>
    </div>
  );
};

const PlateDocumentEditor = ({ note, onChange }: PlateDocumentEditorProps) => {
  const initialValue = useMemo(() => toInitialValue(note.content), [note.content]);
  const editor = usePlateEditor({ plugins: NOTE_PLATE_PLUGINS as never, value: initialValue });
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
            <Toolbar editor={editor} />
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
