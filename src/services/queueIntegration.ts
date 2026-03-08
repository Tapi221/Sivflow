// Operation Queue の既存システムへの統合ヘルパー
// LocalDB との連携を強化

import { operationQueue } from "./operationQueue";
import { getLocalDb } from "./localDB";
import type { Card } from "@/types";

/**
 * Operation Queue 統合サービス
 * 既存のLocalDB操作をOperation Queueに橋渡し
 */
export class QueueIntegrationService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * カード作成（Queue統合版）
   */
  async createCard(cardData: Partial<Card>): Promise<Card> {
    const db = await getLocalDb(this.userId);
    // 1. ローカルDBに即座に反映（楽観的更新）
    // addItem returns the ID string
    const id = await db.addItem("cards", cardData as Card);
    const localCard = await db.cards.get(id);

    if (!localCard) {
      throw new Error("Failed to create local card");
    }

    // 2. Operation Queueに追加（バックグラウンド同期）
    await operationQueue.enqueueChange(
      "card",
      localCard.id,
      "create",
      localCard,
      "medium",
    );

    return localCard;
  }

  /**
   * カード更新（Queue統合版）
   */
  async updateCard(cardId: string, updates: Partial<Card>): Promise<void> {
    const db = await getLocalDb(this.userId);
    // 1. ローカルDBに即座に反映
    await db.updateItem("cards", cardId, updates);

    // 2. Operation Queueに追加
    const updated = await db.cards.get(cardId);
    if (updated) {
      await operationQueue.enqueueChange(
        "card",
        cardId,
        "update",
        updated,
        "medium",
      );
    }
  }

  /**
   * カード削除（Queue統合版）
   */
  async deleteCard(cardId: string): Promise<void> {
    const db = await getLocalDb(this.userId);
    // 1. ローカルDBに即座に反映
    await db.softDelete("cards", cardId);

    // 2. Operation Queueに追加
    await operationQueue.enqueueChange(
      "card",
      cardId,
      "delete",
      { id: cardId, isDeleted: true },
      "medium",
    );
  }

  /**
   * キュー処理実行
   * オンライン復帰時やバックグラウンドで定期的に呼び出す
   */
  async processQueue(): Promise<void> {
    await operationQueue.processQueue();
  }
}

/**
 * グローバルインスタンス管理
 */
let _instance: QueueIntegrationService | null = null;
let _currentUserId: string | null = null;

export function getQueueIntegration(userId: string): QueueIntegrationService {
  if (!_instance || _currentUserId !== userId) {
    _instance = new QueueIntegrationService(userId);
    _currentUserId = userId;
  }
  return _instance;
}



