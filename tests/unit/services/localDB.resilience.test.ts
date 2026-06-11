// @vitest-environment jsdom
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalDb, getLocalDBRuntimeStatus, getLocalDBTelemetrySnapshot, LocalDB, resetLocalDBForLogout, telemetryOncePerSession } from "@/services/localDB";

describe("LocalDB resilience", () => {
  const resetStaticState = () => {
    const localDBClass = LocalDB as unknown;
    localDBClass.persistentOpenDisabled = false;
    localDBClass.openingPromise = null;
    localDBClass.openingUserId = null;
    localDBClass.resettingPromise = null;
    localDBClass.generationBumpedUsers = new Set();
  };

  beforeEach(() => {
    LocalDB.clearInstance();
    resetStaticState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    LocalDB.clearInstance();
    resetStaticState();
    vi.restoreAllMocks();
  });

  it("同時 getInstance 呼び出しでは同じ in-flight promise を返す", async () => {
    const openSpy = vi
      .spyOn(Dexie.prototype, "open")
      .mockImplementation(function mockOpen(this: Dexie) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(this), 25);
        }) as unknown;
      });

    const [db1, db2] = await Promise.all([
      getLocalDb("test-user"),
      getLocalDb("test-user"),
    ]);

    expect(db1).toBe(db2);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("ログアウト reset を best-effort に保ち、失敗理由を保存する", async () => {
    LocalDB.clearInstance();
    const deleteSpy = vi
      .spyOn(Dexie, "delete")
      .mockRejectedValue(new Error("forced reset failure"));

    await resetLocalDBForLogout("test-user");

    const status = getLocalDBRuntimeStatus();
    expect(deleteSpy).toHaveBeenCalled();
    expect(status.resetFailedReason).toContain("delete failed");
  });

  it("backing-store UnknownError で fallback mode に切り替え、無限に再試行しない", async () => {
    const backingStoreError = Object.assign(
      new Error("Internal error opening backing store for indexedDB.open."),
      { name: "UnknownError" },
    );

    const openSpy = vi
      .spyOn(Dexie.prototype, "open")
      .mockRejectedValue(backingStoreError);

    const db = await getLocalDb("test-user");
    const status = getLocalDBRuntimeStatus();

    expect((db as unknown).isInMemoryFallback).toBe(true);
    expect(status.mode).toBe("fallback");
    expect(status.generationBumped).toBe(true);
    expect(status.fallbackReason?.toLowerCase()).toContain("backing store");
    expect(openSpy).toHaveBeenCalledTimes(1);

    await getLocalDb("test-user");
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("backing-store 失敗が繰り返されても generation bump は session あたり最大 1 回にする", async () => {
    const backingStoreError = Object.assign(
      new Error("Internal error opening backing store for indexedDB.open."),
      { name: "UnknownError" },
    );

    vi.spyOn(Dexie.prototype, "open").mockRejectedValue(backingStoreError);

    await getLocalDb("bump-user");
    const firstGeneration = window.localStorage.getItem(
      "flashcard.localdb.generation.bump-user",
    );
    expect(firstGeneration).toBe("1");

    await resetLocalDBForLogout("bump-user");
    await getLocalDb("bump-user");
    const secondGeneration = window.localStorage.getItem(
      "flashcard.localdb.generation.bump-user",
    );
    expect(secondGeneration).toBe("1");
  });

  it("ログアウト reset 時に既知のすべての generation の削除を試みる", async () => {
    const originalDatabases = indexedDB.databases;
    try {
      (indexedDB as unknown).databases = vi
        .fn()
        .mockResolvedValue([
          { name: "FlashcardMasterDB_reset-user_v19_g2" },
          { name: "FlashcardMasterDB_reset-user_v19_g3" },
          { name: "unrelated_db" },
        ]);

      const deleteSpy = vi
        .spyOn(Dexie, "delete")
        .mockResolvedValue(undefined as unknown);

      await resetLocalDBForLogout("reset-user");

      const deletedNames = deleteSpy.mock.calls.map(([name]) => String(name));
      expect(deletedNames).toContain("FlashcardMasterDB_reset-user_v19_g0");
      expect(deletedNames).toContain("FlashcardMasterDB_reset-user_v19_g1");
      expect(deletedNames).toContain("FlashcardMasterDB_reset-user_v19_g2");
      expect(deletedNames).toContain("FlashcardMasterDB_reset-user_v19_g3");
      expect(deletedNames).toContain("FlashcardMasterDB_reset-user");
    } finally {
      (indexedDB as unknown).databases = originalDatabases;
    }
  });

  it("LocalDB telemetry snapshot key を公開する", async () => {
    const snapshot = getLocalDBTelemetrySnapshot();
    expect(snapshot).toHaveProperty("localdb_mode");
    expect(snapshot).toHaveProperty("localdb_reason_code");
    expect(snapshot).toHaveProperty("localdb_fallback_reason");
    expect(snapshot).toHaveProperty("localdb_generation_bumped");
    expect(snapshot).toHaveProperty("localdb_reset_failed");
  });

  it("LocalDB telemetry を session key ごとに 1 回だけ送出する", () => {
    expect(telemetryOncePerSession("localdb_runtime")).toBe(true);
    expect(telemetryOncePerSession("localdb_runtime")).toBe(false);
  });
});
