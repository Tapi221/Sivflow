import type {
  BatchConstraint,
  IQueueManager,
  SyncTask,
} from "@/services/interfaces/ISyncService";
import type { LocalDBLike } from "@/services/localDB";
import type { SyncQueueItem } from "@/types/domain/sync";
import { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
import {
  resolveBlocksFromCardData,
  resolveExtraRowsFromCardData,
  resolveInkFromCardData,
} from "@/domain/card/normalizers/cardShape";

export { normalizeFolderWithSilent };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const readString = (
  value: Record<string, unknown>,
  key: string,
): string | null => {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
};

const readNumber = (
  value: Record<string, unknown>,
  key: string,
): number | null => {
  const candidate = value[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : null;
};

const sanitizeLayout = (value: unknown) => {
  if (!isRecord(value)) return null;

  return {
    baseWidthPx: readNumber(value, "baseWidthPx"),
    cropX: readNumber(value, "cropX"),
  };
};

const sanitizeImageRef = (value: unknown) => {
  if (!isRecord(value)) return value;

  const assetId = readString(value, "assetId") ?? readString(value, "id");
  const remoteUrl = readString(value, "remoteUrl");
  const normalizedRemoteUrl =
    remoteUrl && remoteUrl.startsWith("http") ? remoteUrl : null;

  return {
    id: readString(value, "id") ?? assetId,
    assetId,
    localFileId: readString(value, "localFileId") ?? assetId,
    remoteUrl: normalizedRemoteUrl,
    storagePath: readString(value, "storagePath"),
    status:
      readString(value, "status") ??
      (normalizedRemoteUrl ? "ready" : "uploading"),
    error: readString(value, "error") ?? undefined,
    scale: readNumber(value, "scale") ?? 1,
    x: readNumber(value, "x") ?? 0,
    layout: sanitizeLayout(value.layout),
    naturalW: readNumber(value, "naturalW"),
    naturalH: readNumber(value, "naturalH"),
  };
};

const sanitizeBlockImages = (blocks: unknown[] | undefined) => {
  if (!Array.isArray(blocks)) return blocks;

  return blocks.map((block) => {
    if (!isRecord(block)) return block;
    if (!Array.isArray(block.images)) return block;

    return {
      ...block,
      images: block.images.map((image) => sanitizeImageRef(image)),
    };
  });
};

export const denormalizeCardForStorage = <T>(card: T): T => {
  if (!isRecord(card)) return card;

  const result: Record<string, unknown> = { ...card };

  const frontBlocks = sanitizeBlockImages(
    resolveBlocksFromCardData(result, "question"),
  );
  const backBlocks = sanitizeBlockImages(
    resolveBlocksFromCardData(result, "answer"),
  );

  const frontBase = isRecord(result.front) ? result.front : {};
  const backBase = isRecord(result.back) ? result.back : {};

  result.front = {
    ...frontBase,
    blocks: frontBlocks,
    ink: resolveInkFromCardData(result, "question", { emptyInkAsNull: true }),
    extraRows: resolveExtraRowsFromCardData(result, "question"),
  };

  result.back = {
    ...backBase,
    blocks: backBlocks,
    ink: resolveInkFromCardData(result, "answer", { emptyInkAsNull: true }),
    extraRows: resolveExtraRowsFromCardData(result, "answer"),
  };

  delete result.questionBlocks;
  delete result.answerBlocks;
  delete result.frontBlocks;
  delete result.backBlocks;
  delete result.questionText;
  delete result.answerText;
  delete result.questionImages;
  delete result.answerImages;
  delete result.questionAudios;
  delete result.answerAudios;
  delete result.questionCode;
  delete result.answerCode;
  delete result.questionMarked;
  delete result.answerMarked;
  delete result.questionTextHighlighted;
  delete result.answerTextHighlighted;
  delete result.inkQuestion;
  delete result.inkAnswer;
  delete result.questionExtraRows;
  delete result.answerExtraRows;
  delete result.question_extra_rows;
  delete result.answer_extra_rows;

  return result as T;
};

export const denormalizeFolderForStorage = <T>(folder: T): T => {
  if (!isRecord(folder)) return folder;
  return { ...folder } as T;
};

const getTaskPayloadId = (payload: unknown): string | null => {
  if (!isRecord(payload)) return null;
  return typeof payload.id === "string" && payload.id.length > 0
    ? payload.id
    : null;
};

export class QueueManager implements IQueueManager {
  private readonly MAX_RETRY_COUNT = 3;

  constructor(private readonly localDB: LocalDBLike) {}

  public enqueue = async (task: SyncTask): Promise<void> => {
    const queueItem: SyncQueueItem = {
      id: task.id || `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      idempotencyKey:
        task.idempotencyKey ||
        `ik_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      targetId: task.targetId || getTaskPayloadId(task.payload) || "unknown",
      operationType:
        task.operationType || (task.type === "upload" ? "update" : "create"),
      type: task.type,
      entity: task.entity,
      payload: task.payload,
      priority: task.priority,
      createdAt: task.createdAt || Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      status: "pending",
    } as SyncQueueItem;

    await this.localDB.syncQueue.add(queueItem);
  };

  public peekBatch = async (
    constraint: BatchConstraint,
  ): Promise<SyncTask[]> => {
    const allPending = await this.localDB.syncQueue
      .where("status")
      .equals("pending")
      .toArray();

    const priorityOrder: Record<SyncTask["priority"], number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    allPending.sort((a, b) => {
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt - b.createdAt;
    });

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
    return await this.localDB.syncQueue
      .where("status")
      .equals("pending")
      .count();
  };
}
