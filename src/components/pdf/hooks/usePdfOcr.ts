import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createWorker, type Worker as TesseractWorker } from "tesseract.js";
import type { PdfDocumentController } from "./usePdfDocument";
import {
  clearPdfOcrRecords,
  getPdfOcrPageRecord,
  listPdfOcrPageRecords,
  putPdfOcrPageRecord,
  trimPdfOcrRecordsForDoc,
  type PdfOcrAttemptRecord,
  type PdfOcrPageRecord,
} from "@/lib/pdf/pdfOcrStore";
import {
  buildPdfTextSelection,
  guessPreferredOcrLanguages,
  mergePdfTextSelections,
  normalizePdfExtractedText,
  scorePdfTextQuality,
  selectBestPdfTextSelection,
} from "@/lib/pdf/pdfTextExtraction";
import {
  renderPdfPageForOcr,
  type PdfOcrRenderProfile,
} from "@/lib/pdf/renderPdfPageForOcr";
import { segmentCanvasIntoTextRegions } from "@/lib/pdf/pdfOcrRegionDetection";

const OCR_DEFAULT_LANGUAGE = "jpn+eng";
const OCR_NATIVE_TEXT_SKIP_THRESHOLD = 32;
const OCR_NATIVE_QUALITY_SKIP_THRESHOLD = 0.72;
const OCR_CACHE_SKIP_QUALITY_THRESHOLD = 0.7;
const OCR_RETRY_QUALITY_THRESHOLD = 0.58;
const OCR_REGION_RETRY_QUALITY_THRESHOLD = 0.66;
const OCR_DOCUMENT_RETENTION_LIMIT = 3;
const OCR_MAX_REGION_COUNT = 8;

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

interface OcrAttemptPlan {
  languageHint: string;
  renderProfile: PdfOcrRenderProfile;
  reason: string;
  enableRegionSegmentation?: boolean;
}

interface OcrAttemptResult {
  attemptIndex: number;
  reason: string;
  languageHint: string;
  renderProfile: PdfOcrRenderProfile;
  recognizedText: string;
  selection: ReturnType<typeof buildPdfTextSelection>;
  renderScale: number;
  regionCount: number;
  deskewAngle: number;
  rotationDegrees: number;
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

const getOcrPageConcurrency = () => {
  if (typeof navigator === "undefined") {
    return 2;
  }

  const hardwareConcurrency = navigator.hardwareConcurrency ?? 4;
  const userAgent = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);

  if (isMobile) {
    return 1;
  }

  if (hardwareConcurrency >= 10) {
    return 3;
  }

  return hardwareConcurrency >= 6 ? 2 : 1;
};

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

const shouldUseNativeTextOnly = ({ nativeText }: { nativeText: string }) => {
  const normalizedNativeText = normalizePdfExtractedText(nativeText);
  const nativeQualityScore = scorePdfTextQuality(normalizedNativeText);

  return (
    normalizedNativeText.length >= OCR_NATIVE_TEXT_SKIP_THRESHOLD &&
    nativeQualityScore >= OCR_NATIVE_QUALITY_SKIP_THRESHOLD
  );
};

const prioritizePageNumbers = ({
  pageNumbers,
  currentPage,
}: {
  pageNumbers: number[];
  currentPage: number;
}) => {
  const normalizedCurrentPage = Math.max(1, Math.trunc(currentPage));
  return [...pageNumbers].sort((left, right) => {
    const leftDistance = Math.abs(left - normalizedCurrentPage);
    const rightDistance = Math.abs(right - normalizedCurrentPage);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return left - right;
  });
};

const buildAttemptPlan = ({
  nativeText,
}: {
  nativeText: string;
}): OcrAttemptPlan[] => {
  const preferredLanguages = guessPreferredOcrLanguages(nativeText);
  const normalizedNativeText = normalizePdfExtractedText(nativeText);
  const plans: OcrAttemptPlan[] = [];
  const seen = new Set<string>();

  const pushPlan = (plan: OcrAttemptPlan) => {
    const key = `${plan.languageHint}::${plan.reason}::${plan.renderProfile.mode}::${plan.renderProfile.targetPixels ?? 0}::${plan.enableRegionSegmentation ? "regions" : "full"}::${plan.renderProfile.rotationDegrees ?? 0}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    plans.push(plan);
  };

  pushPlan({
    languageHint: preferredLanguages[0] ?? OCR_DEFAULT_LANGUAGE,
    reason: "default",
    renderProfile: {
      mode: "none",
      targetPixels: 3_200_000,
      minScale: 1.4,
      maxScale: 2.4,
      trimWhitespace: false,
      contrastBoost: 1.04,
      autoDeskew: false,
    },
  });

  pushPlan({
    languageHint: preferredLanguages[0] ?? OCR_DEFAULT_LANGUAGE,
    reason: "deskew-grayscale",
    renderProfile: {
      mode: "grayscale",
      targetPixels: 4_400_000,
      minScale: 1.7,
      maxScale: 2.9,
      trimWhitespace: true,
      contrastBoost: 1.18,
      autoDeskew: true,
      maxDeskewAngle: 1.6,
    },
  });

  pushPlan({
    languageHint: preferredLanguages[0] ?? OCR_DEFAULT_LANGUAGE,
    reason: "binary-highres",
    renderProfile: {
      mode: "binary",
      targetPixels: normalizedNativeText.length < 24 ? 6_800_000 : 5_900_000,
      minScale: 2,
      maxScale: 3.4,
      trimWhitespace: true,
      contrastBoost: 1.28,
      brightnessBoost: 0.02,
      autoDeskew: true,
      maxDeskewAngle: 1.6,
    },
  });

  pushPlan({
    languageHint: preferredLanguages[0] ?? OCR_DEFAULT_LANGUAGE,
    reason: "region-binary",
    enableRegionSegmentation: true,
    renderProfile: {
      mode: "binary",
      targetPixels: 6_000_000,
      minScale: 2.1,
      maxScale: 3.4,
      trimWhitespace: true,
      contrastBoost: 1.26,
      brightnessBoost: 0.02,
      autoDeskew: true,
      maxDeskewAngle: 1.6,
    },
  });

  if (
    normalizedNativeText.length === 0 ||
    scorePdfTextQuality(normalizedNativeText) < 0.12
  ) {
    pushPlan({
      languageHint: preferredLanguages[0] ?? OCR_DEFAULT_LANGUAGE,
      reason: "sideways-fallback",
      renderProfile: {
        mode: "binary",
        targetPixels: 5_200_000,
        minScale: 1.8,
        maxScale: 3,
        trimWhitespace: true,
        contrastBoost: 1.22,
        autoDeskew: false,
        rotationDegrees: 90,
      },
    });
  }

  const fallbackLanguage = preferredLanguages[1] ?? OCR_DEFAULT_LANGUAGE;
  if (fallbackLanguage !== preferredLanguages[0]) {
    pushPlan({
      languageHint: fallbackLanguage,
      reason: "language-fallback",
      enableRegionSegmentation: true,
      renderProfile: {
        mode: "binary",
        targetPixels: 5_500_000,
        minScale: 1.9,
        maxScale: 3.1,
        trimWhitespace: true,
        contrastBoost: 1.24,
        autoDeskew: true,
        maxDeskewAngle: 1.4,
      },
    });
  }

  return plans;
};

const shouldStopRetrying = ({
  bestSelection,
  attemptIndex,
}: {
  bestSelection: ReturnType<typeof buildPdfTextSelection> | null;
  attemptIndex: number;
}) => {
  if (!bestSelection) {
    return false;
  }

  if (bestSelection.qualityScore >= 0.84) {
    return true;
  }

  if (attemptIndex >= 1 && bestSelection.qualityScore >= 0.72) {
    return true;
  }

  return false;
};

const buildAttemptRecords = (
  attempts: OcrAttemptResult[],
): PdfOcrAttemptRecord[] => {
  return attempts.map((attempt) => ({
    attemptIndex: attempt.attemptIndex,
    reason: attempt.reason,
    languageHint: attempt.languageHint,
    renderMode: attempt.renderProfile.mode,
    renderScale: attempt.renderScale,
    deskewAngle: attempt.deskewAngle,
    rotationDegrees: attempt.rotationDegrees,
    regionCount: attempt.regionCount,
    qualityScore: attempt.selection.qualityScore,
    text: attempt.selection.finalText,
  }));
};

const persistSelection = async ({
  docId,
  documentKey,
  pageNumber,
  nativeText,
  selection,
  attempts,
  processingMs,
}: {
  docId: string;
  documentKey: string;
  pageNumber: number;
  nativeText: string;
  selection: ReturnType<typeof buildPdfTextSelection>;
  attempts: OcrAttemptResult[];
  processingMs: number;
}) => {
  if (selection.finalText.length === 0) {
    return null;
  }

  const bestAttempt = attempts[0] ?? null;

  return putPdfOcrPageRecord({
    docId,
    documentKey,
    pageNumber,
    finalText: selection.finalText,
    nativeText,
    ocrText:
      bestAttempt?.recognizedText ??
      (selection.source === "native" ? "" : selection.finalText),
    source: selection.source,
    status: selection.status,
    qualityScore: selection.qualityScore,
    nativeQualityScore: selection.nativeQualityScore,
    ocrQualityScore: selection.ocrQualityScore,
    lines: selection.lines,
    languageHint: bestAttempt?.languageHint ?? OCR_DEFAULT_LANGUAGE,
    attempts: buildAttemptRecords(attempts),
    processingMs,
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
  const workerPromiseMapRef = useRef<Map<string, Promise<TesseractWorker>>>(
    new Map(),
  );
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
        accumulator[record.pageNumber] = record.finalText || record.text;
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
    documentController.invalidateDerivedTextCache();
  }, [documentController]);

  const syncCachedRecords = useCallback(async () => {
    if (!resolvedDocumentKey) {
      if (!mountedRef.current) {
        return;
      }

      applyCachedRecords([]);
      documentController.invalidateDerivedTextCache();
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
    documentController.invalidateDerivedTextCache();
  }, [applyCachedRecords, docId, documentController, resolvedDocumentKey]);

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
        const workerPromises = Array.from(workerPromiseMapRef.current.values());
        workerPromiseMapRef.current.clear();
        await Promise.all(
          workerPromises.map(async (workerPromise) => {
            const worker = await workerPromise;
            await worker.terminate();
          }),
        );
      })();
    };
  }, []);

  const getWorker = useCallback(
    async (languageHint: string, slotId: number) => {
      const normalizedLanguageHint = languageHint.trim() || OCR_DEFAULT_LANGUAGE;
      const workerKey = `${slotId}::${normalizedLanguageHint}`;
      const existingWorkerPromise = workerPromiseMapRef.current.get(workerKey);
      if (existingWorkerPromise) {
        return existingWorkerPromise;
      }

      const workerPromise = createWorker(normalizedLanguageHint, 1);
      workerPromiseMapRef.current.set(workerKey, workerPromise);
      return workerPromise;
    },
    [],
  );

  const markProcessed = useCallback(() => {
    processedPagesRef.current += 1;
    setOcrState((previousState) => ({
      ...previousState,
      processedPages: processedPagesRef.current,
      progress:
        processedPagesRef.current / Math.max(totalPagesRef.current, 1),
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

  const recognizeCanvasText = useCallback(
    async ({
      worker,
      canvas,
    }: {
      worker: TesseractWorker;
      canvas: HTMLCanvasElement;
    }) => {
      const result = await worker.recognize(canvas);
      return normalizePdfExtractedText(result.data.text);
    },
    [],
  );

  const recognizeSegmentedRegions = useCallback(
    async ({
      worker,
      canvas,
    }: {
      worker: TesseractWorker;
      canvas: HTMLCanvasElement;
    }) => {
      const regions = segmentCanvasIntoTextRegions({
        canvas,
        maxRegions: OCR_MAX_REGION_COUNT,
      });

      if (regions.length < 2) {
        const recognizedText = await recognizeCanvasText({ worker, canvas });
        return {
          recognizedText,
          regionCount: 0,
        };
      }

      const regionTexts: string[] = [];

      for (const region of regions) {
        if (cancelRequestedRef.current) {
          break;
        }

        const recognizedText = await recognizeCanvasText({
          worker,
          canvas: region.canvas,
        });
        if (recognizedText.length > 0) {
          regionTexts.push(recognizedText);
        }
      }

      return {
        recognizedText: regionTexts.join("\n"),
        regionCount: regions.length,
      };
    },
    [recognizeCanvasText],
  );

  const performOcrAttempts = useCallback(
    async ({
      pageNumber,
      nativeText,
      slotId,
    }: {
      pageNumber: number;
      nativeText: string;
      slotId: number;
    }) => {
      const plans = buildAttemptPlan({ nativeText });
      const attemptResults: OcrAttemptResult[] = [];
      let bestSelection = buildPdfTextSelection({
        nativeText,
        ocrText: "",
      });

      for (let attemptIndex = 0; attemptIndex < plans.length; attemptIndex += 1) {
        if (cancelRequestedRef.current) {
          break;
        }

        const plan = plans[attemptIndex];
        if (!plan) {
          continue;
        }

        const worker = await getWorker(plan.languageHint, slotId);
        const renderedPage = await renderPdfPageForOcr({
          acquirePage: documentController.acquirePage,
          pageNumber,
          profile: plan.renderProfile,
        });

        const recognition = plan.enableRegionSegmentation
          ? await recognizeSegmentedRegions({
              worker,
              canvas: renderedPage.canvas,
            })
          : {
              recognizedText: await recognizeCanvasText({
                worker,
                canvas: renderedPage.canvas,
              }),
              regionCount: 0,
            };

        const selection = buildPdfTextSelection({
          nativeText,
          ocrText: recognition.recognizedText,
        });

        attemptResults.push({
          attemptIndex,
          reason: plan.reason,
          languageHint: plan.languageHint,
          renderProfile: renderedPage.profile,
          recognizedText: recognition.recognizedText,
          selection,
          renderScale: renderedPage.scale,
          regionCount: recognition.regionCount,
          deskewAngle: renderedPage.deskewAngle,
          rotationDegrees: renderedPage.rotationDegrees,
        });

        attemptResults.sort(
          (left, right) =>
            right.selection.qualityScore - left.selection.qualityScore,
        );

        const mergedSelection = mergePdfTextSelections(
          [bestSelection, selection],
          "ocr",
        );
        bestSelection = selectBestPdfTextSelection([
          bestSelection,
          selection,
          mergedSelection,
        ]);

        if (
          shouldStopRetrying({
            bestSelection,
            attemptIndex,
          })
        ) {
          break;
        }
      }

      return {
        attempts: attemptResults,
        bestSelection,
      };
    },
    [
      documentController.acquirePage,
      getWorker,
      recognizeCanvasText,
      recognizeSegmentedRegions,
    ],
  );

  const runOcr = useCallback(
    async (pageNumbers: number[]) => {
      if (!resolvedDocumentKey || !documentController.doc) {
        markUnavailableDocumentError();
        return;
      }

      const normalizedPageNumbers = prioritizePageNumbers({
        pageNumbers: Array.from(
          new Set(
            pageNumbers
              .filter((pageNumber) => Number.isFinite(pageNumber))
              .map((pageNumber) =>
                Math.max(1, Math.min(numPages, Math.trunc(pageNumber))),
              ),
          ),
        ),
        currentPage,
      });

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

      const processSinglePage = async (pageNumber: number, slotId: number) => {
        if (cancelRequestedRef.current) {
          return;
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

        if (
          cachedRecord?.finalText &&
          cachedRecord.qualityScore >= OCR_CACHE_SKIP_QUALITY_THRESHOLD &&
          cachedRecord.status !== "error"
        ) {
          markProcessed();
          return;
        }

        const nativeText = await extractTextFromTextContent(
          documentController.getPageTextContent,
          pageNumber,
        );
        const normalizedNativeText = normalizePdfExtractedText(nativeText);
        const pageStartAt = performance.now();

        if (shouldUseNativeTextOnly({ nativeText: normalizedNativeText })) {
          const selection = buildPdfTextSelection({
            nativeText: normalizedNativeText,
            ocrText: "",
          });
          await persistSelection({
            docId,
            documentKey: resolvedDocumentKey,
            pageNumber,
            nativeText: normalizedNativeText,
            selection,
            attempts: [],
            processingMs: performance.now() - pageStartAt,
          });
          markProcessed();
          return;
        }

        const { attempts, bestSelection } = await performOcrAttempts({
          pageNumber,
          nativeText: normalizedNativeText,
          slotId,
        });

        const bestAttemptSelection =
          attempts[0]?.selection ??
          buildPdfTextSelection({
            nativeText: normalizedNativeText,
            ocrText: "",
          });

        const effectiveSelection =
          bestSelection.qualityScore >= OCR_REGION_RETRY_QUALITY_THRESHOLD ||
          attempts.length === 0
            ? bestSelection
            : selectBestPdfTextSelection([
                bestSelection,
                bestAttemptSelection,
              ]);

        await persistSelection({
          docId,
          documentKey: resolvedDocumentKey,
          pageNumber,
          nativeText: normalizedNativeText,
          selection:
            effectiveSelection.qualityScore >= OCR_RETRY_QUALITY_THRESHOLD
              ? effectiveSelection
              : bestSelection,
          attempts,
          processingMs: performance.now() - pageStartAt,
        });

        markProcessed();
      };

      try {
        const queue = [...normalizedPageNumbers];
        const workerCount = Math.min(
          getOcrPageConcurrency(),
          normalizedPageNumbers.length,
        );

        await Promise.all(
          Array.from({ length: workerCount }, (_, index) => index).map(
            async (slotId) => {
              while (!cancelRequestedRef.current) {
                const pageNumber = queue.shift();
                if (typeof pageNumber !== "number") {
                  return;
                }

                await processSinglePage(pageNumber, slotId);
              }
            },
          ),
        );

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
      currentPage,
      docId,
      documentController.doc,
      documentController.getPageTextContent,
      markProcessed,
      markUnavailableDocumentError,
      numPages,
      performOcrAttempts,
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
    documentController.invalidateDerivedTextCache();
  }, [
    docId,
    documentController,
    resetLocalOcrState,
    resolvedDocumentKey,
    syncCachedRecords,
  ]);

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
