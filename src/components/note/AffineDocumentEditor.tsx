import "@blocksuite/presets/themes/affine.css";
import { AffineSchemas } from "@blocksuite/blocks";
import { AffineEditorContainer } from "@blocksuite/presets";
import { DocCollection, Schema } from "@blocksuite/store";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Note, NoteBlockContent } from "@/types";

type AffineDocumentEditorProps = {
  note: Note;
  onChange: (changes: Pick<Note, "content" | "contentText" | "contentVersion" | "editor">) => void | Promise<void>;
};

type AffineSnapshotRecord = {
  type: "affine-document";
  snapshot?: unknown;
  text: string;
  updatedAt: string;
};

type AffineDocRuntime = {
  id?: string;
  load?: (init: () => void) => void;
  addBlock?: (flavour: string, props?: Record<string, unknown>, parent?: string) => string;
  resetHistory?: () => void;
  slots?: Record<string, { on?: (callback: () => void) => { dispose?: () => void } | (() => void) }>;
  toJSON?: () => unknown;
  toSnapshot?: () => unknown;
};

type AffineCollectionRuntime = {
  createDoc: (options?: { id?: string }) => AffineDocRuntime;
  importDocSnapshot?: (snapshot: unknown) => AffineDocRuntime;
  exportDocSnapshot?: (docId: string) => unknown;
};

type AffineEditorElement = HTMLElement & {
  doc?: AffineDocRuntime;
};

type AffineRuntime = {
  collection: AffineCollectionRuntime;
  doc: AffineDocRuntime;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const AFFINE_CONTENT_TYPE = "affine-document";

const createAffineSchema = () => new Schema().register(AffineSchemas);

const getInitialAffineRecord = (content: NoteBlockContent | undefined): AffineSnapshotRecord | null => {
  const record = Array.isArray(content) ? content[0] : null;
  if (!record || typeof record !== "object") return null;
  if (record.type !== AFFINE_CONTENT_TYPE) return null;
  return record as AffineSnapshotRecord;
};

const createEmptyAffineDoc = (collection: AffineCollectionRuntime, noteId: string): AffineDocRuntime => {
  const doc = collection.createDoc({ id: noteId });
  const init = () => {
    const pageId = doc.addBlock?.("affine:page", {}) ?? "";
    doc.addBlock?.("affine:surface", {}, pageId);
    const noteBlockId = doc.addBlock?.("affine:note", {}, pageId);
    doc.addBlock?.("affine:paragraph", {}, noteBlockId);
    doc.resetHistory?.();
  };

  if (typeof doc.load === "function") {
    doc.load(init);
    return doc;
  }

  init();
  return doc;
};

const createAffineRuntime = (note: Note): AffineRuntime => {
  const collection = new DocCollection({ schema: createAffineSchema() }) as AffineCollectionRuntime;
  const initialRecord = getInitialAffineRecord(note.content);
  const doc = initialRecord?.snapshot && typeof collection.importDocSnapshot === "function" ? collection.importDocSnapshot(initialRecord.snapshot) : createEmptyAffineDoc(collection, note.id);
  return { collection, doc };
};

const getAffineSnapshot = (runtime: AffineRuntime): unknown => {
  const docId = runtime.doc.id;
  if (docId && typeof runtime.collection.exportDocSnapshot === "function") return runtime.collection.exportDocSnapshot(docId);
  if (typeof runtime.doc.toSnapshot === "function") return runtime.doc.toSnapshot();
  if (typeof runtime.doc.toJSON === "function") return runtime.doc.toJSON();
  return undefined;
};

const toNoteContent = (runtime: AffineRuntime, text: string): NoteBlockContent => [{ type: AFFINE_CONTENT_TYPE, snapshot: getAffineSnapshot(runtime), text, updatedAt: new Date().toISOString() }];

const subscribeToAffineDocChanges = (doc: AffineDocRuntime, callback: () => void) => {
  const disposers: Array<() => void> = [];
  Object.values(doc.slots ?? {}).forEach((slot) => {
    const subscription = slot.on?.(callback);
    if (typeof subscription === "function") {
      disposers.push(subscription);
      return;
    }
    if (subscription?.dispose) {
      disposers.push(() => subscription.dispose?.());
    }
  });

  return () => {
    disposers.forEach((dispose) => dispose());
  };
};

const AffineDocumentEditor = ({ note, onChange }: AffineDocumentEditorProps) => {
  const runtime = useMemo(() => createAffineRuntime(note), [note.id]);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const latestChangeRef = useRef<Pick<Note, "content" | "contentText" | "contentVersion" | "editor"> | null>(null);
  const [saveRevision, setSaveRevision] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.replaceChildren();
    const editor = new AffineEditorContainer() as AffineEditorElement;
    editor.doc = runtime.doc;
    editor.className = "block h-full min-h-[480px] w-full";
    host.appendChild(editor);

    const captureChange = () => {
      const contentText = host.textContent?.trim() ?? "";
      latestChangeRef.current = { content: toNoteContent(runtime, contentText), contentText, contentVersion: 2, editor: "affine" };
      setSaveRevision((revision) => revision + 1);
    };
    const unsubscribe = subscribeToAffineDocChanges(runtime.doc, captureChange);
    host.addEventListener("input", captureChange);
    host.addEventListener("keyup", captureChange);
    host.addEventListener("paste", captureChange);

    return () => {
      unsubscribe();
      host.removeEventListener("input", captureChange);
      host.removeEventListener("keyup", captureChange);
      host.removeEventListener("paste", captureChange);
      host.replaceChildren();
    };
  }, [runtime]);

  useEffect(() => {
    if (!latestChangeRef.current) return;

    const timeoutId = window.setTimeout(() => {
      const changes = latestChangeRef.current;
      latestChangeRef.current = null;
      if (changes) void onChange(changes);
    }, NOTE_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [onChange, saveRevision]);

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-white px-16 py-14 text-[#202124]">
      <div className="mx-auto flex min-h-full w-full max-w-[820px] flex-col">
        <h1 className="mb-7 truncate text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]">{note.title}</h1>
        <div ref={hostRef} className="min-h-0 flex-1 [&_.affine-editor-container]:min-h-[480px]" />
      </div>
    </div>
  );
};

export { AffineDocumentEditor };
