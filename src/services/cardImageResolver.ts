import { storage } from "@platform/firebase/client";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { getOrCreateImageBlobUrl } from "./imageBlobUrlSessionCache";
import { getCachedRemoteUrl, setCachedRemoteUrl } from "./imagePreloadCache";
import { getLocalDb } from "@/services/localdb";
import type { AssetRecord, ResolvableImageRef, UploadedImage } from "@/types";



type ImageRecordLike =
  | {
    remoteUrlCache?: string | null;
    remoteUrl?: string | null;
    remoteKey?: string | null;
    storagePath?: string | null;
    localBlobId?: string | null;
    localFileId?: string | null;
    remoteStatus?: "none" | "pending" | "uploading" | "ready" | "failed" | null;
    status?: "pending" | "uploading" | "ready" | "failed" | null;
  }
  | undefined;
type ImageUpdateCapableDb = Awaited<ReturnType<typeof getLocalDb>> & {
  updateItem: (table: "images", id: string, changes: Record<string, unknown>) => Promise<number>;
};
type ResolvedCardImage = ResolvableImageRef & { url: string | null;
  source: "local_blob" | "cache" | "storage" | "none";
  status: "pending" | "uploading" | "ready" | "failed";
};



const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const getRemoteUrlFromRecord = (record: ImageRecordLike): string | null => {
  if (isNonEmptyString(record?.remoteUrlCache)) {
    return record.remoteUrlCache.trim();
  }

  if (isNonEmptyString(record?.remoteUrl)) {
    return record.remoteUrl.trim();
  }

  return null;
};
const getRemoteKeyFromRecord = (record: ImageRecordLike): string | null => {
  if (isNonEmptyString(record?.remoteKey)) {
    return record.remoteKey.trim();
  }

  if (isNonEmptyString(record?.storagePath)) {
    return record.storagePath.trim();
  }

  return null;
};
const getLocalBlobIdFromRecord = (record: ImageRecordLike): string | null => {
  if (isNonEmptyString(record?.localBlobId)) {
    return record.localBlobId.trim();
  }

  if (isNonEmptyString(record?.localFileId)) {
    return record.localFileId.trim();
  }

  return null;
};
const getResolvedStatusFromRecord = (record: ImageRecordLike): "pending" | "uploading" | "ready" | "failed" => {
  if (!record) return "pending";

  if (record.remoteStatus === "failed" || record.status === "failed") {
    return "failed";
  }

  if (record.remoteStatus === "ready" || record.status === "ready" || isNonEmptyString(record.remoteUrlCache) || isNonEmptyString(record.remoteUrl)) {
    return "ready";
  }

  if (record.remoteStatus === "uploading" || record.status === "uploading" || record.status === "pending") {
    return "uploading";
  }

  return "pending";
};
const resolveImageAssetId = (image: ResolvableImageRef): string | null => {
  for (const value of [image.assetId, image.id, image.localFileId]) {
    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }

  return null;
};
const resolveDirectUrl = (image: ResolvableImageRef): string | null => {
  for (const value of [image.url, image.remoteUrl, image.localUrl]) {
    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }

  return null;
};
const resolveCardImageUrl = async (image: ResolvableImageRef, userId?: string | null): Promise<ResolvedCardImage> => {
  const directUrl = resolveDirectUrl(image);
  if (directUrl) {
    return {
      ...image,
      assetId: resolveImageAssetId(image) ?? "",
      url: directUrl,
      source: "cache",
      status: "ready",
    };
  }

  const assetId = resolveImageAssetId(image);

  if (!assetId) {
    return {
      ...image,
      assetId: "",
      url: null,
      source: "none",
      status: "pending",
    };
  }

  const cachedRemoteUrl = getCachedRemoteUrl(assetId);
  if (cachedRemoteUrl) {
    return {
      ...image,
      assetId,
      url: cachedRemoteUrl,
      source: "cache",
      status: "ready",
    };
  }

  const db = (await getLocalDb(userId ?? undefined)) as ImageUpdateCapableDb;
  const record = (await db.images.get(assetId)) as AssetRecord | UploadedImage | undefined;
  const imageRecord = image as ImageRecordLike;
  const status = getResolvedStatusFromRecord(record ?? imageRecord);
  const localBlobId = getLocalBlobIdFromRecord(record) ?? getLocalBlobIdFromRecord(imageRecord);
  if (localBlobId) {
    const blobUrl = await getOrCreateImageBlobUrl(localBlobId, {
      userId: userId ?? undefined,
    });

    if (blobUrl) {
      return {
        ...image,
        assetId,
        url: blobUrl,
        source: "local_blob",
        status,
      };
    }
  }

  const remoteUrl = getRemoteUrlFromRecord(record) ?? getRemoteUrlFromRecord(imageRecord);
  if (remoteUrl) {
    setCachedRemoteUrl(assetId, remoteUrl);
    return {
      ...image,
      assetId,
      url: remoteUrl,
      source: "cache",
      status: "ready",
    };
  }

  const remoteKey = getRemoteKeyFromRecord(record) ?? getRemoteKeyFromRecord(imageRecord);
  if (remoteKey && status !== "failed") {
    try {
      const downloadUrl = await getDownloadURL(storageRef(storage, remoteKey));
      setCachedRemoteUrl(assetId, downloadUrl);

      void db.updateItem("images", assetId, {
        remoteUrlCache: downloadUrl,
        updatedAt: new Date(),
      });

      return {
        ...image,
        assetId,
        url: downloadUrl,
        source: "storage",
        status: "ready",
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[cardImageResolver] Failed to resolve storage image", {
          assetId,
          remoteKey,
          error,
        });
      }
    }
  }

  return {
    ...image,
    assetId,
    url: null,
    source: "none",
    status,
  };
};



export { resolveCardImageUrl };


export type { ResolvedCardImage };
