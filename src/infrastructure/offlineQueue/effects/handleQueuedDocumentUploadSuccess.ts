import { getLocalDb } from "@/services/localDB";
import type { UploadedImage } from "@/types";

import {
  getDocumentKindLabel,
  toDocumentLike,
  type QueueItem,
} from "@/application/usecases/persistentOfflineQueueModels";

export const handleQueuedDocumentUploadSuccess = async (
  item: QueueItem,
  updatedImage: UploadedImage,
): Promise<void> => {
  const localDb = await getLocalDb();
  const existingDoc = await localDb.documents.get(updatedImage.id);
  if (!existingDoc) {
    return;
  }

  await localDb.updateItem("documents", updatedImage.id, {
    remoteUrl: updatedImage.remoteUrl,
    downloadUrl: updatedImage.remoteUrl,
    storagePath: updatedImage.storagePath ?? existingDoc.storagePath ?? null,
    uploadStatus: "ready",
    updatedAt: new Date(),
  });

  const refreshedDoc = await localDb.documents.get(updatedImage.id);
  console.info(
    "[PersistentQueue] Document sync success with local source retained",
    {
      docId: updatedImage.id,
      kind: getDocumentKindLabel(item),
      localFileId: refreshedDoc?.localFileId ?? null,
      blobUrl:
        toDocumentLike(refreshedDoc).blobUrl ??
        toDocumentLike(refreshedDoc).localUrl ??
        null,
      remoteUrl: refreshedDoc?.remoteUrl ?? null,
      uploadStatus: refreshedDoc?.uploadStatus ?? null,
    },
  );
};
