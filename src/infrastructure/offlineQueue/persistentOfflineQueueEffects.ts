import type { UploadedImage } from "@/types";

import {
  isDocumentQueueItem,
  type QueueItem,
} from "@/application/usecases/persistentOfflineQueueModels";

import { handleQueuedAssetUploadFailure } from "./effects/handleQueuedAssetUploadFailure";
import { handleQueuedAssetUploadSuccess } from "./effects/handleQueuedAssetUploadSuccess";
import { handleQueuedDocumentUploadFailure } from "./effects/handleQueuedDocumentUploadFailure";
import { handleQueuedDocumentUploadSuccess } from "./effects/handleQueuedDocumentUploadSuccess";
import { shouldSkipQueuedDocumentUpload } from "./effects/shouldSkipQueuedDocumentUpload";

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

export {
  handleQueuedUploadPermanentFailure,
  handleQueuedUploadSuccess,
  shouldSkipQueuedDocumentUpload,
};
