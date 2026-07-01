import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@web-renderer/chip/button/button/button";
import { Check, RotateCcw, Upload, X } from "@web-renderer/chip/icons";
import { Slider } from "@web-renderer/chip/ui/slider";
import { ImageFrame } from "@/components/card/blocks/image/ImageFrame";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { CANONICAL_CARD_WIDTH } from "@/domain/card/cardGeometry.constants";
import type { ResolvedCardImage } from "@/services/cardImageResolver";
import { resolveCardImageUrl } from "@/services/cardImageResolver";
import { getOrCreateImageBlobUrl, removeImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { deleteImageBlob, getImageBlob, putImageBlob } from "@/services/imageFileStore";
import { getLocalDb } from "@/services/localdb";
import { persistentQueue } from "@/services/PersistentOfflineQueue";
import type { AssetRecord, UploadedImage } from "@/types";
import { loadImageNaturalSize } from "@/utils/uploaded-image/naturalSize.utils";



type ResolvedEditableImageStatus = "pending" | "uploading" | "ready" | "failed";
type ImageRecordLike =
  | {
    remoteStatus?: "none" | "uploading" | "ready" | "failed" | null;
    status?: "pending" | "uploading" | "ready" | "failed" | null;
    remoteUrlCache?: string | null;
    remoteUrl?: string | null;
    localBlobId?: string | null;
    localFileId?: string | null;
    remoteKey?: string | null;
    storagePath?: string | null;
    mime?: string | null;
    contentType?: string | null;
    userId?: string | null;
    width?: number | null;
    naturalW?: number | null;
    height?: number | null;
    naturalH?: number | null;
    createdAt?: Date | null;
    retryCount?: number | null;
  }
  | null
  | undefined;
type ResolvedEditableImage = ResolvedCardImage & {
  status: ResolvedEditableImageStatus;
};
type ImageItemProps = {
  item: ResolvedEditableImage;
  index: number;
  onRemove: (index: number) => void;
  onRetry: (index: number) => void;
  onUpdate: (index: number, patch: Partial<UploadedImage>) => void;
  displayMode: "fixed" | "fluid";
  zoom: number;
};
type ImageMediaUploaderProps = {
  type?: "image";
  urls?: UploadedImage[];
  onChange: (urls: UploadedImage[]) => void;
  maxFiles?: number;
  initialFile?: File;
  onConsumeInitialFile?: () => void;
  onFilesExcess?: (files: File[]) => void;
  autoOpenPicker?: boolean;
  displayMode?: "fixed" | "fluid";
  zoom?: number;
};
type AudioMediaUploaderProps = {
  type: "audio";
  urls?: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  initialFile?: File;
  onConsumeInitialFile?: () => void;
  onFilesExcess?: (files: File[]) => void;
  autoOpenPicker?: boolean;
};
type MediaUploaderProps = ImageMediaUploaderProps | AudioMediaUploaderProps;



const IMAGE_BLOCK_INSET_PX = 4;
const FIXED_IMAGE_REFERENCE_FRAME_WIDTH_PX =
  CANONICAL_CARD_WIDTH - IMAGE_BLOCK_INSET_PX * 2;
const EMPTY_IMAGE_URLS: UploadedImage[] = [];
const EMPTY_AUDIO_URLS: string[] = [];



const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const getImageStatusKey = (image: UploadedImage): string =>
  image.assetId?.trim() ?? image.id.trim();
const getResolvedStatusFromRecord = (
  record: ImageRecordLike,
): ResolvedEditableImageStatus => {
  if (!record) return "pending";

  if (record.remoteStatus === "failed" || record.status === "failed") {
    return "failed";
  }

  if (
    record.remoteStatus === "ready" ||
    record.status === "ready" ||
    isNonEmptyString(record.remoteUrlCache) ||
    isNonEmptyString(record.remoteUrl)
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
const getLocalBlobIdFromRecord = (record: ImageRecordLike): string | null => {
  if (isNonEmptyString(record?.localBlobId)) {
    return record.localBlobId.trim();
  }

  if (isNonEmptyString(record?.localFileId)) {
    return record.localFileId.trim();
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
const getMimeFromRecord = (record: ImageRecordLike): string =>
  isNonEmptyString(record?.mime)
    ? record.mime.trim()
    : isNonEmptyString(record?.contentType)
      ? record.contentType.trim()
      : "application/octet-stream";
const getDefaultResolvedStatus = (
  resolved: ResolvedCardImage,
): ResolvedEditableImageStatus => {
  return resolved.url ? "ready" : "pending";
};
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



const ImageItem = ({
  item,
  index,
  onRemove,
  onRetry,
  onUpdate,
  displayMode,
  zoom,
}: ImageItemProps) => {
  const [loadFailed, setLoadFailed] = useState(false);
  const persistedScale = clamp(
    typeof item.layout?.baseWidthPx === "number" && item.layout.baseWidthPx > 0
      ? item.layout.baseWidthPx / FIXED_IMAGE_REFERENCE_FRAME_WIDTH_PX
      : Number(item.scale ?? 1),
    0.2,
    1,
  );
  const persistedX = clamp(Number(item.layout?.cropX ?? item.x ?? 0), -1, 1);

  return (
    <div className="relative group w-full">
      <div className="relative w-full overflow-hidden rounded-lg">
        {item.url && !loadFailed ? (
          <ImageFrame
            src={item.url}
            alt={`Image ${index + 1}`}
            className="bg-transparent"
            imgClassName="cursor-pointer"
            displayMode={displayMode}
            zoom={zoom}
            scale={persistedScale}
            x={persistedX}
            fixedReferenceFrameWidthPx={FIXED_IMAGE_REFERENCE_FRAME_WIDTH_PX}
            layoutBaseWidthPx={item.layout?.baseWidthPx ?? null}
            cropX={item.layout?.cropX ?? null}
            naturalW={item.naturalW ?? null}
            naturalH={item.naturalH ?? null}
            editable
            onError={() => setLoadFailed(true)}
            onNaturalSize={({ naturalW, naturalH }) => {
              onUpdate(index, { naturalW, naturalH });
            }}
            onTransformCommit={({ scale, x, layout }) => {
              const resolvedScale = scale >= 0.98 ? 1 : clamp(scale, 0.2, 1);
              const resolvedCropX = resolvedScale >= 0.98 ? 0 : clamp(x, -1, 1);
              onUpdate(index, {
                scale: resolvedScale,
                x: resolvedCropX,
                layout: {
                  baseWidthPx: Math.max(1, layout.baseWidthPx),
                  cropX: resolvedCropX,
                },
              });
            }}
          />
        ) : (
          <div className="w-full h-48 bg-white flex items-center justify-center text-slate-400 text-xs">
            画像を表示できません
          </div>
        )}

        <div className="absolute bottom-1 right-1 flex gap-1 z-20">
          {item.status === "ready" && (
            <div className="p-0.5 bg-green-500 rounded-full shadow-sm">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          {item.status === "failed" && (
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 bg-white/90"
              onClick={() => onRetry(index)}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-6 w-6 bg-white/90"
            onClick={() => onRemove(index)}
            aria-label="画像を削除"
          >
            <X className="w-2.5 h-2.5" />
          </Button>
        </div>

        {item.url && !loadFailed && (
          <div className="pointer-events-none absolute inset-x-3 bottom-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="pointer-events-auto ml-auto w-full max-w-72 rounded-lg border border-slate-200/70 bg-white/75 px-2 py-1 shadow-sm backdrop-blur">
              <Slider
                min={20}
                max={100}
                step={1}
                value={[Math.round(persistedScale * 100)]}
                onValueCommit={(values) => {
                  const nextScaleRaw = clamp((values[0] ?? 100) / 100, 0.2, 1);
                  const nextScale = nextScaleRaw >= 0.98 ? 1 : nextScaleRaw;
                  const nextCropX =
                    nextScale >= 0.999 ? 0 : clamp(persistedX, -1, 1);
                  onUpdate(index, {
                    scale: nextScale,
                    x: nextCropX,
                    layout: {
                      baseWidthPx: Math.max(
                        1,
                        FIXED_IMAGE_REFERENCE_FRAME_WIDTH_PX * nextScale,
                      ),
                      cropX: nextCropX,
                    },
                  });
                }}
                className="w-full"
                aria-label="画像サイズ"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
const MediaUploader = (props: MediaUploaderProps) => {
  const {
    type = "image",
    urls = [],
    onChange,
    maxFiles = 10,
    initialFile,
    onConsumeInitialFile,
    onFilesExcess,
    autoOpenPicker = false,
  } = props;

  const displayMode =
    props.type === "audio" ? "fixed" : (props.displayMode ?? "fixed");
  const zoom = props.type === "audio" ? 1 : (props.zoom ?? 1);

  const { currentUser } = useAuthSession();
  const [dragOver, setDragOver] = useState(false);
  const [statusByAssetId, setStatusByAssetId] = useState<
    Record<string, ResolvedEditableImage["status"]>
  >({});
  const [resolvedImages, setResolvedImages] = useState<ResolvedEditableImage[]>(
    [],
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const consumedInitialFileRef = useRef<File | null>(null);
  const autoOpenedRef = useRef(false);
  const currentUserId = currentUser?.uid ?? null;
  const imageUrls = useMemo(
    () => (type === "image" ? (urls as UploadedImage[]) : EMPTY_IMAGE_URLS),
    [type, urls],
  );
  const audioUrls = useMemo(
    () => (type === "audio" ? (urls as string[]) : EMPTY_AUDIO_URLS),
    [type, urls],
  );
  const imageOnChange = onChange as (urls: UploadedImage[]) => void;
  const audioOnChange = onChange as (urls: string[]) => void;
  const uniqueId = useId();
  const inputId = `file-${type}-${uniqueId}`;

  useEffect(() => {
    if (type !== "image") return;

    let cancelled = false;

    const run = async () => {
      const next = await Promise.all(
        imageUrls.map(async (image) => {
          const resolved = await resolveCardImageUrl(
            image,
            currentUserId ?? undefined,
          );
          const statusKey = getImageStatusKey(image);
          const overrideStatus = statusKey ? statusByAssetId[statusKey] : null;

          return {
            ...resolved,
            status: overrideStatus ?? getDefaultResolvedStatus(resolved),
          } satisfies ResolvedEditableImage;
        }),
      );

      if (!cancelled) {
        setResolvedImages(next);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, imageUrls, statusByAssetId, type]);

  useEffect(() => {
    if (!autoOpenPicker) {
      autoOpenedRef.current = false;
      return;
    }

    if (autoOpenedRef.current) return;

    const rafId = window.requestAnimationFrame(() => {
      autoOpenedRef.current = true;
      fileInputRef.current?.click();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [autoOpenPicker]);

  const buildAssetRemoteKey = useCallback(
    (uid: string, assetId: string) => `users/${uid}/assets/${assetId}`,
    [],
  );

  const refreshAssetStatus = useCallback(
    async (assetId: string) => {
      if (!currentUserId || !assetId.trim()) return;

      const db = await getLocalDb(currentUserId);
      const record = (await db.images.get(assetId)) as ImageRecordLike;

      setStatusByAssetId((prev) => ({
        ...prev,
        [assetId]: getResolvedStatusFromRecord(record),
      }));
    },
    [currentUserId],
  );

  const enqueueAsset = useCallback(
    async (file: File) => {
      if (!currentUserId) {
        throw new Error("ログインが必要です");
      }

      const uid = currentUserId;
      const assetId = crypto.randomUUID();
      const blobRecord = await putImageBlob(file, {
        userId: uid,
        assetId,
      });
      const previewUrl = await getOrCreateImageBlobUrl(blobRecord.localBlobId, {
        userId: uid,
      });
      const naturalSize = await loadImageNaturalSize(String(previewUrl ?? ""));
      const remoteKey = buildAssetRemoteKey(uid, assetId);

      const assetRecord: AssetRecord = {
        id: assetId,
        userId: uid,
        mime: blobRecord.mime,
        size: blobRecord.size,
        localBlobId: blobRecord.localBlobId,
        localStatus: "present",
        remoteKey,
        remoteStatus: "uploading",
        remoteUrlCache: null,
        width: naturalSize?.naturalW ?? null,
        height: naturalSize?.naturalH ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
      };

      const db = await getLocalDb(uid);
      await db.upsert("images", assetRecord);

      await persistentQueue.enqueueAssetUpload(
        {
          assetId,
          userId: uid,
          remoteKey,
          mime: blobRecord.mime,
          size: blobRecord.size,
          fileName: file.name,
        },
        file,
      );
      void persistentQueue.processAssetQueue();

      setStatusByAssetId((prev) => ({ ...prev, [assetId]: "uploading" }));

      return {
        assetId,
        id: assetId,
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
    },
    [buildAssetRemoteKey, currentUserId],
  );

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      if (type !== "image") return;

      const incoming = Array.from(files ?? []);
      if (incoming.length === 0) return;

      const limit = Math.max(0, maxFiles - imageUrls.length);
      const filesToUpload = incoming.slice(0, limit);
      const filesExcess = incoming.slice(limit);

      if (filesExcess.length > 0) {
        onFilesExcess?.(filesExcess);
      }

      if (filesToUpload.length === 0) return;

      const added = await Promise.all(
        filesToUpload.map((file) => enqueueAsset(file)),
      );
      imageOnChange([...imageUrls, ...added]);

      for (const image of added) {
        if (image.assetId) {
          void refreshAssetStatus(image.assetId);
        }
      }
    },
    [
      enqueueAsset,
      imageOnChange,
      imageUrls,
      maxFiles,
      onFilesExcess,
      refreshAssetStatus,
      type,
    ],
  );

  useEffect(() => {
    if (!initialFile || type !== "image") return;

    if (consumedInitialFileRef.current === initialFile) return;

    consumedInitialFileRef.current = initialFile;
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      void handleUpload([initialFile]);
      onConsumeInitialFile?.();
    });

    return () => {
      cancelled = true;
    };
  }, [handleUpload, initialFile, onConsumeInitialFile, type]);

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (type === "image") {
      void handleUpload(files);
    } else {
      const next = [
        ...audioUrls,
        ...Array.from(files).map((file) => URL.createObjectURL(file)),
      ];
      audioOnChange(next);
    }

    event.target.value = "";
  };

  const handleRemove = async (index: number) => {
    if (type !== "image") {
      audioOnChange(audioUrls.filter((_, i) => i !== index));
      return;
    }

    const target = imageUrls[index];
    if (!target) return;

    const assetId = target.assetId?.trim() || target.id.trim();

    if (currentUserId && assetId) {
      const db = await getLocalDb(currentUserId);
      const record = (await db.images.get(assetId)) as ImageRecordLike;
      const localBlobId = getLocalBlobIdFromRecord(record);

      if (localBlobId) {
        removeImageBlobUrl(localBlobId, { userId: currentUserId });
        void deleteImageBlob(localBlobId, { userId: currentUserId });
      }
    }

    imageOnChange(imageUrls.filter((_, i) => i !== index));
  };

  const handleRetry = async (index: number) => {
    const target = imageUrls[index];
    const assetId = (target?.assetId?.trim() || target?.id.trim()) ?? "";

    if (!assetId || !currentUserId) return;

    setStatusByAssetId((prev) => ({ ...prev, [assetId]: "uploading" }));

    const db = await getLocalDb(currentUserId);
    const record = (await db.images.get(assetId)) as ImageRecordLike;

    const localBlobId = getLocalBlobIdFromRecord(record);
    const blob = localBlobId
      ? await getImageBlob(localBlobId, { userId: currentUserId })
      : null;

    if (!blob) {
      setStatusByAssetId((prev) => ({ ...prev, [assetId]: "failed" }));
      return;
    }

    const mime =
      (getMimeFromRecord(record) || blob.type) ?? "application/octet-stream";
    const remoteKey =
      getRemoteKeyFromRecord(record) ??
      buildAssetRemoteKey(currentUserId, assetId);
    const retryFile = new File([blob], getRetryFileName(assetId, mime), {
      type: mime,
    });

    const assetRecord: AssetRecord = {
      id: assetId,
      userId:
        (isNonEmptyString(record?.userId) ? record.userId.trim() : "") ||
        currentUserId,
      mime,
      size: blob.size,
      localBlobId: localBlobId ?? assetId,
      localStatus: "present",
      remoteKey,
      remoteStatus: "uploading",
      remoteUrlCache: null,
      width:
        typeof record?.width === "number"
          ? record.width
          : typeof record?.naturalW === "number"
            ? record.naturalW
            : null,
      height:
        typeof record?.height === "number"
          ? record.height
          : typeof record?.naturalH === "number"
            ? record.naturalH
            : null,
      createdAt: record?.createdAt ?? new Date(),
      updatedAt: new Date(),
      retryCount:
        typeof record?.retryCount === "number" ? record.retryCount + 1 : 1,
    };

    await db.upsert("images", assetRecord);
    await persistentQueue.enqueueAssetUpload(
      {
        assetId,
        userId: currentUserId,
        remoteKey,
        mime,
        size: blob.size,
        fileName: retryFile.name,
      },
      retryFile,
    );
    await persistentQueue.processAssetQueue();
    await refreshAssetStatus(assetId);
  };

  const handleUpdateImage = (index: number, patch: Partial<UploadedImage>) => {
    if (type !== "image") return;

    imageOnChange(
      imageUrls.map((image, i) =>
        i === index ? { ...image, ...patch } : image,
      ),
    );
  };

  const accept =
    type === "image"
      ? "image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
      : "audio/*";
  const ariaLabel =
    type === "image" ? "画像をアップロード" : "音声をアップロード";

  const renderUploadDropzone = (withInput: boolean) => (
    <div
      className={`border-2 border-dashed rounded-3xl p-5 text-center transition-all duration-300 cursor-pointer ${dragOver ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"}`}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void handleUpload(e.dataTransfer.files);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => fileInputRef.current?.click()}
    >
      {withInput ? (
        <input
          hidden
          id={inputId}
          type="file"
          accept={accept}
          multiple
          ref={fileInputRef}
          onChange={handleFileInputChange}
          aria-label={ariaLabel}
        />
      ) : null}
      <div className="text-slate-400 transition-colors select-none">
        <Upload className="w-6 h-6 mx-auto mb-2 opacity-60" />
        <p className="text-xs font-bold tracking-widest uppercase">
          ドラッグ＆ドロップ、クリック、または Ctrl+V で
          {type === "image" ? "画像を" : "音声を"}アップロード
        </p>
      </div>
    </div>
  );

  if (type === "audio") {
    return <div className="space-y-3">{renderUploadDropzone(true)}</div>;
  }

  return (
    <div className="space-y-3">
      {imageUrls.length === 0 && renderUploadDropzone(true)}
      {imageUrls.length > 0 && (
        <>
          <input
            hidden
            id={`${inputId}-hidden`}
            type="file"
            accept={accept}
            multiple
            ref={fileInputRef}
            onChange={handleFileInputChange}
            aria-label={ariaLabel}
          />
          <div className="grid grid-cols-1 gap-2">
            {resolvedImages.map((item, index) => (
              <ImageItem
                key={`${item.assetId}-${index}`}
                item={item}
                index={index}
                onRemove={handleRemove}
                onRetry={handleRetry}
                onUpdate={handleUpdateImage}
                displayMode={displayMode}
                zoom={zoom}
              />
            ))}
            {imageUrls.length < maxFiles && renderUploadDropzone(false)}
          </div>
        </>
      )}
    </div>
  );
};



export default MediaUploader;
