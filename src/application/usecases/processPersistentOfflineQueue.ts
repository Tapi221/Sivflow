import type { UploadedImage } from "@/types";
import { assertImageInvariant } from "@/utils/imageAssertions";

import type { QueueItem } from "./persistentOfflineQueueModels";

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

export const processPersistentOfflineQueue = async (
  items: QueueItem[],
  deps: PersistentOfflineQueueProcessingDeps,
): Promise<void> => {
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
          "[PersistentQueue] readiness guard check failed; continuing upload attempt",
          guardErr,
        );
      }

      const updatedImage = await deps.uploadItem(item);
      if (!updatedImage.remoteUrl) {
        throw new Error("[PersistentQueue] Upload finished without remoteUrl");
      }

      assertImageInvariant(updatedImage);
      await deps.handleSuccess(item, updatedImage);
      await deps.dequeue(item.id);

      console.log(`[PersistentQueue] Processed: ${item.fileName}`);
    } catch (error) {
      console.error(`[PersistentQueue] Failed: ${item.fileName}`, error);

      await deps.incrementRetryCount(item.id);

      if ((item.retryCount ?? 0) + 1 >= 3) {
        console.error(
          `[PersistentQueue] Max retries reached: ${item.fileName}`,
        );

        try {
          await deps.handlePermanentFailure(item);
        } catch (failureErr) {
          console.warn(
            "[PersistentQueue] Failed to handle permanent failure",
            failureErr,
          );
        }

        await deps.dequeue(item.id);
      }
    }

    await (deps.yieldToUi ?? defaultYieldToUi)();
  }
};
