/**
 * AutoBackupService
 * 
 * 設計原則：
 * - 1日1回自動バックアップ
 * - 最大7世代保持（世代ローテーション）
 * - 容量制限で自然消滅
 */

import { snapshotService } from './SnapshotService';
import type { AppSnapshot } from '@/types/snapshot';

const BACKUP_STORAGE_KEY = 'flashcard_auto_backups';
const LAST_BACKUP_KEY = 'flashcard_last_backup_date';
const MAX_BACKUPS = 7;
const MIN_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24時間

export interface BackupMetadata {
  id: string;
  createdAt: string;
  generationCounter: number;
  cardCount: number;
  folderCount: number;
  sizeBytes: number;
}

class AutoBackupService {
  /**
   * 自動バックアップが必要かチェック
   */
  shouldBackup(): boolean {
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    if (!lastBackup) return true;
    
    const lastBackupTime = new Date(lastBackup).getTime();
    const now = Date.now();
    
    return (now - lastBackupTime) >= MIN_BACKUP_INTERVAL_MS;
  }

  /**
   * 自動バックアップを実行
   */
  async performAutoBackup(userId: string): Promise<boolean> {
    if (!this.shouldBackup()) {
      console.log('AutoBackup: Skipped (last backup is recent)');
      return false;
    }

    try {
      console.log('AutoBackup: Starting...');
      const snapshot = await snapshotService.createSnapshot(userId);
      
      // 既存バックアップを取得
      const backups = this.getStoredBackups();
      
      // 新しいバックアップを追加
      const backupData = {
        snapshot,
        metadata: {
          id: `backup_${Date.now()}`,
          createdAt: new Date().toISOString(),
          generationCounter: snapshot.metadata.generationCounter,
          cardCount: snapshot.data.cards.length,
          folderCount: snapshot.data.folders.length,
          sizeBytes: 0 // 後で計算
        }
      };
      
      const json = JSON.stringify(backupData);
      backupData.metadata.sizeBytes = new Blob([json]).size;
      
      backups.unshift(backupData);
      
      // 古いバックアップを削除（世代ローテーション）
      while (backups.length > MAX_BACKUPS) {
        backups.pop();
      }
      
      // 保存
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
      
      console.log('AutoBackup: Completed successfully');
      return true;
    } catch (error) {
      console.error('AutoBackup: Failed', error);
      return false;
    }
  }

  /**
   * 保存済みバックアップ一覧を取得
   */
  getStoredBackups(): Array<{ snapshot: AppSnapshot; metadata: BackupMetadata }> {
    try {
      const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * バックアップメタデータ一覧を取得
   */
  getBackupList(): BackupMetadata[] {
    return this.getStoredBackups().map(b => b.metadata);
  }

  /**
   * 特定のバックアップを取得
   */
  getBackup(backupId: string): { snapshot: AppSnapshot; metadata: BackupMetadata } | null {
    const backups = this.getStoredBackups();
    return backups.find(b => b.metadata.id === backupId) || null;
  }

  /**
   * バックアップからスナップショットをエクスポート
   */
  exportBackup(backupId: string): void {
    const backup = this.getBackup(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    const date = new Date(backup.metadata.createdAt).toISOString().split('T')[0];
    const filename = `flashcard_backup_${date}_gen${backup.metadata.generationCounter}.json`;
    
    const json = JSON.stringify(backup.snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * バックアップを削除
   */
  deleteBackup(backupId: string): void {
    const backups = this.getStoredBackups().filter(b => b.metadata.id !== backupId);
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
  }

  /**
   * 全バックアップを削除
   */
  clearAllBackups(): void {
    localStorage.removeItem(BACKUP_STORAGE_KEY);
    localStorage.removeItem(LAST_BACKUP_KEY);
  }
}

export const autoBackupService = new AutoBackupService();
export default autoBackupService;
