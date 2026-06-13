import { isStorageRecord } from "@/domain/shared/storage/storageRecordUtils";
import { sanitizeCardStorageImageRef } from "@/domain/card/storage/cardStorageImageRefTransforms";

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

export { sanitizeCardStorageImageRef } from "@/domain/card/storage/cardStorageImageRefTransforms";
export { sanitizeCardStorageLayout } from "@/domain/card/storage/cardStorageLayoutTransforms";
export { sanitizeCardStorageBlockImages };
