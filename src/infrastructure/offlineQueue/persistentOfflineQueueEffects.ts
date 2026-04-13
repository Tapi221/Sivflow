import { getLocalDb } from "@/services/localDB";
import { auth } from "@/services/firebase";
import type { SyncQueueItem, UploadedImage } from "@/types";

import {
  getDocumentKindLabel,
  isDocumentQueueItem,
  isDocumentUploadReady,
  makeAssetRecord,
  toAssetLikeRecord,
  toDocumentLike,
  type QueueItem,
} from "@/application/usecases/persistentOfflineQueueModels";

const isAssetLikeImageQueueItem = (item: QueueItem): boolean =>
  !isDocumentQueueItem(item) && item.fileType.startsWith("image/");

export const shouldSkipQueuedDocumentUpload = async (
  item: QueueItem,
): Promise<boolean> => {
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

export const handleQueuedUploadSuccess = async (
  item: QueueItem,
  updatedImage: UploadedImage,
): Promise<void> => {
  const { imageDB } = await import("@/services/ImageDatabaseWriter");
  const firestoreTarget = imageDB.resolveFirestoreTarget(updatedImage);
  if (imageDB.isFirestoreDiagnosticsEnabled()) {
    console.info("[PersistentQueue] Firestore image write attempt", {
      operation: "setDoc",
      path: firestoreTarget.path,
      uid: firestoreTarget.uid,
      queueItemId: item.id,
      fileName: item.fileName,
    });
  }

  try {
    await imageDB.saveToFirestore(updatedImage);
  } catch (writeErr) {
    if (imageDB.isFirestoreDiagnosticsEnabled()) {
      console.error("[PersistentQueue] Firestore image write rejected", {
        operation: "setDoc",
        path: firestoreTarget.path,
        uid: firestoreTarget.uid,
        queueItemId: item.id,
        fileName: item.fileName,
        error: writeErr,
      });
    } else {
      console.error("[PersistentQueue] Firestore image write rejected", {
        operation: "setDoc",
        queueItemId: item.id,
        fileName: item.fileName,
        error: writeErr,
      });
    }

    throw writeErr;
  }

  if (isDocumentQueueItem(item)) {
    const localDb = await getLocalDb();
    const existingDoc = await localDb.documents.get(updatedImage.id);
    if (existingDoc) {
      await localDb.updateItem("documents", updatedImage.id, {
        remoteUrl: updatedImage.remoteUrl,
        downloadUrl: updatedImage.remoteUrl,
        storagePath:
          updatedImage.storagePath ?? existingDoc.storagePath ?? null,
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
    }
  }

  if (isAssetLikeImageQueueItem(item)) {
    const localDb = await getLocalDb();
    const existingAsset = toAssetLikeRecord(
      await localDb.images.get(updatedImage.id),
    );
    await localDb.images.put(
      makeAssetRecord({
        existing: existingAsset,
        itemId: updatedImage.id,
        userId: auth.currentUser?.uid ?? existingAsset?.userId ?? "",
        mime:
          item.fileType || existingAsset?.mime || "application/octet-stream",
        size: item.fileData.byteLength || existingAsset?.size || 0,
        localBlobId:
          existingAsset?.localBlobId ||
          updatedImage.localFileId ||
          updatedImage.id,
        remoteKey: updatedImage.storagePath ?? existingAsset?.remoteKey ?? null,
        remoteStatus: "ready",
        remoteUrlCache:
          typeof updatedImage.remoteUrl === "string"
            ? updatedImage.remoteUrl
            : (existingAsset?.remoteUrlCache ?? null),
        retryCount: 0,
      }),
    );

    const pendingAssetSyncItems = (await localDb.syncQueue.toArray()).filter(
      (queueItem: SyncQueueItem) =>
        queueItem.targetId === updatedImage.id && queueItem.entity === "asset",
    );
    if (pendingAssetSyncItems.length > 0) {
      await localDb.syncQueue.bulkDelete(
        pendingAssetSyncItems.map((queueItem: SyncQueueItem) => queueItem.id),
      );
    }

    if (import.meta.env.DEV) {
      console.info("[AssetSync] upload success", {
        assetId: updatedImage.id,
        remoteKey: updatedImage.storagePath ?? null,
      });
    }
  }
};

export const handleQueuedUploadPermanentFailure = async (
  item: QueueItem,
): Promise<void> => {
  if (isDocumentQueueItem(item)) {
    try {
      const localDb = await getLocalDb();
      const existingDoc = await localDb.documents.get(item.id);
      if (existingDoc) {
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
      }
    } catch (docErr) {
      console.warn(
        "[PersistentQueue] Failed to mark document upload as failed",
        docErr,
      );
    }
  }

  if (isAssetLikeImageQueueItem(item)) {
    try {
      const localDb = await getLocalDb();
      const existingAsset = toAssetLikeRecord(
        await localDb.images.get(item.id),
      );
      await localDb.images.put(
        makeAssetRecord({
          existing: existingAsset,
          itemId: item.id,
          userId: auth.currentUser?.uid ?? existingAsset?.userId ?? "",
          mime:
            item.fileType || existingAsset?.mime || "application/octet-stream",
          size: item.fileData.byteLength || existingAsset?.size || 0,
          localBlobId: existingAsset?.localBlobId || item.id,
          remoteKey: existingAsset?.remoteKey ?? null,
          remoteStatus: "failed",
          remoteUrlCache: existingAsset?.remoteUrlCache ?? null,
          retryCount: (existingAsset?.retryCount ?? 0) + 1,
        }),
      );

      if (import.meta.env.DEV) {
        console.warn("[AssetSync] upload failed", {
          assetId: item.id,
        });
      }
    } catch (assetErr) {
      console.warn("[PersistentQueue] Failed to update asset status", assetErr);
    }
  }
};
