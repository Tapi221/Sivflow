import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import { getDocumentKindLabel, toDocumentLike } from "@/application/usecases/persistentOfflineQueueModels";
import { getLocalDb } from "@/infrastructure/localdb/client";
import type { UploadedImage } from "@/types";



const handleQueuedDocumentUploadSuccess = async (item: QueueItem, updatedImage: UploadedImage): Promise<void> => {
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



export { handleQueuedDocumentUploadSuccess };
