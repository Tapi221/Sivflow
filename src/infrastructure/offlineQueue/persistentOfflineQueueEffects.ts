import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import { isDocumentQueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import { handleQueuedAssetUploadFailure } from "@/infrastructure/offlineQueue/effects/handleQueuedAssetUploadFailure";
import { handleQueuedAssetUploadSuccess } from "@/infrastructure/offlineQueue/effects/handleQueuedAssetUploadSuccess";
import { handleQueuedDocumentUploadFailure } from "@/infrastructure/offlineQueue/effects/handleQueuedDocumentUploadFailure";
import { handleQueuedDocumentUploadSuccess } from "@/infrastructure/offlineQueue/effects/handleQueuedDocumentUploadSuccess";
import { shouldSkipQueuedDocumentUpload } from "@/infrastructure/offlineQueue/effects/shouldSkipQueuedDocumentUpload";
import type { UploadedImage } from "@/types";



const isAssetLikeImageQueueItem = (item: QueueItem): boolean =>
  !isDocumentQueueItem(item) && item.fileType.startsWith("image/");
const handleQueuedUploadSuccess = async (
  item: QueueItem,
  updatedImage: UploadedImage,
): Promise<void> => {
  if (isDocumentQueueItem(item)) {
    await handleQueuedDocumentUploadSuccess(item, updatedImage);
  }

  if (isAssetLikeImageQueueItem(item)) {
    await handleQueuedAssetUploadSuccess(item, updatedImage);
  }
};
const handleQueuedUploadPermanentFailure = async (
  item: QueueItem,
): Promise<void> => {
  if (isDocumentQueueItem(item)) {
    await handleQueuedDocumentUploadFailure(item);
  }

  if (isAssetLikeImageQueueItem(item)) {
    await handleQueuedAssetUploadFailure(item);
  }
};



export { handleQueuedUploadPermanentFailure, handleQueuedUploadSuccess, shouldSkipQueuedDocumentUpload };
