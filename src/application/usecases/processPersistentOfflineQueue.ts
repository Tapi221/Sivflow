import type { QueueItem } from "./persistentOfflineQueueModels";
import type { UploadedImage } from "@/types";
import { assertImageInvariant } from "@/utils/imageAssertions";



interface PersistentOfflineQueueProcessingDeps {
  uploadItem: (item: QueueItem) => Promise<UploadedImage>;
  shouldSkipItem: (item: QueueItem) => Promise<boolean>;
  handleSuccess: (
    item: QueueItem,
    updatedImage: UploadedImage,
  ) => Promise<void>;
  handlePermanentFailure: (item: QueueItem) => Promise<void>;
  dequeue: (id: string) => Promise<void>;
  incrementRetryCount: (id: string) => Promise<void>;
  yieldToUi?: () => Promise<void>;
}



const defaultYieldToUi = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};
const processPersistentOfflineQueue = async (items: QueueItem[], deps: PersistentOfflineQueueProcessingDeps): Promise<void> => {
  for (const item of items) {
    try {
      try {
        const shouldSkip = await deps.shouldSkipItem(item);
        if (shouldSkip) {
          await deps.dequeue(item.id);
          continue;
        }
      } catch (guardErr) {
        console.warn(
          "[PersistentQueue] 準備状態の確認に失敗しました。アップロード処理は続行します",
          guardErr,
        );
      }

      const updatedImage = await deps.uploadItem(item);
      if (!updatedImage.remoteUrl) {
        throw new Error("[PersistentQueue] アップロード完了後に remoteUrl が設定されていません");
      }

      assertImageInvariant(updatedImage);
      await deps.handleSuccess(item, updatedImage);
      await deps.dequeue(item.id);

      console.log(`[PersistentQueue] 処理完了: ${item.fileName}`);
    } catch (error) {
      console.error(`[PersistentQueue] 処理失敗: ${item.fileName}`, error);

      await deps.incrementRetryCount(item.id);

      if ((item.retryCount ?? 0) + 1 >= 3) {
        console.error(
          `[PersistentQueue] 最大リトライ回数に到達しました: ${item.fileName}`,
        );

        try {
          await deps.handlePermanentFailure(item);
        } catch (failureErr) {
          console.warn(
            "[PersistentQueue] 恒久的な失敗処理に失敗しました",
            failureErr,
          );
        }

        await deps.dequeue(item.id);
      }
    }

    await (deps.yieldToUi ?? defaultYieldToUi)();
  }
};



export { processPersistentOfflineQueue };
