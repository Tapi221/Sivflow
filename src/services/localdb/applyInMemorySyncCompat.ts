import { InMemoryLocalDB } from "@/services/InMemoryLocalDB";
import {
  createDeleteQueueItem,
  createUpsertQueueItem,
} from "@/application/usecases/syncQueueItemFactory";
import type {
  DeleteEntity,
  UpsertEntity,
} from "@/application/usecases/syncQueuePayloadGuards";
import type {
  SyncPayloadByEntity,
  SyncPriority,
  SyncQueueItem,
} from "@/types/domain/sync";
import { CURRENT_TAG_STORE } from "./tagStoreNames";

const SYNCABLE_TABLES = new Set<string>([
  "cards",
  "folders",
  "cardSets",
  "documents",
  CURRENT_TAG_STORE,
  "images",
  "userSettings",
]);

const ENTITY_MAP = {
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

type InMemoryLocalDBCompat = InMemoryLocalDB & {
  syncQueue: { put(item: SyncQueueItem): Promise<unknown> };
  syncTrigger?: (() => void) | null;
  enqueueSync?: (tableName: string, payload: unknown) => Promise<void>;
  queueUpsertSync?: <TEntity extends UpsertEntity>(args: {
    entity: TEntity;
    operationType: "create" | "update";
    payload: SyncPayloadByEntity[TEntity];
    priority?: SyncPriority;
  }) => Promise<void>;
  queueDeleteSync?: (args: {
    entity: DeleteEntity;
    targetId: string;
    priority?: SyncPriority;
  }) => Promise<void>;
};

const getPayloadId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return typeof record.id === "string" && record.id.length > 0
    ? record.id
    : null;
};

const putQueueItemAndTrigger = async (
  db: InMemoryLocalDBCompat,
  item: SyncQueueItem,
): Promise<void> => {
  await db.syncQueue.put(item);
  if (db.syncTrigger) {
    setTimeout(() => {
      db.syncTrigger?.();
    }, 0);
  }
};

export const applyInMemorySyncCompat = (): void => {
  const proto = InMemoryLocalDB.prototype as InMemoryLocalDBCompat;

  if (typeof proto.queueUpsertSync !== "function") {
    proto.queueUpsertSync = async function <TEntity extends UpsertEntity>({
      entity,
      operationType,
      payload,
      priority = "high",
    }: {
      entity: TEntity;
      operationType: "create" | "update";
      payload: SyncPayloadByEntity[TEntity];
      priority?: SyncPriority;
    }): Promise<void> {
      const item = createUpsertQueueItem({
        entity,
        operationType,
        payload,
        priority,
      });

      await putQueueItemAndTrigger(this, item);
    };
  }

  if (typeof proto.queueDeleteSync !== "function") {
    proto.queueDeleteSync = async function ({
      entity,
      targetId,
      priority = "high",
    }: {
      entity: DeleteEntity;
      targetId: string;
      priority?: SyncPriority;
    }): Promise<void> {
      const item = createDeleteQueueItem({
        entity,
        targetId,
        priority,
      });

      await putQueueItemAndTrigger(this, item);
    };
  }

  proto.enqueueSync = async function (
    tableName: string,
    payload: unknown,
  ): Promise<void> {
    if (!SYNCABLE_TABLES.has(tableName)) return;

    const entity = ENTITY_MAP[tableName as keyof typeof ENTITY_MAP];
    if (!entity) return;

    const targetId = getPayloadId(payload);
    if (!targetId) return;

    const record =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : null;
    const isDeleted = record?.isDeleted === true;

    if (isDeleted && DELETE_CAPABLE_ENTITIES.has(entity as DeleteEntity)) {
      await this.queueDeleteSync?.({
        entity: entity as DeleteEntity,
        targetId,
        priority: "high",
      });
      return;
    }

    await this.queueUpsertSync?.({
      entity: entity as UpsertEntity,
      operationType: "update",
      payload: payload as never,
      priority: "high",
    });
  };
};
