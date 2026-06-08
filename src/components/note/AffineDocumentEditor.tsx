import { useCallback, useEffect, useRef, useState } from "react";
import type { ClipboardEvent as ReactClipboardEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { Note, NoteBlockContent } from "@/types";

type AffineDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

type NoteBlockType = "paragraph" | "heading1" | "heading2" | "heading3" | "bulleted-list" | "numbered-list" | "todo" | "quote" | "callout" | "code" | "table" | "divider";

type NoteSerializedBlock = {
  type: NoteBlockType;
  text: string;
  checked?: boolean;
  rows?: string[][];
};

type NoteAffineRecord = {
  type: "affine-document";
  blocks: NoteSerializedBlock[];
  html: string;
  text: string;
  snapshot: unknown;
  updatedAt: string;
};

type ToolbarCommand = {
  label: string;
  title: string;
  blockType: NoteBlockType;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_TYPE = "affine-document";
const LEGACY_TEXT_CONTENT_TYPE = "sivflow-text-document";
const NOTE_EDITOR_ROOT_CLASS_NAME = "relative h-full min-h-0 w-full overflow-hidden bg-white px-8 pb-10 pt-14 text-[#202124]";
const NOTE_EDITOR_INNER_CLASS_NAME = "mx-auto flex h-full min-h-0 w-full max-w-[980px] flex-col gap-3";
const NOTE_EDITOR_TOOLBAR_CLASS_NAME = "flex min-h-10 shrink-0 flex-wrap items-center gap-1 rounded-[12px] border border-[rgba(32,33,36,0.08)] bg-[#f7f7f5]/95 px-2 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl";
const NOTE_EDITOR_TOOLBAR_BUTTON_CLASS_NAME = "flex h-7 min-w-7 items-center justify-center rounded-[8px] px-2 text-[12px] font-semibold leading-none tracking-[-0.01em] text-[#55524e] transition hover:bg-white hover:text-[#202124] active:scale-[0.98]";
const NOTE_EDITOR_BODY_CLASS_NAME = "relative min-h-0 flex-1 overflow-y-auto rounded-[18px] border border-[rgba(32,33,36,0.08)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]";
const NOTE_EDITOR_CONTENT_CLASS_NAME = "min-h-full w-full px-10 py-9 text-[16px] leading-7 tracking-[-0.01em] text-[#202124] outline-none [&_aside[data-sivflow-callout='true']]:my-4 [&_aside[data-sivflow-callout='true']]:flex [&_aside[data-sivflow-callout='true']]:gap-3 [&_aside[data-sivflow-callout='true']]:rounded-[14px] [&_aside[data-sivflow-callout='true']]:border [&_aside[data-sivflow-callout='true']]:border-[#ece4c9] [&_aside[data-sivflow-callout='true']]:bg-[#fff8df] [&_aside[data-sivflow-callout='true']]:px-4 [&_aside[data-sivflow-callout='true']]:py-3 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-[#d9d9d6] [&_blockquote]:pl-4 [&_blockquote]:text-[#5f6368] [&_code]:rounded [&_code]:bg-[#f1f3f4] [&_code]:px-1 [&_h1]:mb-4 [&_h1]:mt-2 [&_h1]:text-[34px] [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:tracking-[-0.04em] [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-[26px] [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:tracking-[-0.035em] [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-[20px] [&_h3]:font-semibold [&_h3]:leading-tight [&_h3]:tracking-[-0.025em] [&_hr]:my-5 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-[#e5e5e1] [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-[12px] [&_pre]:bg-[#f7f7f5] [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[13px] [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-[12px] [&_table]:text-[14px] [&_td]:min-w-[120px] [&_td]:border [&_td]:border-[#e5e5e1] [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:min-w-[120px] [&_th]:border [&_th]:border-[#e5e5e1] [&_th]:bg-[#f7f7f5] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_ul[data-sivflow-todo-list='true']]:my-3 [&_ul[data-sivflow-todo-list='true']]:list-none [&_ul[data-sivflow-todo-list='true']]:pl-0 [&_ul[data-sivflow-todo-list='true']_input]:mr-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6";
const NOTE_EDITOR_PLACEHOLDER_CLASS_NAME = "pointer-events-none absolute left-10 top-9 text-[16px] leading-7 tracking-[-0.01em] text-[#a6a6a2]";
const NOTE_EDITOR_SLASH_MENU_CLASS_NAME = "absolute left-6 top-16 z-20 w-[260px] rounded-[14px] border border-[rgba(32,33,36,0.08)] bg-white p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.14)]";
const NOTE_EDITOR_SLASH_ITEM_CLASS_NAME = "flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[13px] font-medium text-[#3c4043] hover:bg-[#f7f7f5]";
const NOTE_EDITOR_PLACEHOLDER = "本文を入力。/ で見出し・表・To-do・コールアウトを追加";
const EMPTY_PARAGRAPH_HTML = "<p><br></p>";
const DEFAULT_TABLE_ROWS = 3;
const DEFAULT_TABLE_COLUMNS = 3;

const TOOLBAR_COMMANDS: ToolbarCommand[] = [
  { label: "Text", title: "本文", blockType: "paragraph" },
  { label: "H1", title: "見出し1", blockType: "heading1" },
  { label: "H2", title: "見出し2", blockType: "heading2" },
  { label: "H3", title: "見出し3", blockType: "heading3" },
  { label: "•", title: "箇条書き", blockType: "bulleted-list" },
  { label: "1.", title: "番号リスト", blockType: "numbered-list" },
  { label: "☐", title: "To-do", blockType: "todo" },
  { label: "Quote", title: "引用", blockType: "quote" },
  { label: "Callout", title: "コールアウト", blockType: "callout" },
  { label: "Code", title: "コード", blockType: "code" },
  { label: "Table", title: "表", blockType: "table" },
  { label: "—", title: "区切り線", blockType: "divider" },
];

const BLOCK_TAG_BY_TYPE: Partial<Record<NoteBlockType, string>> = {
  paragraph: "p",
  heading1: "h1",
  heading2: "h2",
  heading3: "h3",
  quote: "blockquote",
  code: "pre",
};

const BLOCK_TYPES: NoteBlockType[] = ["paragraph", "heading1", "heading2", "heading3", "bulleted-list", "numbered-list", "todo", "quote", "callout", "code", "table", "divider"];

const escapeHtml = (value: string): string => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const getRecordText = (content: NoteBlockContent | undefined): string => {
  const record = Array.isArray(content) ? content[0] : null;
  if (!record || typeof record !== "object") return "";
  if (record.type !== NOTE_CONTENT_TYPE && record.type !== LEGACY_TEXT_CONTENT_TYPE) return "";
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.blocks)) return "";
  return record.blocks.map((block) => block && typeof block === "object" && "text" in block ? String((block as { text?: unknown }).text ?? "") : "").join("\n");
};

const isNoteBlockType = (value: unknown): value is NoteBlockType => typeof value === "string" && BLOCK_TYPES.includes(value as NoteBlockType);

const getRowsFromRecord = (value: unknown): string[][] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.map((row) => Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []).filter((row) => row.length > 0);
};

const getRecordBlocks = (content: NoteBlockContent | undefined): NoteSerializedBlock[] => {
  const record = Array.isArray(content) ? content[0] : null;
  if (!record || typeof record !== "object") return [];
  if (record.type !== NOTE_CONTENT_TYPE && record.type !== LEGACY_TEXT_CONTENT_TYPE) return [];
  if (!Array.isArray(record.blocks)) return [];

  return record.blocks.map((block) => {
    if (!block || typeof block !== "object") return null;
    const blockRecord = block as Record<string, unknown>;
    const type = isNoteBlockType(blockRecord.type) ? blockRecord.type : "paragraph";
    const text = typeof blockRecord.text === "string" ? blockRecord.text : "";
    const checked = typeof blockRecord.checked === "boolean" ? blockRecord.checked : undefined;
    const rows = type === "table" ? getRowsFromRecord(blockRecord.rows) : undefined;
    return { type, text, checked, rows } satisfies NoteSerializedBlock;
  }).filter((block): block is NoteSerializedBlock => block !== null);
};

const createFallbackBlocks = (text: string): NoteSerializedBlock[] => {
  const lines = text.split("\n");
  return lines.length > 0 ? lines.map((line) => ({ type: "paragraph", text: line })) : [{ type: "paragraph", text: "" }];
};

const createDefaultTableRows = (): string[][] => Array.from({ length: DEFAULT_TABLE_ROWS }, (_, rowIndex) => Array.from({ length: DEFAULT_TABLE_COLUMNS }, (_, columnIndex) => rowIndex === 0 ? `列${columnIndex + 1}` : ""));

const createTableHtml = (rows: string[][] = createDefaultTableRows()): string => {
  const normalizedRows = rows.length > 0 ? rows : createDefaultTableRows();
  const [header = [], ...bodyRows] = normalizedRows;
  const headerHtml = `<thead><tr>${header.map((cell) => `<th>${escapeHtml(cell) || "<br>"}</th>`).join("")}</tr></thead>`;
  const bodyHtml = `<tbody>${(bodyRows.length > 0 ? bodyRows : [[]]).map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell) || "<br>"}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<table data-sivflow-table="true">${headerHtml}${bodyHtml}</table>`;
};

const createTodoHtml = (block: NoteSerializedBlock): string => {
  const text = escapeHtml(block.text) || "To-do";
  const checked = block.checked ? " checked" : "";
  const dataChecked = block.checked ? "true" : "false";
  return `<ul data-sivflow-todo-list="true"><li data-checked="${dataChecked}"><input type="checkbox" contenteditable="false"${checked}> <span>${text}</span></li></ul>`;
};

const createCalloutHtml = (block: NoteSerializedBlock): string => {
  const content = escapeHtml(block.text) || "コールアウト";
  return `<aside data-sivflow-callout="true"><span contenteditable="false">💡</span><div>${content}</div></aside>`;
};

const createBlockHtml = (block: NoteSerializedBlock): string => {
  const text = escapeHtml(block.text);
  const content = text.length > 0 ? text : "<br>";

  if (block.type === "heading1") return `<h1>${content}</h1>`;
  if (block.type === "heading2") return `<h2>${content}</h2>`;
  if (block.type === "heading3") return `<h3>${content}</h3>`;
  if (block.type === "bulleted-list") return `<ul><li>${content}</li></ul>`;
  if (block.type === "numbered-list") return `<ol><li>${content}</li></ol>`;
  if (block.type === "todo") return createTodoHtml(block);
  if (block.type === "quote") return `<blockquote>${content}</blockquote>`;
  if (block.type === "callout") return createCalloutHtml(block);
  if (block.type === "code") return `<pre><code>${content}</code></pre>`;
  if (block.type === "table") return createTableHtml(block.rows);
  if (block.type === "divider") return "<hr>";
  return `<p>${content}</p>`;
};

const createEditorHtml = (blocks: NoteSerializedBlock[]): string => {
  if (blocks.length === 0) return EMPTY_PARAGRAPH_HTML;
  return blocks.map(createBlockHtml).join("");
};

const getElementText = (element: Element): string => element.textContent?.replace(/\u00a0/g, " ").trimEnd() ?? "";

const serializeTable = (element: Element): NoteSerializedBlock[] => {
  const rows = Array.from(element.querySelectorAll("tr")).map((row) => Array.from(row.querySelectorAll("th,td")).map(getElementText)).filter((row) => row.length > 0);
  const text = rows.map((row) => row.join("\t")).join("\n");
  return [{ type: "table", text, rows }];
};

const serializeTodoList = (element: Element): NoteSerializedBlock[] => Array.from(element.querySelectorAll(":scope > li")).map((item) => {
  const input = item.querySelector("input[type='checkbox']") as HTMLInputElement | null;
  const checked = input?.checked ?? item.getAttribute("data-checked") === "true";
  return { type: "todo", text: getElementText(item), checked } satisfies NoteSerializedBlock;
});

const serializeElement = (element: Element): NoteSerializedBlock[] => {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "h1") return [{ type: "heading1", text: getElementText(element) }];
  if (tagName === "h2") return [{ type: "heading2", text: getElementText(element) }];
  if (tagName === "h3") return [{ type: "heading3", text: getElementText(element) }];
  if (tagName === "blockquote") return [{ type: "quote", text: getElementText(element) }];
  if (tagName === "aside" && element.getAttribute("data-sivflow-callout") === "true") return [{ type: "callout", text: getElementText(element).replace(/^💡\s*/, "") }];
  if (tagName === "pre") return [{ type: "code", text: getElementText(element) }];
  if (tagName === "table") return serializeTable(element);
  if (tagName === "hr") return [{ type: "divider", text: "" }];
  if (tagName === "ul" && element.getAttribute("data-sivflow-todo-list") === "true") return serializeTodoList(element);
  if (tagName === "ul") return Array.from(element.querySelectorAll(":scope > li")).map((item) => ({ type: "bulleted-list", text: getElementText(item) }));
  if (tagName === "ol") return Array.from(element.querySelectorAll(":scope > li")).map((item) => ({ type: "numbered-list", text: getElementText(item) }));
  return [{ type: "paragraph", text: getElementText(element) }];
};

const isMeaningfulBlock = (block: NoteSerializedBlock): boolean => block.type === "divider" || block.type === "table" || block.text.trim().length > 0;

const serializeEditorBlocks = (root: HTMLElement): NoteSerializedBlock[] => {
  const blocks = Array.from(root.children).flatMap(serializeElement).filter(isMeaningfulBlock);
  if (blocks.length > 0) return blocks;
  const text = root.innerText.trimEnd();
  return text.length > 0 ? createFallbackBlocks(text) : [{ type: "paragraph", text: "" }];
};

const getEditorText = (blocks: NoteSerializedBlock[]): string => blocks.filter((block) => block.type !== "divider").map((block) => block.text).join("\n").trimEnd();

const createNoteContent = (blocks: NoteSerializedBlock[]): NoteBlockContent => {
  const text = getEditorText(blocks);
  const html = createEditorHtml(blocks);
  return [{ type: NOTE_CONTENT_TYPE, blocks, html, text, snapshot: null, updatedAt: new Date().toISOString() } satisfies NoteAffineRecord];
};

const getInitialBlocks = (note: Note): NoteSerializedBlock[] => {
  const blocks = getRecordBlocks(note.content);
  if (blocks.length > 0) return blocks;
  return createFallbackBlocks(note.contentText ?? getRecordText(note.content));
};

const focusEditor = (root: HTMLDivElement | null): void => {
  root?.focus();
};

const removeSlashTrigger = (): void => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const node = selection.anchorNode;
  const offset = selection.anchorOffset;
  if (!node || node.nodeType !== Node.TEXT_NODE || offset <= 0) return;
  const text = node.textContent ?? "";
  if (text[offset - 1] !== "/") return;
  node.textContent = `${text.slice(0, offset - 1)}${text.slice(offset)}`;
  selection.collapse(node, offset - 1);
};

const insertHtmlBlock = (html: string): void => {
  removeSlashTrigger();
  document.execCommand("insertHTML", false, html);
};

const executeEditorCommand = (root: HTMLDivElement | null, blockType: NoteBlockType): void => {
  if (!root) return;
  focusEditor(root);

  if (blockType === "bulleted-list") {
    removeSlashTrigger();
    document.execCommand("insertUnorderedList");
    return;
  }

  if (blockType === "numbered-list") {
    removeSlashTrigger();
    document.execCommand("insertOrderedList");
    return;
  }

  if (blockType === "todo") {
    insertHtmlBlock(`${createTodoHtml({ type: "todo", text: "To-do", checked: false })}<p><br></p>`);
    return;
  }

  if (blockType === "callout") {
    insertHtmlBlock(`${createCalloutHtml({ type: "callout", text: "コールアウト" })}<p><br></p>`);
    return;
  }

  if (blockType === "table") {
    insertHtmlBlock(`${createTableHtml()}<p><br></p>`);
    return;
  }

  if (blockType === "divider") {
    insertHtmlBlock("<hr><p><br></p>");
    return;
  }

  removeSlashTrigger();
  const tagName = BLOCK_TAG_BY_TYPE[blockType] ?? "p";
  document.execCommand("formatBlock", false, tagName);
};

const updateCheckboxState = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return false;
  const item = target.closest("li");
  if (item) item.setAttribute("data-checked", target.checked ? "true" : "false");
  return true;
};

const AffineDocumentEditor = ({ note, onChange }: AffineDocumentEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const saveTimerRef = useRef<number | null>(null);
  const latestSavedTextRef = useRef<string>("");
  const [isEmpty, setIsEmpty] = useState(true);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);

  onChangeRef.current = onChange;

  const updateEmptyState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    setIsEmpty(editor.innerText.trim().length === 0 && !editor.querySelector("hr, table, input[type='checkbox']"));
  }, []);

  const saveNow = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const blocks = serializeEditorBlocks(editor);
    const contentText = getEditorText(blocks);
    if (contentText === latestSavedTextRef.current) return;
    latestSavedTextRef.current = contentText;
    void onChangeRef.current({ content: createNoteContent(blocks), contentText, contentVersion: 2, editor: "affine" });
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(saveNow, NOTE_SAVE_DEBOUNCE_MS);
  }, [saveNow]);

  const handleInput = useCallback(() => {
    updateEmptyState();
    scheduleSave();
  }, [scheduleSave, updateEmptyState]);

  const handleCommand = useCallback((blockType: NoteBlockType) => {
    executeEditorCommand(editorRef.current, blockType);
    setIsSlashMenuOpen(false);
    updateEmptyState();
    scheduleSave();
  }, [scheduleSave, updateEmptyState]);

  const handleToolbarMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>, blockType: NoteBlockType) => {
    event.preventDefault();
    handleCommand(blockType);
  }, [handleCommand]);

  const handleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!updateCheckboxState(event.target)) return;
    updateEmptyState();
    scheduleSave();
  }, [scheduleSave, updateEmptyState]);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "/") {
      window.setTimeout(() => setIsSlashMenuOpen(true), 0);
      return;
    }

    if (event.key === "Escape") {
      setIsSlashMenuOpen(false);
    }
  }, []);

  const handlePaste = useCallback((event: ReactClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    handleInput();
  }, [handleInput]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const blocks = getInitialBlocks(note);
    latestSavedTextRef.current = getEditorText(blocks);
    editor.innerHTML = createEditorHtml(blocks);
    updateEmptyState();
  }, [note.id, updateEmptyState]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      saveNow();
    };
  }, [saveNow]);

  return (
    <div className={NOTE_EDITOR_ROOT_CLASS_NAME}>
      <div className={NOTE_EDITOR_INNER_CLASS_NAME}>
        <div className={NOTE_EDITOR_TOOLBAR_CLASS_NAME} aria-label="AFFiNE note block toolbar">
          {TOOLBAR_COMMANDS.map((command) => (
            <button key={command.blockType} type="button" className={NOTE_EDITOR_TOOLBAR_BUTTON_CLASS_NAME} title={command.title} onMouseDown={(event) => handleToolbarMouseDown(event, command.blockType)}>
              {command.label}
            </button>
          ))}
        </div>
        <div className={NOTE_EDITOR_BODY_CLASS_NAME}>
          {isEmpty ? <div className={NOTE_EDITOR_PLACEHOLDER_CLASS_NAME}>{NOTE_EDITOR_PLACEHOLDER}</div> : null}
          {isSlashMenuOpen ? (
            <div className={NOTE_EDITOR_SLASH_MENU_CLASS_NAME} role="menu" aria-label="ブロックメニュー">
              {TOOLBAR_COMMANDS.map((command) => (
                <button key={command.blockType} type="button" className={NOTE_EDITOR_SLASH_ITEM_CLASS_NAME} onMouseDown={(event) => handleToolbarMouseDown(event, command.blockType)}>
                  <span>{command.title}</span>
                  <span className="text-[11px] text-[#9aa0a6]">{command.label}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div ref={editorRef} className={NOTE_EDITOR_CONTENT_CLASS_NAME} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="AFFiNE note editor" onInput={handleInput} onClick={handleClick} onKeyDown={handleKeyDown} onPaste={handlePaste} />
        </div>
      </div>
    </div>
  );
};

export { AffineDocumentEditor };
