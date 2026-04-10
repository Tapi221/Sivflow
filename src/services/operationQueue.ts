import type { SyncQueueItem } from "@/types/domain/sync";
import { getLocalDb } from "./localDB";
import {
  createDeleteQueueItem,
  createUpsertQueueItem,
} from "@/services/sync/queueItemFactory";

export type QueuePriority = "critical" | "high" | "medium" | "low";
export type OperationType = "create" | "update" | "delete";
export type QueueStatus = "pending" | "processing" | "completed" | "failed";

type SynthesisResult = OperationType | "discard" | "error";
type QueueEntity = "card" | "folder" | "asset";

const OPERATION_MATRIX: Record<
  OperationType,
  Record<OperationType, SynthesisResult>
> = {
  create: {
    create: "error",
    update: "create",
    delete: "discard",
  },
  update: {
    create: "error",
    update: "update",
    delete: "delete",
  },
  delete: {
    create: "update",
    update: "error",
    delete: "delete",
  },
};

const isDatabaseClosedError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { name?: unknown; message?: unknown };

  return (
    candidate.name === "DatabaseClosedError" ||
    (typeof candidate.message === "string" &&
      candidate.message.includes("DatabaseClosedError"))
  );
};

class OperationQueueService {
  private readonly MAX_CONCURRENCY = 5;
  private readonly BATCH_LIMIT = 20;
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 1000;
  private readonly MAX_DELAY_MS = 30000;
  private readonly JITTER_FACTOR = 0.1;
  private readonly STALE_TIMEOUT_MS = 5 * 60 * 1000;

  private activeUserId: string | null = null;
  private scheduledTimer: number | null = null;
  private isProcessing = false;

  public bindUser = (userId: string | null) => {
    this.activeUserId = userId;
  };

  public reset = () => {
    this.activeUserId = null;

    if (this.scheduledTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.scheduledTimer);
      this.scheduledTimer = null;
    }

    this.isProcessing = false;
  };

  private getBoundDb = async () => {
    if (!this.activeUserId) {
      throw new Error("[Queue] activeUserId is not bound.");
    }

    return await getLocalDb(this.activeUserId);
  };

  private resolvePriority = (
    p1: QueuePriority,
    p2: QueuePriority,
  ): QueuePriority => {
    const scores: Record<QueuePriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return scores[p1] >= scores[p2] ? p1 : p2;
  };

  private buildQueueItem = (
    entity: QueueEntity,
    targetId: string,
    op: OperationType,
    data: unknown,
    priority: QueuePriority,
  ): SyncQueueItem => {
    if (op === "delete") {
      return createDeleteQueueItem({
        entity,
        targetId,
        priority,
      });
    }

    return createUpsertQueueItem({
      entity,
      operationType: op,
      payload: data,
      priority,
    });
  };

  private addItem = async (
    entity: QueueEntity,
    targetId: string,
    op: OperationType,
    data: unknown,
    priority: QueuePriority,
  ) => {
    const db = await this.getBoundDb();
    const newItem = this.buildQueueItem(entity, targetId, op, data, priority);
    await db.syncQueue.add(newItem);
  };

  public enqueueChange = async (
    entity: QueueEntity,
    targetId: string,
    operationType: OperationType,
    data: unknown,
    priority: QueuePriority = "medium",
  ): Promise<void> => {
    const db = await this.getBoundDb();

    await db.transaction("rw", [db.syncQueue], async () => {
      const pendingItems = await db.syncQueue
        .toCollection()
        .filter(
          (item) => item.targetId === targetId && item.status === "pending",
        )
        .sortBy("createdAt");

      const existingItem = pendingItems.at(-1);

      if (!existingItem) {
        await this.addItem(entity, targetId, operationType, data, priority);
        return;
      }

      const existingOp = existingItem.operationType as OperationType;
      const resultOp = OPERATION_MATRIX[existingOp][operationType];

      if (resultOp === "discard") {
        await db.syncQueue.delete(existingItem.id);
        console.log(
          `[Queue] Discarded operation for ${targetId} (${existingOp}+${operationType})`,
        );
        return;
      }

      if (resultOp === "error") {
        console.warn(
          `[Queue] Invalid sequence: ${existingOp} -> ${operationType}. Forcing new enqueue.`,
        );
        await this.addItem(entity, targetId, operationType, data, priority);
        return;
      }

      const compressedItem = this.buildQueueItem(
        entity,
        targetId,
        resultOp,
        data,
        this.resolvePriority(existingItem.priority, priority),
      );

      const updatedItem: SyncQueueItem = {
        ...compressedItem,
        id: existingItem.id,
        idempotencyKey: existingItem.idempotencyKey,
        createdAt: existingItem.createdAt,
        updatedAt: Date.now(),
        retryCount: 0,
        status: "pending",
      };

      await db.syncQueue.put(updatedItem);

      console.log(
        `[Queue] Compressed: ${existingOp} + ${operationType} -> ${resultOp}`,
      );
    });

    this.triggerProcess();
  };

  private moveToDLQ = async (item: SyncQueueItem, error: unknown) => {
    const db = await this.getBoundDb();

    console.error(
      `[Queue] Item ${item.id} moved to DLQ after ${this.MAX_RETRIES} retries.`,
      error,
      item,
    );

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
    } catch (syncError) {
      console.error("[Queue] Failed to persist DLQ entry", syncError);
    }

    await db.syncQueue.delete(item.id);
  };

  private handleFailure = async (item: SyncQueueItem, error: unknown) => {
    const db = await this.getBoundDb();
    const newRetryCount = (item.retryCount || 0) + 1;

    if (newRetryCount > this.MAX_RETRIES) {
      await this.moveToDLQ(item, error);
      return;
    }

    const baseDelay = this.BASE_DELAY_MS * Math.pow(2, newRetryCount - 1);
    const cappedDelay = Math.min(baseDelay, this.MAX_DELAY_MS);
    const jitter = cappedDelay * (this.JITTER_FACTOR * (Math.random() * 2 - 1));
    const nextDelay = Math.max(0, cappedDelay + jitter);

    const updatedItem: SyncQueueItem = {
      ...item,
      status: "pending",
      retryCount: newRetryCount,
      lastError: String(error),
      nextRetryAt: Date.now() + nextDelay,
      updatedAt: Date.now(),
      processingStartedAt: undefined,
    };

    await db.syncQueue.put(updatedItem);
  };

  private performSyncOperation = async (item: SyncQueueItem) => {
    console.log(
      `[Queue] Executing ${item.operationType} on ${item.entity}:${item.targetId}`,
      item.idempotencyKey,
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  private cleanupStaleProcessing = async () => {
    const db = await this.getBoundDb();
    const now = Date.now();
    const staleThreshold = now - this.STALE_TIMEOUT_MS;

    const staleItems = await db.syncQueue
      .toCollection()
      .filter((item) => {
        const startedAt = item.processingStartedAt || 0;
        return item.status === "processing" && startedAt < staleThreshold;
      })
      .toArray();

    if (staleItems.length === 0) {
      return;
    }

    console.warn(
      `[Queue] Found ${staleItems.length} stale processing items. Recovering...`,
    );

    await db.transaction("rw", [db.syncQueue], async () => {
      for (const item of staleItems) {
        const recovered: SyncQueueItem = {
          ...item,
          status: "pending",
          retryCount: (item.retryCount || 0) + 1,
          lastError: "Stale Processing Recovery",
          nextRetryAt: now,
          processingStartedAt: undefined,
          updatedAt: now,
        };

        await db.syncQueue.put(recovered);
      }
    });
  };

  public processQueue = async (): Promise<void> => {
    if (!this.activeUserId) {
      return;
    }

    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const db = await this.getBoundDb();
      await this.cleanupStaleProcessing();

      const processingCount = await db.syncQueue
        .toCollection()
        .filter((item) => item.status === "processing")
        .count();

      if (processingCount >= this.MAX_CONCURRENCY) {
        return;
      }

      const capacity = this.MAX_CONCURRENCY - processingCount;
      const fetchLimit = Math.min(capacity, this.BATCH_LIMIT);
      const now = Date.now();

      const fetchByPriority = async (
        priority: QueuePriority,
        limit: number,
      ): Promise<SyncQueueItem[]> => {
        if (limit <= 0) {
          return [];
        }

        const items = await db.syncQueue
          .toCollection()
          .filter(
            (item) =>
              item.status === "pending" &&
              item.priority === priority &&
              (!item.nextRetryAt || item.nextRetryAt <= now),
          )
          .sortBy("createdAt");

        return items.slice(0, limit);
      };

      let candidates: SyncQueueItem[] = [];

      const criticals = await fetchByPriority("critical", fetchLimit);
      candidates = [...candidates, ...criticals];

      const highs = await fetchByPriority(
        "high",
        fetchLimit - candidates.length,
      );
      candidates = [...candidates, ...highs];

      const mediums = await fetchByPriority(
        "medium",
        fetchLimit - candidates.length,
      );
      candidates = [...candidates, ...mediums];

      const lows = await fetchByPriority("low", fetchLimit - candidates.length);
      candidates = [...candidates, ...lows];

      if (candidates.length === 0) {
        return;
      }

      await Promise.all(
        candidates.map(async (item) => {
          const lockedItem = await db.transaction<SyncQueueItem | null>(
            "rw",
            [db.syncQueue],
            async () => {
              const current = await db.syncQueue.get(item.id);

              if (!current || current.status !== "pending") {
                return null;
              }

              const processingItem: SyncQueueItem = {
                ...current,
                status: "processing",
                processingStartedAt: Date.now(),
                updatedAt: Date.now(),
              };

              await db.syncQueue.put(processingItem);

              return processingItem;
            },
          );

          if (!lockedItem) {
            return;
          }

          try {
            await this.performSyncOperation(lockedItem);
            await db.syncQueue.delete(lockedItem.id);
          } catch (error) {
            await this.handleFailure(lockedItem, error);
          }
        }),
      );

      if (candidates.length === fetchLimit) {
        this.triggerProcess(0);
      }
    } catch (error) {
      if (isDatabaseClosedError(error)) {
        console.warn(
          "[Queue] DatabaseClosedError detected. Queue will retry.",
          error,
        );
        this.triggerProcess(300);
        return;
      }

      console.error("[Queue] processQueue failed", error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  };

  public triggerProcess = (delayMs = 100) => {
    if (!this.activeUserId || typeof window === "undefined") {
      return;
    }

    if (this.scheduledTimer !== null) {
      window.clearTimeout(this.scheduledTimer);
    }

    this.scheduledTimer = window.setTimeout(() => {
      this.scheduledTimer = null;
      void this.processQueue();
    }, delayMs);
  };
}

export const operationQueue = new OperationQueueService();
