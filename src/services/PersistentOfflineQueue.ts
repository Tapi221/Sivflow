import type { AssetUploadRequest, QueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import { createAssetQueueImage } from "@/application/usecases/persistentOfflineQueueModels";
import { processPersistentOfflineQueue } from "@/application/usecases/processPersistentOfflineQueue";
import { IndexedDbPersistentOfflineQueueStore } from "@/infrastructure/offlineQueue/IndexedDbPersistentOfflineQueueStore";
import { handleQueuedUploadPermanentFailure, handleQueuedUploadSuccess, shouldSkipQueuedDocumentUpload } from "@/infrastructure/offlineQueue/persistentOfflineQueueEffects";
import { uploadQueuedAsset } from "@/infrastructure/offlineQueue/uploadQueuedAsset";
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
      console.info("[永続キュー] ドキュメント ID が重複しているためキュー登録を上書きします", {
        id: payload.id,
        previousFileName: existing.fileName,
        incomingFileName: payload.fileName,
      });
    }

    await this.store.enqueue(payload);
    console.log(
      this.store.isMemoryFallbackActive()
        ? `[永続キュー] メモリフォールバックに登録しました: ${file.name}`
        : `[永続キュー] キューに登録しました: ${file.name}`,
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
      console.log("[永続キュー] すでに処理中です");
      return;
    }

    this.isProcessing = true;

    try {
      const items = await this.store.getAllItems();
      console.log(`[永続キュー] ${items.length} 件の項目を処理します`);

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

const persistentQueue = new PersistentOfflineQueue();

export { persistentQueue };

export type { AssetUploadRequest };
