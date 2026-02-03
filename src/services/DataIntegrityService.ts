/**
 * DataIntegrityService
 * 
 * 設計原則：
 * - 起動時にデータ整合性をチェック
 * - 問題を検出のみ（自動修復は限定的）
 * - 修復より隔離を優先
 */

import { localDb } from './localDB';
import { normalizeCard, normalizeFolder } from '@/utils';

export interface IntegrityIssue {
  type: 'orphaned_card' | 'invalid_folder_ref' | 'missing_required_field' | 'invalid_value';
  severity: 'warning' | 'error';
  itemType: 'card' | 'folder';
  itemId: string;
  description: string;
  suggestion: string;
}

export interface IntegrityReport {
  checkedAt: string;
  totalCards: number;
  totalFolders: number;
  issues: IntegrityIssue[];
  isHealthy: boolean;
}

class DataIntegrityService {
  /**
   * 完全な整合性チェックを実行
   */
  async checkIntegrity(): Promise<IntegrityReport> {
    const issues: IntegrityIssue[] = [];
    
    try {
      const allCards = await localDb.getAllCards();
      const allFolders = await localDb.getAllFolders();
      
      const cards = allCards.map(normalizeCard);
      const folders = allFolders.map(normalizeFolder);
      
      const folderIds = new Set(folders.map(f => f.id));
      const nonDeletedFolderIds = new Set(
        folders.filter(f => !f.isDeleted).map(f => f.id)
      );

      // 1. カードの整合性チェック
      for (const card of cards) {
        // 削除済みカードはスキップ
        if (card.isDeleted) continue;

        // フォルダIDのチェック
        // null または '' は「未分類（トップレベル）」として完全に許容する
        const currentFid = card.folderId;
        const isUnclassified = currentFid === null || currentFid === '' || currentFid === undefined;
        
        if (currentFid === undefined) {
          issues.push({
            type: 'missing_required_field',
            severity: 'error',
            itemType: 'card',
            itemId: card.id,
            description: 'カードにフォルダIDプロパティがありません',
            suggestion: '整合性修復を実行してください'
          });
          continue;
        }

        // フォルダが存在しないカード（孤立カード）
        // 未分類でない場合、かつフォルダリストに存在しない場合はエラー
        if (!isUnclassified && !folderIds.has(currentFid)) {
          issues.push({
            type: 'orphaned_card',
            severity: 'error',
            itemType: 'card',
            itemId: card.id,
            description: `カードが参照するフォルダ ${currentFid} が存在しません`,
            suggestion: '整合性修復を実行して未分類に移動してください'
          });
          continue;
        }

        // フォルダは存在するが削除済み
        if (!nonDeletedFolderIds.has(card.folderId)) {
          issues.push({
            type: 'invalid_folder_ref',
            severity: 'warning',
            itemType: 'card',
            itemId: card.id,
            description: 'カードが参照するフォルダは削除済みです',
            suggestion: 'フォルダを復元するか、カードを削除してください'
          });
        }

        // 必須フィールドのチェック
        if (!card.questionText && (!card.questionImages || card.questionImages.length === 0)) {
          issues.push({
            type: 'missing_required_field',
            severity: 'warning',
            itemType: 'card',
            itemId: card.id,
            description: 'カードに問題文がありません',
            suggestion: 'カードを編集して問題文を追加してください'
          });
        }
      }

      // 2. フォルダの整合性チェック
      for (const folder of folders) {
        if (folder.isDeleted) continue;

        // 親フォルダが削除済みの場合
        if (folder.parentFolderId && !nonDeletedFolderIds.has(folder.parentFolderId)) {
          if (!folderIds.has(folder.parentFolderId)) {
            issues.push({
              type: 'orphaned_card',
              severity: 'warning',
              itemType: 'folder',
              itemId: folder.id,
              description: `フォルダが参照する親フォルダ ${folder.parentFolderId} が存在しません`,
              suggestion: 'フォルダ構造を確認してください'
            });
          }
        }

        // フォルダ名がない
        if (!folder.folderName && !(folder as any).folder_name) {
          issues.push({
            type: 'missing_required_field',
            severity: 'warning',
            itemType: 'folder',
            itemId: folder.id,
            description: 'フォルダに名前がありません',
            suggestion: 'フォルダ名を設定してください'
          });
        }
      }

      return {
        checkedAt: new Date().toISOString(),
        totalCards: cards.filter(c => !c.isDeleted).length,
        totalFolders: folders.filter(f => !f.isDeleted).length,
        issues,
        isHealthy: issues.filter(i => i.severity === 'error').length === 0
      };
    } catch (error) {
      console.error('Integrity check failed:', error);
      return {
        checkedAt: new Date().toISOString(),
        totalCards: 0,
        totalFolders: 0,
        issues: [{
          type: 'invalid_value',
          severity: 'error',
          itemType: 'card',
          itemId: 'system',
          description: `整合性チェックに失敗しました: ${error}`,
          suggestion: 'アプリを再起動してください'
        }],
        isHealthy: false
      };
    }
  }

  /**
   * 孤立カードをゴミ箱に移動（隔離）
   */
  async quarantineOrphanedCards(): Promise<number> {
    const report = await this.checkIntegrity();
    const orphanedCardIds = report.issues
      .filter(i => i.type === 'orphaned_card' && i.itemType === 'card')
      .map(i => i.itemId);

    let count = 0;
    for (const cardId of orphanedCardIds) {
      try {
        await localDb.softDelete('cards', cardId);
        count++;
      } catch (e) {
        console.error(`Failed to quarantine card ${cardId}:`, e);
      }
    }

    return count;
  }
}

export const dataIntegrityService = new DataIntegrityService();
export default dataIntegrityService;
