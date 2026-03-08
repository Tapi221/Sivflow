// Operation Queue とLocalDB の統合ユーティリティ
// 既存のカード操作フックに統合可能な形で提供

import { operationQueue } from "@/services/operationQueue";
import type { Card } from "@/types";

/**
 * カード操作のQueue化ラッパー
 * 既存のコードから簡単に呼び出せるシンプルなAPI
 */
export const queuedCardOperations = {
  /**
   * カード作成をキューに追加
   */
  async createCard(cardData: Partial<Card>): Promise<void> {
    if (!cardData.id) throw new Error("Card ID is required for queueing");
    await operationQueue.enqueueChange("card", cardData.id, "create", cardData);
  },

  /**
   * カード更新をキューに追加
   */
  async updateCard(cardId: string, updates: Partial<Card>): Promise<void> {
    await operationQueue.enqueueChange("card", cardId, "update", updates);
  },

  /**
   * カード削除をキューに追加
   */
  async deleteCard(cardId: string): Promise<void> {
    await operationQueue.enqueueChange("card", cardId, "delete", {});
  },

  /**
   * キュー処理を即座に実行
   */
  async processQueue(): Promise<void> {
    await operationQueue.processQueue();
  },
};

/**
 * アプリケーション初期化時に呼び出す
 */
export async function initializeOperationQueue(): Promise<void> {
  // 初期化ロジック:
  // 1. サービスの初期化が必要ならここで行う (現状はコンストラクタで十分なら不要だが、キックオフとしてprocessを呼ぶ)
  // 2. クラッシュ等のリカバリ (Stale Recovery) を走らせるため、一度processQueueを呼ぶのが適切
  console.log("[Queue] Initializing OperationQueue integration...");

  // Stale items recovery is included in processQueue
  operationQueue.triggerProcess(); // 非同期でキック

  // オンライン復帰時の自動処理
  if (typeof window !== "undefined") {
    window.addEventListener("online", async () => {
      console.log("[Queue] Online detected, processing queue...");
      await operationQueue.processQueue();
    });
  }
}



