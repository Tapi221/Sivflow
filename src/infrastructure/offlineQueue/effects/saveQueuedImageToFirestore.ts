import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import { writeQueuedImageToFirestore } from "@/infrastructure/images/queuedImageFirestoreWriter";
import type { UploadedImage } from "@/types";

export const saveQueuedImageToFirestore = async (
  item: QueueItem,
  updatedImage: UploadedImage,
): Promise<void> =>
  writeQueuedImageToFirestore(item.id, item.fileName, updatedImage);
