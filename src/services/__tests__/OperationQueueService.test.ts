// @vitest-environment jsdom
import { operationQueue } from "@/services/operationQueue";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock DB
// Dexie is actually persistent in JSDOM unless cleared.
// We clear before each test.

describe("OperationQueueService", () => {
  beforeEach(async () => {
    await db.syncQueue.clear();
    await db.syncErrors.clear();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    // Cleanup to avoid polluting other tests
    await db.syncQueue.clear();
  });

  describe("Compression Logic (Operation Matrix)", () => {
    it("should compress create + update -> create", async () => {
      const targetId = "target-1";
      await operationQueue.enqueueChange("card", targetId, "create", { v: 1 });
      await operationQueue.enqueueChange("card", targetId, "update", { v: 2 });

      const items = await db.syncQueue.toArray();
      expect(items).toHaveLength(1);
      expect(items[0].operationType).toBe("create");
      expect(items[0].payload).toEqual({ v: 2 }); // Payload updated
    });

    it("should discard create + delete", async () => {
      const targetId = "target-2";
      await operationQueue.enqueueChange("card", targetId, "create", { v: 1 });
      await operationQueue.enqueueChange("card", targetId, "delete", {});

      const items = await db.syncQueue.toArray();
      expect(items).toHaveLength(0); // Discarded
    });

    it("should compress update + update -> update", async () => {
      const targetId = "target-3";
      await operationQueue.enqueueChange("card", targetId, "update", { v: 1 });
      await operationQueue.enqueueChange("card", targetId, "update", { v: 2 });

      const items = await db.syncQueue.toArray();
      expect(items).toHaveLength(1);
      expect(items[0].operationType).toBe("update");
      expect(items[0].payload).toEqual({ v: 2 });
    });

    it("should compress update + delete -> delete", async () => {
      const targetId = "target-4";
      await operationQueue.enqueueChange("card", targetId, "update", { v: 1 });
      await operationQueue.enqueueChange("card", targetId, "delete", {});

      const items = await db.syncQueue.toArray();
      expect(items).toHaveLength(1);
      expect(items[0].operationType).toBe("delete");
    });

    it("should compress delete + create -> update (restore)", async () => {
      const targetId = "target-5";
      await operationQueue.enqueueChange("card", targetId, "delete", {});
      await operationQueue.enqueueChange("card", targetId, "create", { v: 1 });

      const items = await db.syncQueue.toArray();
      expect(items).toHaveLength(1);
      expect(items[0].operationType).toBe("update");
      expect(items[0].payload).toEqual({ v: 1 });
    });

    it("should handle invalid create + create as error (force new enqueue)", async () => {
      const targetId = "target-6";
      await operationQueue.enqueueChange("card", targetId, "create", { v: 1 });
      // Should warn and enqueue separate item
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await operationQueue.enqueueChange("card", targetId, "create", { v: 2 });

      const items = await db.syncQueue.toArray();
      expect(items).toHaveLength(2); // Two creates
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("Priority Resolution", () => {
    it("should upgrade priority to high", async () => {
      const targetId = "prio-1";
      await operationQueue.enqueueChange(
        "card",
        targetId,
        "update",
        { v: 1 },
        "background",
      );
      const itemBefore = await db.syncQueue.where({ targetId }).first();
      expect(itemBefore?.priority).toBe("background");

      // Compress with Normal -> Normal
      await operationQueue.enqueueChange(
        "card",
        targetId,
        "update",
        { v: 2 },
        "normal",
      );
      const itemNormal = await db.syncQueue.where({ targetId }).first();
      expect(itemNormal?.priority).toBe("normal");

      // Compress with High -> High
      await operationQueue.enqueueChange(
        "card",
        targetId,
        "update",
        { v: 3 },
        "high",
      );
      const itemHigh = await db.syncQueue.where({ targetId }).first();
      expect(itemHigh?.priority).toBe("high");

      // Compress with Low again -> should stay High
      await operationQueue.enqueueChange(
        "card",
        targetId,
        "update",
        { v: 4 },
        "background",
      );
      const itemFinal = await db.syncQueue.where({ targetId }).first();
      expect(itemFinal?.priority).toBe("high");
    });
  });

  describe("Processing & Retry", () => {
    it("should retry on failure and eventually move to DLQ", async () => {
      const targetId = "retry-1";
      await operationQueue.enqueueChange("card", targetId, "create", { v: 1 });

      // Mock performSyncOperation to always fail
      vi.spyOn(
        operationQueue as unknown,
        "performSyncOperation",
      ).mockRejectedValue(new Error("Network Error"));

      // Mock trigger to do nothing automatically, we drive manually
      vi.spyOn(operationQueue as unknown, "triggerProcess").mockImplementation(
        () => {},
      );

      // Run process 6 times (Max 5 retries + 1 initial)
      // Note: backoff delays nextRetryAt, so we need to trick time or just ignore nextRetryAt check in tests?
      // The processQueue filters by `nextRetryAt <= now`.
      // We can manually update db state to skip waiting.

      for (let i = 0; i <= 5; i++) {
        // Ensure item is ready to be picked (reset nextRetryAt)
        await db.syncQueue
          .where({ targetId })
          .modify({ nextRetryAt: 0, status: "pending" });

        await operationQueue.processQueue();

        const item = await db.syncQueue.where({ targetId }).first();
        if (i < 5) {
          expect(item).toBeDefined();
          expect(item?.retryCount).toBe(i + 1);
          expect(item?.status).toBe("pending"); // Should be reverted to pending
        } else {
          // After 6th try (Initial + 5 Retries), it fails again inside processQueue
          // But wait, MaxRetries=5 means: Initial(0), Retry(1), Retry(2), Retry(3), Retry(4), Retry(5). Next failure -> DLQ.
        }
      }

      // After max retries exceed (in handleFailure), it moves to DLQ
      // We need one more run to trigger the "over limit" check?
      // handleFailure increments count. If newCount > MAX, DLQ.
      // i=5 loop: calls process. Fails. handleFailure changes count to 6. 6 > 5 -> DLQ.

      const itemFinal = await db.syncQueue.where({ targetId }).first();
      expect(itemFinal).toBeUndefined(); // Deleted from queue

      const dlqItem = await db.syncErrors.where({ phase: "queue_dlq" }).first();
      expect(dlqItem).toBeDefined();
      expect(dlqItem?.message).toContain("Network Error");
    });
  });

  describe("Idempotency", () => {
    it("should preserve idempotency key during compression", async () => {
      const targetId = "idem-1";
      await operationQueue.enqueueChange("card", targetId, "create", { v: 1 });
      const item1 = await db.syncQueue.where({ targetId }).first();
      const originalKey = item1?.idempotencyKey;
      expect(originalKey).toBeDefined();

      await operationQueue.enqueueChange("card", targetId, "update", { v: 2 });
      const item2 = await db.syncQueue.where({ targetId }).first();

      expect(item2?.idempotencyKey).toBe(originalKey); // MUST not change
      expect(item2?.payload).toEqual({ v: 2 });
    });
  });
  describe("Stale Item Recovery", () => {
    it("should recover items stuck in processing state for too long", async () => {
      const targetId = "stale-1";
      // 1. Manually insert a stuck item
      await db.syncQueue.add({
        id: "stale-item-id",
        idempotencyKey: "key",
        targetId,
        entity: "card",
        operationType: "create",
        payload: {},
        priority: "normal",
        status: "processing", // STUCK
        createdAt: Date.now() - 3600000, // 1 hour ago
        updatedAt: Date.now() - 3600000,
        processingStartedAt: Date.now() - 600000, // 10 mins ago (Threshold is 5)
        retryCount: 0,
      });

      // 2. Trigger cleanup directly to inspect state before processing picks it up
      await (operationQueue as unknown).cleanupStaleProcessing();

      // 3. Verify status reverted
      const item = await db.syncQueue.get("stale-item-id");
      expect(item).toBeDefined();
      expect(item?.status).toBe("pending");
      expect(item?.retryCount).toBe(1);
      expect(item?.lastError).toBe("Stale Processing Recovery");
    });
  });
});
