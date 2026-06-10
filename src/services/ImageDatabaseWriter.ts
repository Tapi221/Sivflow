import { getImageFromFirestore } from "@/infrastructure/images/imageFirestoreReader";
import { getImageFromIndexedDb, saveImageToIndexedDb } from "@/infrastructure/images/imageIndexedDbStore";
import type { UploadedImage } from "@/types";

class ImageDatabaseWriter {
  saveToIndexedDB = async (image: UploadedImage): Promise<void> => saveImageToIndexedDb(image);

  getFromFirestore = async (imageId: string, userId?: string): Promise<UploadedImage | null> => getImageFromFirestore({ imageId, userId });

  getFromIndexedDB = async (imageId: string): Promise<UploadedImage | null> => getImageFromIndexedDb(imageId);
}

export const imageDB = new ImageDatabaseWriter();
