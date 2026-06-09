import type { Note, NoteBlockContent } from "@/types";

type BlocksuiteRuntime = {
  AffineSchemas: unknown[];
  DocCollection: new (options: { schema: BlocksuiteSchema }) => BlocksuiteDocCollection;
  Schema: new () => BlocksuiteSchema;
  Text: new (text?: string) => unknown;
};

type BlocksuiteSchema = {
  register: (schemas: unknown[]) => void;
};

type BlocksuiteDocCollection = {
  createDoc: (options: { id: string }) => BlocksuiteDoc;
  meta?: {
    initialize?: () => void;
  };
};

type BlocksuiteDoc = {
  addBlock: (flavour: string, props: Record<string, unknown>, parent?: string) => string;
  getBlockByFlavour?: (flavour: string | string[]) => unknown[];
  getBlocksByFlavour?: (flavour: string | string[]) => unknown[];
  load: (initializer?: () => void) => Promise<void> | void;
  toJSON?: () => unknown;
};

type BlocksuiteEditorElement = HTMLElement & {
  autofocus?: boolean;
  doc?: BlocksuiteDoc;
  mode?: "page" | "edgeless";
};

type BlocksuiteBlockModel = {
  children?: unknown[];
  flavour?: string;
  props?: unknown;
  text?: unknown;
};

type NoteRecordBlock = {
  rows?: unknown;
  text?: unknown;
  type?: unknown;
};

type SerializableNoteBlock = { text: string; type: "paragraph" } | { rows: string[][]; type: "table" };

type BlocksuiteAffineEditor = {
  doc: BlocksuiteDoc;
  editor: BlocksuiteEditorElement;
};

const NOTE_CONTENT_TYPE = "affine-document";
const LEGACY_TEXT_CONTENT_TYPE = "sivflow-text-document";
const NOTE_EDITOR_DEFAULT_TITLE = "Untitled";
const NOTE_EDITOR_TAG_NAME = "affine-editor-container";
const NOTE_PARAGRAPH_FLAVOUR = "affine:paragraph";
const NOTE_PAGE_FLAVOUR = "affine:page";
const NOTE_SURFACE_FLAVOUR = "affine:surface";
const NOTE_NOTE_FLAVOUR = "affine:note";
const NOTE_TABLE_FLAVOUR = "affine:table";
const NOTE_EDITOR_STYLE = { display: "block", height: "100%", minHeight: "0", width: "100%" };

let runtimePromise: Promise<BlocksuiteRuntime> | null = null;

const asArray = (value: unknown): unknown[] | null => Array.isArray(value) ? value : null;

const asConstructor = <T>(value: unknown): T | null => typeof value === "function" ? value as T : null;

const asRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" ? value as Record<string, unknown> : null;

const normalizeRows = (rows: unknown): string[][] => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [String(row ?? "")]).filter((row) => row.some((cell) => cell.trim().length > 0));
};

const getRowsText = (rows: unknown): string => normalizeRows(rows).map((row) => row.join("\t")).filter(Boolean).join("\n");

const getRecordBlockText = (block: NoteRecordBlock): string => typeof block.text === "string" ? block.text : getRowsText(block.rows);

const registerAffineEditorElement = (presetExports: Record<string, unknown>): void => {
  if (typeof customElements === "undefined" || customElements.get(NOTE_EDITOR_TAG_NAME)) return;
  const AffineEditorContainer = asConstructor<CustomElementConstructor>(presetExports.AffineEditorContainer);
  if (!AffineEditorContainer) {
    throw new Error("BlockSuite presets do not expose the AFFiNE editor custom element constructor.");
  }
  customElements.define(NOTE_EDITOR_TAG_NAME, AffineEditorContainer);
};

const loadRuntime = async (): Promise<BlocksuiteRuntime> => {
  runtimePromise ??= Promise.all([import("@blocksuite/blocks"), import("@blocksuite/presets"), import("@blocksuite/store")]).then(([blocks, presets, store]) => {
    const blockExports = blocks as Record<string, unknown>;
    const presetExports = presets as Record<string, unknown>;
    const storeExports = store as Record<string, unknown>;
    const runtime = {
      AffineSchemas: asArray(blockExports.AffineSchemas) ?? asArray(presetExports.AffineSchemas) ?? asArray(storeExports.AffineSchemas),
      DocCollection: asConstructor<BlocksuiteRuntime["DocCollection"]>(storeExports.DocCollection),
      Schema: asConstructor<BlocksuiteRuntime["Schema"]>(storeExports.Schema),
      Text: asConstructor<BlocksuiteRuntime["Text"]>(storeExports.Text),
    };

    if (!runtime.AffineSchemas || !runtime.DocCollection || !runtime.Schema || !runtime.Text) {
      throw new Error("Installed BlockSuite packages do not expose the AFFiNE document runtime.");
    }

    registerAffineEditorElement(presetExports);
    return runtime as BlocksuiteRuntime;
  });

  return runtimePromise;
};

const getRecordBlocks = (content: NoteBlockContent | undefined): SerializableNoteBlock[] | null => {
  const record = Array.isArray(content) ? asRecord(content[0]) : null;
  if (!record || (record.type !== NOTE_CONTENT_TYPE && record.type !== LEGACY_TEXT_CONTENT_TYPE) || !Array.isArray(record.blocks)) return null;
  const blocks = record.blocks.flatMap((block): SerializableNoteBlock[] => {
    const blockRecord = asRecord(block) as NoteRecordBlock | null;
    if (!blockRecord) return [];
    const rows = normalizeRows(blockRecord.rows);
    if (blockRecord.type === "table" || rows.length > 0) return [{ rows, type: "table" }];
    return [{ text: getRecordBlockText(blockRecord), type: "paragraph" }];
  });
  return blocks.length > 0 ? blocks : null;
};

const getRecordText = (content: NoteBlockContent | undefined): string => {
  const record = Array.isArray(content) ? asRecord(content[0]) : null;
  if (!record || (record.type !== NOTE_CONTENT_TYPE && record.type !== LEGACY_TEXT_CONTENT_TYPE)) return "";
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.blocks)) return "";
  return record.blocks.map((block) => {
    const blockRecord = asRecord(block) as NoteRecordBlock | null;
    return blockRecord ? getRecordBlockText(blockRecord) : "";
  }).filter(Boolean).join("\n");
};

const getInitialBlocks = (note: Note): SerializableNoteBlock[] => {
  const recordBlocks = getRecordBlocks(note.content);
  if (recordBlocks) return recordBlocks;
  const text = note.contentText ?? getRecordText(note.content);
  return text.split("\n").map((line) => ({ text: line.trimEnd(), type: "paragraph" }));
};

const getOrder = (index: number): string => String(index).padStart(6, "0");

const getTableProps = (runtime: BlocksuiteRuntime, rows: string[][]): Record<string, unknown> => {
  const normalizedRows = rows.length > 0 ? rows : [[""]];
  const columnCount = Math.max(1, ...normalizedRows.map((row) => row.length));
  const rowRecords: Record<string, Record<string, string>> = {};
  const columnRecords: Record<string, Record<string, string>> = {};
  const cells: Record<string, Record<string, unknown>> = {};
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const columnId = `column-${columnIndex}`;
    columnRecords[columnId] = { columnId, order: getOrder(columnIndex) };
  }
  normalizedRows.forEach((row, rowIndex) => {
    const rowId = `row-${rowIndex}`;
    rowRecords[rowId] = { order: getOrder(rowIndex), rowId };
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const columnId = `column-${columnIndex}`;
      cells[`${rowId}:${columnId}`] = { text: new runtime.Text(row[columnIndex] ?? "") };
    }
  });
  return { rows: rowRecords, columns: columnRecords, cells };
};

const getBlockModel = (block: unknown): BlocksuiteBlockModel | null => {
  const blockRecord = asRecord(block);
  if (!blockRecord) return null;
  const model = blockRecord.model;
  return asRecord(model) ? model as BlocksuiteBlockModel : blockRecord as BlocksuiteBlockModel;
};

const getBlockProps = (block: unknown): Record<string, unknown> => {
  const model = getBlockModel(block);
  if (!model) return {};
  return asRecord(model.props) ?? model as Record<string, unknown>;
};

const getTextValue = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") return value.toString();
  return String(value);
};

const getBlocksByFlavour = (doc: BlocksuiteDoc, flavour: string | string[]): unknown[] => doc.getBlocksByFlavour?.(flavour) ?? doc.getBlockByFlavour?.(flavour) ?? [];

const getSortedRecords = (value: unknown, idKey: string): Record<string, unknown>[] => Object.values(asRecord(value) ?? {}).map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item)).sort((first, second) => String(first.order ?? first[idKey] ?? "").localeCompare(String(second.order ?? second[idKey] ?? "")));

const getTableRowsFromModel = (model: BlocksuiteBlockModel): string[][] => {
  const props = getBlockProps(model);
  const rows = getSortedRecords(props.rows, "rowId");
  const columns = getSortedRecords(props.columns, "columnId");
  const cells = asRecord(props.cells) ?? {};
  return rows.map((row) => columns.map((column) => {
    const cell = asRecord(cells[`${String(row.rowId ?? "")}:${String(column.columnId ?? "")}`]);
    return getTextValue(cell?.text);
  }));
};

const getNoteChildModels = (doc: BlocksuiteDoc): BlocksuiteBlockModel[] => {
  const note = getBlocksByFlavour(doc, NOTE_NOTE_FLAVOUR).map(getBlockModel).find(Boolean);
  return Array.isArray(note?.children) ? note.children.map(getBlockModel).filter((model): model is BlocksuiteBlockModel => Boolean(model)) : [];
};

const serializeBlocksuiteBlocks = (doc: BlocksuiteDoc): SerializableNoteBlock[] => {
  return getNoteChildModels(doc).flatMap((model): SerializableNoteBlock[] => {
    if (model.flavour === NOTE_TABLE_FLAVOUR) return [{ rows: getTableRowsFromModel(model), type: "table" }];
    const props = getBlockProps(model);
    return [{ text: getTextValue(props.text ?? model.text), type: "paragraph" }];
  });
};

const initializeBlocksuiteDoc = async (runtime: BlocksuiteRuntime, doc: BlocksuiteDoc, note: Note): Promise<void> => {
  await doc.load(() => {
    const pageId = doc.addBlock(NOTE_PAGE_FLAVOUR, { title: new runtime.Text(note.title.trim() || NOTE_EDITOR_DEFAULT_TITLE) });
    doc.addBlock(NOTE_SURFACE_FLAVOUR, {}, pageId);
    const noteId = doc.addBlock(NOTE_NOTE_FLAVOUR, {}, pageId);
    for (const block of getInitialBlocks(note)) {
      if (block.type === "table") {
        doc.addBlock(NOTE_TABLE_FLAVOUR, getTableProps(runtime, block.rows), noteId);
      } else {
        doc.addBlock(NOTE_PARAGRAPH_FLAVOUR, { text: new runtime.Text(block.text) }, noteId);
      }
    }
  });
};

const createEditorElement = (doc: BlocksuiteDoc): BlocksuiteEditorElement => {
  const editor = document.createElement(NOTE_EDITOR_TAG_NAME) as BlocksuiteEditorElement;
  Object.assign(editor.style, NOTE_EDITOR_STYLE);
  editor.autofocus = true;
  editor.doc = doc;
  editor.mode = "page";
  return editor;
};

const createBlocksuiteAffineEditor = async (note: Note): Promise<BlocksuiteAffineEditor> => {
  const runtime = await loadRuntime();
  const schema = new runtime.Schema();
  schema.register(runtime.AffineSchemas);
  const collection = new runtime.DocCollection({ schema });
  collection.meta?.initialize?.();
  const doc = collection.createDoc({ id: note.id });
  await initializeBlocksuiteDoc(runtime, doc, note);
  return { doc, editor: createEditorElement(doc) };
};

const readBlocksuiteText = (doc: BlocksuiteDoc, host: HTMLDivElement): string => {
  const text = serializeBlocksuiteBlocks(doc).map((block) => block.type === "table" ? block.rows.map((row) => row.join("\t")).join("\n") : block.text).filter(Boolean).join("\n").trimEnd();
  return text.length > 0 ? text : host.innerText.trimEnd();
};

const createBlocksuiteNoteContent = (doc: BlocksuiteDoc, _host: HTMLDivElement, contentText: string): NoteBlockContent => [{ type: NOTE_CONTENT_TYPE, text: contentText, blocks: serializeBlocksuiteBlocks(doc), snapshot: doc.toJSON?.() ?? null, updatedAt: new Date().toISOString() }];

export { createBlocksuiteAffineEditor, createBlocksuiteNoteContent, readBlocksuiteText };
export type { BlocksuiteAffineEditor, BlocksuiteDoc };
