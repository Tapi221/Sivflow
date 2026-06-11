import { describe, expect, it, vi } from "vitest";


import type { ICloudSyncAdapter, INetworkMonitor, IQueueManager, SyncTask } from "@/services/interfaces/ISyncService";


import { DiffEngine } from "@/services/logic/DiffEngine";


import { SyncServiceV2 } from "@/services/SyncServiceV2";


import type { LocalDBLike, SyncableEntityTable } from "@/services/localdb";


import type { SyncQueueItem } from "@/types/domain/sync";

type Row = Record<string, unknown> & { id: string; userId?: string };

const makeTable = (rows: Row[] = []) => {
  const data = new Map(rows.map((row) => [row.id, { ...row }]));

  return {
    get: vi.fn(async (id: string) => data.get(id)),
    put: vi.fn(async (row: Row) => {
      data.set(row.id, { ...row });
    }),
    add: vi.fn(async (row: Row) => {
      data.set(row.id, { ...row });
      return row.id;
    }),
    update: vi.fn(async (id: string, changes: Record<string, unknown>) => {
      const current = data.get(id);
      if (!current) return 0;
      data.set(id, { ...current, ...changes });
      return 1;
    }),
    delete: vi.fn(async (id: string) => {
      data.delete(id);
    }),
    clear: vi.fn(async () => {
      data.clear();
    }),
    toArray: vi.fn(async () => [...data.values()].map((row) => ({ ...row }))),
    where: vi.fn((field: string) => ({
      equals: (value: unknown) => ({
        toArray: async () => [...data.values()].filter((row) => row[field] === value).map((row) => ({ ...row })),
      }),
    })),
  };
};

const makeLocalDb = (initial: Partial<Record<SyncableEntityTable, Row[]>> = {}) => {
  const tables = {
    cards: makeTable(initial.cards),
    folders: makeTable(initial.folders),
    cardSets: makeTable(initial.cardSets),
    documents: makeTable(initial.documents),
    tagRecords: makeTable(initial.tagRecords),
    images: makeTable(initial.images),
    userSettings: makeTable(initial.userSettings),
  };
  const syncQueue: SyncQueueItem[] = [];
  const conflicts: unknown[] = [];
  const upserts: Array<{ table: string; data: unknown; skipSync?: boolean }> = [];
  const queuedUpserts: unknown[] = [];
  const queuedDeletes: unknown[] = [];

  const db = {
    ...tables,
    notes: makeTable(),
    syncErrors: { toArray: vi.fn(async () => []) },
    userSettings: tables.userSettings,
    setSyncTrigger: vi.fn(),
    runSyncTransaction: vi.fn(async (scope: () => Promise<unknown>) => scope()),
    getQueuedItemsOldestFirst: vi.fn(async () => syncQueue),
    getSyncQueueCount: vi.fn(async () => syncQueue.length),
    getLastSyncTime: vi.fn(async () => new Date(50)),
    updateLastSyncTime: vi.fn(async () => undefined),
    clearSyncTables: vi.fn(async () => undefined),
    putSyncRecord: vi.fn(async () => undefined),
    getItem: vi.fn(async (table: SyncableEntityTable, id: string) => tables[table]?.get(id)),
    getAllItems: vi.fn(async (table: SyncableEntityTable) => tables[table]?.toArray() ?? []),
    getDirtyItems: vi.fn(async () => []),
    upsert: vi.fn(async (table: SyncableEntityTable, data: Row, skipSync?: boolean) => {
      upserts.push({ table, data, skipSync });
      await tables[table]?.put(data);
    }),
    queueUpsertSync: vi.fn(async (item: unknown) => {
      queuedUpserts.push(item);
    }),
    queueDeleteSync: vi.fn(async (item: unknown) => {
      queuedDeletes.push(item);
    }),
    putConflict: vi.fn(async (conflict: unknown) => {
      conflicts.push(conflict);
    }),
    getConflicts: vi.fn(async () => conflicts),
    getRecentSyncHistory: vi.fn(async () => []),
    listCardsByUser: vi.fn(async (userId: string) => (await tables.cards.toArray()).filter((row) => row.userId === userId)),
    listFoldersByUser: vi.fn(async (userId: string) => (await tables.folders.toArray()).filter((row) => row.userId === userId)),
    listCardSetsByUser: vi.fn(async (userId: string) => (await tables.cardSets.toArray()).filter((row) => row.userId === userId)),
    addCardSet: vi.fn(async (cardSet: Row) => {
      await tables.cardSets.put(cardSet);
    }),
    updateCardById: vi.fn(async (id: string, changes: Record<string, unknown>) => tables.cards.update(id, changes)),
    purge: vi.fn(async () => undefined),
    clearAllData: vi.fn(async () => undefined),
    getSyncSettings: vi.fn(async () => undefined),
    putSyncSettings: vi.fn(async () => undefined),
    getSyncError: vi.fn(async () => undefined),
    putSyncError: vi.fn(async () => undefined),
    clearSyncErrors: vi.fn(async () => undefined),
    getRetryableSyncErrors: vi.fn(async () => []),
    findQueueProcessingErrorsByTargetId: vi.fn(async () => []),
    putSyncHistory: vi.fn(async () => undefined),
    getSyncStatsSince: vi.fn(async () => ({ histories: [], errors: [] })),
    __upserts: upserts,
    __queuedUpserts: queuedUpserts,
    __queuedDeletes: queuedDeletes,
  };

  return db as unknown as LocalDBLike & {
    __upserts: typeof upserts;
    __queuedUpserts: typeof queuedUpserts;
    __queuedDeletes: typeof queuedDeletes;
    clearSyncTables: ReturnType<typeof vi.fn>;
  };
};

const makeCloud = (overrides: Partial<ICloudSyncAdapter>): ICloudSyncAdapter => ({
  pushBatch: vi.fn(async () => ({ successIds: [], failedIds: [] })),
  pullDiff: vi.fn(async () => ({ changes: [], serverTime: 1000 })),
  pullFull: vi.fn(async () => []),
  getDeviceStatus: vi.fn(async () => "active"),
  revokeDevice: vi.fn(async () => undefined),
  updateDeviceName: vi.fn(async () => undefined),
  cleanupInactiveDevices: vi.fn(async () => 0),
  ...overrides,
});

const makeNetwork = (): INetworkMonitor => ({
  status: "online",
  getBatchConstraint: vi.fn(() => ({ maxSize: 100, concurrency: 1, timeoutMs: 30_000 })),
  reportResult: vi.fn(),
  subscribe: vi.fn(() => () => undefined),
});

const makeTelemetry = () =>
  ({
    log: vi.fn(),
    recordMetric: vi.fn(),
    startTransaction: vi.fn(() => ({ end: vi.fn() })),
  }) as never;

const makeService = ({ cloud, localDB, queue }: { cloud: ICloudSyncAdapter; localDB: LocalDBLike; queue: IQueueManager }) =>
  new SyncServiceV2("user-1", localDB, queue, makeNetwork(), new DiffEngine(), cloud, makeTelemetry());

describe("SyncServiceV2 local-first sync", () => {
  it("起動同期ではクラウド取得より前にローカルの未送信変更を副本へ送る", async () => {
    const events: string[] = [];
    const task: SyncTask = {
      id: "task-1",
      type: "upload",
      entity: "card",
      operationType: "update",
      payload: { id: "card-1", userId: "user-1", title: "local" },
      priority: "high",
      createdAt: 1,
    };
    const queue: IQueueManager = {
      enqueue: vi.fn(),
      peekBatch: vi.fn().mockImplementationOnce(async () => {
        events.push("peek-before-pull");
        return [task];
      }).mockImplementationOnce(async () => []),
      complete: vi.fn(async () => undefined),
      fail: vi.fn(async () => undefined),
      getQueueDepth: vi.fn(async () => 0),
    };
    const cloud = makeCloud({
      pushBatch: vi.fn(async () => {
        events.push("push");
        return { successIds: ["card-1"], failedIds: [] };
      }),
      pullDiff: vi.fn(async () => {
        events.push("pull");
        return { changes: [], serverTime: 1000 };
      }),
    });

    await makeService({ cloud, localDB: makeLocalDb({ cards: [{ id: "card-1", userId: "user-1" }] }), queue }).performStartupSync();

    expect(events).toEqual(["peek-before-pull", "push", "pull"]);
    expect(queue.complete).toHaveBeenCalledWith(["task-1"]);
  });

  it("リモート差分と競合した場合はローカルを正本として保持し、クラウド副本へ再キューする", async () => {
    const localDB = makeLocalDb({
      cards: [{ id: "card-1", userId: "user-1", title: "local", updatedAt: 100, localUpdatedAt: 150, lastSyncedAt: 50 }],
    });
    const queue: IQueueManager = {
      enqueue: vi.fn(),
      peekBatch: vi.fn(async () => []),
      complete: vi.fn(),
      fail: vi.fn(),
      getQueueDepth: vi.fn(async () => 0),
    };
    const cloud = makeCloud({
      pullDiff: vi.fn(async () => ({
        changes: [{ type: "card", id: "card-1", data: { id: "card-1", userId: "user-1", title: "remote", updatedAt: 200 } }],
        serverTime: 1000,
      })),
    });

    await makeService({ cloud, localDB, queue }).performStartupSync();

    expect(localDB.__upserts[0]?.data).toMatchObject({ title: "local" });
    expect(localDB.putConflict).toHaveBeenCalledTimes(1);
    expect(localDB.__queuedUpserts).toEqual(expect.arrayContaining([expect.objectContaining({ entity: "card", payload: expect.objectContaining({ id: "card-1", title: "local" }) })]));
  });

  it("強制再同期でもローカル同期テーブルを消去せず、ローカル全体を副本へ再提示する", async () => {
    const localDB = makeLocalDb({
      cards: [{ id: "card-1", userId: "user-1", title: "local", updatedAt: 100, localUpdatedAt: 150, lastSyncedAt: 50 }],
    });
    const queue: IQueueManager = {
      enqueue: vi.fn(),
      peekBatch: vi.fn(async () => []),
      complete: vi.fn(),
      fail: vi.fn(),
      getQueueDepth: vi.fn(async () => 0),
    };
    const cloud = makeCloud({
      pullDiff: vi.fn(async () => ({
        changes: [{ type: "card", id: "card-1", data: { id: "card-1", userId: "user-1", title: "remote", updatedAt: 200 } }],
        serverTime: 1000,
      })),
    });

    await makeService({ cloud, localDB, queue }).forceFullResync();

    expect(localDB.clearSyncTables).not.toHaveBeenCalled();
    expect(localDB.__upserts[0]?.data).toMatchObject({ title: "local" });
    expect(localDB.__queuedUpserts).toEqual(expect.arrayContaining([expect.objectContaining({ entity: "card", payload: expect.objectContaining({ id: "card-1", title: "local" }) })]));
  });
});
