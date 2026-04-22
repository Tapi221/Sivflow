import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createWorker, type Worker as TesseractWorker } from "tesseract.js";
import type { PdfDocumentController } from "./usePdfDocument";
import {
  clearPdfOcrRecords,
  getPdfOcrPageRecord,
  listPdfOcrPageRecords,
  putPdfOcrPageRecord,
  trimPdfOcrRecordsForDoc,
  type PdfOcrPageRecord,
} from "@/lib/pdf/pdfOcrStore";
import { renderPdfPageForOcr } from "@/lib/pdf/renderPdfPageForOcr";

const OCR_LANGUAGES = "jpn+eng";
const OCR_NATIVE_TEXT_SKIP_THRESHOLD = 32;
const OCR_DOCUMENT_RETENTION_LIMIT = 3;

type OcrStatus = "idle" | "running" | "success" | "error" | "cancelled";

interface UsePdfOcrOptions {
  docId: string;
  documentKey: string;
  currentPage: number;
  numPages: number;
  documentController: PdfDocumentController;
}

interface PdfOcrState {
  status: OcrStatus;
  progress: number;
  processedPages: number;
  totalPages: number;
  currentProcessingPage: number | null;
  error: string | null;
  cachedPageNumbers: number[];
}

const createInitialOcrState = (): PdfOcrState => ({
  status: "idle",
  progress: 0,
  processedPages: 0,
  totalPages: 0,
  currentProcessingPage: null,
  error: null,
  cachedPageNumbers: [],
});

const extractTextFromTextContent = async (
  getPageTextContent: PdfDocumentController["getPageTextContent"],
  pageNumber: number,
) => {
  const textContent = await getPageTextContent(pageNumber);

  return textContent.items
    .map((item) => {
      if (typeof item !== "object" || item === null || !("str" in item)) {
        return "";
      }

      const candidate = (item as { str?: unknown }).str;
      return typeof candidate === "string" ? candidate : "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeExtractedText = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

const persistPageText = async ({
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
  const normalizedText = normalizeExtractedText(text);
  if (normalizedText.length === 0) {
    return null;
  }

  return putPdfOcrPageRecord({
    docId,
    documentKey,
    pageNumber,
    text: normalizedText,
  });
};

export const usePdfOcr = ({
  docId,
  documentKey,
  currentPage,
  numPages,
  documentController,
}: UsePdfOcrOptions) => {
  const [ocrState, setOcrState] = useState<PdfOcrState>(createInitialOcrState);
  const [ocrTextByPage, setOcrTextByPage] = useState<Record<number, string>>(
    {},
  );
  const [ocrRecords, setOcrRecords] = useState<PdfOcrPageRecord[]>([]);

  const mountedRef = useRef(true);
  const workerPromiseRef = useRef<Promise<TesseractWorker> | null>(null);
  const cancelRequestedRef = useRef(false);
  const processedPagesRef = useRef(0);
  const totalPagesRef = useRef(0);

  const resolvedDocumentKey = useMemo(() => {
    if (!documentController.doc) {
      return null;
    }

    const normalizedDocumentKey = documentKey.trim();
    return normalizedDocumentKey.length > 0 ? normalizedDocumentKey : null;
  }, [documentController.doc, documentKey]);

  const applyCachedRecords = useCallback((records: PdfOcrPageRecord[]) => {
    setOcrRecords(records);
    setOcrTextByPage(
      records.reduce<Record<number, string>>((accumulator, record) => {
        accumulator[record.pageNumber] = record.text;
        return accumulator;
      }, {}),
    );
    setOcrState((previousState) => ({
      ...previousState,
      cachedPageNumbers: records.map((record) => record.pageNumber),
    }));
  }, []);

  const resetLocalOcrState = useCallback(() => {
    processedPagesRef.current = 0;
    totalPagesRef.current = 0;
    cancelRequestedRef.current = true;
    setOcrRecords([]);
    setOcrTextByPage({});
    setOcrState(createInitialOcrState());
  }, []);

  const syncCachedRecords = useCallback(async () => {
    if (!resolvedDocumentKey) {
      if (!mountedRef.current) {
        return;
      }

      applyCachedRecords([]);
      return;
    }

    const records = await listPdfOcrPageRecords({
      docId,
      documentKey: resolvedDocumentKey,
    });

    if (!mountedRef.current) {
      return;
    }

    applyCachedRecords(records);
  }, [applyCachedRecords, docId, resolvedDocumentKey]);

  useEffect(() => {
    mountedRef.current = true;

    if (!resolvedDocumentKey) {
      resetLocalOcrState();

      return () => {
        mountedRef.current = false;
      };
    }

    cancelRequestedRef.current = false;

    void (async () => {
      await syncCachedRecords();
      await trimPdfOcrRecordsForDoc({
        docId,
        keepDocumentKey: resolvedDocumentKey,
        maxDocumentKeys: OCR_DOCUMENT_RETENTION_LIMIT,
      });
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [docId, resetLocalOcrState, resolvedDocumentKey, syncCachedRecords]);

  useEffect(() => {
    return () => {
      cancelRequestedRef.current = true;
      void (async () => {
        const workerPromise = workerPromiseRef.current;
        workerPromiseRef.current = null;
        if (!workerPromise) {
          return;
        }

        const worker = await workerPromise;
        await worker.terminate();
      })();
    };
  }, []);

  const getWorker = useCallback(async () => {
    if (workerPromiseRef.current) {
      return workerPromiseRef.current;
    }

    workerPromiseRef.current = createWorker(OCR_LANGUAGES, 1, {
      logger: (message) => {
        const rawProgress =
          typeof (message as { progress?: unknown }).progress === "number"
            ? (message as { progress: number }).progress
            : 0;
        const totalPagesValue = Math.max(totalPagesRef.current, 1);
        const normalizedProgress = Math.min(
          1,
          Math.max(
            0,
            (processedPagesRef.current + rawProgress) / totalPagesValue,
          ),
        );

        if (!mountedRef.current) {
          return;
        }

        setOcrState((previousState) =>
          previousState.status === "running"
            ? {
                ...previousState,
                progress: normalizedProgress,
              }
            : previousState,
        );
      },
    });

    return workerPromiseRef.current;
  }, []);

  const markProcessed = useCallback(() => {
    processedPagesRef.current += 1;
    setOcrState((previousState) => ({
      ...previousState,
      processedPages: processedPagesRef.current,
      progress: processedPagesRef.current / Math.max(totalPagesRef.current, 1),
    }));
  }, []);

  const markUnavailableDocumentError = useCallback(() => {
    setOcrState((previousState) => ({
      ...createInitialOcrState(),
      status: "error",
      error: "PDFの読み込み完了後にOCRを実行してください。",
      cachedPageNumbers: previousState.cachedPageNumbers,
    }));
  }, []);

  const runOcr = useCallback(
    async (pageNumbers: number[]) => {
      if (!resolvedDocumentKey || !documentController.doc) {
        markUnavailableDocumentError();
        return;
      }

      const normalizedPageNumbers = Array.from(
        new Set(
          pageNumbers
            .filter((pageNumber) => Number.isFinite(pageNumber))
            .map((pageNumber) =>
              Math.max(1, Math.min(numPages, Math.trunc(pageNumber))),
            ),
        ),
      );

      if (normalizedPageNumbers.length === 0) {
        return;
      }

      cancelRequestedRef.current = false;
      processedPagesRef.current = 0;
      totalPagesRef.current = normalizedPageNumbers.length;

      setOcrState((previousState) => ({
        ...previousState,
        status: "running",
        progress: 0,
        processedPages: 0,
        totalPages: normalizedPageNumbers.length,
        currentProcessingPage: null,
        error: null,
      }));

      try {
        const worker = await getWorker();

        for (const pageNumber of normalizedPageNumbers) {
          if (cancelRequestedRef.current) {
            break;
          }

          setOcrState((previousState) => ({
            ...previousState,
            currentProcessingPage: pageNumber,
          }));

          const cachedRecord = await getPdfOcrPageRecord({
            docId,
            documentKey: resolvedDocumentKey,
            pageNumber,
          });

          if (cachedRecord?.text) {
            markProcessed();
            continue;
          }

          const nativeText = await extractTextFromTextContent(
            documentController.getPageTextContent,
            pageNumber,
          );
          const normalizedNativeText = normalizeExtractedText(nativeText);

          if (normalizedNativeText.length >= OCR_NATIVE_TEXT_SKIP_THRESHOLD) {
            await persistPageText({
              docId,
              documentKey: resolvedDocumentKey,
              pageNumber,
              text: normalizedNativeText,
            });
            markProcessed();
            continue;
          }

          const renderedPage = await renderPdfPageForOcr({
            acquirePage: documentController.acquirePage,
            pageNumber,
          });
          const result = await worker.recognize(renderedPage.canvas);
          const normalizedOcrText = normalizeExtractedText(result.data.text);

          if (normalizedOcrText.length > 0) {
            await persistPageText({
              docId,
              documentKey: resolvedDocumentKey,
              pageNumber,
              text: normalizedOcrText,
            });
          } else if (normalizedNativeText.length > 0) {
            await persistPageText({
              docId,
              documentKey: resolvedDocumentKey,
              pageNumber,
              text: normalizedNativeText,
            });
          }

          markProcessed();
        }

        await syncCachedRecords();

        if (!mountedRef.current) {
          return;
        }

        setOcrState((previousState) => ({
          ...previousState,
          status: cancelRequestedRef.current ? "cancelled" : "success",
          currentProcessingPage: null,
          progress: 1,
        }));
      } catch (errorValue) {
        if (!mountedRef.current) {
          return;
        }

        setOcrState((previousState) => ({
          ...previousState,
          status: "error",
          currentProcessingPage: null,
          error:
            errorValue instanceof Error
              ? errorValue.message
              : "OCR に失敗しました。",
        }));
      }
    },
    [
      docId,
      documentController.acquirePage,
      documentController.doc,
      documentController.getPageTextContent,
      getWorker,
      markProcessed,
      markUnavailableDocumentError,
      numPages,
      resolvedDocumentKey,
      syncCachedRecords,
    ],
  );

  const runCurrentPageOcr = useCallback(async () => {
    await runOcr([currentPage]);
  }, [currentPage, runOcr]);

  const runAllPagesOcr = useCallback(async () => {
    await runOcr(Array.from({ length: numPages }, (_, index) => index + 1));
  }, [numPages, runOcr]);

  const clearOcr = useCallback(async () => {
    cancelRequestedRef.current = true;

    if (!resolvedDocumentKey) {
      resetLocalOcrState();
      return;
    }

    await clearPdfOcrRecords({
      docId,
      documentKey: resolvedDocumentKey,
    });
    await syncCachedRecords();

    if (!mountedRef.current) {
      return;
    }

    setOcrState(createInitialOcrState());
  }, [docId, resetLocalOcrState, resolvedDocumentKey, syncCachedRecords]);

  const cancelOcr = useCallback(() => {
    cancelRequestedRef.current = true;
    setOcrState((previousState) => ({
      ...previousState,
      status: "cancelled",
      currentProcessingPage: null,
    }));
  }, []);

  const hasOcrForCurrentPage = useMemo(() => {
    return (
      typeof ocrTextByPage[currentPage] === "string" &&
      ocrTextByPage[currentPage].length > 0
    );
  }, [currentPage, ocrTextByPage]);

  const hasAnyOcr = useMemo(() => {
    return ocrRecords.length > 0;
  }, [ocrRecords.length]);

  const ocrPageNumbers = useMemo(() => {
    return ocrRecords.map((record) => record.pageNumber);
  }, [ocrRecords]);

  return {
    ocrState,
    ocrTextByPage,
    ocrRecords,
    ocrPageNumbers,
    hasAnyOcr,
    runCurrentPageOcr,
    runAllPagesOcr,
    cancelOcr,
    clearOcr,
    hasOcrForCurrentPage,
  };
};
