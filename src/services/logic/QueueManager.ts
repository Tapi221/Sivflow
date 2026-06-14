import { createQueueItemFromSyncTask, queueItemToSyncTask } from "@/application/usecases/syncQueueItemFactory";
import type { BatchConstraint, IQueueManager, SyncTask } from "@/services/interfaces/ISyncService";
import type { LocalDBLike } from "@/services/localdb";
import type { SyncQueueItem } from "@/types/domain/sync";



type QueueReadableLocalDB = LocalDBLike & {
  getQueuedItemsOldestFirst?: () => Promise<SyncQueueItem[]>;
};



const PRIORITY_ORDER: Record<SyncTask["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
const DELETE_OPERATION_TYPE = "delete";



class QueueManager implements IQueueManager {
  private readonly MAX_RETRY_COUNT = 3;
  private readonly BASE_RETRY_DELAY_MS = 5_000;
  private readonly MAX_RETRY_DELAY_MS = 5 * 60_000;

  constructor(private readonly localDB: QueueReadableLocalDB) {}

  private readonly isReadyForProcessing = (
    item: SyncQueueItem,
    now: number,
  ): boolean => {
    if (item.status !== "pending") return false;

    const nextRetryAt =
      typeof item.nextRetryAt === "number" ? item.nextRetryAt : item.createdAt;

    return nextRetryAt <= now;
  };

  private readonly sortQueueItems = (
    items: ReadonlyArray<SyncQueueItem>,
  ): SyncQueueItem[] => {
    return [...items].sort((left, right) => {
      const priorityDiff =
        PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return left.createdAt - right.createdAt;
    });
  };

  private readonly getQueuedItems = async (): Promise<SyncQueueItem[]> => {
    if (typeof this.localDB.getQueuedItemsOldestFirst === "function") {
      return this.localDB.getQueuedItemsOldestFirst();
    }

    return [];
  };

  private readonly computeRetryDelayMs = (retryCount: number): number => {
    const exponent = Math.max(0, retryCount - 1);
    const delay = this.BASE_RETRY_DELAY_MS * 2 ** exponent;
    return Math.min(delay, this.MAX_RETRY_DELAY_MS);
  };

  private readonly putQueueItems = async (
    items: ReadonlyArray<SyncQueueItem>,
  ): Promise<void> => {
    await Promise.all(items.map((item) => this.localDB.putSyncQueueItem(item)));
  };

  private readonly removeQueueItems = async (
    ids: ReadonlyArray<string>,
  ): Promise<void> => {
    await Promise.all(ids.map((id) => this.localDB.removeSyncQueueItem(id)));
  };

  private readonly isSameTarget = (
    left: SyncQueueItem,
    right: SyncQueueItem,
  ): boolean => {
    return left.entity === right.entity && left.targetId === right.targetId;
  };

  private readonly isDeleteQueueItem = (item: SyncQueueItem): boolean => {
    return item.operationType === DELETE_OPERATION_TYPE;
  };

  private readonly getShadowedUpsertIds = (
    queueItem: SyncQueueItem,
    queuedItems: ReadonlyArray<SyncQueueItem>,
  ): string[] => {
    if (!this.isDeleteQueueItem(queueItem)) return [];

    return queuedItems
      .filter((item) => this.isSameTarget(item, queueItem))
      .filter((item) => !this.isDeleteQueueItem(item))
      .map((item) => item.id);
  };

  private readonly hasDeleteForSameTarget = (
    queueItem: SyncQueueItem,
    queuedItems: ReadonlyArray<SyncQueueItem>,
  ): boolean => {
    if (this.isDeleteQueueItem(queueItem)) return false;

    return queuedItems.some((item) => {
      return this.isSameTarget(item, queueItem) && this.isDeleteQueueItem(item);
    });
  };

  public enqueue = async (task: SyncTask): Promise<void> => {
    const queueItem = createQueueItemFromSyncTask(task);

    await this.localDB.runSyncTransaction(async () => {
      const queuedItems = await this.getQueuedItems();

      const duplicate = queuedItems.some(
        (item) => item.idempotencyKey === queueItem.idempotencyKey,
      );

      if (duplicate) return;

      if (this.hasDeleteForSameTarget(queueItem, queuedItems)) return;

      const shadowedUpsertIds = this.getShadowedUpsertIds(queueItem, queuedItems);
      if (shadowedUpsertIds.length > 0) {
        await this.removeQueueItems(shadowedUpsertIds);
      }

      await this.localDB.putSyncQueueItem(queueItem);
    });
  };

  public peekBatch = async (
    constraint: BatchConstraint,
  ): Promise<SyncTask[]> => {
    const now = Date.now();

    return this.localDB.runSyncTransaction(async () => {
      const queuedItems = await this.getQueuedItems();
      const readyItems = this.sortQueueItems(
        queuedItems.filter((item) => this.isReadyForProcessing(item, now)),
      );

      const claimedItems = readyItems
        .slice(0, constraint.maxSize)
        .map((item) => {
          return {
            ...item,
            status: "processing" as const,
            processingStartedAt: now,
            updatedAt: now,
          };
        });

      if (claimedItems.length === 0) return [];

      await this.putQueueItems(claimedItems);

      return claimedItems.map((item) => queueItemToSyncTask(item));
    });
  };

  public complete = async (taskIds: string[]): Promise<void> => {
    await this.removeQueueItems(taskIds);
  };

  public fail = async (
    taskIds: string[],
    reason: string,
    retryable: boolean,
  ): Promise<void> => {
    if (!retryable) {
      await this.removeQueueItems(taskIds);
      console.error("[QueueManager] Non-retryable failure:", reason, taskIds);
      return;
    }

    const now = Date.now();

    await this.localDB.runSyncTransaction(async () => {
      const queuedItems = await this.getQueuedItems();
      const queuedItemById = new Map(
        queuedItems.map((item) => [item.id, item]),
      );
      const retryItems: SyncQueueItem[] = [];
      const deleteIds: string[] = [];

      for (const id of taskIds) {
        const currentItem = queuedItemById.get(id);
        if (!currentItem) continue;

        const nextRetryCount = (currentItem.retryCount ?? 0) + 1;

        if (nextRetryCount >= this.MAX_RETRY_COUNT) {
          deleteIds.push(id);
          console.error("[QueueManager] Max retry exceeded:", id);
          continue;
        }

        retryItems.push({
          ...currentItem,
          status: "pending",
          retryCount: nextRetryCount,
          lastError: reason,
          lastRetryAt: now,
          nextRetryAt: now + this.computeRetryDelayMs(nextRetryCount),
          processingStartedAt: undefined,
          updatedAt: now,
        });
      }

      if (retryItems.length > 0) {
        await this.putQueueItems(retryItems);
      }

      if (deleteIds.length > 0) {
        await this.removeQueueItems(deleteIds);
      }
    });
  };

  public getQueueDepth = async (): Promise<number> => {
    const queuedItems = await this.getQueuedItems();

    if (queuedItems.length === 0) {
      return this.localDB.getSyncQueueCount();
    }

    return queuedItems.filter((item) => item.status === "pending").length;
  };
}



export { QueueManager };
