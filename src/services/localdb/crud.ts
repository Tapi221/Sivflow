import type { DeleteEntity, UpsertEntity } from "@/application/usecases/syncQueuePayloadGuards";
import { assertNoBlobUrlInCardPayload } from "./blobUrl";
import type { DocDbCtx } from "./documentsLifecycle";
import { cleanupBeforeDocumentDelete, cleanupBeforeDocumentSoftDelete, cleanupBeforeDocumentUpdate } from "./documentsLifecycle";
import { CURRENT_TAG_STORE } from "./tagStoreNames";
import type { Card, Folder } from "@/types";



type EnqueueSync = (table: string, type: "upload" | "download", payload: unknown) => Promise<void>;
interface TableLike<T extends object> {
  add(item: T): PromiseLike<unknown> | unknown;
  get(id: unknown): PromiseLike<T | undefined> | T | undefined;
  update(id: unknown, changes: unknown): PromiseLike<number> | number;
  put(item: T): PromiseLike<unknown> | unknown;
  bulkPut(items: ReadonlyArray<T>): PromiseLike<unknown> | unknown;
  delete(id: unknown): PromiseLike<void> | void;
}
interface DbLike {
  table<T extends object, _TKey = string>(name: string): TableLike<T>;
  name?: string;
}
type QueueSyncApi = {
  queueUpsertSync?: <TEntity extends UpsertEntity>(args: {
    entity: TEntity;
    operationType: "create" | "update";
    payload: unknown;
    priority?: "critical" | "high" | "medium" | "low";
  }) => Promise<void>;
  queueDeleteSync?: (args: {
    entity: DeleteEntity;
    targetId: string;
    priority?: "critical" | "high" | "medium" | "low";
  }) => Promise<void>;
};
type CardInput = Card;
type FolderInput = Folder;
type AnyRow = Record<string, unknown> & { id?: string; };
type CardStorageRow = AnyRow & {
  front?: { blocks?: unknown[]; };
  back?: { blocks?: unknown[]; };
};
type DocumentUpdateChanges = Parameters<typeof cleanupBeforeDocumentUpdate>[2];
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
type DeleteItem = {
  (db: DbLike, table: "documents", id: string): Promise<void>;
  (db: DbLike, table: string, id: string): Promise<void>;
};
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



const ENTITY_BY_TABLE = {
  cards: "card",
  folders: "folder",
  cardSets: "cardSet",
  documents: "document",
  [CURRENT_TAG_STORE]: "tag",
  images: "asset",
  userSettings: "userSetting",
} as const;
const DELETE_CAPABLE_ENTITIES = new Set<DeleteEntity>([
  "card",
  "folder",
  "cardSet",
  "document",
  "tag",
  "asset",
]);



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

  const ctor = (value as { constructor?: { name?: unknown; }; }).constructor;
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
const enqueueThroughSyncQueueApi = async (
  db: DbLike,
  table: string,
  operationType: "create" | "update",
  payload: AnyRow,
  fallbackEnqueue: EnqueueSync,
): Promise<void> => {
  const queueDb = db as DbLike & QueueSyncApi;
  const entity = ENTITY_BY_TABLE[table as keyof typeof ENTITY_BY_TABLE];

  if (!entity || typeof queueDb.queueUpsertSync !== "function") {
    await fallbackEnqueue(table, "upload", payload);
    return;
  }

  const targetId = getId(payload);
  if (!targetId) {
    await fallbackEnqueue(table, "upload", payload);
    return;
  }

  if (
    payload.isDeleted === true &&
    DELETE_CAPABLE_ENTITIES.has(entity as DeleteEntity) &&
    typeof queueDb.queueDeleteSync === "function"
  ) {
    await queueDb.queueDeleteSync({
      entity: entity as DeleteEntity,
      targetId,
      priority: "high",
    });
    return;
  }

  await queueDb.queueUpsertSync({
    entity: entity as UpsertEntity,
    operationType,
    payload,
    priority: "high",
  });
};
const addItem: AddItem = async (db: DbLike, table: string, item: unknown, skipSync: boolean, enqueueSync: EnqueueSync): Promise<string> => {
  if (table === "cards") {
    assertNoBlobUrlInCardPayload(item, { entityType: table, entityId: getId(item) });
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
    `[Diagnostic] localDb.addItem 開始。Table=${table}, ItemID=${getId(payload) ?? "<generated>"
    }, localDb インスタンス種別=${getConstructorName(db)}`,
  );

  console.log(
    `[LocalDB] addItem 開始 -> table=${table} id=${getId(payload) ?? "<generated>"
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
      `[LocalDB] addItem カード内容 -> 質問Blocks=${questionBlocksLen}, 回答Blocks=${answerBlocksLen}`,
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
        throw new Error(
          "DB instance mismatch: write succeeded but read failed",
        );
      }
    } catch (verifyError: unknown) {
      console.error("[LocalDB] addItem verification ERROR", verifyError);
      throw verifyError;
    }

    const savedItem: AnyRow = { ...payload, id: resolvedId };

    console.log(
      `[LocalDB] addItem Dexie追加後 -> table=${table} returnedId=${returnedId} resolvedId=${resolvedId}`,
    );

    if (!skipSync) {
      try {
        await enqueueThroughSyncQueueApi(
          db,
          table,
          "create",
          savedItem,
          enqueueSync,
        );
        console.log(
          `[LocalDB] addItem 同期キューに登録しました -> table=${table} id=${resolvedId}`,
        );
      } catch (enqueueError: unknown) {
        console.error("[LocalDB] addItem enqueueSync ERROR", {
          table,
          id: resolvedId,
          error: enqueueError,
        });
      }
    }

    console.log(`[LocalDB] addItem 成功 -> table=${table} id=${resolvedId}`);
    return resolvedId;
  } catch (error: unknown) {
    const code = errorCode(error);
    console.error(
      `[LocalDB] addItem ERROR -> table=${table} id=${getId(payload) ?? "<generated>"
      } code=${code} payloadPreview=${preview}`,
      error,
    );
    throw error;
  }
};
const updateItem: UpdateItem = async (db: DbLike, table: string, id: string, changes: unknown, skipSync: boolean, enqueueSync: EnqueueSync): Promise<number> => {
  if (table === "documents") {
    if (!isDocDbCtx(db)) {
      throw new Error("[LocalDB] documentsLifecycle requires db.documents, but the provided db does not have it.");
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
    `[LocalDB] updateItem 更新 -> table=${table} id=${id} skipSync=${skipSync} changesKeys=${recordKeys(
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
      `[LocalDB] updateItem カード変更 -> 質問Blocks=${questionBlocksLen}, 回答Blocks=${answerBlocksLen}`,
    );
  }

  const tableApi = db.table<AnyRow>(table);
  const result = await tableApi.update(id, payload);

  if (!skipSync) {
    const fullItem = await tableApi.get(id);
    if (fullItem) {
      await enqueueThroughSyncQueueApi(
        db,
        table,
        "update",
        fullItem,
        enqueueSync,
      );
    }
  }

  return result;
};
const deleteItem: DeleteItem = async (db: DbLike, table: string, id: string): Promise<void> => {
  if (table === "documents") {
    if (!isDocDbCtx(db)) {
      throw new Error("[LocalDB] documentsLifecycle requires db.documents, but the provided db does not have it.");
    }

    await cleanupBeforeDocumentDelete(db, id);
  }

  const tableApi = db.table<AnyRow>(table);
  await tableApi.delete(id);
};
const softDelete = async (db: DbLike, table: string, id: string, updateItemFn: (table: string, id: string, changes: Record<string, unknown>) => Promise<number>): Promise<number> => {
  const now = new Date();

  console.log(`[LocalDB] ソフト削除 -> table=${table} id=${id}`);

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
const bulkUpsert: BulkUpsert = async (db: DbLike, table: string, items: unknown[], skipSync: boolean, enqueueSync: EnqueueSync): Promise<void> => {
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
      await enqueueThroughSyncQueueApi(db, table, "update", item, enqueueSync);
    }
  }
};
const upsert: Upsert = async (db: DbLike, tableName: string, data: unknown, skipSync: boolean, enqueueSync: EnqueueSync): Promise<void> => {
  if (tableName === "cards") {
    assertNoBlobUrlInCardPayload(data, { entityType: tableName, entityId: getId(data) });
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
    await enqueueThroughSyncQueueApi(
      db,
      tableName,
      "update",
      payload,
      enqueueSync,
    );
  }
};



export { addItem, updateItem, deleteItem, softDelete, bulkUpsert, upsert };


export type { EnqueueSync, TableLike, DbLike };
