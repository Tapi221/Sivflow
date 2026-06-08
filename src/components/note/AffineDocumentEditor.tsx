import { useCallback, useEffect, useRef } from "react";
import type { Note, NoteBlockContent } from "@/types";

type AffineDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

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

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_TYPE = "affine-document";
const LEGACY_TEXT_CONTENT_TYPE = "sivflow-text-document";
const NOTE_EDITOR_ROOT_CLASS_NAME = "relative h-full min-h-0 w-full overflow-hidden bg-white text-[#202124]";
const NOTE_EDITOR_HOST_CLASS_NAME = "h-full min-h-0 w-full overflow-hidden bg-white";
const NOTE_EDITOR_LOADING_CLASS_NAME = "flex h-full w-full items-center justify-center bg-white text-[12px] font-medium text-[#9aa0a6]";
const NOTE_EDITOR_CONTAINER_TAG_NAME = "affine-editor-container";
const NOTE_EDITOR_DEFAULT_TITLE = "Untitled";
const NOTE_PARAGRAPH_FLAVOUR = "affine:paragraph";
const NOTE_PAGE_FLAVOUR = "affine:page";
const NOTE_SURFACE_FLAVOUR = "affine:surface";
const NOTE_NOTE_FLAVOUR = "affine:note";

let blocksuiteRuntimePromise: Promise<BlocksuiteRuntime> | null = null;

const loadBlocksuiteRuntime = async (): Promise<BlocksuiteRuntime> => {
  blocksuiteRuntimePromise ??= Promise.all([import("@blocksuite/blocks"), import("@blocksuite/presets"), import("@blocksuite/store")]).then(([blocks, _presets, store]) => {
    const blockExports = blocks as Record<string, unknown>;
    const storeExports = store as Record<string, unknown>;
    const AffineSchemas = blockExports.AffineSchemas;
    const DocCollection = storeExports.DocCollection;
    const Schema = storeExports.Schema;
    const Text = storeExports.Text;

    if (!Array.isArray(AffineSchemas) || typeof DocCollection !== "function" || typeof Schema !== "function" || typeof Text !== "function") {
      throw new Error("BlockSuite AFFiNE runtime is incomplete.");
    }

    return { AffineSchemas, DocCollection, Schema, Text } as BlocksuiteRuntime;
  });

  return blocksuiteRuntimePromise;
};

const getRecordText = (content: NoteBlockContent | undefined): string => {
  const record = Array.isArray(content) ? content[0] : null;
  if (!record || typeof record !== "object") return "";
  if (record.type !== NOTE_CONTENT_TYPE && record.type !== LEGACY_TEXT_CONTENT_TYPE) return "";
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.blocks)) return "";
  return record.blocks.map((block) => block && typeof block === "object" && "text" in block ? String((block as { text?: unknown }).text ?? "") : "").filter(Boolean).join("\n");
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
  if (model && typeof model === "object") return model as BlocksuiteBlockModel;
  return blockRecord as BlocksuiteBlockModel;
};

const getTextValue = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") return value.toString();
  return String(value);
};

const getBlocksuiteBlockText = (block: unknown): string => {
  const model = getBlockModel(block);
  return model ? getTextValue(model.text) : "";
};

const createNoteContent = (doc: BlocksuiteDoc, contentText: string): NoteBlockContent => [{ type: NOTE_CONTENT_TYPE, text: contentText, snapshot: doc.toJSON?.() ?? null, updatedAt: new Date().toISOString() }];

const initializeCollection = (collection: BlocksuiteDocCollection): void => {
  collection.meta?.initialize?.();
};

const createEditorElement = (): BlocksuiteEditorElement => {
  const editor = document.createElement(NOTE_EDITOR_CONTAINER_TAG_NAME) as BlocksuiteEditorElement;
  editor.style.display = "block";
  editor.style.height = "100%";
  editor.style.minHeight = "0";
  editor.style.width = "100%";
  return editor;
};

const loadDocWithInitialContent = async (runtime: BlocksuiteRuntime, doc: BlocksuiteDoc, note: Note): Promise<void> => {
  const title = note.title.trim() || NOTE_EDITOR_DEFAULT_TITLE;
  const paragraphs = getInitialParagraphs(note);
  const loadResult = doc.load(() => {
    const pageId = doc.addBlock(NOTE_PAGE_FLAVOUR, { title: new runtime.Text(title) });
    doc.addBlock(NOTE_SURFACE_FLAVOUR, {}, pageId);
    const noteId = doc.addBlock(NOTE_NOTE_FLAVOUR, {}, pageId);
    for (const paragraph of paragraphs) {
      doc.addBlock(NOTE_PARAGRAPH_FLAVOUR, { text: new runtime.Text(paragraph) }, noteId);
    }
  });

  await Promise.resolve(loadResult);
};

const getEditorText = (doc: BlocksuiteDoc, host: HTMLDivElement): string => {
  const paragraphBlocks = doc.getBlockByFlavour?.(NOTE_PARAGRAPH_FLAVOUR) ?? [];
  const paragraphText = paragraphBlocks.map(getBlocksuiteBlockText).join("\n").trimEnd();
  if (paragraphText.length > 0) return paragraphText;
  return host.innerText.trimEnd();
};

const AffineDocumentEditor = ({ note, onChange }: AffineDocumentEditorProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<BlocksuiteDoc | null>(null);
  const onChangeRef = useRef(onChange);
  const saveTimerRef = useRef<number | null>(null);
  const latestSavedTextRef = useRef<string>(note.contentText ?? getRecordText(note.content));

  onChangeRef.current = onChange;

  const saveNow = useCallback(() => {
    const host = hostRef.current;
    const doc = docRef.current;
    if (!host || !doc) return;
    const contentText = getEditorText(doc, host);
    if (contentText === latestSavedTextRef.current) return;
    latestSavedTextRef.current = contentText;
    void onChangeRef.current({ content: createNoteContent(doc, contentText), contentText, contentVersion: 2, editor: "affine" });
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(saveNow, NOTE_SAVE_DEBOUNCE_MS);
  }, [saveNow]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let isDisposed = false;
    const abortController = new AbortController();
    const mutationObserver = new MutationObserver(scheduleSave);

    host.replaceChildren();
    host.className = NOTE_EDITOR_LOADING_CLASS_NAME;
    host.textContent = "AFFiNE を読み込み中";
    latestSavedTextRef.current = note.contentText ?? getRecordText(note.content);

    void loadBlocksuiteRuntime().then(async (runtime) => {
      if (isDisposed) return;
      const schema = new runtime.Schema();
      schema.register(runtime.AffineSchemas);
      const collection = new runtime.DocCollection({ schema });
      initializeCollection(collection);
      const doc = collection.createDoc({ id: note.id });
      await loadDocWithInitialContent(runtime, doc, note);
      if (isDisposed) return;
      const editor = createEditorElement();
      editor.doc = doc;
      editor.mode = "page";
      docRef.current = doc;
      host.className = NOTE_EDITOR_HOST_CLASS_NAME;
      host.replaceChildren(editor);
      mutationObserver.observe(host, { attributes: true, characterData: true, childList: true, subtree: true });
      host.addEventListener("input", scheduleSave, { signal: abortController.signal });
      host.addEventListener("keyup", scheduleSave, { signal: abortController.signal });
      host.addEventListener("paste", scheduleSave, { signal: abortController.signal });
      host.addEventListener("drop", scheduleSave, { signal: abortController.signal });
    });

    return () => {
      saveNow();
      isDisposed = true;
      abortController.abort();
      mutationObserver.disconnect();
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      docRef.current = null;
      host.replaceChildren();
    };
  }, [note.id, note.title, saveNow, scheduleSave]);

  return (
    <div className={NOTE_EDITOR_ROOT_CLASS_NAME}>
      <div ref={hostRef} className={NOTE_EDITOR_HOST_CLASS_NAME} />
    </div>
  );
};

export { AffineDocumentEditor };
