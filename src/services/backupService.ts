import type { Folder, Card, User, UserSettings, UserStats } from '../types';
import { firestoreDb } from './firebase';
import { collection, writeBatch, doc, setDoc } from 'firebase/firestore';

/**
 * 手動バックアップサービス
 * クラウド同期がオフに設定されたフォルダを含む、すべてのデータをFirestoreにバックアップします。
 * 用途：端末故障、紛失、機種変更前などのリスク軽減
 */
export class BackupService {
  private userId: string;

  constructor(userId: string) {
    if (!userId) {
      throw new Error('BackupService requires a user ID.');
    }
    this.userId = userId;
  }

  /**
   * ローカルDBのすべてのデータをFirestoreにバックアップします。
   * @returns バックアップが成功したかどうか、およびバックアップしたアイテム数
   */

  async backupAllData(
    folders: Folder[],
    cards: Card[],
    userSettings: UserSettings,
    userStats: UserStats
  ): Promise<{ success: boolean; itemCount: number; error?: string }> {
    try {
      if (!firestoreDb) {
        throw new Error('Firestore is not initialized.');
      }

      // Firestore batch 制限対策
      // - 500 ops / 10MiB を超えると commit が死ぬので、余裕を持ってチャンクする
      const MAX_OPS = 450;
      const MAX_BYTES = Math.floor(7.5 * 1024 * 1024);
      const encoder = new TextEncoder();

      const estimateBytes = (value: unknown): number => {
        try {
          return encoder.encode(JSON.stringify(value)).length;
        } catch {
          return 1024 * 1024;
        }
      };

      let batch = writeBatch(firestoreDb);
      let ops = 0;
      let bytes = 0;
      let itemCount = 0;

      const commit = async (): Promise<void> => {
        if (ops === 0) return;
        await batch.commit();
        batch = writeBatch(firestoreDb);
        ops = 0;
        bytes = 0;
      };

      const addSet = async (ref: unknown, data: unknown): Promise<void> => {
        const payloadBytes = estimateBytes(data) + 512;
        const wouldExceed = ops > 0 && (ops + 1 > MAX_OPS || bytes + payloadBytes > MAX_BYTES);
        if (wouldExceed) {
          await commit();
        }
        batch.set(ref, data);
        ops += 1;
        bytes += payloadBytes;
        itemCount += 1;
      };

      const now = new Date();

      // フォルダをバックアップ（cloud_sync_enabledの状態に関わらずバックアップ）
      for (const folder of folders) {
        const folderRef = doc(firestoreDb, `users/${this.userId}/folders/${folder.id}`);
        await addSet(folderRef, {
          ...folder,
          // バックアップ時のメタデータを追加
          backupAt: now,
          source: 'manual_backup',
        });
      }

      // カードをバックアップ
      for (const card of cards) {
        const cardRef = doc(firestoreDb, `users/${this.userId}/cards/${card.id}`);
        await addSet(cardRef, {
          ...card,
          backupAt: now,
          source: 'manual_backup',
        });
      }

      // ユーザー設定をバックアップ
      {
        const userSettingsRef = doc(firestoreDb, `users/${this.userId}/userSettings/settings`);
        await addSet(userSettingsRef, {
          ...userSettings,
          backupAt: now,
          source: 'manual_backup',
        });
      }

      // ユーザー統計をバックアップ
      {
        const userStatsRef = doc(firestoreDb, `users/${this.userId}/userStats/stats`);
        await addSet(userStatsRef, {
          ...userStats,
          backupAt: now,
          source: 'manual_backup',
        });
      }

      // 残りを commit
      await commit();

      console.log(`[Backup] Successfully backed up ${itemCount} items.`);
      return {
        success: true,
        itemCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Backup] Error during backup:', error);
      return {
        success: false,
        itemCount: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * 最終バックアップ時刻を取得
   * @returns 最後にバックアップが成功した時刻、またはnull
   */
  async getLastBackupTime(): Promise<Date | null> {
    try {
      // ローカルストレージから取得（簡易実装）
      const lastBackupTime = localStorage.getItem(`${this.userId}_lastBackupTime`);
      return lastBackupTime ? new Date(lastBackupTime) : null;
    } catch (error) {
      console.error('[Backup] Error retrieving last backup time:', error);
      return null;
    }
  }

  /**
   * バックアップ完了時刻を記録
   */
  async recordBackupTime(): Promise<void> {
    try {
      localStorage.setItem(`${this.userId}_lastBackupTime`, new Date().toISOString());
    } catch (error) {
      console.error('[Backup] Error recording backup time:', error);
    }
  }
}

/**
 * バックアップサービスのシングルトンインスタンス
 */
let backupServiceInstance: BackupService | null = null;

export function initializeBackupService(userId: string): BackupService {
  if (!backupServiceInstance || backupServiceInstance['userId'] !== userId) {
    backupServiceInstance = new BackupService(userId);
  }
  return backupServiceInstance;
}

export function getBackupService(): BackupService {
  if (!backupServiceInstance) {
    throw new Error('BackupService is not initialized. Call initializeBackupService first.');
  }
  return backupServiceInstance;
}