import { describe, expect, it } from "vitest";
import { DiffEngine } from "@/services/logic/DiffEngine";

describe("DiffEngine", () => {
  const diffEngine = new DiffEngine();

  describe("calculateDiff", () => {
    it("差分がない場合は null を返す", () => {
      const local = { id: "1", title: "test", updatedAt: 100 };
      const remote = { id: "1", title: "test", updatedAt: 200 };

      const diff = diffEngine.calculateDiff(local, remote);
      expect(diff).toBeNull();
    });

    it("フィールド変更を検出する", () => {
      const local = { id: "1", title: "new title", updatedAt: 100 };
      const remote = { id: "1", title: "old title", updatedAt: 200 };

      const diff = diffEngine.calculateDiff(local, remote);
      expect(diff).toEqual({ title: "new title" });
    });

    it("メタデータフィールドを無視する", () => {
      const local = {
        id: "1",
        title: "test",
        updatedAt: 100,
        lastSyncedAt: 90,
        localUpdatedAt: 110,
        _metadata: { version: 1 },
      };
      const remote = {
        id: "1",
        title: "test",
        updatedAt: 200,
        lastSyncedAt: 100,
        localUpdatedAt: 120,
        _metadata: { version: 2 },
      };

      const diff = diffEngine.calculateDiff(local, remote);
      expect(diff).toBeNull();
    });

    it("JSON 比較で構造的な変更を検出する", () => {
      const local = { id: "1", tags: ["a", "b"] };
      const remote = { id: "1", tags: ["a"] };

      const diff = diffEngine.calculateDiff(local, remote);
      expect(diff).toEqual({ tags: ["a", "b"] });
    });

    it("入力が欠けている場合は null を返す", () => {
      expect(diffEngine.calculateDiff(null, {})).toBeNull();
      expect(diffEngine.calculateDiff({}, null)).toBeNull();
    });
  });

  describe("merge", () => {
    const baseLocal = {
      id: "1",
      title: "local",
      updatedAt: 100,
      localUpdatedAt: 100,
      lastSyncedAt: 100,
    };

    it("local が null の初回同期では remote データを返す", () => {
      const remote = { id: "1", title: "remote" };
      const result = diffEngine.merge(null, remote);
      expect(result.merged).toEqual(remote);
      expect(result.conflict).toBe(false);
    });

    it("remote が null の場合は local データを返す", () => {
      const result = diffEngine.merge(baseLocal, null);
      expect(result.merged).toEqual(baseLocal);
      expect(result.conflict).toBe(false);
    });

    it("サーバー側に新しいデータがある場合は local を更新する", () => {
      const remote = {
        id: "1",
        title: "remote update",
        updatedAt: 200,
      };

      const result = diffEngine.merge(baseLocal, remote);

      expect(result.merged).toMatchObject({ title: "remote update" });
      expect(result.conflict).toBe(false);
      expect(result.merged.updatedAt).toBe(200);
    });

    it("local だけが変更されている場合は local を保持する", () => {
      const local = {
        ...baseLocal,
        title: "local update",
        localUpdatedAt: 150,
      };
      const remote = {
        id: "1",
        title: "old remote",
        updatedAt: 100,
      };

      const result = diffEngine.merge(local, remote);

      expect(result.merged).toMatchObject({ title: "local update" });
      expect(result.conflict).toBe(false);
    });

    it("両側が変更されている場合は競合を検出する", () => {
      const local = {
        ...baseLocal,
        title: "local changes",
        localUpdatedAt: 150,
      };
      const remote = { ...baseLocal, title: "remote changes", updatedAt: 200 };

      const result = diffEngine.merge(local, remote, "server_wins");

      expect(result.conflict).toBe(true);
      expect(result.merged).toMatchObject({ title: "remote changes" });
    });

    it("競合時に client_wins 戦略を尊重する", () => {
      const local = {
        ...baseLocal,
        title: "local changes",
        localUpdatedAt: 150,
      };
      const remote = { ...baseLocal, title: "remote changes", updatedAt: 200 };

      const result = diffEngine.merge(local, remote, "client_wins");

      expect(result.conflict).toBe(true);
      expect(result.merged).toMatchObject({ title: "local changes" });
      expect(result.merged.updatedAt).toBe(200);
    });
  });

  describe("validateConsistency", () => {
    it("ID が一致していれば true を返す", () => {
      expect(diffEngine.validateConsistency({ id: "1" }, { id: "1" })).toBe(
        true,
      );
    });

    it("ID が一致しなければ false を返す", () => {
      expect(diffEngine.validateConsistency({ id: "1" }, { id: "2" })).toBe(
        false,
      );
    });

    it("どちらかが欠けている場合は false を返す", () => {
      expect(diffEngine.validateConsistency(null, { id: "1" })).toBe(false);
      expect(diffEngine.validateConsistency({ id: "1" }, null)).toBe(false);
    });
  });
});
