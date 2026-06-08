import { useCallback, useEffect, useRef } from "react";
import "@blocksuite/presets/themes/affine.css";
import type { Note, NoteBlockContent } from "@/types";

type AffineDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

type NoteParagraphBlock = {
  type: "paragraph";
  text: string;
};

type NoteAffineRecord = {
  type: "affine-document";
  blocks: NoteParagraphBlock[];
  text: string;
  snapshot: unknown;
  updatedAt: string;
};

type BlocksuiteRuntime = {
  AffineSchemas: unknown[];
  DocCollection: new (options: { schema: BlocksuiteSchema }) => BlocksuiteDocCollection;
  EditorContainer: new () => BlocksuiteEditorContainer;
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

type BlocksuiteEditorContainer = HTMLElement & {
  doc?: BlocksuiteDoc;
  mode?: "page" | "edgeless";
};

type BlocksuiteBlockModel = {
  text?: unknown;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const NOTE_CONTENT_TYPE = "affine-document";
const LEGACY_TEXT_CONTENT_TYPE = "sivflow-text-document";
const NOTE_EDITOR_ROOT_CLASS_NAME = "h-full min-h-0 w-full overflow-hidden bg-white text-[#202124]";
const NOTE_EDITOR_HOST_CLASS_NAME = "h-full min-h-0 w-full";
const NOTE_EDITOR_CONTAINER_CLASS_NAME = "block h-full min-h-0 w-full bg-white";
const NOTE_EDITOR_DEFAULT_TITLE = "Untitled";
const NOTE_BLOCK_NOTE_XYWH = "[0,0,820,640]";

let blocksuiteRuntimePromise: Promise<BlocksuiteRuntime> | null = null;

const loadBlocksuiteRuntime = async (): Promise<BlocksuiteRuntime> => {
  blocksuiteRuntimePromise ??= Promise.all([import("@blocksuite/blocks/models"), import("@blocksuite/presets"), import("@blocksuite/store")]).then(([models, presets, store]) => {
    const runtime = { ...models, ...presets, ...store } as Record<string, unknown>;
    const AffineSchemas = runtime.AffineSchemas;
    const DocCollection = runtime.DocCollection;
    const EditorContainer = runtime.EditorContainer;
    const Schema = runtime.Schema;
    const Text = runtime.Text;

    if (!Array.isArray(AffineSchemas) || typeof DocCollection !== "function" || typeof EditorContainer !== "function" || typeof Schema !== "function" || typeof Text !== "function") {
      throw new Error("BlockSuite AFFiNE runtime is incomplete.");
    }

    return { AffineSchemas, DocCollection, EditorContainer, Schema, Text } as BlocksuiteRuntime;
  });

  return blocksuiteRuntimePromise;
};

const getRecordText = (content: NoteBlockContent | undefined): string => {
  const record = Array.isArray(content) ? content[0] : null;
  if (!record || typeof record !== "object") return "";
  if (record.type !== NOTE_CONTENT_TYPE && record.type !== LEGACY_TEXT_CONTENT_TYPE) return "";
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.blocks)) return "";
  return record.blocks.map((block) => block && typeof block === "object" && "text" in block ? String((block as { text?: unknown }).text ?? "") : "").join("\n");
};

const createParagraphBlocks = (text: string): NoteParagraphBlock[] => {
  const lines = text.split("\n");
  return lines.length > 0 ? lines.map((line) => ({ type: "paragraph", text: line })) : [{ type: "paragraph", text: "" }];
};

const getBlockModel = (block: unknown): BlocksuiteBlockModel | null => {
  if (!block || typeof block !== "object") return null;
  const blockRecord = block as Record<string, unknown>;
  const model = blockRecord.model;
  if (model && typeof model === "object") return model as BlocksuiteBlockModel;
  return blockRecord as BlocksuiteBlockModel;
};

const getBlockText = (block: unknown): string => {
  const model = getBlockModel(block);
  if (!model || model.text === undefined || model.text === null) return "";
  if (typeof model.text === "string") return model.text;
  if (typeof model.text === "object" && "toString" in model.text && typeof model.text.toString === "function") return model.text.toString();
  return String(model.text);
};

const getEditorText = (doc: BlocksuiteDoc, host: HTMLDivElement): string => {
  const paragraphBlocks = doc.getBlockByFlavour?.("affine:paragraph") ?? [];
  const paragraphText = paragraphBlocks.map(getBlockText).join("\n").trimEnd();
  if (paragraphText.length > 0) return paragraphText;
  return host.innerText.trimEnd();
};

const createNoteContent = (doc: BlocksuiteDoc, text: string): NoteBlockContent => [{ type: NOTE_CONTENT_TYPE, blocks: createParagraphBlocks(text), text, snapshot: doc.toJSON?.() ?? null, updatedAt: new Date().toISOString() } satisfies NoteAffineRecord];

const initializeCollection = (collection: BlocksuiteDocCollection): void => {
  collection.meta?.initialize?.();
};

const loadDocWithInitialText = async (runtime: BlocksuiteRuntime, doc: BlocksuiteDoc, note: Note): Promise<void> => {
  const text = getRecordText(note.content);
  const title = note.title.trim() || NOTE_EDITOR_DEFAULT_TITLE;
  const loadResult = doc.load(() => {
    const pageId = doc.addBlock("affine:page", { title: new runtime.Text(title) });
    doc.addBlock("affine:surface", {}, pageId);
    const noteId = doc.addBlock("affine:note", { xywh: NOTE_BLOCK_NOTE_XYWH }, pageId);
    for (const block of createParagraphBlocks(text)) {
      doc.addBlock("affine:paragraph", { text: new runtime.Text(block.text) }, noteId);
    }
  });

  await Promise.resolve(loadResult);
};

const AffineDocumentEditor = ({ note, onChange }: AffineDocumentEditorProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<BlocksuiteDoc | null>(null);
  const latestSavedTextRef = useRef<string>(getRecordText(note.content));
  const onChangeRef = useRef(onChange);
  const saveTimerRef = useRef<number | null>(null);

  onChangeRef.current = onChange;

  const scheduleSave = useCallback(() => {
    const host = hostRef.current;
    const doc = docRef.current;
    if (!host || !doc) return;

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      const contentText = getEditorText(doc, host);
      if (contentText === latestSavedTextRef.current) return;
      latestSavedTextRef.current = contentText;
      void onChangeRef.current({ content: createNoteContent(doc, contentText), contentText, contentVersion: 2, editor: "affine" });
    }, NOTE_SAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let isDisposed = false;
    const abortController = new AbortController();
    const mutationObserver = new MutationObserver(scheduleSave);

    host.replaceChildren();
    latestSavedTextRef.current = getRecordText(note.content);

    void loadBlocksuiteRuntime().then(async (runtime) => {
      if (isDisposed) return;

      const schema = new runtime.Schema();
      schema.register(runtime.AffineSchemas);
      const collection = new runtime.DocCollection({ schema });
      initializeCollection(collection);
      const doc = collection.createDoc({ id: note.id });
      await loadDocWithInitialText(runtime, doc, note);
      if (isDisposed) return;

      const editor = new runtime.EditorContainer();
      editor.doc = doc;
      editor.mode = "page";
      editor.className = NOTE_EDITOR_CONTAINER_CLASS_NAME;
      docRef.current = doc;
      host.replaceChildren(editor);
      mutationObserver.observe(host, { attributes: true, characterData: true, childList: true, subtree: true });
      host.addEventListener("input", scheduleSave, { signal: abortController.signal });
      host.addEventListener("keyup", scheduleSave, { signal: abortController.signal });
      host.addEventListener("paste", scheduleSave, { signal: abortController.signal });
      host.addEventListener("drop", scheduleSave, { signal: abortController.signal });
    }).catch(() => {
      if (!isDisposed) {
        docRef.current = null;
        host.replaceChildren();
      }
    });

    return () => {
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
  }, [note.id, note.title, scheduleSave]);

  return (
    <div className={NOTE_EDITOR_ROOT_CLASS_NAME}>
      <div ref={hostRef} className={NOTE_EDITOR_HOST_CLASS_NAME} />
    </div>
  );
};

export { AffineDocumentEditor };
