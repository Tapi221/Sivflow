import { getLocalDb } from "@/infrastructure/localdb/client";
import type { UploadedImage } from "@/types";
import { assertImageInvariant } from "@/utils/imageAssertions";



const saveImageToIndexedDb = async (image: UploadedImage): Promise<void> => {
  assertImageInvariant(image);

  try {
    const db = await getLocalDb();
    await db.images.put(image);
    console.log(`[ImageDB] IndexedDB に保存しました: ${image.id}`);
  } catch (error) {
    console.error("[ImageDB] Failed to save to IndexedDB", error);
    throw error;
  }
};
const getImageFromIndexedDb = async (imageId: string): Promise<UploadedImage | null> => {
  try {
    const db = await getLocalDb();
    const image = await db.images.get(imageId);
    return (image as UploadedImage | null) ?? null;
  } catch (error) {
    console.error("[ImageDB] Failed to get from IndexedDB", error);
    throw error;
  }
};



export { saveImageToIndexedDb, getImageFromIndexedDb };
