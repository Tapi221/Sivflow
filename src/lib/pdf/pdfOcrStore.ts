import {
  buildPdfTextSelection,
  normalizePdfExtractedText,
  splitPdfTextIntoLines,
  type PdfOcrLineRecord,
  type PdfOcrRecordStatus,
  type PdfOcrTextSource,
} from "@/lib/pdf/pdfTextExtraction";
import type { PdfOcrPreprocessMode } from "@/lib/pdf/renderPdfPageForOcr";

export interface PdfOcrAttemptRecord {
  attemptIndex: number;
  languageHint: string;
  renderMode: PdfOcrPreprocessMode;
  renderScale: number;
  qualityScore: number;
  text: string;
}

export interface PdfOcrPageRecord {
  id: string;
  docId: string;
  documentKey: string;
  pageNumber: number;
  text: string;
  finalText: string;
  nativeText: string;
  ocrText: string;
  source: PdfOcrTextSource;
  status: PdfOcrRecordStatus;
  qualityScore: number;
  nativeQualityScore: number;
  ocrQualityScore: number;
  charCount: number;
  lineCount: number;
  lines: PdfOcrLineRecord[];
  languageHint: string;
  attempts: PdfOcrAttemptRecord[];
  processingMs: number;
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

const isPdfOcrLineRecord = (value: unknown): value is PdfOcrLineRecord => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PdfOcrLineRecord>;
  return (
    typeof candidate.order === "number" &&
    Number.isFinite(candidate.order) &&
    typeof candidate.text === "string" &&
    (candidate.origin === "native" ||
      candidate.origin === "ocr" ||
      candidate.origin === "hybrid")
  );
};

const isPdfOcrAttemptRecord = (value: unknown): value is PdfOcrAttemptRecord => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PdfOcrAttemptRecord>;
  return (
    typeof candidate.attemptIndex === "number" &&
    Number.isFinite(candidate.attemptIndex) &&
    typeof candidate.languageHint === "string" &&
    (candidate.renderMode === "none" ||
      candidate.renderMode === "grayscale" ||
      candidate.renderMode === "binary") &&
    typeof candidate.renderScale === "number" &&
    Number.isFinite(candidate.renderScale) &&
    typeof candidate.qualityScore === "number" &&
    Number.isFinite(candidate.qualityScore) &&
    typeof candidate.text === "string"
  );
};

const normalizeStoredPdfOcrPageRecord = (
  value: unknown,
): PdfOcrPageRecord | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<PdfOcrPageRecord> & { text?: unknown };
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.docId !== "string" ||
    typeof candidate.documentKey !== "string" ||
    typeof candidate.pageNumber !== "number" ||
    !Number.isFinite(candidate.pageNumber) ||
    typeof candidate.updatedAt !== "number" ||
    !Number.isFinite(candidate.updatedAt)
  ) {
    return null;
  }

  const legacyText = typeof candidate.text === "string" ? candidate.text : "";
  const finalText = normalizePdfExtractedText(
    typeof candidate.finalText === "string" ? candidate.finalText : legacyText,
  );
  const nativeText = normalizePdfExtractedText(
    typeof candidate.nativeText === "string" ? candidate.nativeText : finalText,
  );
  const ocrText = normalizePdfExtractedText(
    typeof candidate.ocrText === "string" ? candidate.ocrText : finalText,
  );
  const normalizedSource: PdfOcrTextSource =
    candidate.source === "native" ||
    candidate.source === "ocr" ||
    candidate.source === "hybrid"
      ? candidate.source
      : "native";
  const lines = Array.isArray(candidate.lines)
    ? candidate.lines.filter(isPdfOcrLineRecord).map((line, index) => ({
        ...line,
        order: index,
      }))
    : splitPdfTextIntoLines(finalText).map((text, index) => ({
        order: index,
        text,
        origin: normalizedSource === "hybrid" ? "native" : normalizedSource,
      }));

  const fallbackSelection = buildPdfTextSelection({
    nativeText,
    ocrText,
  });

  return {
    id: candidate.id,
    docId: candidate.docId,
    documentKey: candidate.documentKey,
    pageNumber: candidate.pageNumber,
    text: finalText,
    finalText,
    nativeText,
    ocrText,
    source: normalizedSource,
    status:
      candidate.status === "success" ||
      candidate.status === "partial" ||
      candidate.status === "error"
        ? candidate.status
        : fallbackSelection.status,
    qualityScore:
      typeof candidate.qualityScore === "number" &&
      Number.isFinite(candidate.qualityScore)
        ? candidate.qualityScore
        : fallbackSelection.qualityScore,
    nativeQualityScore:
      typeof candidate.nativeQualityScore === "number" &&
      Number.isFinite(candidate.nativeQualityScore)
        ? candidate.nativeQualityScore
        : fallbackSelection.nativeQualityScore,
    ocrQualityScore:
      typeof candidate.ocrQualityScore === "number" &&
      Number.isFinite(candidate.ocrQualityScore)
        ? candidate.ocrQualityScore
        : fallbackSelection.ocrQualityScore,
    charCount:
      typeof candidate.charCount === "number" &&
      Number.isFinite(candidate.charCount)
        ? candidate.charCount
        : finalText.length,
    lineCount:
      typeof candidate.lineCount === "number" &&
      Number.isFinite(candidate.lineCount)
        ? candidate.lineCount
        : lines.length,
    lines,
    languageHint:
      typeof candidate.languageHint === "string" &&
      candidate.languageHint.trim().length > 0
        ? candidate.languageHint
        : "jpn+eng",
    attempts: Array.isArray(candidate.attempts)
      ? candidate.attempts.filter(isPdfOcrAttemptRecord)
      : [],
    processingMs:
      typeof candidate.processingMs === "number" &&
      Number.isFinite(candidate.processingMs)
        ? candidate.processingMs
        : 0,
    updatedAt: candidate.updatedAt,
  };
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
        .map(normalizeStoredPdfOcrPageRecord)
        .filter((record): record is PdfOcrPageRecord => Boolean(record))
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

  const rawRecord = await runOcrTransaction<unknown>({
    mode: "readonly",
    action: (store) => store.get(id),
  });

  return normalizeStoredPdfOcrPageRecord(rawRecord);
};

export const putPdfOcrPageRecord = async ({
  docId,
  documentKey,
  pageNumber,
  text,
  finalText,
  nativeText,
  ocrText,
  source,
  status,
  qualityScore,
  nativeQualityScore,
  ocrQualityScore,
  lines,
  languageHint,
  attempts,
  processingMs,
}: {
  docId: string;
  documentKey: string;
  pageNumber: number;
  text?: string;
  finalText?: string;
  nativeText?: string;
  ocrText?: string;
  source?: PdfOcrTextSource;
  status?: PdfOcrRecordStatus;
  qualityScore?: number;
  nativeQualityScore?: number;
  ocrQualityScore?: number;
  lines?: PdfOcrLineRecord[];
  languageHint?: string;
  attempts?: PdfOcrAttemptRecord[];
  processingMs?: number;
}) => {
  const selection = buildPdfTextSelection({
    nativeText: nativeText ?? "",
    ocrText: ocrText ?? finalText ?? text ?? "",
  });
  const normalizedFinalText = normalizePdfExtractedText(
    finalText ?? text ?? selection.finalText,
  );
  const normalizedLines =
    Array.isArray(lines) && lines.length > 0
      ? lines.map((line, index) => ({ ...line, order: index }))
      : selection.lines;

  const record: PdfOcrPageRecord = {
    id: buildPdfOcrRecordId({ docId, documentKey, pageNumber }),
    docId,
    documentKey,
    pageNumber,
    text: normalizedFinalText,
    finalText: normalizedFinalText,
    nativeText: normalizePdfExtractedText(nativeText ?? ""),
    ocrText: normalizePdfExtractedText(ocrText ?? ""),
    source: source ?? selection.source,
    status: status ?? selection.status,
    qualityScore: Number((qualityScore ?? selection.qualityScore).toFixed(4)),
    nativeQualityScore: Number(
      (nativeQualityScore ?? selection.nativeQualityScore).toFixed(4),
    ),
    ocrQualityScore: Number(
      (ocrQualityScore ?? selection.ocrQualityScore).toFixed(4),
    ),
    charCount: normalizedFinalText.length,
    lineCount: normalizedLines.length,
    lines: normalizedLines,
    languageHint: languageHint?.trim() || "jpn+eng",
    attempts:
      attempts?.map((attempt) => ({
        ...attempt,
        text: normalizePdfExtractedText(attempt.text),
        qualityScore: Number(attempt.qualityScore.toFixed(4)),
      })) ?? [],
    processingMs:
      typeof processingMs === "number" && Number.isFinite(processingMs)
        ? Math.max(0, Math.trunc(processingMs))
        : 0,
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
