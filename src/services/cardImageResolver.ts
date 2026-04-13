import { getOrCreateImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { getLocalDb } from "@/services/localDB";
import { storage } from "@/services/firebase";
import {
  getCachedRemoteUrl,
  setCachedRemoteUrl,
} from "@/services/imagePreloadCache";
import type { AssetRecord, CardImageRef } from "@/types";
import { getDownloadURL, ref as storageRef } from "firebase/storage";

export type ResolvedCardImage = CardImageRef & {
  url: string | null;
  source: "local_blob" | "cache" | "storage" | "none";
};

export const resolveCardImageUrl = async (
  image: CardImageRef,
  userId?: string | null,
): Promise<ResolvedCardImage> => {
  const assetId = image.assetId?.trim();

  if (!assetId) {
    return {
      ...image,
      url: null,
      source: "none",
    };
  }

  const cachedRemoteUrl = getCachedRemoteUrl(assetId);
  if (cachedRemoteUrl) {
    return {
      ...image,
      url: cachedRemoteUrl,
      source: "cache",
    };
  }

  const db = await getLocalDb(userId ?? undefined);
  const asset = (await db.images.get(assetId)) as AssetRecord | undefined;

  if (asset?.localBlobId && asset.localStatus === "present") {
    const blobUrl = await getOrCreateImageBlobUrl(asset.localBlobId, {
      userId: userId ?? undefined,
    });
    if (blobUrl) {
      return {
        ...image,
        url: blobUrl,
        source: "local_blob",
      };
    }
  }

  if (asset?.remoteUrlCache) {
    setCachedRemoteUrl(assetId, asset.remoteUrlCache);
    return {
      ...image,
      url: asset.remoteUrlCache,
      source: "cache",
    };
  }

  if (asset?.remoteKey && asset.remoteStatus !== "failed") {
    const remoteUrl = await getDownloadURL(storageRef(storage, asset.remoteKey));
    setCachedRemoteUrl(assetId, remoteUrl);
    void db.images.update(assetId, {
      remoteUrlCache: remoteUrl,
      updatedAt: new Date(),
    });
    return {
      ...image,
      url: remoteUrl,
      source: "storage",
    };
  }

  return { ...image, url: null, source: "none" };
};
