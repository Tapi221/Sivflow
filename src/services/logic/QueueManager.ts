import type {
  BatchConstraint,
  IQueueManager,
  SyncTask,
} from "@/services/interfaces/ISyncService";
import type { LocalDBLike } from "@/services/localDB";
import {
  createQueueItemFromSyncTask,
  queueItemToSyncTask,
} from "@/application/usecases/syncQueueItemFactory";
import type { SyncQueueItem } from "@/types/domain/sync";

export {
  denormalizeCardForStorage,
  denormalizeFolderForStorage,
  normalizeFolderWithSilent,
} from "@/services/localdb/transforms";

export class QueueManager implements IQueueManager {
  private readonly MAX_RETRY_COUNT = 3;

  constructor(private readonly localDB: LocalDBLike) {}

  public enqueue = async (task: SyncTask): Promise<void> => {
    await this.localDB.syncQueue.add(createQueueItemFromSyncTask(task));
  };

  public peekBatch = async (
    constraint: BatchConstraint,
  ): Promise<SyncTask[]> => {
    const allPending = await this.getPendingQueue()
      .where("status")
      .equals("pending")
      .toArray();

    const priorityOrder: Record<SyncTask["priority"], number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    allPending.sort((a: SyncQueueItem, b: SyncQueueItem) => {
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt - b.createdAt;
    });

    return allPending
      .slice(0, constraint.maxSize)
      .map((item: SyncQueueItem) => queueItemToSyncTask(item));
  };

  public complete = async (taskIds: string[]): Promise<void> => {
    await this.localDB.syncQueue.bulkDelete(taskIds);
  };

  public fail = async (
    taskIds: string[],
    reason: string,
    retryable: boolean,
  ): Promise<void> => {
    if (!retryable) {
      await this.localDB.syncQueue.bulkDelete(taskIds);
      console.error("[QueueManager] Non-retryable failure:", reason, taskIds);
      return;
    }

    for (const id of taskIds) {
      const item = await this.localDB.syncQueue.get(id);
      if (!item) continue;

      const newRetryCount = (item.retryCount || 0) + 1;

      if (newRetryCount >= this.MAX_RETRY_COUNT) {
        await this.localDB.syncQueue.delete(id);
        console.error("[QueueManager] Max retry exceeded:", id);
        continue;
      }

      await this.localDB.syncQueue.update(id, {
        retryCount: newRetryCount,
        lastError: reason,
        lastRetryAt: Date.now(),
      });
    }
  };

  public getQueueDepth = async (): Promise<number> => {
    return await this.getPendingQueue()
      .where("status")
      .equals("pending")
      .count();
  };

  private getPendingQueue = (): {
    where: (index: string) => {
      equals: (value: string) => {
        toArray: () => Promise<SyncQueueItem[]>;
        count: () => Promise<number>;
      };
    };
  } =>
    this.localDB.syncQueue as unknown as {
      where: (index: string) => {
        equals: (value: string) => {
          toArray: () => Promise<SyncQueueItem[]>;
          count: () => Promise<number>;
        };
      };
    };
}
