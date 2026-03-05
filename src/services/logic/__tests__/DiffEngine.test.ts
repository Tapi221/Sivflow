import { describe, it, expect } from "vitest";
import { DiffEngine } from "../DiffEngine";

// Note: This test file requires 'vitest' to be installed and configured.
// Since vitest is not in package.json yet, this serves as the implementation
// of the test logic ready to be run once the environment is set up.

describe("DiffEngine", () => {
  const engine = new DiffEngine();

  describe("calculateDiff", () => {
    it("should return null when objects are identical", () => {
      const local = { id: "1", title: "test", content: "hello" };
      const remote = { id: "1", title: "test", content: "hello" };

      const diff = engine.calculateDiff(local, remote);
      expect(diff).toBeNull();
    });

    it("should detect simple field changes", () => {
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

    it("should ignore metadata fields", () => {
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
    it("should merge remote changes when no local changes", () => {
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

    it("should detect conflicts when both sides changed", () => {
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

    it("should respect client_wins strategy", () => {
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
    it("should return false if IDs fail to match", () => {
      const local = { id: "1" };
      const remote = { id: "2" };
      expect(engine.validateConsistency(local, remote)).toBe(false);
    });

    it("should return true for consistent basic data", () => {
      const local = { id: "1", title: "A" };
      const remote = { id: "1", title: "B" };
      expect(engine.validateConsistency(local, remote)).toBe(true);
    });
  });
});
