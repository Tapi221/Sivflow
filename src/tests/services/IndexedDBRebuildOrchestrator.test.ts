import { beforeEach, describe, expect, it, vi } from "vitest";

const pullDiffMock = vi.fn();
const getLocalDbMock = vi.fn();
const dexieDeleteMock = vi.fn();
const clearInstanceMock = vi.fn();
const markCleanMock = vi.fn();

vi.mock("../logic/CloudSyncAdapter", () => ({
  CloudSyncAdapter: class {
    pullDiff = pullDiffMock;
  },
}));

vi.mock("../localDB", () => ({
  getLocalDb: getLocalDbMock,
  LocalDB: {
    clearInstance: clearInstanceMock,
    getDatabaseNameForUser: (userId: string) => `FlashcardMasterDB_${userId}`,
  },
}));

vi.mock("dexie", () => ({
  Dexie: {
    delete: dexieDeleteMock,
  },
}));

vi.mock("../IndexedDBMetadataService", () => ({
  IndexedDBMetadataService: class {
    markClean = markCleanMock;
  },
}));

describe("IndexedDBRebuildOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues rebuild with degraded success when one item fails", async () => {
    const oldDb = { close: vi.fn(), name: "FlashcardMasterDB_user-1" };
    const upsert = vi.fn(async (_table: string, data: unknown) => {
      if (data?.id === "bad-card") {
        throw new Error("bad payload");
      }
    });
    const newDb = {
      folders: {},
      cards: {},
      users: {},
      userSettings: {},
      userStats: {},
      syncMetadata: {},
      levelHistories: {},
      deviceMeta: {},
      tags: {},
      cardRelations: {},
      projectMaps: {},
      upsert,
      transaction: vi.fn(
        async (_mode: string, _tables: unknown[], fn: () => Promise<void>) => {
          await fn();
        },
      ),
    };

    pullDiffMock.mockResolvedValue({
      changes: [
        {
          type: "card",
          id: "ok-card",
          data: { id: "ok-card", questionBlocks: [] },
        },
        {
          type: "card",
          id: "bad-card",
          data: { id: "bad-card", questionBlocks: [] },
        },
      ],
    });
    getLocalDbMock
      .mockResolvedValueOnce(oldDb as unknown)
      .mockResolvedValueOnce(newDb as unknown);

    const { IndexedDBRebuildOrchestrator } =
      await import("../IndexedDBRebuildOrchestrator");

    const result = await IndexedDBRebuildOrchestrator.rebuild("user-1", "test");

    expect(result.success).toBe(true);
    expect(result.degraded).toBe(true);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].id).toBe("bad-card");
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith(
      "cards",
      expect.objectContaining({ id: "ok-card" }),
      true,
    );
    expect(dexieDeleteMock).toHaveBeenCalled();
  });
});
