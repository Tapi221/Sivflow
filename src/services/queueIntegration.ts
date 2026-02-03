// Operation Queue の既存システムへの統合ヘルパー
// LocalDB との連携を強化

import { OperationQueueService } from './operationQueue';
import { LocalDB, initializeDB, getLocalDb } from './localDB';
import type { Card, Folder } from '../types';

/**
 * Operation Queue 統合サービス
 * 既存のLocalDB操作をOperation Queueに橋渡し
 */
export class QueueIntegrationService {
  private userId: string;
  private localDB: LocalDB;

  constructor(userId: string) {
    this.userId = userId;
    initializeDB(userId);
    this.localDB = getLocalDb();
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    await OperationQueueService.initialize();
  }

  /**
   * カード作成（Queue統合版）
   */
  async createCard(cardData: Partial<Card>): Promise<Card> {
    // 1. ローカルDBに即座に反映（楽観的更新）
    const localCard = await this.localDB.addCard(cardData as Card);

    // 2. Operation Queueに追加（バックグラウンド同期）
    await OperationQueueService.enqueue('createCard', {
      ...cardData,
      localId: localCard.id, // ローカルIDを紐付け
    });

    return localCard;
  }

  /**
   * カード更新（Queue統合版）
   */
  async updateCard(cardId: string, updates: Partial<Card>): Promise<void> {
    // 1. ローカルDBに即座に反映
    await this.localDB.updateCard(cardId, updates);

    // 2. Operation Queueに追加
    await OperationQueueService.enqueue('updateCard', {
      cardId,
      ...updates,
    });
  }

  /**
   * カード削除（Queue統合版）
   */
  async deleteCard(cardId: string): Promise<void> {
    // 1. ローカルDBに即座に反映
    await this.localDB.deleteCard(cardId);

    // 2. Operation Queueに追加
    await OperationQueueService.enqueue('deleteCard', {
      cardId,
    });
  }

  /**
   * キュー処理実行
   * オンライン復帰時やバックグラウンドで定期的に呼び出す
   */
  async processQueue(): Promise<void> {
    await OperationQueueService.processQueue();
  }

  /**
   * ResyncRequired 発生時の処理
   * Operation Queue 側で自動的にハンドリングされる
   */
  async handleResyncRequired(): Promise<void> {
    // このメソッドは通常使用されない
    // OperationQueueService 内部で自動的に処理される
    console.warn('ResyncRequired detected in QueueIntegrationService');
  }
}

/**
 * グローバルインスタンス管理
 */
let queueIntegration: QueueIntegrationService | null = null;

export function getQueueIntegration(userId: string): QueueIntegrationService {
  if (!queueIntegration || queueIntegration['userId'] !== userId) {
    queueIntegration = new QueueIntegrationService(userId);
  }
  return queueIntegration;
}
