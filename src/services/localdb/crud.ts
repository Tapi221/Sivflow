import {
  denormalizeCardForStorage,
  denormalizeFolderForStorage,
} from './transforms';
import { assertNoBlobUrlInCardPayload } from './blobUrl';
import {
  cleanupBeforeDocumentUpdate,
  cleanupBeforeDocumentDelete,
  cleanupBeforeDocumentSoftDelete,
} from './documentsLifecycle';
import type { DocDbCtx } from './documentsLifecycle';

/**
 * 外部境界（Syncキュー）なので payload は unknown に落とす。
 */
export type EnqueueSync = (
  table: string,
  type: 'upload' | 'download',
  payload: unknown
) => Promise<void>;

/** Dexie を直接 import しない最小インターフェース。
 *  add/put/bulkPut の戻り値は Dexie の PromiseExtended<IndexableType> と合わせるため
 *  PromiseLike<unknown> にしてある（実運用上は常に string が返る）。 */
export interface TableLike<T extends Record<string, unknown>> {
  add(item: T): PromiseLike<unknown>;
  get(id: string): Promise<T | undefined>;
  update(id: string, changes: Partial<T>): Promise<number>;
  put(item: T): PromiseLike<unknown>;
  bulkPut(items: ReadonlyArray<T>): PromiseLike<unknown>;
  delete(id: string): Promise<void>;
}

export interface DbLike {
  table<T extends Record<string, unknown>>(name: string): TableLike<T>;
  name?: string;
}

/** transforms の入出力を自動追従 */
type CardInput = Parameters<typeof denormalizeCardForStorage>[0];
type FolderInput = Parameters<typeof denormalizeFolderForStorage>[0];

type EnsureRecord<T> = T extends Record<string, unknown> ? T : Record<string, unknown>;

/**
 * Storage 形（denormalize 後）をベースにして、ログ用に参照しているプロパティだけ補助的に載せる。
 */
type CardStorageRow = EnsureRecord<ReturnType<typeof denormalizeCardForStorage>> & {
  id?: string;
  questionBlocks?: unknown[];
  answerBlocks?: unknown[];
  questionText?: string;
};

type FolderStorageRow = EnsureRecord<ReturnType<typeof denormalizeFolderForStorage>> & {
  id?: string;
};

type AnyRow = Record<string, unknown> & { id?: string };

type DocumentUpdateChanges = Parameters<typeof cleanupBeforeDocumentUpdate>[2];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getStringProp(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

function getId(v: unknown): string | undefined {
  if (!isRecord(v)) return undefined;
  const id = getStringProp(v, 'id');
  if (!id) return undefined;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getConstructorName(v: unknown): string {
  if (!isRecord(v)) return '<unknown>';
  const ctor = v['constructor'];
  if (!isRecord(ctor)) return '<unknown>';
  const name = ctor['name'];
  return typeof name === 'string' ? name : '<unknown>';
}

function safeJsonPreview(v: unknown, max = 200): string {
  try {
    const s = JSON.stringify(v);
    return s.length > max ? s.substring(0, max) + '...(truncated)' : s;
  } catch {
    return '<unserializable-payload>';
  }
}

function errorCode(error: unknown): string {
  if (typeof error === 'string') return error;
  if (!isRecord(error)) return 'UNKNOWN_ERROR';

  return (
    getStringProp(error, 'name') ??
    getStringProp(error, 'code') ??
    getStringProp(error, 'message') ??
    'UNKNOWN_ERROR'
  );
}

function recordKeys(v: unknown): string[] {
  if (!isRecord(v)) return [];
  return Object.keys(v);
}

/** documentsLifecycle 用: db.documents を持つDBだけ通す */
type DocAwareDb = DbLike & DocDbCtx;

function isDocDbCtx(db: DbLike): db is DocAwareDb {
  return 'documents' in db;
}

/* -----------------------------
 * addItem
 * ----------------------------- */

export async function addItem(
  db: DbLike,
  table: 'cards',
  item: CardInput,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<string>;
export async function addItem(
  db: DbLike,
  table: 'folders',
  item: FolderInput,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<string>;
export async function addItem(
  db: DbLike,
  table: string,
  item: Record<string, unknown>,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<string>;
export async function addItem(
  db: DbLike,
  table: string,
  item: unknown,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<string> {
  if (table === 'cards') {
    assertNoBlobUrlInCardPayload(item, { entityType: table, entityId: getId(item) });
  }

  const payload: AnyRow =
    table === 'cards'
      ? (denormalizeCardForStorage(item as CardInput) as CardStorageRow)
      : table === 'folders'
      ? (denormalizeFolderForStorage(item as FolderInput) as FolderStorageRow)
      : (isRecord(item) ? item : {});

  if (table === 'cards') {
    assertNoBlobUrlInCardPayload(payload, {
      entityType: table,
      entityId: getId(payload) ?? getId(item),
    });
  }

  const preview = safeJsonPreview(payload);

  console.log(
    `[Diagnostic] localDb.addItem START. Table=${table}, ItemID=${
      getId(payload) ?? '<generated>'
    }, localDb instance type=${getConstructorName(db)}`
  );
  console.log(
    `[LocalDB] addItem START -> table=${table} id=${getId(payload) ?? '<generated>'} skipSync=${skipSync}`
  );

  if (table === 'cards') {
    const qBlocksLen = Array.isArray((payload as CardStorageRow).questionBlocks)
      ? (payload as CardStorageRow).questionBlocks!.length
      : 0;
    const aBlocksLen = Array.isArray((payload as CardStorageRow).answerBlocks)
      ? (payload as CardStorageRow).answerBlocks!.length
      : 0;
    const qText =
      typeof (payload as CardStorageRow).questionText === 'string'
        ? (payload as CardStorageRow).questionText!.substring(0, 30)
        : '';
    console.log(
      `[LocalDB] addItem CARD_CONTENT -> Q_Blocks=${qBlocksLen}, A_Blocks=${aBlocksLen}, Q_Text="${qText}..."`
    );
  }

  try {
    const tableApi =
      table === 'cards'
        ? db.table<CardStorageRow>(table)
        : table === 'folders'
        ? db.table<FolderStorageRow>(table)
        : db.table<AnyRow>(table);

    const returnedId = String(await tableApi.add(payload));
    const resolvedId = getId(payload) ?? returnedId;

    // 書き込み後の読み取り検証
    try {
      const maxVerifyAttempts = 4;
      let saved: AnyRow | undefined;

      for (let attempt = 1; attempt <= maxVerifyAttempts; attempt++) {
        try {
          saved = await tableApi.get(resolvedId);
        } catch {
          saved = undefined;
        }
        if (saved) break;
        await new Promise<void>((res) => setTimeout(res, 35 * attempt));
      }

      if (!saved) {
        console.error(
          '[LocalDB] addItem verification failed after retries: write succeeded but read returned null',
          { table, id: resolvedId, instanceName: db.name }
        );
        throw new Error('DB instance mismatch: write succeeded but read failed');
      }
    } catch (verifyErr: unknown) {
      console.error('[LocalDB] addItem verification ERROR', verifyErr);
      throw verifyErr;
    }

    const savedItem: AnyRow = { ...payload, id: resolvedId };

    console.log(
      `[LocalDB] addItem AFTER_DEXIE_ADD -> table=${table} returnedId=${returnedId} resolvedId=${resolvedId}`
    );

    if (!skipSync) {
      try {
        await enqueueSync(table, 'upload', savedItem);
        console.log(`[LocalDB] addItem ENQUEUED_SYNC -> table=${table} id=${resolvedId}`);
      } catch (enqueueErr: unknown) {
        console.error('[LocalDB] addItem enqueueSync ERROR', {
          table,
          id: resolvedId,
          error: enqueueErr,
        });
      }
    }

    console.log(`[LocalDB] addItem SUCCESS -> table=${table} id=${resolvedId}`);
    return resolvedId;
  } catch (error: unknown) {
    const code = errorCode(error);
    console.error(
      `[LocalDB] addItem ERROR -> table=${table} id=${
        getId(payload) ?? '<generated>'
      } code=${code} payloadPreview=${preview}`,
      error
    );
    throw error;
  }
}

/* -----------------------------
 * updateItem
 * ----------------------------- */

export async function updateItem(
  db: DbLike,
  table: 'cards',
  id: string,
  changes: CardInput,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<number>;
export async function updateItem(
  db: DbLike,
  table: 'folders',
  id: string,
  changes: FolderInput,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<number>;
export async function updateItem(
  db: DbLike,
  table: 'documents',
  id: string,
  changes: DocumentUpdateChanges,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<number>;
export async function updateItem(
  db: DbLike,
  table: string,
  id: string,
  changes: Record<string, unknown>,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<number>;
export async function updateItem(
  db: DbLike,
  table: string,
  id: string,
  changes: unknown,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<number> {
  if (table === 'documents') {
    if (!isDocDbCtx(db)) {
      throw new Error(
        '[LocalDB] documentsLifecycle requires db.documents, but the provided db does not have it.'
      );
    }
    await cleanupBeforeDocumentUpdate(db, id, changes as DocumentUpdateChanges);
  }

  if (table === 'cards') {
    assertNoBlobUrlInCardPayload(changes, { entityType: table, entityId: id });
  }

  const payload: AnyRow =
    table === 'cards'
      ? (denormalizeCardForStorage(changes as CardInput) as CardStorageRow)
      : table === 'folders'
      ? (denormalizeFolderForStorage(changes as FolderInput) as FolderStorageRow)
      : (isRecord(changes) ? changes : {});

  if (table === 'cards') {
    assertNoBlobUrlInCardPayload(payload, { entityType: table, entityId: id });
  }

  console.log(
    `[LocalDB] updateItem -> table=${table} id=${id} skipSync=${skipSync} changesKeys=${recordKeys(
      changes
    ).join(',')}`
  );

  if (table === 'cards') {
    const qBlocksLen = Array.isArray((payload as CardStorageRow).questionBlocks)
      ? (payload as CardStorageRow).questionBlocks!.length
      : undefined;
    const aBlocksLen = Array.isArray((payload as CardStorageRow).answerBlocks)
      ? (payload as CardStorageRow).answerBlocks!.length
      : undefined;
    const hasQText = typeof (payload as CardStorageRow).questionText === 'string';
    console.log(
      `[LocalDB] updateItem CARD_CHANGES -> Q_Blocks=${qBlocksLen}, A_Blocks=${aBlocksLen}, hasQText=${hasQText}`
    );
  }

  const tableApi =
    table === 'cards'
      ? db.table<CardStorageRow>(table)
      : table === 'folders'
      ? db.table<FolderStorageRow>(table)
      : db.table<AnyRow>(table);

  const result = await tableApi.update(id, payload);

  if (!skipSync) {
    const fullItem = await tableApi.get(id);
    if (fullItem) {
      await enqueueSync(table, 'upload', fullItem);
    }
  }

  return result;
}

/* -----------------------------
 * deleteItem
 * ----------------------------- */

export async function deleteItem(db: DbLike, table: 'documents', id: string): Promise<void>;
export async function deleteItem(db: DbLike, table: string, id: string): Promise<void>;
export async function deleteItem(db: DbLike, table: string, id: string): Promise<void> {
  if (table === 'documents') {
    if (!isDocDbCtx(db)) {
      throw new Error(
        '[LocalDB] documentsLifecycle requires db.documents, but the provided db does not have it.'
      );
    }
    await cleanupBeforeDocumentDelete(db, id);
  }
  const tableApi = db.table<AnyRow>(table);
  await tableApi.delete(id);
}

/* -----------------------------
 * softDelete
 * ----------------------------- */

export async function softDelete(
  db: DbLike,
  table: string,
  id: string,
  updateItemFn: (table: string, id: string, changes: Record<string, unknown>) => Promise<number>
): Promise<number> {
  const now = new Date();
  console.log(`[LocalDB] softDelete -> table=${table} id=${id}`);

  if (table === 'documents') {
    if (!isDocDbCtx(db)) {
      throw new Error(
        '[LocalDB] documentsLifecycle requires db.documents, but the provided db does not have it.'
      );
    }
    await cleanupBeforeDocumentSoftDelete(db, id);
  }

  const extraChanges: Record<string, unknown> =
    table === 'documents'
      ? { localFileId: null, localUrl: null, blobUrl: null }
      : {};

  return updateItemFn(table, id, {
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
    ...extraChanges,
  });
}

/* -----------------------------
 * bulkUpsert
 * ----------------------------- */

export async function bulkUpsert(
  db: DbLike,
  table: 'cards',
  items: CardInput[],
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<void>;
export async function bulkUpsert(
  db: DbLike,
  table: 'folders',
  items: FolderInput[],
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<void>;
export async function bulkUpsert(
  db: DbLike,
  table: string,
  items: Record<string, unknown>[],
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<void>;
export async function bulkUpsert(
  db: DbLike,
  table: string,
  items: unknown[],
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<void> {
  if (items.length === 0) return;

  const payload: AnyRow[] =
    table === 'cards'
      ? (items as CardInput[]).map((x) => denormalizeCardForStorage(x) as CardStorageRow)
      : table === 'folders'
      ? (items as FolderInput[]).map((x) => denormalizeFolderForStorage(x) as FolderStorageRow)
      : items.filter(isRecord);

  if (table === 'cards') {
    for (const entry of payload) {
      assertNoBlobUrlInCardPayload(entry, {
        entityType: table,
        entityId: getId(entry),
      });
    }
  }

  const tableApi =
    table === 'cards'
      ? db.table<CardStorageRow>(table)
      : table === 'folders'
      ? db.table<FolderStorageRow>(table)
      : db.table<AnyRow>(table);

  await tableApi.bulkPut(payload);

  if (!skipSync) {
    for (const item of payload) {
      await enqueueSync(table, 'upload', item);
    }
  }
}

/* -----------------------------
 * upsert
 * ----------------------------- */

export async function upsert(
  db: DbLike,
  tableName: 'cards',
  data: CardInput,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<void>;
export async function upsert(
  db: DbLike,
  tableName: 'folders',
  data: FolderInput,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<void>;
export async function upsert(
  db: DbLike,
  tableName: string,
  data: Record<string, unknown>,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<void>;
export async function upsert(
  db: DbLike,
  tableName: string,
  data: unknown,
  skipSync: boolean,
  enqueueSync: EnqueueSync
): Promise<void> {
  if (tableName === 'cards') {
    assertNoBlobUrlInCardPayload(data, { entityType: tableName, entityId: getId(data) });
  }

  const payload: AnyRow =
    tableName === 'cards'
      ? (denormalizeCardForStorage(data as CardInput) as CardStorageRow)
      : tableName === 'folders'
      ? (denormalizeFolderForStorage(data as FolderInput) as FolderStorageRow)
      : (isRecord(data) ? data : {});

  if (tableName === 'cards') {
    assertNoBlobUrlInCardPayload(payload, {
      entityType: tableName,
      entityId: getId(payload) ?? getId(data),
    });
  }

  const tableApi =
    tableName === 'cards'
      ? db.table<CardStorageRow>(tableName)
      : tableName === 'folders'
      ? db.table<FolderStorageRow>(tableName)
      : db.table<AnyRow>(tableName);

  await tableApi.put(payload);

  if (!skipSync) {
    await enqueueSync(tableName, 'upload', payload);
  }
}