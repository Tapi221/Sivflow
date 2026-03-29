// Operation Queue とLocalDB の統合ユーティリティ
// 既存のカード操作フックに統合可能な形で提供

import { operationQueue } from "@/services/operationQueue";

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




