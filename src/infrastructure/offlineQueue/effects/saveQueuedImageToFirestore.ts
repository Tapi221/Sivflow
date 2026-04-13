import { writeQueuedImageToFirestore } from "@/infrastructure/images/queuedImageFirestoreWriter";
import type { UploadedImage } from "@/types";

import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";

export const saveQueuedImageToFirestore = async (
  item: QueueItem,
  updatedImage: UploadedImage,
): Promise<void> =>
  writeQueuedImageToFirestore(item.id, item.fileName, updatedImage);
