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

export const listPdfOcrPageRecords = async ({
  docId,
  documentKey,
}: {
  docId: string;
  documentKey: string;
}) => {
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
        .filter((record): record is PdfOcrPageRecord => {
          return (
            typeof record === "object" &&
            record !== null &&
            (record as PdfOcrPageRecord).documentKey === documentKey
          );
        })
        .sort((left, right) => left.pageNumber - right.pageNumber);

      resolve(records);
      db.close();
    };
  });
};

export const deleteStalePdfOcrRecords = async ({
  docId,
  keepDocumentKey,
}: {
  docId: string;
  keepDocumentKey: string;
}) => {
  const db = await openOcrDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(OCR_STORE_NAME, "readwrite");
    const store = transaction.objectStore(OCR_STORE_NAME);
    const index = store.index(OCR_BY_DOC_ID_INDEX);
    const request = index.getAll(docId);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to read stale OCR records"));
    };

    transaction.onerror = () => {
      reject(transaction.error ?? new Error("Failed to delete stale OCR records"));
    };

    request.onsuccess = () => {
      const records = request.result ?? [];

      records.forEach((record) => {
        const candidate = record as Partial<PdfOcrPageRecord>;
        if (
          typeof candidate.id !== "string" ||
          candidate.documentKey === keepDocumentKey
        ) {
          return;
        }

        store.delete(candidate.id);
      });
    };

    transaction.oncomplete = () => {
      resolve();
      db.close();
    };
  });
};
