import type { UploadedImage } from "@/types";

import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";

export const saveQueuedImageToFirestore = async (
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
};
