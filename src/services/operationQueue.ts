import { getLocalDb } from "./localDB";
import type { SyncQueueItem } from "@/types/domain/sync";

export type QueuePriority = "critical" | "high" | "medium" | "low";
export type OperationType = "create" | "update" | "delete";

// 'completed' | 'failed' are reserved for future audit logs.
// Current Policy: Delete on Success, Revert to Pending/DLQ on Failure.
export type QueueStatus = "pending" | "processing" | "completed" | "failed";

type SynthesisResult = OperationType | "discard" | "error";

/**
 * Operation Synthesis Matrix
 * Defines how to combine a new operation with an existing pending operation.
 *
 * Assumption: 'data' is a complete snapshot replacement. No deep merging.
 */
const OPERATION_MATRIX: Record<
  OperationType,
  Record<OperationType, SynthesisResult>
> = {
  create: {
    create: "error", // Duplicate create
    update: "create", // Update on top of create -> effectively create with new data
    delete: "discard", // Create then delete -> cancel out
  },
  update: {
    create: "error", // Create on top of update -> invalid
    update: "update", // Update on top of update -> merge to single update (latest data)
    delete: "delete", // Update then delete -> delete
  },
  delete: {
    create: "update", // Delete then create -> effective restore (update)
    update: "error", // Update on top of delete
    delete: "delete", // Redundant delete
  },
};

class OperationQueueService {
  // Concurrency & Batch Settings
  private readonly MAX_CONCURRENCY = 5;
  private readonly BATCH_LIMIT = 20;

  // Retry Settings
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 1000;
  private readonly MAX_DELAY_MS = 30000;
  private readonly JITTER_FACTOR = 0.1; // +/- 10%
  private readonly STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (Orphan detection)

  constructor() {}

  /**
   * Enqueues a change operation with compression logic.
   * If a pending operation exists for the same target, it attempts to compress them.
   */
  async enqueueChange(
    entity: "card" | "folder" | "asset",
    targetId: string,
    operationType: OperationType,
    data: unknown,
    priority: QueuePriority = "medium",
  ): Promise<void> {
    const db = await getLocalDb();
    await db.transaction("rw", ["syncQueue"], async () => {
      // 1. Find existing Pending item
      // Items in 'processing' status are EXCLUDED from compression to preserve execution integrity.
      // We use the composite index [targetId+status] implicitly via where clause.
      const existingItem = await db.syncQueue
        .where({ targetId: targetId })
        .filter((item) => item.status === "pending")
        .first();

      if (existingItem) {
        // 2. Apply Synthesis Matrix
        const existingOp = existingItem.operationType as OperationType;
        const resultOp = OPERATION_MATRIX[existingOp][operationType];

        // 2-a. Discard (e.g. Create + Delete)
        if (resultOp === "discard") {
          await db.syncQueue.delete(existingItem.id);
          console.log(
            `[Queue] Discarded operation for ${targetId} (${existingOp}+${operationType})`,
          );
          return;
        }

        // 2-b. Error / Fallback (e.g. Invalid sequence)
        if (resultOp === "error") {
          console.warn(
            `[Queue] Invalid sequence: ${existingOp} -> ${operationType}. Forcing new enqueue.`,
          );
          // Force add as a new item (no compression)
          await this.addItem(entity, targetId, operationType, data, priority);
          return;
        }

        // 2-c. Update (Compression)
        // Preserve IdempotencyKey, Replace Payload, Merge Priority
        await db.syncQueue.update(existingItem.id, {
          operationType: resultOp as OperationType,
          payload: data, // Snapshot Replacement
          priority: this.resolvePriority(existingItem.priority, priority),
          entity: entity, // Ensure entity is correct (should match)
          updatedAt: Date.now(),
          retryCount: 0,
          lastError: undefined,
          nextRetryAt: undefined,
        });
        console.log(
          `[Queue] Compressed: ${existingOp} + ${operationType} -> ${resultOp}`,
        );
      } else {
        // 3. New Item
        await this.addItem(entity, targetId, operationType, data, priority);
      }
    });

    // Trigger processing
    this.triggerProcess();
  }

  // Helper to add new item
  private async addItem(
    entity: "card" | "folder" | "asset",
    targetId: string,
    op: OperationType,
    data: unknown,
    priority: QueuePriority,
  ) {
    const newItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(), // Generated once per operation stream
      targetId,
      entity,
      operationType: op,
      action: op, // Legacy compatibility
      type: "upload",
      payload: data,
      priority,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
    };
    const db = await getLocalDb();
    await db.syncQueue.add(newItem);
  }

  /**
   * Processes the queue with concurrency control and priority handling.
   * Safe to call concurrently (Re-entrant safe).
   */
  async processQueue(): Promise<void> {
    const db = await getLocalDb();
    // 0. Cleanup Stale Items (Self-Healing)
    await this.cleanupStaleProcessing();

    // 1. Global Concurrency Check
    const processingCount = await db.syncQueue
      .where("status")
      .equals("processing")
      .count();

    if (processingCount >= this.MAX_CONCURRENCY) return;

    const capacity = this.MAX_CONCURRENCY - processingCount;
    const fetchLimit = Math.min(capacity, this.BATCH_LIMIT);
    const now = Date.now();

    // 2. Cascading Priority Fetch
    // We try to fill the 'fetchLimit' starting from High priority
    let candidates: SyncQueueItem[] = [];

    // Helper to fetch
    const fetchByPriority = async (p: QueuePriority, limit: number) => {
      if (limit <= 0) return [];
      return await db.syncQueue
        .where("[status+priority]")
        .equals(["pending", p])
        .filter((item) => !item.nextRetryAt || item.nextRetryAt <= now)
        .limit(limit)
        .sortBy("createdAt");
    };

    // a. High
    const highs = await fetchByPriority("high", fetchLimit);
    candidates = [...candidates, ...highs];

    // b. Medium (Normal)
    const mediums = await fetchByPriority(
      "medium",
      fetchLimit - candidates.length,
    );
    candidates = [...candidates, ...mediums];

    // c. Low (Background)
    const lows = await fetchByPriority("low", fetchLimit - candidates.length);
    candidates = [...candidates, ...lows];

    if (candidates.length === 0) return;

    // 3. Lock & Execute
    // Process items in parallel (limited by the fact we just fetched limited batch)
    await Promise.all(
      candidates.map(async (item) => {
        // 3-a. Transactional Lock (CAS)
        const lockedItem = await db.transaction<
          SyncQueueItem | null | undefined
        >("rw", ["syncQueue"], async () => {
          const current = await db.syncQueue.get(item.id);
          if (!current || current.status !== "pending") return null;

          // Update to processing
          await db.syncQueue.update(item.id, {
            status: "processing",
            processingStartedAt: Date.now(),
          });
          return current;
        });

        if (!lockedItem) return; // Lost race or already processed

        // 3-b. Execution
        try {
          await this.performSyncOperation(lockedItem);

          // Success: Delete Immediately (Delete on Success)
          await db.syncQueue.delete(lockedItem.id);
        } catch (error) {
          await this.handleFailure(lockedItem, error);
        }
      }),
    );

    // Continue processing if queue might not be empty and we had full batch
    if (candidates.length === fetchLimit) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private resolvePriority(p1: QueuePriority, p2: QueuePriority): QueuePriority {
    const scores = { critical: 4, high: 3, medium: 2, low: 1 };
    return scores[p1] >= scores[p2] ? p1 : p2;
  }

  /**
   * Failure Handling with Backoff & DLQ
   */
  private async handleFailure(
    item: SyncQueueItem,
    error: unknown,
  ): Promise<void> {
    const newRetryCount = (item.retryCount || 0) + 1;

    if (newRetryCount > this.MAX_RETRIES) {
      // A. Max Retry Exceeded -> Move to DLQ
      await this.moveToDLQ(item, error);
      return;
    }

    // B. Backoff Calculation
    const baseDelay = this.BASE_DELAY_MS * Math.pow(2, newRetryCount - 1);
    const cappedDelay = Math.min(baseDelay, this.MAX_DELAY_MS);

    // Full Jitter
    const jitter = cappedDelay * (this.JITTER_FACTOR * (Math.random() * 2 - 1));
    const nextDelay = Math.max(0, cappedDelay + jitter);

    const db = await getLocalDb();
    // Revert to pending with delay
    await db.syncQueue.update(item.id, {
      status: "pending",
      retryCount: newRetryCount,
      lastError: String(error),
      nextRetryAt: Date.now() + nextDelay,
    });
  }

  /**
   * Dead Letter Queue Logic
   * In Phase 1, we just delete from queue and log error.
   * Future: Move to dedicated DLQ table.
   */
  private async moveToDLQ(item: SyncQueueItem, error: unknown): Promise<void> {
    console.error(
      `[Queue] Item ${item.id} moved to DLQ after ${this.MAX_RETRIES} retries.`,
      error,
      item,
    );

    // In a real implementation: localDb.dlq.add({ ...item, error: ... })
    // For now, we perform "manual recovery" by just deleting it from active queue
    // but ideally we should keep it somewhere.
    // We will create a skeleton for 'syncErrors' table usage if defined, or just log hard.
    // Luckily we have 'syncErrors' table in localDB from previous versions!

    const db = await getLocalDb();
    try {
      await db.syncErrors.add({
        id: crypto.randomUUID(),
        occurredAt: Date.now(),
        phase: "queue_dlq",
        retryCount: 0,
        retryable: false,
        message: String(error),
        metadata: {
          originalItemId: item.id,
          targetId: item.targetId,
          operationType: item.operationType,
          payload: item.payload,
        },
      });
    } catch (e) {
      console.error("Failed to save to DLQ/SyncErrors", e);
    }

    await db.syncQueue.delete(item.id);
  }

  private async performSyncOperation(item: SyncQueueItem): Promise<void> {
    // Mock Implementation for Phase 1
    // In Phase 2/3, this calls Cloud Functions
    console.log(
      `[Queue] Executing ${item.operationType} on ${item.entity}:${item.targetId}`,
      item.idempotencyKey,
    );

    // Simulating network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Throw random error for testing retry if needed
    // if (Math.random() < 0.3) throw new Error("Random Network Error");
  }

  public triggerProcess(): void {
    // Trigger async processing without awaiting
    // Debouncing could be added here if needed
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Identifies items stuck in 'processing' state for too long (due to crash/timeout)
   * and reverts them to 'pending' to allow retry.
   */
  private async cleanupStaleProcessing(): Promise<void> {
    const now = Date.now();
    const staleThreshold = now - this.STALE_TIMEOUT_MS;

    const db = await getLocalDb();
    // Scanning all 'processing' items
    // Since max concurrency is low (5), this scan is cheap.
    try {
      const staleItems = await db.syncQueue
        .where("status")
        .equals("processing")
        .filter((item) => {
          // If processingStartedAt is missing, treat as stale immediately (legacy/bug)
          // or give it a grace period if we prefer. But assuming new code, it should be set.
          const startedAt = item.processingStartedAt || 0;
          return startedAt < staleThreshold;
        })
        .toArray();

      if (staleItems.length > 0) {
        console.warn(
          `[Queue] Found ${staleItems.length} stale processing items. Recovering...`,
        );

        await db.transaction("rw", ["syncQueue"], async () => {
          for (const item of staleItems) {
            await db.syncQueue.update(item.id, {
              status: "pending",
              // processingStartedAt: undefined, // Optional cleanup
              retryCount: (item.retryCount || 0) + 1,
              lastError: "Stale Processing Recovery",
              nextRetryAt: now, // Retry immediately
            });
          }
        });
      }
    } catch (error) {
      console.error("[Queue] Failed to cleanup stale items:", error);
    }
  }
}

export const operationQueue = new OperationQueueService();





