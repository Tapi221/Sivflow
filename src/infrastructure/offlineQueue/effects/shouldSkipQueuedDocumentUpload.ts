import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import { getDocumentKindLabel, isDocumentQueueItem, isDocumentUploadReady } from "@/application/usecases/persistentOfflineQueueModels";
import { getLocalDb } from "@/infrastructure/localdb/client";



const shouldSkipQueuedDocumentUpload = async (item: QueueItem): Promise<boolean> => {
  if (!isDocumentQueueItem(item)) {
    return false;
  }

  const localDb = await getLocalDb();
  const existingDoc = await localDb.documents.get(item.id);
  if (!isDocumentUploadReady(existingDoc)) {
    return false;
  }

  console.info(
    "[PersistentQueue] Skip queued document upload because item is already ready",
    {
      docId: item.id,
      fileName: item.fileName,
      kind: getDocumentKindLabel(item),
      uploadStatus: existingDoc?.uploadStatus ?? null,
    },
  );

  return true;
};



export { shouldSkipQueuedDocumentUpload };
