export interface PdfOcrPageRecord {
  id: string;
  docId: string;
  documentKey: string;
  pageNumber: number;
  text: string;
  updatedAt: number;
}

const OCR_DB_NAME = "flashcard-master-pdf-ocr";
const OCR_DB_VERSION = 1;
const OCR_STORE_NAME = "ocrPages";
const OCR_BY_DOC_ID_INDEX = "byDocId";

const openOcrDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(OCR_DB_NAME, OCR_DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open OCR IndexedDB"));
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(OCR_STORE_NAME)
        ? request.transaction?.objectStore(OCR_STORE_NAME)
        : db.createObjectStore(OCR_STORE_NAME, { keyPath: "id" });

      if (!store) {
        return;
      }

      if (!store.indexNames.contains(OCR_BY_DOC_ID_INDEX)) {
        store.createIndex(OCR_BY_DOC_ID_INDEX, "docId", { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
};

const runOcrTransaction = async <T>({
  mode,
  action,
}: {
  mode: IDBTransactionMode;
  action: (store: IDBObjectStore) => IDBRequest<T>;
}): Promise<T> => {
  const db = await openOcrDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OCR_STORE_NAME, mode);
    const store = transaction.objectStore(OCR_STORE_NAME);
    const request = action(store);

    request.onerror = () => {
      reject(request.error ?? new Error("OCR IndexedDB request failed"));
    };

    transaction.onerror = () => {
      reject(transaction.error ?? new Error("OCR IndexedDB transaction failed"));
    };

    transaction.oncomplete = () => {
      resolve(request.result);
      db.close();
    };
  });
};

const runOcrWriteTransaction = async ({
  action,
}: {
  action: (store: IDBObjectStore) => void;
}): Promise<void> => {
  const db = await openOcrDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OCR_STORE_NAME, "readwrite");
    const store = transaction.objectStore(OCR_STORE_NAME);

    transaction.onerror = () => {
      reject(transaction.error ?? new Error("OCR IndexedDB transaction failed"));
    };

    transaction.oncomplete = () => {
      resolve();
      db.close();
    };

    try {
      action(store);
    } catch (errorValue) {
      reject(
        errorValue instanceof Error
          ? errorValue
          : new Error("OCR IndexedDB write failed"),
      );
      db.close();
    }
  });
};

const isPdfOcrPageRecord = (value: unknown): value is PdfOcrPageRecord => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PdfOcrPageRecord>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.docId === "string" &&
    typeof candidate.documentKey === "string" &&
    typeof candidate.pageNumber === "number" &&
    Number.isFinite(candidate.pageNumber) &&
    typeof candidate.text === "string" &&
    typeof candidate.updatedAt === "number" &&
    Number.isFinite(candidate.updatedAt)
  );
};

const listPdfOcrRecordsForDocId = async (docId: string) => {
  const db = await openOcrDb();

  return new Promise<PdfOcrPageRecord[]>((resolve, reject) => {
    const transaction = db.transaction(OCR_STORE_NAME, "readonly");
    const store = transaction.objectStore(OCR_STORE_NAME);
    const index = store.index(OCR_BY_DOC_ID_INDEX);
    const request = index.getAll(docId);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list OCR records"));
    };

    transaction.onerror = () => {
      reject(transaction.error ?? new Error("Failed to list OCR records"));
    };

    transaction.oncomplete = () => {
      const records = (request.result ?? [])
        .filter(isPdfOcrPageRecord)
        .sort((left, right) => left.pageNumber - right.pageNumber);

      resolve(records);
      db.close();
    };
  });
};

const deletePdfOcrRecordIds = async (ids: string[]) => {
  if (ids.length === 0) {
    return;
  }

  await runOcrWriteTransaction({
    action: (store) => {
      ids.forEach((id) => {
        store.delete(id);
      });
    },
  });
};

export const buildPdfOcrRecordId = ({
  docId,
  documentKey,
  pageNumber,
}: {
  docId: string;
  documentKey: string;
  pageNumber: number;
}) => {
  return `${docId}::${documentKey}::${pageNumber}`;
};

export const getPdfOcrPageRecord = async ({
  docId,
  documentKey,
  pageNumber,
}: {
  docId: string;
  documentKey: string;
  pageNumber: number;
}) => {
  const id = buildPdfOcrRecordId({
    docId,
    documentKey,
    pageNumber,
  });

  return runOcrTransaction<PdfOcrPageRecord | undefined>({
    mode: "readonly",
    action: (store) => store.get(id),
  });
};

export const putPdfOcrPageRecord = async ({
  docId,
  documentKey,
  pageNumber,
  text,
}: {
  docId: string;
  documentKey: string;
  pageNumber: number;
  text: string;
}) => {
  const record: PdfOcrPageRecord = {
    id: buildPdfOcrRecordId({ docId, documentKey, pageNumber }),
    docId,
    documentKey,
    pageNumber,
    text,
    updatedAt: Date.now(),
  };

  await runOcrTransaction<IDBValidKey>({
    mode: "readwrite",
    action: (store) => store.put(record),
  });

  return record;
};

export const deletePdfOcrPageRecord = async ({
  docId,
  documentKey,
  pageNumber,
}: {
  docId: string;
  documentKey: string;
  pageNumber: number;
}) => {
  const id = buildPdfOcrRecordId({ docId, documentKey, pageNumber });

  await deletePdfOcrRecordIds([id]);
};

export const listPdfOcrPageRecords = async ({
  docId,
  documentKey,
}: {
  docId: string;
  documentKey: string;
}) => {
  const records = await listPdfOcrRecordsForDocId(docId);

  return records.filter((record) => record.documentKey === documentKey);
};

export const clearPdfOcrRecords = async ({
  docId,
  documentKey,
}: {
  docId: string;
  documentKey: string;
}) => {
  const records = await listPdfOcrPageRecords({ docId, documentKey });

  await deletePdfOcrRecordIds(records.map((record) => record.id));
};

export const trimPdfOcrRecordsForDoc = async ({
  docId,
  keepDocumentKey,
  maxDocumentKeys = 3,
}: {
  docId: string;
  keepDocumentKey: string;
  maxDocumentKeys?: number;
}) => {
  const normalizedKeepDocumentKey = keepDocumentKey.trim();
  if (normalizedKeepDocumentKey.length === 0) {
    return;
  }

  const records = await listPdfOcrRecordsForDocId(docId);
  if (records.length === 0) {
    return;
  }

  const safeMaxDocumentKeys = Math.max(1, Math.trunc(maxDocumentKeys));
  const documentKeyActivity = new Map<string, number>();

  records.forEach((record) => {
    const currentUpdatedAt = documentKeyActivity.get(record.documentKey) ?? 0;
    if (record.updatedAt > currentUpdatedAt) {
      documentKeyActivity.set(record.documentKey, record.updatedAt);
    }
  });

  const orderedDocumentKeys = Array.from(documentKeyActivity.entries())
    .sort(([leftKey, leftUpdatedAt], [rightKey, rightUpdatedAt]) => {
      if (leftKey === normalizedKeepDocumentKey) {
        return -1;
      }

      if (rightKey === normalizedKeepDocumentKey) {
        return 1;
      }

      return rightUpdatedAt - leftUpdatedAt;
    })
    .map(([documentKey]) => documentKey);

  const retainedDocumentKeys = new Set(
    orderedDocumentKeys.slice(0, safeMaxDocumentKeys),
  );
  retainedDocumentKeys.add(normalizedKeepDocumentKey);

  await deletePdfOcrRecordIds(
    records
      .filter((record) => !retainedDocumentKeys.has(record.documentKey))
      .map((record) => record.id),
  );
};
