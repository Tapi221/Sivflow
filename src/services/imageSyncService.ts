import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { LocalDBLike } from "./localDB";
import type { UploadedImage } from "../types";
import { createStorageUrl } from "../types/branded";

const MAX_QUOTA = 500 * 1024 * 1024; // 500MB
const MAX_RETRIES = 5;

export class ImageSyncService {
  private localDB: LocalDBLike;

  constructor(userId: string, localDB: LocalDBLike) {
    this.localDB = localDB;
  }

  private async getStorageUsage(): Promise<number> {
    const stats =
      (await this.localDB.userStats.get("current")) ||
      (await this.localDB.userStats.toCollection().first());
    return stats?.totalStorageUsedBytes || 0;
  }

  private async checkQuota(fileSize: number): Promise<boolean> {
    const currentUsage = await this.getStorageUsage();
    return currentUsage + fileSize <= MAX_QUOTA;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async calculateChecksum(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * サムネイルを生成する（Canvasを使用）
   */
  async generateThumbnail(
    blob: Blob,
    maxWidth = 300,
    maxHeight = 300,
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (thumbnailBlob) => {
            if (thumbnailBlob) {
              resolve(thumbnailBlob);
            } else {
              reject(new Error("Failed to create thumbnail blob"));
            }
          },
          "image/jpeg",
          0.7,
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * ローカルにのみ存在する（remoteUrlがない）画像を検出し、Storageにアップロードする
   */
  async syncLocalImages(
    userId: string,
    onProgress?: (msg: string) => void,
  ): Promise<void> {
    console.log("[ImageSync] Starting image sync check...");
    onProgress?.("画像同期の準備中...");
    const cards = await this.localDB.cards.toArray();

    for (const card of cards) {
      const updatedQuestionImages = await this.processImageArray(
        userId,
        card.id,
        "cards",
        "questionImages",
        card.questionImages,
        onProgress,
      );
      const updatedAnswerImages = await this.processImageArray(
        userId,
        card.id,
        "cards",
        "answerImages",
        card.answerImages,
        onProgress,
      );

      if (updatedQuestionImages || updatedAnswerImages) {
        await this.localDB.cards.update(card.id, {
          questionImages: updatedQuestionImages || card.questionImages,
          answerImages: updatedAnswerImages || card.answerImages,
          updatedAt: new Date(),
        });
      }
    }
  }

  private async processImageArray(
    userId: string,
    entityId: string,
    table: string,
    fieldName: string,
    images: UploadedImage[],
    onProgress?: (msg: string) => void,
  ): Promise<UploadedImage[] | null> {
    if (!images || images.length === 0) return null;
    let changed = false;
    const newImages = [...images];

    for (let i = 0; i < newImages.length; i++) {
      const image = newImages[i];
      // localUrlがあり、remoteUrlがない場合
      if (image.localUrl && !image.remoteUrl) {
        // すでに完了しているか、直近で失敗しすぎていないか確認
        if (image.uploadState === "completed") continue;

        try {
          onProgress?.(
            `アップロード中 (${i + 1}/${newImages.length}): ${image.id.substring(0, 8)}...`,
          );
          const syncedImage = await this.uploadImageToStorage(userId, image);
          newImages[i] = syncedImage;
          changed = true;
          console.log(`[ImageSync] Successfully uploaded image ${image.id}`);
        } catch (error) {
          console.error(
            `[ImageSync] Failed to upload image ${image.id}:`,
            error,
          );
          newImages[i] = {
            ...image,
            uploadState: "failed",
            lastAttempt: new Date(),
          };
          changed = true;
        }
      }
    }

    return changed ? newImages : null;
  }

  private async uploadImageToStorage(
    userId: string,
    image: UploadedImage,
  ): Promise<UploadedImage> {
    if (!image.localUrl) throw new Error("Local URL missing");

    const response = await fetch(image.localUrl);
    const blob = await response.blob();

    // 1. Quota Check
    const thumbnailBlob = await this.generateThumbnail(blob);
    const totalSize = blob.size + thumbnailBlob.size;

    // Checksum
    const checksum = await this.calculateChecksum(blob);

    // 2. Check if already uploaded (Resume / Deduplication)
    // 実装プランに基づき、同一チェックサムの画像がクラウドにあれば再利用可能
    const highResPath = `users/${userId}/images/${checksum}_full`;
    const highResRef = ref(storage, highResPath);

    try {
      const existingUrl = await getDownloadURL(highResRef);
      console.log(
        `[ImageSync] Image with checksum ${checksum} already exists. Skipping upload.`,
      );

      const thumbPath = `users/${userId}/images/${checksum}_thumb`;
      const thumbUrl = await getDownloadURL(ref(storage, thumbPath));

      return {
        ...image,
        remoteUrl: createStorageUrl(existingUrl),
        thumbnailUrl: createStorageUrl(thumbUrl),
        remoteId: image.id,
        storagePath: highResPath,
        status: "ready",
        uploadState: "completed",
        sizeBytes: blob.size,
        checksum: checksum,
        lastAttempt: new Date(),
      };
    } catch {
      // Not found, proceed with upload
    }

    if (!(await this.checkQuota(totalSize))) {
      throw new Error("Storage quota exceeded (Max 500MB)");
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Update state to inProgress
        // 1. 高解像度版のアップロード
        const highResPath = `users/${userId}/images/${image.id}_full`;
        const highResRef = ref(storage, highResPath);
        await uploadBytes(highResRef, blob);
        const highResUrl = await getDownloadURL(highResRef);

        // 2. サムネイルのアップロード
        const thumbnailPath = `users/${userId}/images/${image.id}_thumb`;
        const thumbnailRef = ref(storage, thumbnailPath);
        await uploadBytes(thumbnailRef, thumbnailBlob);
        const thumbnailUrl = await getDownloadURL(thumbnailRef);

        // Update UserStats usage
        await this.updateStorageUsage(blob.size, thumbnailBlob.size);

        return {
          ...image,
          remoteUrl: createStorageUrl(highResUrl),
          thumbnailUrl: createStorageUrl(thumbnailUrl),
          remoteId: image.id,
          storagePath: highResPath,
          status: "ready",
          uploadState: "completed",
          sizeBytes: blob.size,
          checksum: checksum,
          lastAttempt: new Date(),
        };
      } catch (error) {
        lastError = error;
        console.warn(
          `[ImageSync] Upload attempt ${attempt + 1} failed for ${image.id}:`,
          error,
        );
        if (attempt < MAX_RETRIES - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError || new Error("Upload failed after max retries");
  }

  private async updateStorageUsage(
    highResSize: number,
    thumbnailSize: number,
  ): Promise<void> {
    const statsTable = this.localDB.userStats;
    const stats =
      (await statsTable.get("current")) ||
      (await statsTable.toCollection().first());

    if (stats) {
      await statsTable.update(stats.id, {
        totalHighResBytes: (stats.totalHighResBytes || 0) + highResSize,
        totalThumbnailBytes: (stats.totalThumbnailBytes || 0) + thumbnailSize,
        totalStorageUsedBytes:
          (stats.totalStorageUsedBytes || 0) + highResSize + thumbnailSize,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * [DEPRECATED/REMOVED]
   * Previously used to download images to creating local blobs.
  * Removed to prevent "Not allowed to load local resource" errors and blob leaks.
  * We now rely on standard browser caching for remote URLs.
  */
  async downloadHighResImage(image: UploadedImage): Promise<string | null> {
    void image;
    return null;
  }
}
