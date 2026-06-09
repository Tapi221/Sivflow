import type { Note, NoteBlockContent } from "@/types";

type RuntimeModule = Record<string, unknown>;

type AffineRuntime = {
  AffineSchemas: unknown[];
  Awareness: new (doc: unknown) => unknown;
  AwarenessStore: new (awareness: unknown) => unknown;
  BlockStdScope: new (options: { extensions: unknown[]; store: BlocksuiteDoc }) => { get: (identifier: unknown) => { app$?: { value: string } }; render: () => unknown };
  StoreContainer: new (doc: RuntimeDoc) => { getStore: (options?: { extensions?: unknown[]; readonly?: boolean }) => BlocksuiteDoc; removeStore: (options: { id?: string; readonly?: boolean }) => void };
  Subject: new <T = void>() => { next: (value?: T) => void };
  Text: new (text?: string) => unknown;
  ThemeProvider: unknown;
  WithDisposable: (base: CustomElementConstructor) => CustomElementConstructor;
  YDoc: new (options?: { guid?: string }) => { clientID: number; getMap: (name: string) => Map<string, unknown>; load: () => void; transact: (callback: () => void) => void };
  html: (strings: TemplateStringsArray, ...values: unknown[]) => unknown;
  nanoid: () => string;
  nothing: unknown;
  ShadowlessElement: CustomElementConstructor;
  SignalWatcher: (base: CustomElementConstructor) => CustomElementConstructor;
  guard: (deps: unknown[], value: () => unknown) => unknown;
  storeExtensions: unknown[];
  viewExtensions: unknown[];
};

type BlocksuiteDoc = {
  addBlock: (flavour: string, props: Record<string, unknown>, parent?: string) => string;
  getBlockByFlavour?: (flavour: string | string[]) => unknown[];
  getBlocksByFlavour?: (flavour: string | string[]) => unknown[];
  root?: unknown;
  slots?: {
    rootAdded?: {
      subscribe?: (callback: () => void) => { unsubscribe: () => void };
    };
  };
};

type BlocksuiteEditorElement = HTMLElement & {
  autofocus?: boolean;
  specs?: unknown[];
  store?: BlocksuiteDoc;
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

type RuntimeDoc = {
  awarenessStore: unknown;
  clear: () => void;
  dispose: () => void;
  getStore: (options?: { extensions?: unknown[]; readonly?: boolean }) => BlocksuiteDoc;
  id: string;
  load: (initializer?: () => void) => RuntimeDoc;
  loaded: boolean;
  meta: { createDate: number; id: string; tags: string[]; title: string };
  ready: boolean;
  remove: () => void;
  removeStore: (options: { id?: string; readonly?: boolean }) => void;
  rootDoc: InstanceType<AffineRuntime["YDoc"]>;
  spaceDoc: InstanceType<AffineRuntime["YDoc"]>;
  workspace: RuntimeWorkspace;
  yBlocks: Map<string, unknown>;
};

type RuntimeWorkspace = {
  blobSync: Record<string, never>;
  createDoc: (docId?: string) => RuntimeDoc;
  dispose: () => void;
  doc: InstanceType<AffineRuntime["YDoc"]>;
  docs: Map<string, RuntimeDoc>;
  getDoc: (docId: string) => RuntimeDoc | null;
  id: string;
  idGenerator: () => string;
  meta: {
    addDocMeta: (meta: { createDate: number; id: string; tags: string[]; title: string }) => void;
    docs: { createDate: number; id: string; tags: string[]; title: string }[];
    getDocMeta: (id: string) => { createDate: number; id: string; tags: string[]; title: string } | undefined;
    removeDocMeta: (id: string) => void;
  };
  removeDoc: (docId: string) => void;
  slots: { docListUpdated: { next: () => void } };
};

type SerializableNoteBlock = { text: string; type: "paragraph" } | { rows: string[][]; type: "table" };

type BlocksuiteAffineEditor = {
  doc: BlocksuiteDoc;
  editor: BlocksuiteEditorElement;
};

const NOTE_CONTENT_TYPE = "affine-document";
const LEGACY_TEXT_CONTENT_TYPE = "sivflow-text-document";
const NOTE_EDITOR_DEFAULT_TITLE = "Untitled";
const NOTE_EDITOR_TAG_NAME = "sivflow-affine-editor";
const NOTE_PARAGRAPH_FLAVOUR = "affine:paragraph";
const NOTE_PAGE_FLAVOUR = "affine:page";
const NOTE_SURFACE_FLAVOUR = "affine:surface";
const NOTE_NOTE_FLAVOUR = "affine:note";
const NOTE_TABLE_FLAVOUR = "affine:table";
const NOTE_EDITOR_STYLE = { display: "block", height: "100%", minHeight: "0", width: "100%" };
const NOTE_DEFAULT_DOC_ID = "doc";

let runtimePromise: Promise<AffineRuntime> | null = null;

const asRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" ? value as Record<string, unknown> : null;

const getExport = <T>(module: RuntimeModule, name: string): T => {
  const value = module[name];
  if (value === undefined || value === null) throw new Error(`@blocksuite/affine export is missing: ${name}`);
  return value as T;
};

const getFirstArray = (...values: unknown[]): unknown[] => values.find((value): value is unknown[] => Array.isArray(value)) ?? [];

const compactExtensions = (extensions: unknown[]): unknown[] => Array.from(new Set(extensions.filter(Boolean)));

const normalizeRows = (rows: unknown): string[][] => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [String(row ?? "")]).filter((row) => row.some((cell) => cell.trim().length > 0));
};

const getRowsText = (rows: unknown): string => normalizeRows(rows).map((row) => row.join("\t")).filter(Boolean).join("\n");

const getRecordBlockText = (block: NoteRecordBlock): string => typeof block.text === "string" ? block.text : getRowsText(block.rows);

const defineAffineEditorElement = (runtime: AffineRuntime): void => {
  if (typeof customElements === "undefined" || customElements.get(NOTE_EDITOR_TAG_NAME)) return;
  const BaseElement = runtime.SignalWatcher(runtime.WithDisposable(runtime.ShadowlessElement));
  class SivflowAffineEditor extends BaseElement {
    static properties = { autofocus: { type: Boolean }, specs: { attribute: false }, store: { attribute: false } };
    accessor autofocus = false;
    accessor specs: unknown[] = [];
    accessor store!: BlocksuiteDoc;
    private std: InstanceType<AffineRuntime["BlockStdScope"]> | null = null;

    override connectedCallback() {
      super.connectedCallback();
      this.std = new runtime.BlockStdScope({ extensions: this.specs, store: this.store });
      const subscription = this.store.slots?.rootAdded?.subscribe?.(() => this.requestUpdate());
      if (subscription) this._disposables?.add?.({ dispose: () => subscription.unsubscribe() });
    }

    override firstUpdated() {
      if (!this.autofocus) return;
      setTimeout(() => {
        const richText = this.querySelector("rich-text") as { inlineEditor?: { focusEnd?: () => void } } | null;
        richText?.inlineEditor?.focusEnd?.();
        if (!richText?.inlineEditor) this.querySelector<HTMLElement>("[contenteditable='true']")?.focus({ preventScroll: true });
      });
    }

    override render() {
      if (!this.store.root || !this.std) return runtime.nothing;
      const theme = this.std.get(runtime.ThemeProvider).app$?.value ?? "light";
      return runtime.html`
        <div data-theme=${theme} class="affine-page-viewport">
          <div class="page-editor playground-page-editor-container">
            ${runtime.guard([this.std], () => this.std?.render())}
          </div>
        </div>
      `;
    }
  }
  customElements.define(NOTE_EDITOR_TAG_NAME, SivflowAffineEditor);
};

const loadRuntime = async (): Promise<AffineRuntime> => {
  runtimePromise ??= Promise.all([
    import("@blocksuite/affine/schemas"),
    import("@blocksuite/affine/store"),
    import("@blocksuite/affine/std"),
    import("@blocksuite/affine/shared/services"),
    import("@blocksuite/affine/global/lit"),
    import("lit"),
    import("lit/directives/guard.js"),
    import("yjs"),
    import("y-protocols/awareness.js"),
    import("rxjs"),
    import("@blocksuite/affine/foundation/store"),
    import("@blocksuite/affine/blocks/root/store"),
    import("@blocksuite/affine/blocks/surface/store"),
    import("@blocksuite/affine/blocks/note/store"),
    import("@blocksuite/affine/blocks/paragraph/store"),
    import("@blocksuite/affine/blocks/list/store"),
    import("@blocksuite/affine/blocks/table/store"),
    import("@blocksuite/affine/blocks/database/store"),
    import("@blocksuite/affine/blocks/data-view/store"),
    import("@blocksuite/affine/foundation/view"),
    import("@blocksuite/affine/blocks/root/view"),
    import("@blocksuite/affine/blocks/surface/view"),
    import("@blocksuite/affine/blocks/note/view"),
    import("@blocksuite/affine/blocks/paragraph/view"),
    import("@blocksuite/affine/blocks/list/view"),
    import("@blocksuite/affine/blocks/table/view"),
    import("@blocksuite/affine/blocks/database/view"),
    import("@blocksuite/affine/blocks/data-view/view"),
    import("@blocksuite/affine/widgets/slash-menu/view"),
    import("@blocksuite/affine/widgets/toolbar/view"),
    import("@blocksuite/affine/widgets/drag-handle/view"),
    import("@blocksuite/affine/widgets/keyboard-toolbar/view"),
    import("@blocksuite/affine/widgets/viewport-overlay/view"),
    import("@blocksuite/affine/widgets/page-dragging-area/view"),
    import("@blocksuite/affine/widgets/scroll-anchoring/view"),
    import("@blocksuite/affine/inlines/preset/view"),
    import("@blocksuite/affine/inlines/link/view"),
    import("@blocksuite/affine/inlines/reference/view"),
  ]).then((modules) => {
    const [schemas, store, std, services, litGlobals, lit, guardModule, yjs, awareness, rxjs, ...extensionModules] = modules as RuntimeModule[];
    const runtime: AffineRuntime = {
      AffineSchemas: getFirstArray(schemas.AffineSchemas),
      Awareness: getExport(awareness, "Awareness"),
      AwarenessStore: getExport(store, "AwarenessStore"),
      BlockStdScope: getExport(std, "BlockStdScope"),
      StoreContainer: getExport(store, "StoreContainer"),
      Subject: getExport(rxjs, "Subject"),
      Text: getExport(store, "Text"),
      ThemeProvider: getExport(services, "ThemeProvider"),
      WithDisposable: getExport(litGlobals, "WithDisposable"),
      YDoc: getExport(yjs, "Doc"),
      html: getExport(lit, "html"),
      nanoid: getExport(store, "nanoid"),
      nothing: getExport(lit, "nothing"),
      ShadowlessElement: getExport(litGlobals, "ShadowlessElement"),
      SignalWatcher: getExport(litGlobals, "SignalWatcher"),
      guard: getExport(guardModule, "guard"),
      storeExtensions: compactExtensions(extensionModules.slice(0, 9).flatMap((module) => Object.values(module))),
      viewExtensions: compactExtensions(extensionModules.slice(9).flatMap((module) => Object.values(module))),
    };
    defineAffineEditorElement(runtime);
    return runtime;
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

const getTableProps = (runtime: AffineRuntime, rows: string[][]): Record<string, unknown> => {
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

const createWorkspace = (runtime: AffineRuntime, note: Note): RuntimeWorkspace => {
  const docs = new Map<string, RuntimeDoc>();
  const metas = new Map<string, { createDate: number; id: string; tags: string[]; title: string }>();
  const rootDoc = new runtime.YDoc({ guid: note.id });
  const workspace = {
    blobSync: {},
    createDoc: (docId = NOTE_DEFAULT_DOC_ID): RuntimeDoc => {
      const meta = { createDate: Date.now(), id: docId, tags: [], title: note.title };
      metas.set(docId, meta);
      const spaceDoc = new runtime.YDoc({ guid: docId });
      spaceDoc.clientID = rootDoc.clientID;
      const doc = {
        awarenessStore: new runtime.AwarenessStore(new runtime.Awareness(spaceDoc)),
        clear: () => doc.yBlocks.clear(),
        dispose: () => doc.clear(),
        getStore: (options = {}) => storeContainer.getStore({ ...options, extensions: compactExtensions([...runtime.storeExtensions, ...(options.extensions ?? [])]) }),
        id: docId,
        load: (initializer?: () => void) => {
          if (doc.ready) return doc;
          doc.spaceDoc.load();
          initializer?.();
          doc.loaded = true;
          doc.ready = true;
          return doc;
        },
        loaded: false,
        meta,
        ready: false,
        remove: () => {
          docs.delete(docId);
          metas.delete(docId);
        },
        removeStore: (options: { id?: string; readonly?: boolean }) => storeContainer.removeStore(options),
        rootDoc,
        spaceDoc,
        workspace,
        yBlocks: spaceDoc.getMap("blocks"),
      } as RuntimeDoc;
      const storeContainer = new runtime.StoreContainer(doc);
      docs.set(docId, doc);
      return doc;
    },
    dispose: () => docs.forEach((doc) => doc.dispose()),
    doc: rootDoc,
    docs,
    getDoc: (docId: string) => docs.get(docId) ?? null,
    id: note.folderId || note.id,
    idGenerator: runtime.nanoid,
    meta: {
      addDocMeta: (meta: { createDate: number; id: string; tags: string[]; title: string }) => metas.set(meta.id, meta),
      get docs() {
        return Array.from(metas.values());
      },
      getDocMeta: (id: string) => metas.get(id),
      removeDocMeta: (id: string) => metas.delete(id),
    },
    removeDoc: (docId: string) => {
      docs.get(docId)?.remove();
    },
    slots: { docListUpdated: new runtime.Subject<void>() },
  } satisfies RuntimeWorkspace;
  return workspace;
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

const serializeBlocksuiteBlocks = (doc: BlocksuiteDoc): SerializableNoteBlock[] => getNoteChildModels(doc).flatMap((model): SerializableNoteBlock[] => {
  if (model.flavour === NOTE_TABLE_FLAVOUR) return [{ rows: getTableRowsFromModel(model), type: "table" }];
  const props = getBlockProps(model);
  return [{ text: getTextValue(props.text ?? model.text), type: "paragraph" }];
});

const initializeBlocksuiteStore = (runtime: AffineRuntime, store: BlocksuiteDoc, note: Note): void => {
  const pageId = store.addBlock(NOTE_PAGE_FLAVOUR, { title: new runtime.Text(note.title.trim() || NOTE_EDITOR_DEFAULT_TITLE) });
  store.addBlock(NOTE_SURFACE_FLAVOUR, {}, pageId);
  const noteId = store.addBlock(NOTE_NOTE_FLAVOUR, {}, pageId);
  for (const block of getInitialBlocks(note)) {
    if (block.type === "table") {
      store.addBlock(NOTE_TABLE_FLAVOUR, getTableProps(runtime, block.rows), noteId);
    } else {
      store.addBlock(NOTE_PARAGRAPH_FLAVOUR, { text: new runtime.Text(block.text) }, noteId);
    }
  }
};

const createEditorElement = (doc: BlocksuiteDoc, specs: unknown[]): BlocksuiteEditorElement => {
  const editor = document.createElement(NOTE_EDITOR_TAG_NAME) as BlocksuiteEditorElement;
  Object.assign(editor.style, NOTE_EDITOR_STYLE);
  editor.autofocus = true;
  editor.specs = specs;
  editor.store = doc;
  return editor;
};

const createBlocksuiteAffineEditor = async (note: Note): Promise<BlocksuiteAffineEditor> => {
  const runtime = await loadRuntime();
  const workspace = createWorkspace(runtime, note);
  const runtimeDoc = workspace.createDoc(note.id);
  let store: BlocksuiteDoc | null = null;
  runtimeDoc.load(() => {
    store = runtimeDoc.getStore();
    initializeBlocksuiteStore(runtime, store, note);
  });
  if (!store) throw new Error("AFFiNE store was not initialized.");
  return { doc: store, editor: createEditorElement(store, runtime.viewExtensions) };
};

const readBlocksuiteText = (doc: BlocksuiteDoc, host: HTMLDivElement): string => {
  const text = serializeBlocksuiteBlocks(doc).map((block) => block.type === "table" ? block.rows.map((row) => row.join("\t")).join("\n") : block.text).filter(Boolean).join("\n").trimEnd();
  return text.length > 0 ? text : host.innerText.trimEnd();
};

const createBlocksuiteNoteContent = (doc: BlocksuiteDoc, _host: HTMLDivElement, contentText: string): NoteBlockContent => [{ type: NOTE_CONTENT_TYPE, text: contentText, blocks: serializeBlocksuiteBlocks(doc), snapshot: null, updatedAt: new Date().toISOString() }];

export { createBlocksuiteAffineEditor, createBlocksuiteNoteContent, readBlocksuiteText };
export type { BlocksuiteAffineEditor, BlocksuiteDoc };
