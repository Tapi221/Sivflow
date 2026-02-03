import { strictValidateBeforeSave } from '@/utils/imageValidation';
import type { UploadedImage } from '@/types';

/**
 * 永続化されたオフラインキュー
 */
class PersistentOfflineQueue {
  private readonly DB_NAME = 'offline_upload_queue';
  private readonly STORE_NAME = 'pending_uploads';
  private isProcessing = false;
  
  /**
   * キューに追加（IndexedDB に永続化）
   */
  async enqueue(image: UploadedImage, file: File): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    
    // File を ArrayBuffer に変換して保存
    const arrayBuffer = await file.arrayBuffer();
    
    await store.add({
      id: image.id,
      image,
      fileData: arrayBuffer,
      fileName: file.name,
      fileType: file.type,
      retryCount: 0,
      enqueuedAt: Date.now(),
    });
    
    console.log(`[PersistentQueue] Enqueued: ${file.name}`);
  }
  
  /**
   * キューを処理（アプリ起動時に自動実行）
   */
  async processQueue(
    uploadFn: (file: File, image: UploadedImage) => Promise<UploadedImage>
  ): Promise<void> {
    if (this.isProcessing) {
      console.log('[PersistentQueue] Already processing');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const items = await store.getAll();
      
      console.log(`[PersistentQueue] Processing ${items.length} items`);
      
      for (const item of items) {
        try {
          // ArrayBuffer から File を復元
          const file = new File([item.fileData], item.fileName, { type: item.fileType });
          
          // アップロード処理
          const updatedImage = await uploadFn(file, item.image);
          
          // バリデーション
          strictValidateBeforeSave(updatedImage);
          
          // DB 更新
          const { imageDB } = await import('@/services/ImageDatabaseWriter');
          await imageDB.saveToFirestore(updatedImage);
          
          // キューから削除
          await this.dequeue(item.id);
          
          console.log(`[PersistentQueue] Processed: ${item.fileName}`);
        } catch (error) {
          console.error(`[PersistentQueue] Failed: ${item.fileName}`, error);
          
          // リトライカウントを増やす
          await this.incrementRetryCount(item.id);
          
          // 最大3回までリトライ
          if (item.retryCount >= 3) {
            console.error(`[PersistentQueue] Max retries reached: ${item.fileName}`);
            await this.dequeue(item.id);
          }
        }
        
        // UI スレッド占有対策
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * キューの件数を取得
   */
  async getQueueCount(): Promise<number> {
    const db = await this.openDB();
    const tx = db.transaction(this.STORE_NAME, 'readonly');
    const store = tx.objectStore(this.STORE_NAME);
    const count = await store.count();
    return count;
  }
  
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }
  
  private async dequeue(id: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.STORE_NAME, 'readwrite');
    await tx.objectStore(this.STORE_NAME).delete(id);
  }
  
  private async incrementRetryCount(id: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    const item = await store.get(id);
    
    if (item) {
      item.retryCount = (item.retryCount || 0) + 1;
      await store.put(item);
    }
  }
}

/**
 * 永続化オフラインキューの統一インスタンス
 */
export const persistentQueue = new PersistentOfflineQueue();

// アプリ起動時に自動処理（uploadFn は外部から注入）
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('[PersistentQueue] App loaded, ready to process queue');
  });
  
  // ネットワーク復帰時にも処理
  window.addEventListener('online', () => {
    console.log('[PersistentQueue] Network online, ready to process queue');
  });
}
