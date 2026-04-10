import { firestoreDb, storage } from "@/services/firebase";
import type { UploadMetadata } from "@/types";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const converted = (value as { toDate: () => unknown }).toDate();
    return converted instanceof Date ? converted : null;
  }
  if (typeof value === "number" || typeof value === "string") {
    const converted = new Date(value);
    return Number.isNaN(converted.getTime()) ? null : converted;
  }
  return null;
};

export const cleanupFailedUploads = async (userId: string) => {
  const result = {
    deleted: 0,
    errors: [] as { id: string; error: unknown }[],
  };

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const uploadsRef = collection(firestoreDb, `users/${userId}/uploads`);
    const snapshot = await getDocs(uploadsRef);

    const staleUploads = snapshot.docs.filter((uploadDoc) => {
      const data = uploadDoc.data() as UploadMetadata;
      const date = toDate(data.uploadedAt);
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
          } catch (e: unknown) {
            const storageErrorCode =
              typeof e === "object" &&
              e !== null &&
              "code" in e &&
              typeof (e as { code?: unknown }).code === "string"
                ? (e as { code: string }).code
                : null;

            if (storageErrorCode !== "storage/object-not-found") {
              throw e;
            }
          }
        }

        await deleteDoc(doc(firestoreDb, `users/${userId}/uploads`, docId));
        result.deleted += 1;
      } catch (err) {
        console.error(`Failed to cleanup upload ${docId}:`, err);
        result.errors.push({ id: docId, error: err });
      }
    }

    return result;
  } catch (error) {
    console.error("Cleanup process failed:", error);
    throw error;
  }
};
