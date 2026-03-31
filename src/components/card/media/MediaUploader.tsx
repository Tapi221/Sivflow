import { ImageFrame } from "@/components/card/blocks/ImageFrame";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuthSession } from "@/contexts/AuthContext";
import { useReliableFileUpload } from "@/hooks/platform/useReliableFileUpload";
import { cn } from "@/lib/utils";
import {
    removeImageBlobUrl,
} from "@/services/imageBlobUrlSessionCache";
import { useLocalImageBlobUrl } from "@/hooks/image/useLocalImageBlobUrl";
import { deleteImageBlob, putImageBlob } from "@/services/imageFileStore";
import { getLocalDb } from "@/services/localDB";
import type { AssetRecord, UploadedImage, UploadedImageStatus } from "@/types";
import type { StorageUrl } from "@/types/core/branded";
import { Check, Copy, Download, Pause, Play, RotateCcw, Upload, X } from "@/ui/icons";
import {
    createFailedUploadedImage,
    createUploadedImage,
} from "@/utils/uploaded-image/factory";
import { convertHeicToJpeg, isHeicFile } from "@/utils/uploaded-image/heic";
import { loadImageNaturalSize } from "@/utils/uploaded-image/naturalSize";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function ImageItem({ item, index, onRetry, onUpdate }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const { currentUser } = useAuthSession();
  const [draftTransform, setDraftTransform] = useState<{
    scale: number;
    x: number;
  } | null>(null);

  // ── blob URL 解決と pin/unpin ──────────────────────────────────────────
  // 「非 blob の直接 URL」（remoteUrl または https: / data: の localUrl）が
  // あればキャッシュ経由の解決は不要。それ以外（blob: URL を含む）は
  // useLocalImageBlobUrl 経由で解決することで pin が保証される。
  //
  // item.localUrl が blob: の場合も hook 経由にする理由:
  //   アップロードハンドラが localUrl に previewUrl (blob:) を直入れしているが、
  //   その URL は imageBlobUrlSessionCache に localFileId キーで存在している。
  //   hook がそのキーで getOrCreateImageBlobUrl を呼ぶと同じ URL を返し pin する。
  //   → item.localUrl (blob:) 経由でもキャッシュの pin 機構が有効になる。
  const nonBlobDirectUrl: string | null =
    item?.remoteUrl && !String(item.remoteUrl).startsWith("blob:")
      ? String(item.remoteUrl)
      : item?.localUrl && !String(item.localUrl).startsWith("blob:")
        ? String(item.localUrl)
        : null;

  const localBlobId: string | null = nonBlobDirectUrl
    ? null
    : (item?.localFileId ?? item?.assetId ?? item?.id ?? null);

  const { url: resolvedUrl } = useLocalImageBlobUrl(
    localBlobId,
    currentUser?.uid,
  );

  const displayUrl = nonBlobDirectUrl ?? resolvedUrl ?? "";
  // ─────────────────────────────────────────────────────────────────────

  const isFailed = item.status === "failed";
  const persistedScale = clamp(Number(item.scale ?? 1), 0.2, 1);
  const persistedX = clamp(Number(item.x ?? 0), -1, 1);
  const safeScale = draftTransform?.scale ?? persistedScale;
  const safeX = draftTransform?.x ?? persistedX;
  useEffect(() => {
    queueMicrotask(() => setLoadFailed(false));
  }, [displayUrl]);
  useEffect(() => {
    if (!draftTransform) return;
    if (
      Math.abs(draftTransform.scale - persistedScale) < 0.001 &&
      Math.abs(draftTransform.x - persistedX) < 0.001
    ) {
      setDraftTransform(null);
    }
  }, [draftTransform, persistedScale, persistedX]);
  const handleCopyImage = useCallback(async () => {
    if (!displayUrl) return;
    try {
      const response = await fetch(displayUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (
        navigator.clipboard?.write &&
        typeof ClipboardItem !== "undefined" &&
        blob.type
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        return;
      }
      await navigator.clipboard.writeText(displayUrl);
    } catch (error) {
      console.error("Failed to copy image:", error);
      try {
        await navigator.clipboard.writeText(displayUrl);
      } catch {
        alert("画像のコピーに失敗しました。");
      }
    }
  }, [displayUrl]);
  const handleDownloadImage = useCallback(async () => {
    if (!displayUrl) return;
    try {
      const response = await fetch(displayUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const ext =
        blob.type === "image/png"
          ? "png"
          : blob.type === "image/webp"
            ? "webp"
            : blob.type === "image/gif"
              ? "gif"
              : "jpg";
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `uploaded-image-${index + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Failed to download image:", error);
      const a = document.createElement("a");
      a.href = displayUrl;
      a.download = `uploaded-image-${index + 1}`;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }, [displayUrl, index]);
  const commitTransform = useCallback(
    (next: { scale: number; x: number }) => {
      const normalized = {
        scale: next.scale >= 0.98 ? 1 : clamp(next.scale, 0.2, 1),
        x: next.scale >= 0.98 ? 0 : clamp(next.x, -1, 1),
      };
      setDraftTransform(normalized);
      onUpdate(index, normalized);
    },
    [index, onUpdate],
  );

  return (
    <>
      <div className="relative group w-full">
        <div className="relative w-full overflow-hidden rounded-lg">
          {displayUrl && !loadFailed ? (
            <ImageFrame
              src={displayUrl}
              alt={`Image ${index + 1}`}
              className="bg-transparent"
              imgClassName="cursor-pointer"
              scale={safeScale}
              x={safeX}
              naturalW={item.naturalW ?? null}
              naturalH={item.naturalH ?? null}
              editable
              onError={() => setLoadFailed(true)}
              onNaturalSize={({ naturalW, naturalH }) => {
                if (
                  (item.naturalW ?? 0) === naturalW &&
                  (item.naturalH ?? 0) === naturalH
                )
                  return;
                onUpdate(index, { naturalW, naturalH });
              }}
              onTransformChange={({ scale, x }) => {
                setDraftTransform({
                  scale: scale >= 0.98 ? 1 : clamp(scale, 0.2, 1),
                  x: scale >= 0.98 ? 0 : clamp(x, -1, 1),
                });
              }}
              onTransformCommit={({ scale, x }) => {
                commitTransform({ scale, x });
              }}
            />
          ) : (
            <div className="w-full h-48 bg-white flex items-center justify-center text-slate-400 text-xs">
              画像を表示できません
            </div>
          )}

          {/* Optimistic Status Badges & Progress */}
          <div className="absolute inset-x-2 bottom-2 z-20">
            {item.status === "uploading" &&
              item.progress !== undefined &&
              item.progress < 100 && (
                <div className="bg-white/90 rounded-full h-1 overflow-hidden shadow-sm">
                  <div
                    className="h-full progress-bar-fill"
                    style={
                      {
                        "--progress": `${item.progress}%`,
                        "--progress-color": "var(--primary-color)",
                      } as React.CSSProperties
                    }
                  />
                </div>
              )}
          </div>

          <div className="absolute bottom-1 right-1 flex gap-1 z-20">
            {item.source === "cloud" && (
              <div className="p-0.5 bg-green-500 rounded-full shadow-sm">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            {item.source === "local_fallback" && (
              <div className="p-1.5 bg-amber-500 rounded-full shadow-sm"></div>
            )}
          </div>

          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 supports-[hover:none]:opacity-100 transition-opacity">
            {displayUrl && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-6 w-6 bg-white/90"
                onClick={() => {
                  void handleCopyImage();
                }}
                aria-label="画像をコピー"
              >
                <Copy className="w-2.5 h-2.5" />
              </Button>
            )}
            {displayUrl && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-6 w-6 bg-white/90"
                onClick={() => {
                  void handleDownloadImage();
                }}
                aria-label="画像をダウンロード"
              >
                <Download className="w-2.5 h-2.5" />
              </Button>
            )}
            {isFailed && (
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

          {displayUrl && !loadFailed && (
            <div className="pointer-events-none absolute inset-x-3 bottom-0 z-30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 supports-[hover:none]:opacity-100 transition-opacity">
              <div
                className="pointer-events-auto ml-auto w-full max-w-[300px] rounded-lg border border-slate-200/70 bg-white/75 px-2 py-1 shadow-sm backdrop-blur"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <Slider
                  min={20}
                  max={100}
                  step={1}
                  value={[Math.round(safeScale * 100)]}
                  onValueChange={(values) => {
                    const nextScaleRaw = clamp((values[0] ?? 100) / 100, 0.2, 1);
                    const nextScale = nextScaleRaw >= 0.98 ? 1 : nextScaleRaw;
                    const baseX = nextScale >= 0.999 ? 0 : safeX;
                    setDraftTransform({ scale: nextScale, x: baseX });
                  }}
                  onValueCommit={(values) => {
                    const nextScaleRaw = clamp((values[0] ?? 100) / 100, 0.2, 1);
                    const nextScale = nextScaleRaw >= 0.98 ? 1 : nextScaleRaw;
                    const baseX = nextScale >= 0.999 ? 0 : safeX;
                    commitTransform({ scale: nextScale, x: baseX });
                  }}
                  className="w-full"
                  aria-label="画像サイズ"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
const MemoizedImageItem = React.memo(
  ImageItem,
  (prev, next) => prev.item === next.item && prev.index === next.index,
);

function AudioItem({ url, index, onRemove }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50">
      <audio ref={audioRef} src={url} onEnded={() => setIsPlaying(false)} />
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
      <span className="flex-1 text-sm text-gray-600 truncate">
        音声 {index + 1}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500 hover:bg-red-50"
        onClick={() => onRemove(index)}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

interface MediaUploaderProps {
  type?: "image" | "audio";
  urls?: (string | UploadedImage)[];
  onChange: (urls: (string | UploadedImage)[]) => void;
  maxFiles?: number;
  initialFile?: File;
  onConsumeInitialFile?: () => void;
  onFilesExcess?: (files: File[]) => void;
  autoOpenPicker?: boolean;
}

export default function MediaUploader({
  type = "image",
  urls = [],
  onChange,
  maxFiles = 10,
  initialFile,
  onConsumeInitialFile,
  onFilesExcess,
  autoOpenPicker = false,
}: MediaUploaderProps) {
  const { currentUser } = useAuthSession();
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [retryIndex, setRetryIndex] = useState<number | null>(null);
  const latestItemsRef = useRef(urls);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoOpenedRef = useRef(false);

  const uniqueId = useId();
  const inputId = `file-${type}-${uniqueId}`;

  useEffect(() => {
    latestItemsRef.current = urls;
  }, [urls]);

  useEffect(() => {
    if (!autoOpenPicker) {
      autoOpenedRef.current = false;
      return;
    }
    if (autoOpenedRef.current) return;

    const trigger = () => {
      if (!fileInputRef.current) return;
      autoOpenedRef.current = true;
      fileInputRef.current.click();
    };

    const rafId = window.requestAnimationFrame(trigger);
    return () => window.cancelAnimationFrame(rafId);
  }, [autoOpenPicker, urls.length, type]);

  const accept =
    type === "image"
      ? "image/png,image/jpeg,image/jpg,image/heic,image/heif"
      : "audio/*";

  const ariaLabel =
    type === "image" ? "画像をアップロード" : "音声をアップロード";

  const { uploadFile } = useReliableFileUpload();

  // Helper to generate storage path
  const getStoragePath = (uid: string) => (fileName: string) =>
    `users/${uid}/uploads/${fileName}`;
  const buildAssetRemoteKey = useCallback(
    (uid: string, assetId: string) => `users/${uid}/assets/${assetId}`,
    [],
  );
  const upsertAssetRecord = useCallback(
    async (asset: AssetRecord) => {
      const db = await getLocalDb(currentUser?.uid);
      await db.images.put(asset as unknown);
    },
    [currentUser?.uid],
  );
  const enqueueAssetUpload = useCallback(
    async (payload: {
      assetId: string;
      localBlobId: string;
      remoteKey: string;
      mime: string;
      size: number;
    }) => {
      const db = await getLocalDb(currentUser?.uid);
      const now = Date.now();
      const existing = await db.syncQueue
        .where("targetId")
        .equals(payload.assetId)
        .filter(
          (item: unknown) =>
            item.entity === "asset" && item.status === "pending",
        )
        .first();
      if (existing) return;
      await db.syncQueue.add({
        id: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        targetId: payload.assetId,
        entity: "asset",
        operationType: "update",
        type: "upload",
        action: "update",
        payload,
        priority: "high",
        createdAt: now,
        updatedAt: now,
        status: "pending",
        retryCount: 0,
      } as unknown);
      if (import.meta.env.DEV) {
        console.info("[Asset] Enqueued upload", payload);
      }
    },
    [currentUser?.uid],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- upload handler intentionally recreated with current mutable editor state.
  const handleUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    // 認証チェック
    if (!currentUser) {
      alert("画像をアップロードするにはログインが必要です。");
      return;
    }

    const isImage = type === "image";
    const currentCount = urls.length;
    const limit = Math.max(0, maxFiles - currentCount);

    // Convert to array
    const allFiles = Array.from(files);

    // Split into current vs excess
    const filesToUpload = allFiles.slice(0, limit);
    const filesExcess = allFiles.slice(limit);

    // Notify parent about excess files
    if (filesExcess.length > 0 && onFilesExcess) {
      onFilesExcess(filesExcess);
    }

    if (filesToUpload.length === 0) {
      return;
    }

    const filesArray = filesToUpload;

    if (!isImage) {
      setIsUploading(true);
      try {
        const uploadAudioWrapper = async (file: File) => {
          return await uploadFile(file, getStoragePath(currentUser.uid), {
            type: "card_audio",
          });
        };

        // maxFiles=1 の場合は最初の1ファイルのみ処理
        const filesToUpload =
          maxFiles === 1 ? filesArray.slice(0, 1) : filesArray;
        const results = await Promise.allSettled(
          filesToUpload.map(uploadAudioWrapper),
        );
        const uploadedUrls = results
          .filter((result) => result.status === "fulfilled")
          .map((result: unknown) => result.value.url);

        if (uploadedUrls.length > 0) {
          if (maxFiles === 1) {
            // 単一ファイル制限の場合は置き換え
            onChange([uploadedUrls[0]]);
          } else {
            onChange([...(urls as string[]), ...uploadedUrls]);
          }
        }

        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.error("Audio upload failures:", failures);
          alert(`${failures.length}件のファイルのアップロードに失敗しました。`);
        }
      } catch (error: unknown) {
        console.error("[MediaUploader] Audio upload error:", error);
        alert(`ファイルのアップロードに失敗しました: ${error.message}`);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Image Upload Logic using Hook
    try {
      const prepared = await Promise.all(
        filesArray.map(async (file) => {
          if (isHeicFile(file)) {
            try {
              const converted = await convertHeicToJpeg(file);
              const image = createUploadedImage(converted);
              const assetId = image.assetId ?? image.id;
              const blobRecord = await putImageBlob(converted, {
                userId: currentUser.uid,
                assetId,
              });
              const previewUrl = await getOrCreateImageBlobUrl(
                blobRecord.localBlobId,
                { userId: currentUser.uid },
              );
              const naturalSize = await loadImageNaturalSize(
                String(previewUrl ?? image.localUrl ?? ""),
              );
              const remoteKey = buildAssetRemoteKey(currentUser.uid, assetId);
              await upsertAssetRecord({
                id: assetId,
                userId: currentUser.uid,
                mime: blobRecord.mime,
                size: blobRecord.size,
                localBlobId: blobRecord.localBlobId,
                localStatus: "present",
                remoteKey,
                remoteStatus: "none",
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              if (import.meta.env.DEV) {
                console.info("[MediaUploader] image asset created", {
                  assetId,
                  localBlobId: blobRecord.localBlobId,
                });
              }
              await enqueueAssetUpload({
                assetId,
                localBlobId: blobRecord.localBlobId,
                remoteKey,
                mime: blobRecord.mime,
                size: blobRecord.size,
              });
              return {
                file: converted,
                image: {
                  ...image,
                  assetId,
                  localFileId: blobRecord.localBlobId,
                  storagePath: remoteKey,
                  localUrl: (previewUrl ?? image.localUrl) as unknown,
                  naturalW: naturalSize?.naturalW ?? image.naturalW,
                  naturalH: naturalSize?.naturalH ?? image.naturalH,
                },
              };
            } catch (error) {
              console.warn("HEIC conversion failed", error);
              return { file: null, image: createFailedUploadedImage(file) };
            }
          }
          const image = createUploadedImage(file);
          const assetId = image.assetId ?? image.id;
          const blobRecord = await putImageBlob(file, {
            userId: currentUser.uid,
            assetId,
          });
          const previewUrl = await getOrCreateImageBlobUrl(
            blobRecord.localBlobId,
            { userId: currentUser.uid },
          );
          const naturalSize = await loadImageNaturalSize(
            String(previewUrl ?? image.localUrl ?? ""),
          );
          const remoteKey = buildAssetRemoteKey(currentUser.uid, assetId);
          await upsertAssetRecord({
            id: assetId,
            userId: currentUser.uid,
            mime: blobRecord.mime,
            size: blobRecord.size,
            localBlobId: blobRecord.localBlobId,
            localStatus: "present",
            remoteKey,
            remoteStatus: "none",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          if (import.meta.env.DEV) {
            console.info("[MediaUploader] image asset created", {
              assetId,
              localBlobId: blobRecord.localBlobId,
            });
          }
          await enqueueAssetUpload({
            assetId,
            localBlobId: blobRecord.localBlobId,
            remoteKey,
            mime: blobRecord.mime,
            size: blobRecord.size,
          });
          return {
            file,
            image: {
              ...image,
              assetId,
              localFileId: blobRecord.localBlobId,
              storagePath: remoteKey,
              localUrl: (previewUrl ?? image.localUrl) as unknown,
              naturalW: naturalSize?.naturalW ?? image.naturalW,
              naturalH: naturalSize?.naturalH ?? image.naturalH,
            },
          };
        }),
      );

      const newImages = [
        ...(urls as UploadedImage[]),
        ...prepared.map((item) => item.image),
      ];
      latestItemsRef.current = newImages;
      onChange(newImages);

      // Process uploads
      await Promise.all(
        prepared.map(async (preparedItem) => {
          if (!preparedItem.file) return;
          const image = preparedItem.image;

          try {
            const result = await uploadFile(
              preparedItem.file,
              () =>
                buildAssetRemoteKey(currentUser.uid, image.assetId ?? image.id),
              { type: "card_image", docId: image.assetId ?? image.id },
              (progress) => {
                // Update progress state
                const current =
                  (latestItemsRef.current as UploadedImage[]) || [];
                const updated = current.map((item) =>
                  item.id === image.id ? { ...item, progress: progress } : item,
                );
                onChange(updated);
              },
            );

            // Ensure cloud sync icon is visible for at least 1 second and force 100%
            const currentMid =
              (latestItemsRef.current as UploadedImage[]) || [];
            const updatedMid = currentMid.map((item) =>
              item.id === image.id ? { ...item, progress: 100 } : item,
            );
            onChange(updatedMid);

            await new Promise((resolve) => setTimeout(resolve, 800));

            const current = (latestItemsRef.current as UploadedImage[]) || [];
            const updated = current.map((item) => {
              if (item.id !== image.id) return item;
              const safeRemoteUrl =
                typeof result.url === "string" && result.url.startsWith("http")
                  ? result.url
                  : null;
              return {
                ...item,
                assetId: item.assetId ?? item.id,
                localFileId: item.localFileId ?? item.assetId ?? item.id,
                localUrl: item.localUrl ?? null,
                remoteUrl: (safeRemoteUrl || null) as StorageUrl | null,
                storagePath: result.storagePath || null,
                status: safeRemoteUrl
                  ? ("ready" as UploadedImageStatus)
                  : ("uploading" as UploadedImageStatus),
                source: result.source || null,
                fallbackReason: result.fallbackReason || null,
                progress: 100, // completed
              };
            });
            latestItemsRef.current = updated; // 最新の状態を保存
            onChange(updated);
          } catch (error: unknown) {
            console.error(
              "[MediaUploader] Image upload error for:",
              image.id,
              error,
            );
            const current = (latestItemsRef.current as UploadedImage[]) || [];
            const updated = current.map((item) =>
              item.id === image.id
                ? {
                    ...item,
                    status: "failed" as UploadedImageStatus,
                    error: error.message,
                  }
                : item,
            );
            latestItemsRef.current = updated; // 最新の状態を保存
            onChange(updated);
          }
        }),
      );
    } catch (error: unknown) {
      console.error("[MediaUploader] Image preparation/upload error:", error);
      alert(`画像のアップロードに失敗しました: ${error.message}`);
    }
  };

  // Handle initialFile (pending upload from overflow)
  useEffect(() => {
    if (initialFile && onConsumeInitialFile) {
      // Automatically start uploading the file
      handleUpload([initialFile]);
      // Notify parent that the file has been consumed so it can be cleared from state
      onConsumeInitialFile();
    }
  }, [handleUpload, initialFile, onConsumeInitialFile]);

  const handleRetry = (index: number) => {
    if (type !== "image") return;
    setRetryIndex(index);
    fileInputRef.current?.click();
  };

  const handleRetryUpload = async (file: File, index: number) => {
    if (!currentUser) {
      alert("画像をアップロードするにはログインが必要です。");
      return;
    }

    const current = (latestItemsRef.current as UploadedImage[]) || [];
    const previous = current[index];
    // 直接 URL.revokeObjectURL を呼ぶと pinCount を無視して revoke してしまう。
    // removeImageBlobUrl はキャッシュ側の pinCount を確認し、
    // pin 中なら staleUrls に積んで unpin 後に revoke するため安全。
    if (previous) {
      const localBlobId =
        previous.localFileId ?? previous.assetId ?? previous.id ?? null;
      if (localBlobId) {
        removeImageBlobUrl(localBlobId, { userId: currentUser?.uid });
      }
    }

    try {
      const targetFile = isHeicFile(file)
        ? await convertHeicToJpeg(file)
        : file;
      const created = createUploadedImage(targetFile) as UploadedImage;
      const assetId = created.assetId ?? created.id;
      const remoteKey = buildAssetRemoteKey(currentUser.uid, assetId);
      const blobRecord = await putImageBlob(targetFile, {
        userId: currentUser.uid,
        assetId,
      });
      const previewUrl = await getOrCreateImageBlobUrl(blobRecord.localBlobId, {
        userId: currentUser.uid,
      });
      const naturalSize = await loadImageNaturalSize(
        String(previewUrl ?? created.localUrl ?? ""),
      );
      await upsertAssetRecord({
        id: assetId,
        userId: currentUser.uid,
        mime: blobRecord.mime,
        size: blobRecord.size,
        localBlobId: blobRecord.localBlobId,
        localStatus: "present",
        remoteKey,
        remoteStatus: "none",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (import.meta.env.DEV) {
        console.info("[MediaUploader] image asset created", {
          assetId,
          localBlobId: blobRecord.localBlobId,
        });
      }
      await enqueueAssetUpload({
        assetId,
        localBlobId: blobRecord.localBlobId,
        remoteKey,
        mime: blobRecord.mime,
        size: blobRecord.size,
      });
      const newImage = {
        ...created,
        assetId,
        localFileId: blobRecord.localBlobId,
        storagePath: remoteKey,
        localUrl: (previewUrl ?? created.localUrl) as unknown,
        naturalW: naturalSize?.naturalW ?? created.naturalW,
        naturalH: naturalSize?.naturalH ?? created.naturalH,
      };
      const replaced = current.map((item, i) =>
        i === index ? newImage : item,
      );
      onChange(replaced);

      const result = await uploadFile(targetFile, () => remoteKey, {
        type: "card_image",
        docId: assetId,
      });

      const after = (latestItemsRef.current as UploadedImage[]) || [];
      const updated = after.map((item) => {
        if (item.id !== newImage.id) return item;
        const safeRemoteUrl =
          typeof result.url === "string" && result.url.startsWith("http")
            ? result.url
            : null;
        return {
          ...item,
          assetId: item.assetId ?? item.id,
          localFileId: item.localFileId ?? item.assetId ?? item.id,
          localUrl: item.localUrl ?? null,
          remoteUrl: (safeRemoteUrl || null) as StorageUrl | null,
          storagePath: result.storagePath || null,
          status: safeRemoteUrl
            ? ("ready" as UploadedImageStatus)
            : ("uploading" as UploadedImageStatus),
          source: result.source || null,
          fallbackReason: result.fallbackReason || null,
        };
      });
      onChange(updated);
    } catch (error: unknown) {
      console.warn("Retry failed", error);
      // Fallback failed or hook threw
      const failedImage = createFailedUploadedImage(file) as UploadedImage;
      const replaced = current.map((item, i) =>
        i === index ? failedImage : item,
      );
      onChange(replaced);
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (retryIndex !== null && type === "image") {
      const file = files[0];
      handleRetryUpload(file, retryIndex);
      setRetryIndex(null);
      event.target.value = "";
      return;
    }

    handleUpload(files);
    event.target.value = "";
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload],
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // Handle paste for images and audio
  const handlePaste = useCallback(
    async (e) => {
      const target = e.target as HTMLElement | null;
      const isEditableTarget = !!target?.closest(
        'input, textarea, select, [contenteditable="true"]',
      );
      if (isEditableTarget) return;

      // Only handle paste if mouse is hovering over this uploader instance
      if (!containerRef.current?.matches(":hover")) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files = [];
      for (const item of items) {
        if (type === "image" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        } else if (type === "audio" && item.type.startsWith("audio/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      // We pass ALL files to handleUpload, which now knows how to split them.
      if (files.length > 0) {
        e.preventDefault();
        await handleUpload(files);
      }
    },
    [handleUpload, type],
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleRemove = (index: number) => {
    if (type === "image") {
      const items = urls as UploadedImage[];
      const removed = items[index];
      const localBlobId =
        removed?.localFileId ?? removed?.assetId ?? removed?.id ?? null;
      if (localBlobId) {
        removeImageBlobUrl(localBlobId, { userId: currentUser?.uid });
        void deleteImageBlob(localBlobId, { userId: currentUser?.uid });
      }
      const next = items.filter((_, i) => i !== index);
      onChange(next);
      return;
    }

    const newUrls = (urls as string[]).filter((_, i) => i !== index);
    onChange(newUrls);
  };

  const handleUpdateImage = (index: number, patch: Partial<UploadedImage>) => {
    const current = (latestItemsRef.current as UploadedImage[]) || [];
    const target = current[index];
    if (!target) return;
    const changed = Object.entries(patch).some(
      ([key, value]) => target[key as keyof UploadedImage] !== value,
    );
    if (!changed) return;
    const next = current.map((image, i) =>
      i === index ? { ...image, ...patch } : image,
    );
    latestItemsRef.current = next;
    onChange(next);
  };

  const renderUploadDropzone = (withInput: boolean) => (
    <div
      className={cn(
        "border-2 border-dashed rounded-[24px] p-5 text-center transition-all duration-300 cursor-pointer group/upload",
        dragOver
          ? "border-indigo-400 bg-indigo-50/50"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30",
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => {
        setRetryIndex(null);
        fileInputRef.current?.click();
      }}
    >
      {withInput ? (
        <input
          hidden
          id={inputId}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          aria-label={ariaLabel}
        />
      ) : null}

      {isUploading ? (
        <div className="flex items-center justify-center gap-2 text-indigo-600">
          <Upload className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
          <p className="text-sm">アップロード中...</p>
        </div>
      ) : (
        <div className="text-slate-400 group-hover/upload:text-slate-500 transition-colors select-none">
          <Upload className="w-6 h-6 mx-auto mb-2 opacity-60" />
          <p className="text-[10px] font-bold tracking-widest uppercase">
            ドラッグ＆ドロップ、クリック、または Ctrl+V で
            {type === "image" ? "画像を" : "音声を"}アップロード
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* 
          urls が空の場合のみ、大きなアップロードエリアを表示する。
          画像や音声が既に1つ以上ある場合は、この巨大なエリアは隠して
          コンテンツリストの末尾に小さな「追加」ボタンを表示する。
      */}
      {urls.length === 0 && renderUploadDropzone(true)}

      {/* 
          隠し input 要素: 
          大きなエリアを隠しても、追加ボタンからクリックイベントを発火させるために必要。
      */}
      {urls.length > 0 && (
        <input
          hidden
          id={`${inputId}-hidden`}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          aria-label={ariaLabel}
        />
      )}

      {urls.length > 0 && type === "image" && (
        <div className="grid grid-cols-1 gap-2">
          {urls.map((item, index) => (
            <MemoizedImageItem
              key={`img-${(item as UploadedImage).id ?? index}-${index}`}
              item={item as UploadedImage}
              index={index}
              onRetry={handleRetry}
              onUpdate={handleUpdateImage}
            />
          ))}

          {urls.length < maxFiles && (
            renderUploadDropzone(false)
          )}
        </div>
      )}

      {urls.length > 0 && type === "audio" && (
        <div className="space-y-2">
          {urls.map((item, index) => (
            <AudioItem
              key={`audio-${index}`}
              url={item as string}
              index={index}
              onRemove={handleRemove}
            />
          ))}

          {urls.length < maxFiles && (
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-dashed text-slate-500 py-2.5 h-auto"
              onClick={() => {
                setRetryIndex(null);
                fileInputRef.current?.click();
              }}
            >
              <Upload className="w-4 h-4" />
              <span className="text-xs uppercase font-bold">音声を追加</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}








