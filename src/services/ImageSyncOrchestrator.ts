import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeDB, getLocalDb } from "./localDB";
import type { UploadedImage } from "@/types";
import type { BlobUrl, StorageUrl } from "@/types/branded";
import { createStorageUrl, revokeBlobUrl } from "@/types/branded";
import { assertImageInvariant } from "@/utils/imageAssertions";

/**
 * 画像同期のオーケストレーター
 *
 * 責務:
 * - 画像のアップロードとDB更新を一貫して行う
 * - 状態機械による同期状態の管理
 * - この関数以外から upload / DB update を呼ばせない
 */
export class ImageSyncOrchestrator {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    initializeDB(userId);
  }

  /**
   * 画像の同期とDB更新を一貫して行う唯一の関数
   *
   * 正式な同期順序（変更不可）:
   * 1. local image 存在確認
   * 2. Storage アップロード
   * 3. remoteUrl 確定
   * 4. Assert（最終防衛線）
   * 5. DB 更新
   * 6. local cleanup
   *
   * @throws {Error} アップロード失敗時
   */
  async syncImageAndUpdateCard(
    cardId: string,
    imageField: "questionImages" | "answerImages",
    imageIndex: number,
    image: UploadedImage,
  ): Promise<UploadedImage> {
    // 1. local image 存在確認
    if (!image.localUrl) {
      throw new Error("[ImageSync] No local image to sync");
    }

    // 2. Storage アップロード
    const remoteUrl = await this.uploadLocalImage(image.localUrl, image.id);

    // 3. remoteUrl 確定
    const syncedImage: UploadedImage = {
      ...image,
      remoteUrl,
      status: "ready",
      source: "cloud",
      uploadState: "completed",
      lastAttempt: new Date(),
    };

    // 4. Assert（最終防衛線）
    assertImageInvariant(syncedImage);

    // 5. DB 更新
    await this.updateCardImage(cardId, imageField, imageIndex, syncedImage);

    // 6. local cleanup
    if (image.localUrl) {
      revokeBlobUrl(image.localUrl);
    }

    return syncedImage;
  }

  /**
   * 状態機械による画像同期の処理
   *
   * 状態遷移:
   * PENDING → (upload success) → READY
   * PENDING → (upload fail) → FAILED
   * FAILED → (retry) → PENDING
   */
  async processImageByState(
    cardId: string,
    imageField: "questionImages" | "answerImages",
    imageIndex: number,
    image: UploadedImage,
  ): Promise<void> {
    switch (image.status) {
      case "uploading":
        // PENDING 状態: アップロードを試行
        try {
          await this.syncImageAndUpdateCard(
            cardId,
            imageField,
            imageIndex,
            image,
          );
        } catch (error) {
          console.error("[ImageSync] Upload failed:", error);
          // FAILED 状態に遷移
          await this.markImageAsFailed(
            cardId,
            imageField,
            imageIndex,
            error as Error,
          );
        }
        break;

      case "failed":
        // FAILED 状態: リトライロジック（後で実装）
        console.warn(
          "[ImageSync] Image in failed state, retry later:",
          image.id,
        );
        break;

      case "ready":
        // READY 状態: 何もしない
        break;

      default:
        console.warn("[ImageSync] Unknown image status:", image.status);
    }
  }

  /**
   * ローカル画像を Storage にアップロード
   * @private
   */
  private async uploadLocalImage(
    localUrl: BlobUrl,
    imageId: string,
  ): Promise<StorageUrl> {
    // Blob URL から Blob を取得
    const response = await fetch(localUrl);
    const blob = await response.blob();

    // Storage パスを生成
    const storagePath = `users/${this.userId}/images/${imageId}_full`;
    const storageRef = ref(storage, storagePath);

    // アップロード
    await uploadBytes(storageRef, blob);

    // Download URL を取得
    const downloadUrl = await getDownloadURL(storageRef);

    return createStorageUrl(downloadUrl);
  }

  /**
   * カードの画像を更新
   * @private
   */
  private async updateCardImage(
    cardId: string,
    imageField: "questionImages" | "answerImages",
    imageIndex: number,
    syncedImage: UploadedImage,
  ): Promise<void> {
    const db = await getLocalDb();
    const card = await db.cards.get(cardId);
    if (!card) {
      throw new Error(`[ImageSync] Card not found: ${cardId}`);
    }

    const images = card[imageField] || [];
    images[imageIndex] = syncedImage;

    const updateData: unknown = {
      [imageField]: images,
      updatedAt: new Date(),
    };

    await db.cards.update(cardId, updateData);
  }

  /**
   * 画像を失敗状態にマーク
   * @private
   */
  private async markImageAsFailed(
    cardId: string,
    imageField: "questionImages" | "answerImages",
    imageIndex: number,
    error: Error,
  ): Promise<void> {
    const db = await getLocalDb();
    const card = await db.cards.get(cardId);
    if (!card) return;

    const images = card[imageField] || [];
    const image = images[imageIndex];

    if (image) {
      images[imageIndex] = {
        ...image,
        status: "failed",
        uploadState: "failed",
        lastAttempt: new Date(),
      };

      const updateData: unknown = {
        [imageField]: images,
        updatedAt: new Date(),
      };

      await db.cards.update(cardId, updateData);
    }
  }

  /**
   * すべての未同期画像を処理
   */
  async syncAllPendingImages(
    onProgress?: (msg: string) => void,
  ): Promise<void> {
    onProgress?.("未同期画像を検索中...");

    const db = await getLocalDb();
    const cards = await db.cards.toArray();
    let totalProcessed = 0;

    for (const card of cards) {
      // questionImages の処理
      if (card.questionImages) {
        for (let i = 0; i < card.questionImages.length; i++) {
          const image = card.questionImages[i];
          if (image.status === "uploading" && image.localUrl) {
            onProgress?.(
              `アップロード中: ${card.id.substring(0, 8)}... (${totalProcessed + 1})`,
            );
            await this.processImageByState(card.id, "questionImages", i, image);
            totalProcessed++;
          }
        }
      }

      // answerImages の処理
      if (card.answerImages) {
        for (let i = 0; i < card.answerImages.length; i++) {
          const image = card.answerImages[i];
          if (image.status === "uploading" && image.localUrl) {
            onProgress?.(
              `アップロード中: ${card.id.substring(0, 8)}... (${totalProcessed + 1})`,
            );
            await this.processImageByState(card.id, "answerImages", i, image);
            totalProcessed++;
          }
        }
      }
    }

    onProgress?.(`完了: ${totalProcessed} 件の画像を同期しました`);
  }
}
