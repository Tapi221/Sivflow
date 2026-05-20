import {
  isImageFirestoreDiagnosticsEnabled,
  resolveImageFirestoreTarget,
  saveImageToFirestore,
} from "./imageFirestoreWriter";

import type { UploadedImage } from "@/types";

export const writeQueuedImageToFirestore = async (
  queueItemId: string,
  fileName: string,
  image: UploadedImage,
): Promise<void> => {
  const firestoreTarget = resolveImageFirestoreTarget(image);

  if (isImageFirestoreDiagnosticsEnabled()) {
    console.info("[PersistentQueue] Firestore image write attempt", {
      operation: "setDoc",
      path: firestoreTarget.path,
      uid: firestoreTarget.uid,
      queueItemId,
      fileName,
    });
  }

  try {
    await saveImageToFirestore(image);
  } catch (writeErr) {
    if (isImageFirestoreDiagnosticsEnabled()) {
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
