type BlobScopeOptions = {
  userId?: string | null;
};
type StoredImageFile = {
  id: string;
  blob: Blob;
  updatedAt: number;
};
type PutImageBlobOptions = {
  userId: string;
  assetId: string;
};
type ImageBlobRecord = {
  localBlobId: string;
  size: number;
  mime: string;
};



const DB_NAME = "image_file_store";
const STORE_NAME = "image_files";
const DB_VERSION = 1;
let dbPromise: Promise<IDBDatabase> | null = null;



const makeScopedId = (id: string, options?: BlobScopeOptions): string => {
  const userId = options?.userId?.trim();
  if (!userId) return id;
  return `${userId}:${id}`;
};
const openImageFileDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("画像ファイルストアを開けませんでした"));
    };
  });
  return dbPromise;
};
const getStoredImageFile = async (
  id: string,
): Promise<StoredImageFile | null> => {
  const db = await openImageFileDb();
  return new Promise<StoredImageFile | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      const result = request.result as StoredImageFile | undefined;
      resolve(result ?? null);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("画像 blob の読み込みに失敗しました"));
  });
};
const putScopedImageBlob = async (id: string, blob: Blob): Promise<void> => {
  const db = await openImageFileDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const payload: StoredImageFile = { id, blob, updatedAt: Date.now() };
    store.put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("画像 blob の保存に失敗しました"));
    tx.onabort = () => reject(tx.error ?? new Error("画像 blob の保存が中断されました"));
  });
};
const putImageBlob = async (blob: Blob, options: PutImageBlobOptions): Promise<ImageBlobRecord> => {
  const localBlobId = options.assetId;
  await putScopedImageBlob(makeScopedId(localBlobId, options), blob);
  return {
    localBlobId,
    size: blob.size,
    mime: blob.type ?? "application/octet-stream",
  };
};
const deleteImageBlob = async (id: string, options?: BlobScopeOptions): Promise<void> => {
  const db = await openImageFileDb();
  const scopedId = makeScopedId(id, options);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(scopedId);
    if (scopedId !== id) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("画像 blob の削除に失敗しました"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("画像 blob の削除が中断されました"));
  });
};
const getImageBlob = async (id: string, options?: BlobScopeOptions): Promise<Blob | null> => {
  const scopedId = makeScopedId(id, options);
  const scoped = await getStoredImageFile(scopedId);
  if (scoped?.blob) return scoped.blob;

  const legacy = await getStoredImageFile(id);
  if (!legacy?.blob) return null;

  if (scopedId !== id) {
    await putScopedImageBlob(scopedId, legacy.blob);
    await deleteImageBlob(id);
  }
  return legacy.blob;
};
const deleteImageBlobsByUser = async (userId: string): Promise<void> => {
  const prefix = `${userId.trim()}:`;
  if (!userId.trim()) return;
  const db = await openImageFileDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const key = String(cursor.key ?? "");
      if (key.startsWith(prefix)) {
        cursor.delete();
      }
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("user に紐づく画像 blob の削除に失敗しました"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("画像 blob の cleanup が中断されました"));
    request.onerror = () =>
      reject(request.error ?? new Error("画像 blob の走査に失敗しました"));
  });
};



export { putImageBlob, getImageBlob, deleteImageBlob, deleteImageBlobsByUser };


export type { PutImageBlobOptions, ImageBlobRecord };
