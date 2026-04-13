import { processPersistentOfflineQueue } from "@/application/usecases/processPersistentOfflineQueue";
import {
  createAssetQueueImage,
  type AssetUploadRequest,
  type QueueItem,
} from "@/application/usecases/persistentOfflineQueueModels";
import { IndexedDbPersistentOfflineQueueStore } from "@/infrastructure/offlineQueue/IndexedDbPersistentOfflineQueueStore";
import {
  handleQueuedUploadPermanentFailure,
  handleQueuedUploadSuccess,
  shouldSkipQueuedDocumentUpload,
} from "@/infrastructure/offlineQueue/persistentOfflineQueueEffects";
import { uploadQueuedAsset } from "@/infrastructure/offlineQueue/uploadQueuedAsset";
import { bindPersistentQueueAutoProcessing } from "@/platform/web/bindPersistentQueueAutoProcessing";
import type { UploadedImage } from "@/types";

class PersistentOfflineQueue {
  private isProcessing = false;
  private readonly store = new IndexedDbPersistentOfflineQueueStore();

  enqueueAssetUpload = async (
    request: AssetUploadRequest,
    file: File,
  ): Promise<void> => {
    const queueImage = createAssetQueueImage(request);
    await this.enqueue(queueImage, file);
  };

  processAssetQueue = async (): Promise<void> => {
    await this.processQueueItems(uploadQueuedAsset);
  };

  enqueue = async (image: UploadedImage, file: File): Promise<void> => {
    const arrayBuffer = await file.arrayBuffer();
    const payload: QueueItem = {
      id: image.id,
      image,
      fileData: arrayBuffer,
      fileName: file.name,
      fileType: file.type,
      retryCount: 0,
      enqueuedAt: Date.now(),
    };

    const existing = await this.store.getQueueItem(payload.id);
    if (existing) {
      console.info("[PersistentQueue] Deduplicating enqueue by document id", {
        id: payload.id,
        previousFileName: existing.fileName,
        incomingFileName: payload.fileName,
      });
    }

    await this.store.enqueue(payload);
    console.log(
      this.store.isMemoryFallbackActive()
        ? `[PersistentQueue] Enqueued in memory fallback: ${file.name}`
        : `[PersistentQueue] Enqueued: ${file.name}`,
    );
  };

  processQueue = async (
    uploadFn: (file: File, image: UploadedImage) => Promise<UploadedImage>,
  ): Promise<void> => {
    await this.processQueueItems(async (item) => {
      const file = new File([item.fileData], item.fileName, {
        type: item.fileType,
      });
      return uploadFn(file, item.image);
    });
  };

  getQueueCount = async (): Promise<number> => this.store.getQueueCount();

  private processQueueItems = async (
    uploadItem: (item: QueueItem) => Promise<UploadedImage>,
  ): Promise<void> => {
    if (this.isProcessing) {
      console.log("[PersistentQueue] Already processing");
      return;
    }

    this.isProcessing = true;

    try {
      const items = await this.store.getAllItems();
      console.log(`[PersistentQueue] Processing ${items.length} items`);

      await processPersistentOfflineQueue(items, {
        uploadItem,
        shouldSkipItem: shouldSkipQueuedDocumentUpload,
        handleSuccess: handleQueuedUploadSuccess,
        handlePermanentFailure: handleQueuedUploadPermanentFailure,
        dequeue: this.store.dequeue,
        incrementRetryCount: this.store.incrementRetryCount,
      });
    } finally {
      this.isProcessing = false;
    }
  };
}

export type { AssetUploadRequest };

export const persistentQueue = new PersistentOfflineQueue();

bindPersistentQueueAutoProcessing(persistentQueue);
