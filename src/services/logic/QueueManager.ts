import type {
  BatchConstraint,
  IQueueManager,
  SyncTask,
} from "@/services/interfaces/ISyncService";
import type { LocalDBLike } from "@/services/localDB";

/**
 * QueueManager: オフライン時の同期タスクを永続化し、順序保証とリトライ制御を行う
 * LocalDBに依存するが、それ以外の副作用はない
 */
export class QueueManager implements IQueueManager {
  private localDB: LocalDBLike;
  private readonly MAX_RETRY_COUNT = 3;

  constructor(localDB: LocalDBLike) {
    this.localDB = localDB;
  }

  /**
   * タスクをキューに追加
   */
  async enqueue(task: SyncTask): Promise<void> {
    const queueItem = {
      id: task.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      idempotencyKey:
        task.idempotencyKey ||
        `ik_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      targetId: task.targetId || task.payload?.id || "unknown",
      operationType:
        task.operationType || (task.type === "upload" ? "update" : "create"),
      type: task.type,
      entity: task.entity,
      payload: task.payload,
      priority: task.priority,
      createdAt: task.createdAt || Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      status: "pending" as const,
    };

    await this.localDB.syncQueue.add(queueItem);
  }

  /**
   * バッチ制約に基づいてタスクを取得
   * 優先度順にソートし、制約に収まる数だけ返す
   */
  async peekBatch(constraint: BatchConstraint): Promise<SyncTask[]> {
    const allPending = await this.localDB.syncQueue
      .where("status")
      .equals("pending")
      .toArray();

    // 優先度でソート（critical > high > medium > low）
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allPending.sort((a, b) => {
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt - b.createdAt; // 同じ優先度ならFIFO
    });

    // 制約に収まる数だけ取得
    return allPending.slice(0, constraint.maxSize).map((item) => ({
      id: item.id,
      idempotencyKey: item.idempotencyKey,
      targetId: item.targetId,
      operationType: item.operationType,
      type: item.type,
      entity: item.entity,
      payload: item.payload,
      priority: item.priority,
      createdAt: item.createdAt,
    }));
  }

  /**
   * タスク完了（キューから削除）
   */
  async complete(taskIds: string[]): Promise<void> {
    await this.localDB.syncQueue.bulkDelete(taskIds);
  }

  /**
   * タスク失敗（リトライ可能ならretryCount++、不可能なら削除）
   */
  async fail(
    taskIds: string[],
    reason: string,
    retryable: boolean,
  ): Promise<void> {
    if (!retryable) {
      // リトライ不可能なら削除
      await this.localDB.syncQueue.bulkDelete(taskIds);
      console.error(`[QueueManager] Non-retryable failure:`, reason, taskIds);
      return;
    }

    // リトライ可能な場合、retryCountをインクリメント
    for (const id of taskIds) {
      const item = await this.localDB.syncQueue.get(id);
      if (!item) continue;

      const newRetryCount = (item.retryCount || 0) + 1;

      if (newRetryCount >= this.MAX_RETRY_COUNT) {
        // 最大リトライ回数を超えたら削除
        await this.localDB.syncQueue.delete(id);
        console.error(`[QueueManager] Max retry exceeded:`, id);
      } else {
        // リトライ回数を更新
        await this.localDB.syncQueue.update(id, {
          retryCount: newRetryCount,
          lastError: reason,
          lastRetryAt: Date.now(),
        });
      }
    }
  }

  /**
   * キューの深さ（未処理タスク数）を取得
   */
  async getQueueDepth(): Promise<number> {
    return await this.localDB.syncQueue
      .where("status")
      .equals("pending")
      .count();
  }
}
