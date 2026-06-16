import { auth, storage } from "@platform/firebase/client";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import type { UploadedImage } from "@/types";



const uploadQueuedAsset = async (item: QueueItem): Promise<UploadedImage> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Unauthenticated during background upload");
  }

  if (!item.image.storagePath) {
    throw new Error("Queued upload is missing storagePath");
  }

  const file = new File([item.fileData], item.fileName, {
    type: item.fileType,
  });
  const storageRef = ref(storage, item.image.storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<UploadedImage>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      () => {
        // Progress hook reserved for future global UI integration.
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            ...item.image,
            remoteUrl: downloadUrl as UploadedImage["remoteUrl"],
            status: "ready",
            updatedAt: new Date(),
          });
        } catch (error) {
          reject(error);
        }
      },
    );
  });
};



export { uploadQueuedAsset };
