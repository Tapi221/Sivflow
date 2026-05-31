import { describe, expect, it } from "vitest";
import { DiffEngine } from "@/services/logic/DiffEngine";

// Note: This test file requires 'vitest' to be installed and configured.
// Since vitest is not in package.json yet, this serves as the implementation
// of the test logic ready to be run once the environment is set up.

describe("DiffEngine", () => {
  const engine = new DiffEngine();

  describe("calculateDiff", () => {
    it("オブジェクトが同一なら null を返す", () => {
      const local = { id: "1", title: "test", content: "hello" };
      const remote = { id: "1", title: "test", content: "hello" };

      const diff = engine.calculateDiff(local, remote);
      expect(diff).toBeNull();
    });

    it("単純なフィールド変更を検出する", () => {
      const local = {
        id: "1",
        title: "new title",
        content: "hello",
        updatedAt: 100,
      };
      const remote = {
        id: "1",
        title: "old title",
        content: "hello",
        updatedAt: 50,
      };

      const diff = engine.calculateDiff(local, remote);
      expect(diff).toEqual({ title: "new title" });
    });

    it("メタデータフィールドを無視する", () => {
      const local = {
        id: "1",
        title: "test",
        updatedAt: 200,
        lastSyncedAt: 100,
      };
      const remote = {
        id: "1",
        title: "test",
        updatedAt: 100,
        lastSyncedAt: 50,
      };

      const diff = engine.calculateDiff(local, remote);
      expect(diff).toBeNull();
    });
  });

  describe("merge", () => {
    it("ローカル変更がない場合は remote の変更をマージする", () => {
      const local = {
        id: "1",
        title: "old",
        updatedAt: 100,
        lastSyncedAt: 100,
        localUpdatedAt: 100,
      };
      const remote = { id: "1", title: "new", updatedAt: 200 };

      const { merged, conflict } = engine.merge(local, remote);

      expect(conflict).toBe(false);
      expect(merged.title).toBe("new");
      expect(merged.updatedAt).toBe(200);
    });

    it("両側が変更されている場合は競合を検出する", () => {
      const local = {
        id: "1",
        title: "local change",
        updatedAt: 100,
        lastSyncedAt: 50,
        localUpdatedAt: 100,
      };
      const remote = { id: "1", title: "remote change", updatedAt: 200 };

      const { merged, conflict } = engine.merge(local, remote, "server_wins");

      expect(conflict).toBe(true);
      expect(merged.title).toBe("remote change"); // server_wins logic
    });

    it("client_wins 戦略を尊重する", () => {
      const local = {
        id: "1",
        title: "local change",
        updatedAt: 100,
        lastSyncedAt: 50,
        localUpdatedAt: 100,
      };
      const remote = { id: "1", title: "remote change", updatedAt: 200 };

      const { merged, conflict } = engine.merge(local, remote, "client_wins");

      expect(conflict).toBe(true);
      expect(merged.title).toBe("local change"); // stays local
    });
  });

  describe("validateConsistency", () => {
    it("ID が一致しない場合は false を返す", () => {
      const local = { id: "1" };
      const remote = { id: "2" };
      expect(engine.validateConsistency(local, remote)).toBe(false);
    });

    it("基本データに整合性がある場合は true を返す", () => {
      const local = { id: "1", title: "A" };
      const remote = { id: "1", title: "B" };
      expect(engine.validateConsistency(local, remote)).toBe(true);
    });
  });
});
