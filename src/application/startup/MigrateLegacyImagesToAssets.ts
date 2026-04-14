import { getImageFromFirestore } from "@/infrastructure/images/imageFirestoreReader";
import { getLocalDb } from "@/infrastructure/localdb/client";
import { persistentQueue } from "@/services/PersistentOfflineQueue";
import { getImageBlob } from "@/services/imageFileStore";
import type {
  AssetRecord,
  AssetRemoteStatus,
  Card,
  CardBlock,
  CardFace,
  UploadedImage,
} from "@/types";

type ImageRecordLike = Partial<AssetRecord> &
  Partial<UploadedImage> &
  Record<string, unknown>;

type AssetSnapshot = {
  assetId: string;
  localBlobId: string | null;
  remoteKey: string | null;
  remoteUrl: string | null;
  mime: string;
  size: number | null;
  width: number | null;
  height: number | null;
  remoteStatus: AssetRemoteStatus;
  retryCount: number;
};

type MigrationSummary = {
  scannedCards: number;
  scannedImages: number;
  canonicalizedImages: number;
  hydratedAssets: number;
  enqueuedUploads: number;
  failedImages: number;
};

type MigrationState = {
  status: "done" | "failed";
  migratedAt: string;
  summary?: MigrationSummary;
  error?: string;
};

type MigrateLegacyImagesToAssetsParams = {
  userId: string;
};

const MIGRATION_VERSION = "v1";
const MIGRATION_STORAGE_KEY_PREFIX = "legacy-image-asset-migration";
const inFlightTouchMigrations = new Set<string>();

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const readFirstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const readRemoteUrl = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (!isNonEmptyString(value)) continue;
    const trimmed = value.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
  }

  return null;
};

const readFirstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (isFiniteNumber(value)) return value;
  }

  return null;
};

const parseAssetIdFromStoragePath = (
  storagePath: string | null,
): string | null => {
  if (!storagePath) return null;

  const trimmed = storagePath.trim();
  if (!trimmed) return null;

  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return segments[segments.length - 1] ?? null;
};

const buildAssetRemoteKey = (userId: string, assetId: string): string =>
  `users/${userId}/assets/${assetId}`;

const getRetryFileName = (assetId: string, mime: string): string => {
  const normalized = mime.trim().toLowerCase();

  if (normalized === "image/png") return `${assetId}.png`;
  if (normalized === "image/webp") return `${assetId}.webp`;
  if (normalized === "image/gif") return `${assetId}.gif`;
  if (normalized === "image/heic") return `${assetId}.heic`;
  if (normalized === "image/heif") return `${assetId}.heif`;
  if (normalized === "image/avif") return `${assetId}.avif`;

  return `${assetId}.jpg`;
};

const getStorageValue = (
  image: UploadedImage,
  source: ImageRecordLike | null | undefined,
): string | null =>
  readFirstString(
    source?.remoteKey,
    source?.storagePath,
    image.storagePath,
    image.remoteId,
  );

const resolveAssetId = (
  image: UploadedImage,
  source: ImageRecordLike | null | undefined,
): string | null =>
  readFirstString(
    image.assetId,
    source?.assetId,
    image.id,
    source?.id,
    image.localFileId,
    source?.localBlobId,
    source?.localFileId,
    parseAssetIdFromStoragePath(getStorageValue(image, source)),
  );

const resolveRemoteStatus = (
  image: UploadedImage,
  source: ImageRecordLike | null | undefined,
  remoteUrl: string | null,
): AssetRemoteStatus => {
  const status = readFirstString(
    source?.remoteStatus,
    image.status,
    source?.status,
    image.uploadState,
  );

  if (remoteUrl) return "ready";
  if (status === "ready" || status === "completed") return "ready";
  if (status === "failed") return "failed";
  if (
    status === "uploading" ||
    status === "pending" ||
    status === "inProgress"
  ) {
    return "uploading";
  }

  return "none";
};

const buildAssetSnapshot = (
  image: UploadedImage,
  source: ImageRecordLike | null | undefined,
  assetId: string,
): AssetSnapshot => {
  const remoteUrl = readRemoteUrl(
    source?.remoteUrlCache,
    source?.remoteUrl,
    image.remoteUrl,
    image.thumbnailUrl,
  );
  const remoteKey = readFirstString(
    source?.remoteKey,
    source?.storagePath,
    image.storagePath,
  );
  const mime =
    readFirstString(source?.mime, source?.contentType, image.contentType) ??
    "application/octet-stream";
  const size = readFirstNumber(source?.size, image.size, image.sizeBytes);
  const width = readFirstNumber(
    source?.width,
    source?.naturalW,
    image.naturalW,
  );
  const height = readFirstNumber(
    source?.height,
    source?.naturalH,
    image.naturalH,
  );
  const localBlobId = readFirstString(
    source?.localBlobId,
    image.localFileId,
    source?.localFileId,
    assetId,
  );

  return {
    assetId,
    localBlobId,
    remoteKey,
    remoteUrl,
    mime,
    size,
    width,
    height,
    remoteStatus: resolveRemoteStatus(image, source, remoteUrl),
    retryCount: readFirstNumber(source?.retryCount, image.retryCount) ?? 0,
  };
};

const upsertAssetRecord = async ({
  userId,
  image,
  snapshot,
}: {
  userId: string;
  image: UploadedImage;
  snapshot: AssetSnapshot;
}): Promise<void> => {
  const db = await getLocalDb(userId);
  const existing = (await db.images.get(snapshot.assetId)) as
    | ImageRecordLike
    | undefined;
  const now = new Date();

  const assetRecord: AssetRecord = {
    id: snapshot.assetId,
    userId,
    mime: snapshot.mime,
    size: snapshot.size ?? 0,
    localBlobId: snapshot.localBlobId,
    localStatus: snapshot.localBlobId ? "present" : "missing",
    remoteKey: snapshot.remoteKey,
    remoteStatus: snapshot.remoteStatus,
    remoteUrlCache: snapshot.remoteUrl,
    width: snapshot.width,
    height: snapshot.height,
    createdAt:
      existing?.createdAt instanceof Date
        ? existing.createdAt
        : image.updatedAt instanceof Date
          ? image.updatedAt
          : now,
    updatedAt: now,
    retryCount: snapshot.retryCount,
  };

  await db.images.put(assetRecord);
};

const buildCanonicalImageRef = ({
  source,
  assetId,
  remoteKey,
  remoteUrl,
  mime,
  size,
}: {
  source: UploadedImage;
  assetId: string;
  remoteKey: string | null;
  remoteUrl: string | null;
  mime: string;
  size: number | null;
}): UploadedImage => ({
  id: assetId,
  assetId,
  localFileId: source.localFileId?.trim() || assetId,
  remoteUrl: remoteUrl as UploadedImage["remoteUrl"],
  localUrl: null,
  status: remoteUrl
    ? "ready"
    : source.status === "failed"
      ? "failed"
      : "uploading",
  storagePath: remoteKey,
  contentType: mime,
  size: size ?? source.size ?? source.sizeBytes ?? null,
  sizeBytes: size ?? source.sizeBytes ?? source.size ?? null,
  retryCount: source.retryCount ?? 0,
  source: source.source ?? "local_fallback",
  naturalW: source.naturalW ?? null,
  naturalH: source.naturalH ?? null,
  scale: source.scale ?? 1,
  x: source.x ?? 0,
  layout: source.layout ?? null,
  updatedAt: new Date(),
});

const didCanonicalImageChange = (
  before: UploadedImage,
  after: UploadedImage,
): boolean => {
  return (
    (before.assetId ?? null) !== (after.assetId ?? null) ||
    (before.id ?? null) !== (after.id ?? null) ||
    (before.localFileId ?? null) !== (after.localFileId ?? null) ||
    (before.remoteUrl ?? null) !== (after.remoteUrl ?? null) ||
    (before.storagePath ?? null) !== (after.storagePath ?? null) ||
    (before.contentType ?? null) !== (after.contentType ?? null) ||
    (before.size ?? null) !== (after.size ?? null) ||
    (before.sizeBytes ?? null) !== (after.sizeBytes ?? null) ||
    (before.status ?? null) !== (after.status ?? null)
  );
};

const enqueueLocalOnlyAssetUpload = async ({
  userId,
  assetId,
  localBlobId,
  remoteKey,
  mime,
}: {
  userId: string;
  assetId: string;
  localBlobId: string;
  remoteKey: string;
  mime: string;
}): Promise<boolean> => {
  const blob = await getImageBlob(localBlobId, { userId });
  if (!blob) return false;

  const retryFile = new File([blob], getRetryFileName(assetId, mime), {
    type: mime,
  });

  await persistentQueue.enqueueAssetUpload(
    {
      assetId,
      userId,
      remoteKey,
      mime,
      size: blob.size,
      fileName: retryFile.name,
    },
    retryFile,
  );

  return true;
};

const migrateSingleImageRef = async ({
  userId,
  image,
  summary,
}: {
  userId: string;
  image: UploadedImage;
  summary: MigrationSummary;
}): Promise<UploadedImage> => {
  const db = await getLocalDb(userId);
  const existing = (await db.images.get(
    image.assetId?.trim() || image.id.trim(),
  )) as ImageRecordLike | undefined;

  const provisionalAssetId =
    resolveAssetId(image, existing) ?? crypto.randomUUID();

  let firestoreImage: UploadedImage | null = null;
  try {
    firestoreImage = await getImageFromFirestore({
      imageId: provisionalAssetId,
      userId,
      inFlightTouchMigrations,
    });
  } catch (error) {
    console.warn("[LegacyImageMigration] Firestore image lookup skipped", {
      imageId: provisionalAssetId,
      error,
    });
  }

  const snapshot = buildAssetSnapshot(
    image,
    (firestoreImage as ImageRecordLike | null) ?? existing ?? null,
    provisionalAssetId,
  );

  const nextRemoteKey =
    snapshot.remoteKey ??
    (snapshot.localBlobId && !snapshot.remoteUrl
      ? buildAssetRemoteKey(userId, provisionalAssetId)
      : null);

  await upsertAssetRecord({
    userId,
    image,
    snapshot: {
      ...snapshot,
      remoteKey: nextRemoteKey,
    },
  });
  summary.hydratedAssets += 1;

  if (snapshot.localBlobId && !snapshot.remoteUrl && nextRemoteKey) {
    const enqueued = await enqueueLocalOnlyAssetUpload({
      userId,
      assetId: provisionalAssetId,
      localBlobId: snapshot.localBlobId,
      remoteKey: nextRemoteKey,
      mime: snapshot.mime,
    });

    if (enqueued) {
      summary.enqueuedUploads += 1;
    }
  }

  const canonical = buildCanonicalImageRef({
    source: image,
    assetId: provisionalAssetId,
    remoteKey: nextRemoteKey,
    remoteUrl: snapshot.remoteUrl,
    mime: snapshot.mime,
    size: snapshot.size,
  });

  if (didCanonicalImageChange(image, canonical)) {
    summary.canonicalizedImages += 1;
  }

  return canonical;
};

const migrateImageArray = async ({
  userId,
  images,
  summary,
}: {
  userId: string;
  images: UploadedImage[];
  summary: MigrationSummary;
}): Promise<UploadedImage[]> => {
  const nextImages: UploadedImage[] = [];

  for (const image of images) {
    summary.scannedImages += 1;

    try {
      const migrated = await migrateSingleImageRef({
        userId,
        image,
        summary,
      });
      nextImages.push(migrated);
    } catch (error) {
      summary.failedImages += 1;
      console.error("[LegacyImageMigration] Failed to migrate image ref", {
        imageId: image.assetId ?? image.id,
        error,
      });
      nextImages.push(image);
    }
  }

  return nextImages;
};

const migrateBlocks = async ({
  userId,
  blocks,
  summary,
}: {
  userId: string;
  blocks: CardBlock[];
  summary: MigrationSummary;
}): Promise<CardBlock[]> => {
  const nextBlocks: CardBlock[] = [];

  for (const block of blocks) {
    if (!Array.isArray(block.images) || block.images.length === 0) {
      nextBlocks.push(block);
      continue;
    }

    const nextImages = await migrateImageArray({
      userId,
      images: block.images,
      summary,
    });

    nextBlocks.push({
      ...block,
      images: nextImages,
    });
  }

  return nextBlocks;
};

const migrateFace = async ({
  userId,
  face,
  summary,
}: {
  userId: string;
  face: CardFace;
  summary: MigrationSummary;
}): Promise<CardFace> => {
  const nextBlocks = await migrateBlocks({
    userId,
    blocks: Array.isArray(face.blocks) ? face.blocks : [],
    summary,
  });

  const nextAttachmentImages =
    Array.isArray(face.attachments?.images) &&
    face.attachments.images.length > 0
      ? await migrateImageArray({
          userId,
          images: face.attachments.images,
          summary,
        })
      : face.attachments?.images;

  return {
    ...face,
    blocks: nextBlocks,
    attachments: face.attachments
      ? {
          ...face.attachments,
          images: nextAttachmentImages,
        }
      : face.attachments,
  };
};

const migrateCard = async ({
  userId,
  card,
  summary,
}: {
  userId: string;
  card: Card;
  summary: MigrationSummary;
}): Promise<Card> => {
  const nextFront = await migrateFace({
    userId,
    face: card.front,
    summary,
  });
  const nextBack = await migrateFace({
    userId,
    face: card.back,
    summary,
  });

  return {
    ...card,
    front: nextFront,
    back: nextBack,
    updatedAt: new Date(),
  };
};

const readMigrationState = (userId: string): MigrationState | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      `${MIGRATION_STORAGE_KEY_PREFIX}:${MIGRATION_VERSION}:${userId}`,
    );
    if (!raw) return null;
    return JSON.parse(raw) as MigrationState;
  } catch {
    return null;
  }
};

const writeMigrationState = (userId: string, state: MigrationState): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      `${MIGRATION_STORAGE_KEY_PREFIX}:${MIGRATION_VERSION}:${userId}`,
      JSON.stringify(state),
    );
  } catch {
    // no-op
  }
};

export const migrateLegacyImagesToAssets = async ({
  userId,
}: MigrateLegacyImagesToAssetsParams): Promise<MigrationSummary> => {
  const previousState = readMigrationState(userId);
  if (previousState?.status === "done") {
    return (
      previousState.summary ?? {
        scannedCards: 0,
        scannedImages: 0,
        canonicalizedImages: 0,
        hydratedAssets: 0,
        enqueuedUploads: 0,
        failedImages: 0,
      }
    );
  }

  const summary: MigrationSummary = {
    scannedCards: 0,
    scannedImages: 0,
    canonicalizedImages: 0,
    hydratedAssets: 0,
    enqueuedUploads: 0,
    failedImages: 0,
  };

  try {
    const db = await getLocalDb(userId);
    const cards = (await db.cards.toArray()) as Card[];

    for (const card of cards) {
      summary.scannedCards += 1;
      const migratedCard = await migrateCard({
        userId,
        card,
        summary,
      });

      if (
        JSON.stringify(card.front) !== JSON.stringify(migratedCard.front) ||
        JSON.stringify(card.back) !== JSON.stringify(migratedCard.back)
      ) {
        await db.cards.update(card.id, {
          front: migratedCard.front,
          back: migratedCard.back,
          updatedAt: new Date(),
        });
      }
    }

    if (summary.enqueuedUploads > 0) {
      await persistentQueue.processAssetQueue();
    }

    writeMigrationState(userId, {
      status: "done",
      migratedAt: new Date().toISOString(),
      summary,
    });

    console.info("[LegacyImageMigration] completed", summary);

    return summary;
  } catch (error) {
    writeMigrationState(userId, {
      status: "failed",
      migratedAt: new Date().toISOString(),
      summary,
      error: error instanceof Error ? error.message : String(error),
    });

    console.error("[LegacyImageMigration] failed", {
      userId,
      summary,
      error,
    });

    throw error;
  }
};
