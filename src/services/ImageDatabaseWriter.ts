import { getImageFromFirestore } from "@/infrastructure/images/imageFirestoreReader";
import {
  type FirestoreTarget,
  isImageFirestoreDiagnosticsEnabled,
  resolveImageFirestoreTarget,
  saveImageBatchToFirestore,
  saveImageToFirestore,
} from "@/infrastructure/images/imageFirestoreWriter";
import {
  getImageFromIndexedDb,
  saveImageToIndexedDb,
} from "@/infrastructure/images/imageIndexedDbStore";
import type { UploadedImage } from "@/types";

class ImageDatabaseWriter {
  private readonly inFlightTouchMigrations = new Set<string>();

  isFirestoreDiagnosticsEnabled = (): boolean =>
    isImageFirestoreDiagnosticsEnabled();

  resolveFirestoreTarget = (
    image: UploadedImage,
    explicitUid?: string,
  ): FirestoreTarget => resolveImageFirestoreTarget(image, explicitUid);

  saveToFirestore = async (image: UploadedImage): Promise<void> =>
    saveImageToFirestore(image);

  saveToIndexedDB = async (image: UploadedImage): Promise<void> =>
    saveImageToIndexedDb(image);

  saveBatch = async (images: UploadedImage[]): Promise<void> =>
    saveImageBatchToFirestore(images);

  getFromFirestore = async (
    imageId: string,
    userId?: string,
  ): Promise<UploadedImage | null> =>
    getImageFromFirestore({
      imageId,
      userId,
      inFlightTouchMigrations: this.inFlightTouchMigrations,
    });

  getFromIndexedDB = async (imageId: string): Promise<UploadedImage | null> =>
    getImageFromIndexedDb(imageId);
}

export const imageDB = new ImageDatabaseWriter();
