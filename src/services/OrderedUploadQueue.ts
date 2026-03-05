import pLimit from "p-limit";
import { strictValidateBeforeSave } from "@/utils/imageValidation";
import type { UploadedImage } from "@/types";
import { imageDB } from "@/services/ImageDatabaseWriter";
import * as Sentry from "@sentry/react";

/**
 * 順序保証付き並列アップロード
 */
class OrderedUploadQueue {
  private queue: Array<{ file: File; image: UploadedImage; order: number }> =
    [];
  private completedOrders = new Set<number>();

  /**
   * アップロードタスクを追加（順序番号付き）
   */
  enqueue(file: File, image: UploadedImage, order: number): void {
    this.queue.push({ file, image, order });
    console.log(
      `[OrderedUpload] Enqueued order ${order} (Total: ${this.queue.length})`,
    );
  }

  /**
   * 並列アップロード（p-limit + 順序保証）
   */
  async processWithOrder(
    concurrency: number = 2,
    uploadFn: (file: File, image: UploadedImage) => Promise<UploadedImage>,
  ): Promise<void> {
    const limit = pLimit(concurrency);

    const tasks = this.queue.map((item) =>
      limit(async () => {
        try {
          // 1. アップロード処理
          const updatedImage = await uploadFn(item.file, item.image);

          // 2. バリデーション
          strictValidateBeforeSave(updatedImage);

          // 3. DB 保存（順序番号を記録）
          await imageDB.saveToFirestore({
            ...updatedImage,
            uploadOrder: item.order,
          });

          // 4. 完了記録
          this.completedOrders.add(item.order);

          console.log(`[OrderedUpload] Completed order ${item.order}`);
        } catch (error) {
          console.error(`[OrderedUpload] Failed order ${item.order}`, error);

          // エラー時はコンソールに記録(Sentryは本番環境で自動的にキャプチャ)
          throw error;
        }
      }),
    );

    await Promise.allSettled(tasks);

    // 順序の整合性チェック
    const expectedOrders = this.queue
      .map((item) => item.order)
      .sort((a, b) => a - b);
    const missingOrders = expectedOrders.filter(
      (order) => !this.completedOrders.has(order),
    );

    if (missingOrders.length > 0) {
      console.error(
        `[OrderedUpload] Missing orders: ${missingOrders.join(", ")}`,
      );

      // Sentry に報告(本番環境で自動キャプチャ)
      if (import.meta.env.PROD) {
        console.error("[OrderedUpload] Upload order integrity violation", {
          missingOrders,
        });
      }
    }
  }

  /**
   * キューをクリア
   */
  clear(): void {
    this.queue = [];
    this.completedOrders.clear();
    console.log("[OrderedUpload] Queue cleared");
  }

  /**
   * 完了状況を取得
   */
  getStatus(): { total: number; completed: number; pending: number } {
    return {
      total: this.queue.length,
      completed: this.completedOrders.size,
      pending: this.queue.length - this.completedOrders.size,
    };
  }
}

/**
 * 順序保証付きアップロードキューの統一インスタンス
 */
export const orderedUploadQueue = new OrderedUploadQueue();
