import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import { isBackingStoreOpenError } from "@/infrastructure/localdb/errors";
import { warnOncePerSession } from "@/services/localDBRuntimeState";



class IndexedDbPersistentOfflineQueueStore {
  private readonly dbName: string;
  private readonly storeName: string;
  private idbUnavailable = false;
  private readonly memoryQueue = new Map<string, QueueItem>();

  constructor(options?: { dbName?: string; storeName?: string; }) {
    this.dbName = options?.dbName ?? "offline_upload_queue";
    this.storeName = options?.storeName ?? "pending_uploads";
  }

  isMemoryFallbackActive = (): boolean => this.idbUnavailable;

  getQueueItem = async (id: string): Promise<QueueItem | null> => {
    if (!id) return null;
    if (this.idbUnavailable) {
      return this.memoryQueue.get(id) ?? null;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const item = await this.requestToPromise(store.get(id));
      return (item as QueueItem | undefined) ?? null;
    } catch (error) {
      this.activateMemoryFallback(error);
      return this.memoryQueue.get(id) ?? null;
    }
  };

  enqueue = async (item: QueueItem): Promise<void> => {
    if (this.idbUnavailable) {
      this.memoryQueue.set(item.id, item);
      return;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const req = store.put(item);

      await this.requestToPromise(req);
    } catch (error) {
      this.activateMemoryFallback(error);
      this.memoryQueue.set(item.id, item);
    }
  };

  getAllItems = async (): Promise<QueueItem[]> => {
    if (this.idbUnavailable) {
      return Array.from(this.memoryQueue.values());
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const items = await this.requestToPromise(store.getAll());
      return items as QueueItem[];
    } catch (error) {
      this.activateMemoryFallback(error);
      return Array.from(this.memoryQueue.values());
    }
  };

  dequeue = async (id: string): Promise<void> => {
    if (this.idbUnavailable) {
      this.memoryQueue.delete(id);
      return;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      await this.requestToPromise(store.delete(id));
    } catch (error) {
      this.activateMemoryFallback(error);
      this.memoryQueue.delete(id);
    }
  };

  incrementRetryCount = async (id: string): Promise<void> => {
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
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
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
  };

  getQueueCount = async (): Promise<number> => {
    if (this.idbUnavailable) {
      return this.memoryQueue.size;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      return await this.requestToPromise(store.count());
    } catch (error) {
      this.activateMemoryFallback(error);
      return this.memoryQueue.size;
    }
  };

  private requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  private openDB = async (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
    });

  private activateMemoryFallback = (error: unknown): void => {
    if (this.idbUnavailable) return;

    this.idbUnavailable = true;

    const reason = isBackingStoreOpenError(error)
      ? "[PersistentQueue] IndexedDB backing store error detected. Switched to in-memory queue for this session (cleared on reload)."
      : "[PersistentQueue] IndexedDB unavailable. Switched to in-memory queue for this session (cleared on reload).";

    warnOncePerSession("persistent-queue:idb-fallback", reason, error);
  };
}



export { IndexedDbPersistentOfflineQueueStore };
