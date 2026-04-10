import type { Card, Folder } from "@/types";
import { assertNoBlobUrlInCardPayload } from "./blobUrl";
import {
  cleanupBeforeDocumentDelete,
  cleanupBeforeDocumentSoftDelete,
  cleanupBeforeDocumentUpdate,
} from "./documentsLifecycle";
import type { DocDbCtx } from "./documentsLifecycle";

/**
 * 外部境界（Sync キュー）なので payload は unknown に落とす。
 */
export type EnqueueSync = (
  table: string,
  type: "upload" | "download",
  payload: unknown,
) => Promise<void>;

/**
 * Dexie を直接 import しない最小インターフェース。
 * add / put / bulkPut の戻り値は Dexie の PromiseExtended<IndexableType> と揃えるため
 * PromiseLike<unknown> にしてある。
 */
export interface TableLike<T extends Record<string, unknown>> {
  add: (item: T) => PromiseLike<unknown>;
  get: (id: string) => Promise<T | undefined>;
  update: (id: string, changes: Partial<T>) => Promise<number>;
  put: (item: T) => PromiseLike<unknown>;
  bulkPut: (items: ReadonlyArray<T>) => PromiseLike<unknown>;
  delete: (id: string) => Promise<void>;
}

export interface DbLike {
  table: <T extends Record<string, unknown>>(name: string) => TableLike<T>;
  name?: string;
}

type CardInput = Card;
type FolderInput = Folder;
type AnyRow = Record<string, unknown> & { id?: string };

type CardStorageRow = AnyRow & {
  front?: { blocks?: unknown[] };
  back?: { blocks?: unknown[] };
};

type DocumentUpdateChanges = Parameters<typeof cleanupBeforeDocumentUpdate>[2];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const getStringProp = (
  obj: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
};

const getId = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  const id = getStringProp(value, "id");
  if (!id) return undefined;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getConstructorName = (value: unknown): string => {
  if (!value || (typeof value !== "object" && typeof value !== "function")) {
    return "<unknown>";
  }

  const ctor = (value as { constructor?: { name?: unknown } }).constructor;
  return typeof ctor?.name === "string" ? ctor.name : "<unknown>";
};

const safeJsonPreview = (value: unknown, max = 200): string => {
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > max
      ? `${serialized.substring(0, max)}...(truncated)`
      : serialized;
  } catch {
    return "<unserializable-payload>";
  }
};

const errorCode = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (!isRecord(error)) return "UNKNOWN_ERROR";

  return (
    getStringProp(error, "name") ??
    getStringProp(error, "code") ??
    getStringProp(error, "message") ??
    "UNKNOWN_ERROR"
  );
};

const recordKeys = (value: unknown): string[] => {
  return isRecord(value) ? Object.keys(value) : [];
};

const isDocDbCtx = (db: DbLike): db is DbLike & DocDbCtx => {
  const maybeDb = db as DbLike & Partial<DocDbCtx>;
  const documents = maybeDb.documents;

  return (
    typeof documents === "object" &&
    documents !== null &&
    typeof documents.get === "function" &&
    typeof documents.filter === "function"
  );
};

const toStorageRow = (value: unknown): AnyRow => {
  if (!isRecord(value)) return {};
  return { ...value } as AnyRow;
};

/* -----------------------------
 * addItem
 * ----------------------------- */

type AddItem = {
  (
    db: DbLike,
    table: "cards",
    item: CardInput,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<string>;
  (
    db: DbLike,
    table: "folders",
    item: FolderInput,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<string>;
  (
    db: DbLike,
    table: string,
    item: Record<string, unknown>,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<string>;
};

export const addItem: AddItem = async (
  db: DbLike,
  table: string,
  item: unknown,
  skipSync: boolean,
  enqueueSync: EnqueueSync,
): Promise<string> => {
  if (table === "cards") {
    assertNoBlobUrlInCardPayload(item, {
      entityType: table,
      entityId: getId(item),
    });
  }

  const payload = toStorageRow(item);
  const preview = safeJsonPreview(payload);

  if (table === "cards") {
    assertNoBlobUrlInCardPayload(payload, {
      entityType: table,
      entityId: getId(payload) ?? getId(item),
    });
  }

  console.log(
    `[Diagnostic] localDb.addItem START. Table=${table}, ItemID=${
      getId(payload) ?? "<generated>"
    }, localDb instance type=${getConstructorName(db)}`,
  );
  console.log(
    `[LocalDB] addItem START -> table=${table} id=${
      getId(payload) ?? "<generated>"
    } skipSync=${skipSync}`,
  );

  if (table === "cards") {
    const cardPayload = payload as CardStorageRow;
    const questionBlocksLen = Array.isArray(cardPayload.front?.blocks)
      ? cardPayload.front.blocks.length
      : 0;
    const answerBlocksLen = Array.isArray(cardPayload.back?.blocks)
      ? cardPayload.back.blocks.length
      : 0;

    console.log(
      `[LocalDB] addItem CARD_CONTENT -> Q_Blocks=${questionBlocksLen}, A_Blocks=${answerBlocksLen}`,
    );
  }

  try {
    const tableApi = db.table<AnyRow>(table);
    const returnedId = String(await tableApi.add(payload));
    const resolvedId = payload.id ?? returnedId;

    try {
      const maxVerifyAttempts = 4;
      let saved: AnyRow | undefined;

      for (let attempt = 1; attempt <= maxVerifyAttempts; attempt += 1) {
        try {
          saved = await tableApi.get(resolvedId);
        } catch {
          saved = undefined;
        }

        if (saved) break;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 35 * attempt);
        });
      }

      if (!saved) {
        console.error(
          "[LocalDB] addItem verification failed after retries: write succeeded but read returned null",
          { table, id: resolvedId, instanceName: db.name },
        );
        throw new Error("DB instance mismatch: write succeeded but read failed");
      }
    } catch (verifyError: unknown) {
      console.error("[LocalDB] addItem verification ERROR", verifyError);
      throw verifyError;
    }

    const savedItem: AnyRow = { ...payload, id: resolvedId };

    console.log(
      `[LocalDB] addItem AFTER_DEXIE_ADD -> table=${table} returnedId=${returnedId} resolvedId=${resolvedId}`,
    );

    if (!skipSync) {
      try {
        await enqueueSync(table, "upload", savedItem);
        console.log(
          `[LocalDB] addItem ENQUEUED_SYNC -> table=${table} id=${resolvedId}`,
        );
      } catch (enqueueError: unknown) {
        console.error("[LocalDB] addItem enqueueSync ERROR", {
          table,
          id: resolvedId,
          error: enqueueError,
        });
      }
    }

    console.log(`[LocalDB] addItem SUCCESS -> table=${table} id=${resolvedId}`);
    return resolvedId;
  } catch (error: unknown) {
    const code = errorCode(error);
    console.error(
      `[LocalDB] addItem ERROR -> table=${table} id=${
        getId(payload) ?? "<generated>"
      } code=${code} payloadPreview=${preview}`,
      error,
    );
    throw error;
  }
};

/* -----------------------------
 * updateItem
 * ----------------------------- */

type UpdateItem = {
  (
    db: DbLike,
    table: "cards",
    id: string,
    changes: Partial<CardInput>,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<number>;
  (
    db: DbLike,
    table: "folders",
    id: string,
    changes: Partial<FolderInput>,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<number>;
  (
    db: DbLike,
    table: "documents",
    id: string,
    changes: DocumentUpdateChanges,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<number>;
  (
    db: DbLike,
    table: string,
    id: string,
    changes: Record<string, unknown>,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<number>;
};

export const updateItem: UpdateItem = async (
  db: DbLike,
  table: string,
  id: string,
  changes: unknown,
  skipSync: boolean,
  enqueueSync: EnqueueSync,
): Promise<number> => {
  if (table === "documents") {
    if (!isDocDbCtx(db)) {
      throw new Error(
        "[LocalDB] documentsLifecycle requires db.documents, but the provided db does not have it.",
      );
    }

    await cleanupBeforeDocumentUpdate(db, id, changes as DocumentUpdateChanges);
  }

  if (table === "cards") {
    assertNoBlobUrlInCardPayload(changes, { entityType: table, entityId: id });
  }

  const payload = toStorageRow(changes);

  if (table === "cards") {
    assertNoBlobUrlInCardPayload(payload, { entityType: table, entityId: id });
  }

  console.log(
    `[LocalDB] updateItem -> table=${table} id=${id} skipSync=${skipSync} changesKeys=${recordKeys(
      changes,
    ).join(",")}`,
  );

  if (table === "cards") {
    const cardPayload = payload as CardStorageRow;
    const questionBlocksLen = Array.isArray(cardPayload.front?.blocks)
      ? cardPayload.front.blocks.length
      : undefined;
    const answerBlocksLen = Array.isArray(cardPayload.back?.blocks)
      ? cardPayload.back.blocks.length
      : undefined;

    console.log(
      `[LocalDB] updateItem CARD_CHANGES -> Q_Blocks=${questionBlocksLen}, A_Blocks=${answerBlocksLen}`,
    );
  }

  const tableApi = db.table<AnyRow>(table);
  const result = await tableApi.update(id, payload);

  if (!skipSync) {
    const fullItem = await tableApi.get(id);
    if (fullItem) {
      await enqueueSync(table, "upload", fullItem);
    }
  }

  return result;
};

/* -----------------------------
 * deleteItem
 * ----------------------------- */

type DeleteItem = {
  (db: DbLike, table: "documents", id: string): Promise<void>;
  (db: DbLike, table: string, id: string): Promise<void>;
};

export const deleteItem: DeleteItem = async (
  db: DbLike,
  table: string,
  id: string,
): Promise<void> => {
  if (table === "documents") {
    if (!isDocDbCtx(db)) {
      throw new Error(
        "[LocalDB] documentsLifecycle requires db.documents, but the provided db does not have it.",
      );
    }

    await cleanupBeforeDocumentDelete(db, id);
  }

  const tableApi = db.table<AnyRow>(table);
  await tableApi.delete(id);
};

/* -----------------------------
 * softDelete
 * ----------------------------- */

export const softDelete = async (
  db: DbLike,
  table: string,
  id: string,
  updateItemFn: (
    table: string,
    id: string,
    changes: Record<string, unknown>,
  ) => Promise<number>,
): Promise<number> => {
  const now = new Date();

  console.log(`[LocalDB] softDelete -> table=${table} id=${id}`);

  if (table === "documents") {
    if (!isDocDbCtx(db)) {
      throw new Error(
        "[LocalDB] documentsLifecycle requires db.documents, but the provided db does not have it.",
      );
    }

    await cleanupBeforeDocumentSoftDelete(db, id);
  }

  const extraChanges: Record<string, unknown> =
    table === "documents"
      ? { localFileId: null, localUrl: null, blobUrl: null }
      : {};

  return updateItemFn(table, id, {
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
    ...extraChanges,
  });
};

/* -----------------------------
 * bulkUpsert
 * ----------------------------- */

type BulkUpsert = {
  (
    db: DbLike,
    table: "cards",
    items: CardInput[],
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<void>;
  (
    db: DbLike,
    table: "folders",
    items: FolderInput[],
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<void>;
  (
    db: DbLike,
    table: string,
    items: Record<string, unknown>[],
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<void>;
};

export const bulkUpsert: BulkUpsert = async (
  db: DbLike,
  table: string,
  items: unknown[],
  skipSync: boolean,
  enqueueSync: EnqueueSync,
): Promise<void> => {
  if (items.length === 0) return;

  if (table === "cards") {
    for (const item of items) {
      assertNoBlobUrlInCardPayload(item, {
        entityType: table,
        entityId: getId(item),
      });
    }
  }

  const payload = items.filter(isRecord).map((item) => ({ ...item }) as AnyRow);

  if (table === "cards") {
    for (const entry of payload) {
      assertNoBlobUrlInCardPayload(entry, {
        entityType: table,
        entityId: getId(entry),
      });
    }
  }

  const tableApi = db.table<AnyRow>(table);
  await tableApi.bulkPut(payload);

  if (!skipSync) {
    for (const item of payload) {
      await enqueueSync(table, "upload", item);
    }
  }
};

/* -----------------------------
 * upsert
 * ----------------------------- */

type Upsert = {
  (
    db: DbLike,
    tableName: "cards",
    data: CardInput,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<void>;
  (
    db: DbLike,
    tableName: "folders",
    data: FolderInput,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<void>;
  (
    db: DbLike,
    tableName: string,
    data: Record<string, unknown>,
    skipSync: boolean,
    enqueueSync: EnqueueSync,
  ): Promise<void>;
};

export const upsert: Upsert = async (
  db: DbLike,
  tableName: string,
  data: unknown,
  skipSync: boolean,
  enqueueSync: EnqueueSync,
): Promise<void> => {
  if (tableName === "cards") {
    assertNoBlobUrlInCardPayload(data, {
      entityType: tableName,
      entityId: getId(data),
    });
  }

  const payload = toStorageRow(data);

  if (tableName === "cards") {
    assertNoBlobUrlInCardPayload(payload, {
      entityType: tableName,
      entityId: getId(payload) ?? getId(data),
    });
  }

  const tableApi = db.table<AnyRow>(tableName);
  await tableApi.put(payload);

  if (!skipSync) {
    await enqueueSync(tableName, "upload", payload);
  }
};