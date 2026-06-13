import type { EditorDraft } from "./cardEditorUtils";
import { getLocalDb } from "@/services/localdb";
import { persistentQueue } from "@/services/PersistentOfflineQueue";
import type { UploadedImage } from "@/types/domain/assets";
import type { CardBlock, CardFaceAttachments } from "@/types/domain/card";



type LocalImageRecordLike = {
  remoteStatus?: "none" | "uploading" | "ready" | "failed" | null;
  status?: "pending" | "uploading" | "ready" | "failed" | null;
  remoteUrlCache?: string | null;
  remoteUrl?: string | null;
  remoteKey?: string | null;
  storagePath?: string | null;
};



const IMAGE_UPLOAD_SAVE_TIMEOUT_MS = 30_000;
const IMAGE_UPLOAD_SAVE_POLL_MS = 300;



const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const getImageAssetKey = (image: UploadedImage): string | null => {
  return asTrimmedString(image.assetId) ?? asTrimmedString(image.id);
};
const getRecordRemoteUrl = (record: LocalImageRecordLike | null): string | null => {
  return (
    asTrimmedString(record?.remoteUrlCache) ??
    asTrimmedString(record?.remoteUrl)
  );
};
const getRecordStoragePath = (
  record: LocalImageRecordLike | null,
): string | null => {
  return asTrimmedString(record?.remoteKey) ?? asTrimmedString(record?.storagePath);
};
const isRecordReady = (record: LocalImageRecordLike | null): boolean => {
  if (!record) return false;
  return (
    record.remoteStatus === "ready" ||
    record.status === "ready" ||
    getRecordRemoteUrl(record) !== null
  );
};
const isRecordFailed = (record: LocalImageRecordLike | null): boolean => {
  if (!record) return false;
  return record.remoteStatus === "failed" || record.status === "failed";
};
const hasRemotePersistence = (image: UploadedImage): boolean => {
  return (
    asTrimmedString(image.remoteUrl) !== null ||
    asTrimmedString(image.storagePath) !== null
  );
};
const shouldWaitForImage = (image: UploadedImage): boolean => {
  if (image.status === "failed") {
    throw new Error(
      "画像のアップロードに失敗しています。画像を再試行してからカードを保存してください。",
    );
  }

  if (image.status === "uploading" || image.status === "pending") {
    return true;
  }

  return !hasRemotePersistence(image);
};
const collectBlockImages = (blocks: CardBlock[]): UploadedImage[] => {
  return blocks.flatMap((block) => block.images ?? []);
};
const collectAttachmentImages = (
  attachments: CardFaceAttachments | null | undefined,
): UploadedImage[] => {
  return attachments?.images ?? [];
};
const collectDraftImages = (draft: EditorDraft): UploadedImage[] => {
  return [
    ...collectBlockImages(draft.frontBlocks),
    ...collectBlockImages(draft.backBlocks),
    ...collectAttachmentImages(draft.frontAttachments),
    ...collectAttachmentImages(draft.backAttachments),
  ];
};
const uniqueImagesByAssetKey = (images: UploadedImage[]): UploadedImage[] => {
  const seen = new Set<string>();
  const unique: UploadedImage[] = [];

  for (const image of images) {
    const assetKey = getImageAssetKey(image);
    if (!assetKey || seen.has(assetKey)) continue;
    seen.add(assetKey);
    unique.push(image);
  }

  return unique;
};
const mergeReadyImage = (
  image: UploadedImage,
  record: LocalImageRecordLike | null,
): UploadedImage => {
  const remoteUrl = getRecordRemoteUrl(record) ?? asTrimmedString(image.remoteUrl);
  const storagePath =
    asTrimmedString(image.storagePath) ?? getRecordStoragePath(record);

  return {
    ...image,
    remoteUrl: (remoteUrl ?? null) as UploadedImage["remoteUrl"],
    storagePath: storagePath ?? null,
    status: "ready",
    source: remoteUrl ? "cloud" : image.source,
    updatedAt: new Date(),
  };
};
const replaceImages = (
  images: UploadedImage[] | undefined,
  readyImagesByKey: Map<string, UploadedImage>,
): UploadedImage[] | undefined => {
  if (!images) return images;

  return images.map((image) => {
    const assetKey = getImageAssetKey(image);
    if (!assetKey) return image;
    return readyImagesByKey.get(assetKey) ?? image;
  });
};
const replaceBlockImages = (
  blocks: CardBlock[],
  readyImagesByKey: Map<string, UploadedImage>,
): CardBlock[] => {
  return blocks.map((block) => {
    if (!block.images?.length) return block;
    return {
      ...block,
      images: replaceImages(block.images, readyImagesByKey) ?? [],
    };
  });
};
const replaceAttachmentImages = (
  attachments: CardFaceAttachments,
  readyImagesByKey: Map<string, UploadedImage>,
): CardFaceAttachments => {
  return {
    ...attachments,
    images: replaceImages(attachments.images, readyImagesByKey) ?? [],
  };
};
const applyReadyImagesToDraft = (
  draft: EditorDraft,
  readyImagesByKey: Map<string, UploadedImage>,
): EditorDraft => {
  if (readyImagesByKey.size === 0) return draft;

  return {
    ...draft,
    frontBlocks: replaceBlockImages(draft.frontBlocks, readyImagesByKey),
    backBlocks: replaceBlockImages(draft.backBlocks, readyImagesByKey),
    frontAttachments: replaceAttachmentImages(
      draft.frontAttachments,
      readyImagesByKey,
    ),
    backAttachments: replaceAttachmentImages(draft.backAttachments, readyImagesByKey),
  };
};
const processAssetQueueBestEffort = async (): Promise<void> => {
  try {
    await persistentQueue.processAssetQueue();
  } catch (error) {
    console.warn("[CardSave] Failed to process image upload queue", error);
  }
};
const waitForDraftImageUploads = async (draft: EditorDraft): Promise<EditorDraft> => {
  const images = uniqueImagesByAssetKey(collectDraftImages(draft));
  const pendingImages = images.filter(shouldWaitForImage);

  if (pendingImages.length === 0) {
    return draft;
  }

  for (const image of pendingImages) {
    if (!getImageAssetKey(image)) {
      throw new Error(
        "画像のアップロード状態を確認できません。画像を追加し直してからカードを保存してください。",
      );
    }
  }

  await processAssetQueueBestEffort();

  const deadline = Date.now() + IMAGE_UPLOAD_SAVE_TIMEOUT_MS;
  const pendingKeys = pendingImages.map((image) => getImageAssetKey(image) ?? "");

  while (true) {
    const localDb = await getLocalDb();
    const readyImagesByKey = new Map<string, UploadedImage>();
    const unresolvedKeys: string[] = [];

    for (const image of pendingImages) {
      const assetKey = getImageAssetKey(image);
      if (!assetKey) continue;

      const record = (await localDb.images.get(assetKey)) as
        | LocalImageRecordLike
        | null
        | undefined;
      const normalizedRecord = record ?? null;

      if (isRecordFailed(normalizedRecord)) {
        throw new Error(
          "画像のアップロードに失敗しています。画像を再試行してからカードを保存してください。",
        );
      }

      if (isRecordReady(normalizedRecord)) {
        readyImagesByKey.set(assetKey, mergeReadyImage(image, normalizedRecord));
        continue;
      }

      unresolvedKeys.push(assetKey);
    }

    if (unresolvedKeys.length === 0) {
      return applyReadyImagesToDraft(draft, readyImagesByKey);
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `画像アップロードが完了していないためカード保存を中止しました（${unresolvedKeys.length}/${pendingKeys.length}件）。通信状態を確認してもう一度保存してください。`,
      );
    }

    await sleep(IMAGE_UPLOAD_SAVE_POLL_MS);
    await processAssetQueueBestEffort();
  }
};



export { waitForDraftImageUploads };
