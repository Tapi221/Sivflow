const DB_NAME = "document_file_store";
const STORE_NAME = "document_files";
const DB_VERSION = 1;

type BlobScopeOptions = {
  userId?: string | null;
};

type StoredDocumentFile = {
  id: string;
  blob: Blob;
  updatedAt: number;
};

const makeScopedId = (id: string, options?: BlobScopeOptions): string => {
  const userId = options?.userId?.trim();
  if (!userId) return id;
  return `${userId}:${id}`;
};

const openDocumentFileDb = async (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open document file store"));
  });

export const saveDocumentBlob = async (
  id: string,
  blob: Blob,
  options?: BlobScopeOptions,
): Promise<void> => {
  const db = await openDocumentFileDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const payload: StoredDocumentFile = {
      id: makeScopedId(id, options),
      blob,
      updatedAt: Date.now(),
    };
    store.put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to save document blob"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("Document blob save aborted"));
  });
};

const getStoredDocumentFile = async (
  id: string,
): Promise<StoredDocumentFile | null> => {
  const db = await openDocumentFileDb();
  return new Promise<StoredDocumentFile | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      const result = request.result as StoredDocumentFile | undefined;
      resolve(result ?? null);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read document blob"));
  });
};

export const getDocumentBlob = async (
  id: string,
  options?: BlobScopeOptions,
): Promise<Blob | null> => {
  const scopedId = makeScopedId(id, options);
  const scoped = await getStoredDocumentFile(scopedId);
  if (scoped?.blob) return scoped.blob;

  // Backward compatibility for legacy records saved without user scope.
  const legacy = await getStoredDocumentFile(id);
  if (!legacy?.blob) return null;

  if (scopedId !== id) {
    // Migrate legacy key -> scoped key lazily when possible.
    await saveDocumentBlob(id, legacy.blob, options);
    await deleteDocumentBlob(id);
  }
  return legacy.blob;
};

export const deleteDocumentBlob = async (
  id: string,
  options?: BlobScopeOptions,
): Promise<void> => {
  const db = await openDocumentFileDb();
  const scopedId = makeScopedId(id, options);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(scopedId);
    if (scopedId !== id) {
      // Also try removing legacy unscoped key.
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to delete document blob"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("Document blob delete aborted"));
  });
};

export const deleteDocumentBlobsByUser = async (
  userId: string,
): Promise<void> => {
  if (!userId) return;
  const db = await openDocumentFileDb();
  const prefix = `${userId}:`;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const key = String(cursor.primaryKey ?? "");
      if (key.startsWith(prefix)) {
        cursor.delete();
      }
      cursor.continue();
    };

    request.onerror = () =>
      reject(request.error ?? new Error("Failed to iterate document blobs"));
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to delete user document blobs"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("Delete user document blobs aborted"));
  });
};




