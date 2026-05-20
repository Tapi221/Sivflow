import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";

import { firestoreDb, storage } from "@/infrastructure/firebase/client";
import { normalizeDate } from "@/shared/codec/date";
import type { UploadMetadata } from "@/types";

export const cleanupFailedUploads = async (userId: string) => {
  const result = {
    deleted: 0,
    errors: [] as { id: string; error: unknown }[],
  };

  try {
    if (!firestoreDb) {
      console.warn(
        "[storageCleanup] firestoreDb is not initialized. Skipping cleanup.",
      );
      return result;
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const uploadsRef = collection(firestoreDb, `users/${userId}/uploads`);
    const snapshot = await getDocs(uploadsRef);

    const staleUploads = snapshot.docs.filter((uploadDoc) => {
      const data = uploadDoc.data() as UploadMetadata;
      const date = normalizeDate(data.uploadedAt);
      const isOld = date !== null && date < yesterday;
      const isNotReady = data.status !== "ready";
      return isOld && isNotReady;
    });

    for (const uploadDoc of staleUploads) {
      const data = uploadDoc.data() as UploadMetadata;
      const docId = uploadDoc.id;

      try {
        if (data.storagePath) {
          const fileRef = ref(storage, data.storagePath);
          try {
            await deleteObject(fileRef);
          } catch (error: unknown) {
            const storageErrorCode =
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              typeof (error as { code?: unknown }).code === "string"
                ? (error as { code: string }).code
                : null;

            if (storageErrorCode !== "storage/object-not-found") {
              throw error;
            }
          }
        }

        await deleteDoc(doc(firestoreDb, `users/${userId}/uploads`, docId));
        result.deleted += 1;
      } catch (error) {
        console.error(`Failed to cleanup upload ${docId}:`, error);
        result.errors.push({ id: docId, error });
      }
    }

    return result;
  } catch (error) {
    console.error("Cleanup process failed:", error);
    throw error;
  }
};
