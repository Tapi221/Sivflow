import { strictValidateBeforeSave } from '@/utils/imageValidation';
import type { UploadedImage } from '@/types';
import { getLocalDb, isBackingStoreOpenError } from '@/services/localDB';
import { warnOncePerSession } from '@/services/localDBRuntimeState';

interface QueueItem {
  id: string;
  image: UploadedImage;
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
  retryCount: number;
  enqueuedAt: number;
}

/**
 * 永続化されたオフラインキュー
 */
class PersistentOfflineQueue {
  private readonly PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  private readonly DB_NAME = 'offline_upload_queue';
  private readonly STORE_NAME = 'pending_uploads';
  private isProcessing = false;
  private idbUnavailable = false;
  private readonly memoryQueue = new Map<string, QueueItem>();

  private requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private isPdfQueueItem(item: QueueItem | { fileType: string; fileName: string }): boolean {
    return item.fileType === 'application/pdf'
      || (typeof item.fileName === 'string' && item.fileName.toLowerCase().endsWith('.pdf'));
  }

  private isPptxQueueItem(item: QueueItem | { fileType: string; fileName: string }): boolean {
    return item.fileType === this.PPTX_MIME
      || (typeof item.fileName === 'string' && item.fileName.toLowerCase().endsWith('.pptx'));
  }

  private isDocumentQueueItem(item: QueueItem | { fileType: string; fileName: string }): boolean {
    return this.isPdfQueueItem(item) || this.isPptxQueueItem(item);
  }

  private getDocumentKindLabel(item: QueueItem | { fileType: string; fileName: string }): 'PDF' | 'PPTX' | 'DOC' {
    if (this.isPdfQueueItem(item)) return 'PDF';
    if (this.isPptxQueueItem(item)) return 'PPTX';
    return 'DOC';
  }

  private isDocumentUploadReady(doc: any): boolean {
    if (!doc) return false;
    if (doc.uploadStatus === 'ready') return true;
    if (typeof doc.remoteUrl === 'string' && doc.remoteUrl.trim().length > 0) return true;
    if (typeof doc.downloadUrl === 'string' && doc.downloadUrl.trim().length > 0) return true;
    return false;
  }

  private async getQueueItem(id: string): Promise<QueueItem | null> {
    if (!id) return null;
    if (this.idbUnavailable) {
      return this.memoryQueue.get(id) ?? null;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const item = await this.requestToPromise(store.get(id));
      return (item as QueueItem | undefined) ?? null;
    } catch (error) {
      this.activateMemoryFallback(error);
      return this.memoryQueue.get(id) ?? null;
    }
  }
  
  /**
   * キューに追加（IndexedDB に永続化）
   */
  async enqueue(image: UploadedImage, file: File): Promise<void> {
    // File を ArrayBuffer に変換して保存（tx作成前に完了させる）
    const arrayBuffer = await file.arrayBuffer();

    const payload: QueueItem = {
      id: image.id,
      image,
      fileData: arrayBuffer,
      fileName: file.name,
      fileType: file.type,
      retryCount: 0,
      enqueuedAt: Date.now(),
    };

    const existing = await this.getQueueItem(payload.id);
    if (existing) {
      console.info('[PersistentQueue] Deduplicating enqueue by document id', {
        id: payload.id,
        previousFileName: existing.fileName,
        incomingFileName: payload.fileName,
      });
    }

    if (this.idbUnavailable) {
      this.memoryQueue.set(payload.id, payload);
      console.log(`[PersistentQueue] Enqueued in memory fallback: ${file.name}`);
      return;
    }

    try {
      const db = await this.openDB();
      // ✅ tx作成〜store.putまでの間に await を挟まない
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.put(payload);

        req.onerror = () => reject(req.error);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? req.error);
        tx.onabort = () => reject(tx.error ?? req.error ?? new Error('IDB tx aborted'));
      });
    } catch (error) {
      this.activateMemoryFallback(error);
      this.memoryQueue.set(payload.id, payload);
      console.log(`[PersistentQueue] Enqueued in memory fallback after IDB error: ${file.name}`);
      return;
    }

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
      const items = await this.getAllItems();
      
      console.log(`[PersistentQueue] Processing ${items.length} items`);
      
      for (const item of items) {
        try {
          if (this.isDocumentQueueItem(item)) {
            try {
              const localDb = await getLocalDb();
              const existingDoc = await localDb.documents.get(item.id);
              if (this.isDocumentUploadReady(existingDoc)) {
                console.info('[PersistentQueue] Skip queued document upload because item is already ready', {
                  docId: item.id,
                  fileName: item.fileName,
                  kind: this.getDocumentKindLabel(item),
                  uploadStatus: existingDoc?.uploadStatus ?? null,
                });
                await this.dequeue(item.id);
                continue;
              }
            } catch (guardErr) {
              console.warn('[PersistentQueue] readiness guard check failed; continuing upload attempt', guardErr);
            }
          }

          // ArrayBuffer から File を復元
          const file = new File([item.fileData], item.fileName, { type: item.fileType });
          
          // アップロード処理
          const updatedImage = await uploadFn(file, item.image);
          if (!updatedImage.remoteUrl) {
            throw new Error('[PersistentQueue] Upload finished without remoteUrl');
          }
          
          // バリデーション
          strictValidateBeforeSave(updatedImage);
          
          // DB 更新
          const { imageDB } = await import('@/services/ImageDatabaseWriter');
          const firestoreTarget = imageDB.resolveFirestoreTarget(updatedImage);
          if (imageDB.isFirestoreDiagnosticsEnabled()) {
            console.info('[PersistentQueue] Firestore image write attempt', {
              operation: 'setDoc',
              path: firestoreTarget.path,
              uid: firestoreTarget.uid,
              queueItemId: item.id,
              fileName: item.fileName,
            });
          }
          try {
            await imageDB.saveToFirestore(updatedImage);
          } catch (writeErr) {
            if (imageDB.isFirestoreDiagnosticsEnabled()) {
              console.error('[PersistentQueue] Firestore image write rejected', {
                operation: 'setDoc',
                path: firestoreTarget.path,
                uid: firestoreTarget.uid,
                queueItemId: item.id,
                fileName: item.fileName,
                error: writeErr,
              });
            } else {
              console.error('[PersistentQueue] Firestore image write rejected', {
                operation: 'setDoc',
                queueItemId: item.id,
                fileName: item.fileName,
                error: writeErr,
              });
            }
            throw writeErr;
          }

          // ドキュメント（PDF/PPTX）の場合は documents テーブルも更新（remoteUrl反映）
          const isDocumentItem = this.isDocumentQueueItem(item);
          if (isDocumentItem) {
            const localDb = await getLocalDb();
            const existingDoc = await localDb.documents.get(updatedImage.id);
            if (existingDoc) {
              await localDb.updateItem('documents', updatedImage.id, {
                remoteUrl: updatedImage.remoteUrl,
                downloadUrl: updatedImage.remoteUrl,
                storagePath: updatedImage.storagePath ?? existingDoc.storagePath ?? null,
                uploadStatus: 'ready',
                updatedAt: new Date(),
              });
              const refreshedDoc = await localDb.documents.get(updatedImage.id);
              console.info('[PersistentQueue] Document sync success with local source retained', {
                docId: updatedImage.id,
                kind: this.getDocumentKindLabel(item),
                localFileId: refreshedDoc?.localFileId ?? null,
                blobUrl: (refreshedDoc as any)?.blobUrl ?? refreshedDoc?.localUrl ?? null,
                remoteUrl: refreshedDoc?.remoteUrl ?? null,
                uploadStatus: refreshedDoc?.uploadStatus ?? null,
              });
            }
          }
          
          // キューから削除
          await this.dequeue(item.id);
          
          console.log(`[PersistentQueue] Processed: ${item.fileName}`);
        } catch (error) {
          console.error(`[PersistentQueue] Failed: ${item.fileName}`, error);
          
          // リトライカウントを増やす
          await this.incrementRetryCount(item.id);
          
          // 最大3回までリトライ
          if ((item.retryCount ?? 0) + 1 >= 3) {
            console.error(`[PersistentQueue] Max retries reached: ${item.fileName}`);
            const isDocumentItem = this.isDocumentQueueItem(item);
            if (isDocumentItem) {
              try {
                const localDb = await getLocalDb();
                const existingDoc = await localDb.documents.get(item.id);
                if (existingDoc) {
                  if (this.isDocumentUploadReady(existingDoc)) {
                    console.info('[PersistentQueue] Skip failed-mark because document is already ready', {
                      docId: item.id,
                      kind: this.getDocumentKindLabel(item),
                      uploadStatus: existingDoc.uploadStatus ?? null,
                    });
                    await this.dequeue(item.id);
                    continue;
                  }
                  await localDb.updateItem('documents', item.id, {
                    uploadStatus: 'failed',
                    updatedAt: new Date(),
                  });
                  const failedDoc = await localDb.documents.get(item.id);
                  console.error('[PersistentQueue] Document sync failed after retries; local source kept', {
                    docId: item.id,
                    kind: this.getDocumentKindLabel(item),
                    localFileId: failedDoc?.localFileId ?? null,
                    blobUrl: (failedDoc as any)?.blobUrl ?? failedDoc?.localUrl ?? null,
                    remoteUrl: failedDoc?.remoteUrl ?? null,
                    uploadStatus: failedDoc?.uploadStatus ?? null,
                  });
                }
              } catch (docErr) {
                console.warn('[PersistentQueue] Failed to mark document upload as failed', docErr);
              }
            }
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
    if (this.idbUnavailable) {
      return this.memoryQueue.size;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      return await this.requestToPromise(store.count());
    } catch (error) {
      this.activateMemoryFallback(error);
      return this.memoryQueue.size;
    }
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

  private activateMemoryFallback(error: unknown): void {
    if (this.idbUnavailable) return;
    this.idbUnavailable = true;

    const reason = isBackingStoreOpenError(error)
      ? '[PersistentQueue] IndexedDB backing store error detected. Switched to in-memory queue for this session (cleared on reload).'
      : '[PersistentQueue] IndexedDB unavailable. Switched to in-memory queue for this session (cleared on reload).';

    warnOncePerSession('persistent-queue:idb-fallback', reason, error);
  }

  private async getAllItems(): Promise<QueueItem[]> {
    if (this.idbUnavailable) {
      return Array.from(this.memoryQueue.values());
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const items = await this.requestToPromise(store.getAll());
      return items as QueueItem[];
    } catch (error) {
      this.activateMemoryFallback(error);
      return Array.from(this.memoryQueue.values());
    }
  }
  
  private async dequeue(id: string): Promise<void> {
    if (this.idbUnavailable) {
      this.memoryQueue.delete(id);
      return;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      await this.requestToPromise(store.delete(id));
    } catch (error) {
      this.activateMemoryFallback(error);
      this.memoryQueue.delete(id);
    }
  }
  
  private async incrementRetryCount(id: string): Promise<void> {
    if (this.idbUnavailable) {
      const item = this.memoryQueue.get(id);
      if (item) {
        item.retryCount = (item.retryCount || 0) + 1;
        this.memoryQueue.set(id, item);
      }
      return;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const item = await this.requestToPromise(store.get(id));
      
      if (item) {
        item.retryCount = (item.retryCount || 0) + 1;
        await this.requestToPromise(store.put(item));
      }
    } catch (error) {
      this.activateMemoryFallback(error);
      const item = this.memoryQueue.get(id);
      if (item) {
        item.retryCount = (item.retryCount || 0) + 1;
        this.memoryQueue.set(id, item);
      }
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
