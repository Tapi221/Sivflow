import { getOrCreateImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { getLocalDb } from "@/services/localDB";
import { storage } from "@/services/firebase";
import {
  getCachedRemoteUrl,
  setCachedRemoteUrl,
} from "@/services/imagePreloadCache";
import type { AssetRecord, CardImageRef, UploadedImage } from "@/types";
import { getDownloadURL, ref as storageRef } from "firebase/storage";

type ImageRecordLike = Partial<AssetRecord & UploadedImage> | undefined;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

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

const getResolvedStatusFromRecord = (
  record: ImageRecordLike,
): "pending" | "uploading" | "ready" | "failed" => {
  if (!record) return "pending";

  if (record.remoteStatus === "failed" || record.status === "failed") {
    return "failed";
  }

  if (
    record.remoteStatus === "ready" ||
    record.status === "ready" ||
    isNonEmptyString(record?.remoteUrlCache) ||
    isNonEmptyString(record?.remoteUrl)
  ) {
    return "ready";
  }

  if (
    record.remoteStatus === "uploading" ||
    record.status === "uploading" ||
    record.status === "pending"
  ) {
    return "uploading";
  }

  return "pending";
};

export type ResolvedCardImage = CardImageRef & {
  url: string | null;
  source: "local_blob" | "cache" | "storage" | "none";
  status: "pending" | "uploading" | "ready" | "failed";
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
      status: "pending",
    };
  }

  const cachedRemoteUrl = getCachedRemoteUrl(assetId);
  if (cachedRemoteUrl) {
    return {
      ...image,
      url: cachedRemoteUrl,
      source: "cache",
      status: "ready",
    };
  }

  const db = await getLocalDb(userId ?? undefined);
  const record = (await db.images.get(assetId)) as
    | AssetRecord
    | UploadedImage
    | undefined;
  const status = getResolvedStatusFromRecord(record);

  const localBlobId = getLocalBlobIdFromRecord(record);
  if (localBlobId) {
    const blobUrl = await getOrCreateImageBlobUrl(localBlobId, {
      userId: userId ?? undefined,
    });

    if (blobUrl) {
      return {
        ...image,
        url: blobUrl,
        source: "local_blob",
        status,
      };
    }
  }

  const remoteUrl = getRemoteUrlFromRecord(record);
  if (remoteUrl) {
    setCachedRemoteUrl(assetId, remoteUrl);
    return {
      ...image,
      url: remoteUrl,
      source: "cache",
      status: "ready",
    };
  }

  const remoteKey = getRemoteKeyFromRecord(record);
  if (remoteKey && status !== "failed") {
    const downloadUrl = await getDownloadURL(storageRef(storage, remoteKey));
    setCachedRemoteUrl(assetId, downloadUrl);

    void db.images.update(assetId, {
      remoteUrlCache: downloadUrl,
      updatedAt: new Date(),
    });

    return {
      ...image,
      url: downloadUrl,
      source: "storage",
      status: "ready",
    };
  }

  return {
    ...image,
    url: null,
    source: "none",
    status,
  };
};
