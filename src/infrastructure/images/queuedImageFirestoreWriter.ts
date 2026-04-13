import type { UploadedImage } from "@/types";

import { imageDB } from "@/services/ImageDatabaseWriter";

export const writeQueuedImageToFirestore = async (
  queueItemId: string,
  fileName: string,
  image: UploadedImage,
): Promise<void> => {
  const firestoreTarget = imageDB.resolveFirestoreTarget(image);

  if (imageDB.isFirestoreDiagnosticsEnabled()) {
    console.info("[PersistentQueue] Firestore image write attempt", {
      operation: "setDoc",
      path: firestoreTarget.path,
      uid: firestoreTarget.uid,
      queueItemId,
      fileName,
    });
  }

  try {
    await imageDB.saveToFirestore(image);
  } catch (writeErr) {
    if (imageDB.isFirestoreDiagnosticsEnabled()) {
      console.error("[PersistentQueue] Firestore image write rejected", {
        operation: "setDoc",
        path: firestoreTarget.path,
        uid: firestoreTarget.uid,
        queueItemId,
        fileName,
        error: writeErr,
      });
    } else {
      console.error("[PersistentQueue] Firestore image write rejected", {
        operation: "setDoc",
        queueItemId,
        fileName,
        error: writeErr,
      });
    }

    throw writeErr;
  }
};
