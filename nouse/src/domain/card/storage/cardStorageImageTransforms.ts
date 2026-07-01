import { sanitizeCardStorageImageRef } from "./cardStorageImageRefTransforms";
import { isStorageRecord } from "@/domain/shared/storage/storageRecordUtils";



const sanitizeCardStorageBlockImages = (blocks: unknown[] | undefined) => {
  if (!Array.isArray(blocks)) return blocks;

  return blocks.map((block) => {
    if (!isStorageRecord(block) || !Array.isArray(block.images)) return block;

    return {
      ...block,
      images: block.images.map((image) => sanitizeCardStorageImageRef(image)),
    };
  });
};



export { sanitizeCardStorageImageRef } from "./cardStorageImageRefTransforms";
export { sanitizeCardStorageLayout } from "./cardStorageLayoutTransforms";
export { sanitizeCardStorageBlockImages };
