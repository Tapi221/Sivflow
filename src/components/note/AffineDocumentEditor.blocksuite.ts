import type { Note, NoteBlockContent } from "@/types";

type BlocksuiteRuntime = {
  AffineEditorContainer: new () => BlocksuiteEditorElement;
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
  getBlockByFlavour?: (flavour: string) => unknown[];
  load: (initializer?: () => void) => Promise<void> | void;
  toJSON?: () => unknown;
};

type BlocksuiteEditorElement = HTMLElement & {
  doc?: BlocksuiteDoc;
  mode?: "page" | "edgeless";
};

type BlocksuiteBlockModel = {
  text?: unknown;
};

type NoteRecordBlock = {
  rows?: unknown;
  text?: unknown;
};

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
const NOTE_EDITOR_STYLE = { display: "block", height: "100%", minHeight: "0", width: "100%" };

let runtimePromise: Promise<BlocksuiteRuntime> | null = null;

const asArray = (value: unknown): unknown[] | null => Array.isArray(value) ? value : null;

const asConstructor = <T>(value: unknown): T | null => typeof value === "function" ? value as T : null;

const getRowsText = (rows: unknown): string => {
  if (!Array.isArray(rows)) return "";
  return rows.map((row) => Array.isArray(row) ? row.map((cell) => String(cell ?? "")).join("\t") : "").filter(Boolean).join("\n");
};

const getRecordBlockText = (block: NoteRecordBlock): string => typeof block.text === "string" ? block.text : getRowsText(block.rows);

const getRegisteredAffineEditorContainer = (): BlocksuiteRuntime["AffineEditorContainer"] | null => {
  if (typeof customElements === "undefined") return null;
  return asConstructor<BlocksuiteRuntime["AffineEditorContainer"]>(customElements.get(NOTE_EDITOR_TAG_NAME));
};

const loadRuntime = async (): Promise<BlocksuiteRuntime> => {
  runtimePromise ??= Promise.all([import("@blocksuite/blocks"), import("@blocksuite/presets"), import("@blocksuite/store")]).then(([blocks, presets, store]) => {
    const blockExports = blocks as Record<string, unknown>;
    const presetExports = presets as Record<string, unknown>;
    const storeExports = store as Record<string, unknown>;
    const runtime = {
      AffineEditorContainer: asConstructor<BlocksuiteRuntime["AffineEditorContainer"]>(presetExports.AffineEditorContainer) ?? getRegisteredAffineEditorContainer(),
      AffineSchemas: asArray(blockExports.AffineSchemas) ?? asArray(presetExports.AffineSchemas) ?? asArray(storeExports.AffineSchemas),
      DocCollection: asConstructor<BlocksuiteRuntime["DocCollection"]>(storeExports.DocCollection),
      Schema: asConstructor<BlocksuiteRuntime["Schema"]>(storeExports.Schema),
      Text: asConstructor<BlocksuiteRuntime["Text"]>(storeExports.Text),
    };

    if (!runtime.AffineEditorContainer || !runtime.AffineSchemas || !runtime.DocCollection || !runtime.Schema || !runtime.Text) {
      throw new Error("Installed BlockSuite packages do not expose the AFFiNE document runtime.");
    }

    return runtime as BlocksuiteRuntime;
  });

  return runtimePromise;
};

const getRecordText = (content: NoteBlockContent | undefined): string => {
  const record = Array.isArray(content) ? content[0] : null;
  if (!record || typeof record !== "object") return "";
  if (record.type !== NOTE_CONTENT_TYPE && record.type !== LEGACY_TEXT_CONTENT_TYPE) return "";
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.blocks)) return "";
  return record.blocks.map((block) => block && typeof block === "object" ? getRecordBlockText(block as NoteRecordBlock) : "").filter(Boolean).join("\n");
};

const getInitialParagraphs = (note: Note): string[] => {
  const text = note.contentText ?? getRecordText(note.content);
  const paragraphs = text.split("\n").map((line) => line.trimEnd());
  return paragraphs.length > 0 ? paragraphs : [""];
};

const getBlockModel = (block: unknown): BlocksuiteBlockModel | null => {
  if (!block || typeof block !== "object") return null;
  const blockRecord = block as Record<string, unknown>;
  const model = blockRecord.model;
  return model && typeof model === "object" ? model as BlocksuiteBlockModel : blockRecord as BlocksuiteBlockModel;
};

const getTextValue = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") return value.toString();
  return String(value);
};

const initializeBlocksuiteDoc = async (runtime: BlocksuiteRuntime, doc: BlocksuiteDoc, note: Note): Promise<void> => {
  await doc.load(() => {
    const pageId = doc.addBlock(NOTE_PAGE_FLAVOUR, { title: new runtime.Text(note.title.trim() || NOTE_EDITOR_DEFAULT_TITLE) });
    doc.addBlock(NOTE_SURFACE_FLAVOUR, {}, pageId);
    const noteId = doc.addBlock(NOTE_NOTE_FLAVOUR, {}, pageId);
    for (const paragraph of getInitialParagraphs(note)) {
      doc.addBlock(NOTE_PARAGRAPH_FLAVOUR, { text: new runtime.Text(paragraph) }, noteId);
    }
  });
};

const createEditorElement = (runtime: BlocksuiteRuntime, doc: BlocksuiteDoc): BlocksuiteEditorElement => {
  const editor = new runtime.AffineEditorContainer();
  Object.assign(editor.style, NOTE_EDITOR_STYLE);
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
  return { doc, editor: createEditorElement(runtime, doc) };
};

const readBlocksuiteText = (doc: BlocksuiteDoc, host: HTMLDivElement): string => {
  const paragraphBlocks = doc.getBlockByFlavour?.(NOTE_PARAGRAPH_FLAVOUR) ?? [];
  const paragraphText = paragraphBlocks.map((block) => getTextValue(getBlockModel(block)?.text)).join("\n").trimEnd();
  return paragraphText.length > 0 ? paragraphText : host.innerText.trimEnd();
};

const createBlocksuiteNoteContent = (doc: BlocksuiteDoc, host: HTMLDivElement, contentText: string): NoteBlockContent => [{ type: NOTE_CONTENT_TYPE, text: contentText, snapshot: doc.toJSON?.() ?? null, html: host.innerHTML, updatedAt: new Date().toISOString() }];

export { createBlocksuiteAffineEditor, createBlocksuiteNoteContent, readBlocksuiteText };
export type { BlocksuiteAffineEditor, BlocksuiteDoc };
