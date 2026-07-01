import { getOrCreateImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { putImageBlob } from "@/services/imageFileStore";
import { getLocalDb } from "@/services/localdb";
import { persistentQueue } from "@/services/PersistentOfflineQueue";
import type { AssetRecord, UploadedImage } from "@/types";
import { loadImageNaturalSize } from "@/utils/uploaded-image/naturalSize.utils";



const buildAssetRemoteKey = (uid: string, assetId: string) => `users/${uid}/assets/${assetId}`;
const createSelectionCaptureImageAsset = async ({ blob, userId }: { blob: Blob;
  userId: string;
}): Promise<UploadedImage> => {
  const assetId = crypto.randomUUID();
  const file = new File([blob], `${assetId}.png`, { type: blob.type ?? "image/png" });
  const blobRecord = await putImageBlob(file, { userId, assetId });
  const previewUrl = await getOrCreateImageBlobUrl(blobRecord.localBlobId, { userId });
  const naturalSize = await loadImageNaturalSize(String(previewUrl ?? ""));
  const remoteKey = buildAssetRemoteKey(userId, assetId);

  const assetRecord: AssetRecord = {
    id: assetId,
    userId,
    mime: blobRecord.mime,
    size: blobRecord.size,
    createdAt: new Date(),
    updatedAt: new Date(),
    localBlobId: blobRecord.localBlobId,
    localStatus: "present",
    remoteKey,
    remoteStatus: "uploading",
    remoteUrlCache: null,
    retryCount: 0,
    width: naturalSize?.naturalW ?? null,
    height: naturalSize?.naturalH ?? null,
  };

  const db = await getLocalDb(userId);
  await db.upsert("images", assetRecord);

  await persistentQueue.enqueueAssetUpload(
    {
      assetId,
      userId,
      remoteKey,
      mime: blobRecord.mime,
      size: blobRecord.size,
      fileName: file.name,
    },
    file,
  );
  void persistentQueue.processAssetQueue();

  return {
    id: assetId,
    assetId,
    localFileId: blobRecord.localBlobId,
    remoteUrl: null,
    localUrl: null,
    status: "uploading",
    storagePath: remoteKey,
    contentType: blobRecord.mime,
    size: blobRecord.size,
    sizeBytes: blobRecord.size,
    source: "local_fallback",
    naturalW: naturalSize?.naturalW ?? null,
    naturalH: naturalSize?.naturalH ?? null,
    scale: 1,
    x: 0,
    layout: null,
  } satisfies UploadedImage;
};



export { createSelectionCaptureImageAsset };
