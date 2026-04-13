import { getLocalDb } from "@/services/localDB";

import {
  getDocumentKindLabel,
  isDocumentUploadReady,
  toDocumentLike,
  type QueueItem,
} from "@/application/usecases/persistentOfflineQueueModels";

export const handleQueuedDocumentUploadFailure = async (
  item: QueueItem,
): Promise<void> => {
  try {
    const localDb = await getLocalDb();
    const existingDoc = await localDb.documents.get(item.id);
    if (!existingDoc) {
      return;
    }

    if (isDocumentUploadReady(existingDoc)) {
      console.info(
        "[PersistentQueue] Skip failed-mark because document is already ready",
        {
          docId: item.id,
          kind: getDocumentKindLabel(item),
          uploadStatus: existingDoc.uploadStatus ?? null,
        },
      );
      return;
    }

    await localDb.updateItem("documents", item.id, {
      uploadStatus: "failed",
      updatedAt: new Date(),
    });

    const failedDoc = await localDb.documents.get(item.id);
    console.error(
      "[PersistentQueue] Document sync failed after retries; local source kept",
      {
        docId: item.id,
        kind: getDocumentKindLabel(item),
        localFileId: failedDoc?.localFileId ?? null,
        blobUrl:
          toDocumentLike(failedDoc).blobUrl ??
          toDocumentLike(failedDoc).localUrl ??
          null,
        remoteUrl: failedDoc?.remoteUrl ?? null,
        uploadStatus: failedDoc?.uploadStatus ?? null,
      },
    );
  } catch (docErr) {
    console.warn(
      "[PersistentQueue] Failed to mark document upload as failed",
      docErr,
    );
  }
};
