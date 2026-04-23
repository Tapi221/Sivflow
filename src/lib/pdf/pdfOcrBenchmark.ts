import type { PdfOcrPageKind } from "@/lib/pdf/pdfOcrPageClassification";
import type { PdfOcrTextSource } from "@/lib/pdf/pdfTextExtraction";

export interface PdfOcrBenchmarkSample {
  pageNumber: number;
  pageKind: PdfOcrPageKind;
  classificationConfidence: number;
  selectedSource: PdfOcrTextSource;
  finalQualityScore: number;
  processingMs: number;
  attemptCount: number;
  regionAttemptCount: number;
  timeoutCount: number;
  finalCharCount: number;
  finalLineCount: number;
  usedLanguageHints: string[];
}

export interface PdfOcrBenchmarkSummary {
  pageCount: number;
  avgQualityScore: number;
  avgProcessingMs: number;
  p50ProcessingMs: number;
  p95ProcessingMs: number;
  avgAttemptCount: number;
  avgFinalCharCount: number;
  regionRetryRate: number;
  timeoutRate: number;
  sourceBreakdown: Record<PdfOcrTextSource, number>;
  kindBreakdown: Record<PdfOcrPageKind, number>;
  lowQualityPageCount: number;
}

const percentile = (values: number[], ratio: number) => {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.round((sortedValues.length - 1) * ratio)),
  );

  return sortedValues[index] ?? 0;
};

const round = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(4));
};

export const summarizePdfOcrBenchmark = (
  samples: readonly PdfOcrBenchmarkSample[],
): PdfOcrBenchmarkSummary => {
  const safeSamples = [...samples];
  const pageCount = safeSamples.length;
  const processingValues = safeSamples.map((sample) => sample.processingMs);

  const sourceBreakdown: Record<PdfOcrTextSource, number> = {
    native: 0,
    ocr: 0,
    hybrid: 0,
  };
  const kindBreakdown: Record<PdfOcrPageKind, number> = {
    "native-rich": 0,
    "dense-text": 0,
    "mixed-layout": 0,
    "sparse-scan": 0,
    "numeric-heavy": 0,
    unknown: 0,
  };

  safeSamples.forEach((sample) => {
    sourceBreakdown[sample.selectedSource] += 1;
    kindBreakdown[sample.pageKind] += 1;
  });

  const totalAttemptCount = safeSamples.reduce(
    (sum, sample) => sum + sample.attemptCount,
    0,
  );
  const totalRegionAttemptCount = safeSamples.reduce(
    (sum, sample) => sum + sample.regionAttemptCount,
    0,
  );
  const totalTimeoutCount = safeSamples.reduce(
    (sum, sample) => sum + sample.timeoutCount,
    0,
  );
  const totalCharCount = safeSamples.reduce(
    (sum, sample) => sum + sample.finalCharCount,
    0,
  );

  return {
    pageCount,
    avgQualityScore:
      pageCount > 0
        ? round(
            safeSamples.reduce(
              (sum, sample) => sum + sample.finalQualityScore,
              0,
            ) / pageCount,
          )
        : 0,
    avgProcessingMs:
      pageCount > 0
        ? round(
            safeSamples.reduce((sum, sample) => sum + sample.processingMs, 0) /
              pageCount,
          )
        : 0,
    p50ProcessingMs: round(percentile(processingValues, 0.5)),
    p95ProcessingMs: round(percentile(processingValues, 0.95)),
    avgAttemptCount: pageCount > 0 ? round(totalAttemptCount / pageCount) : 0,
    avgFinalCharCount: pageCount > 0 ? round(totalCharCount / pageCount) : 0,
    regionRetryRate:
      totalAttemptCount > 0
        ? round(totalRegionAttemptCount / totalAttemptCount)
        : 0,
    timeoutRate:
      totalAttemptCount > 0 ? round(totalTimeoutCount / totalAttemptCount) : 0,
    sourceBreakdown,
    kindBreakdown,
    lowQualityPageCount: safeSamples.filter(
      (sample) => sample.finalQualityScore < 0.55,
    ).length,
  };
};

export const formatPdfOcrBenchmarkSummary = (
  summary: PdfOcrBenchmarkSummary,
) => {
  return {
    pageCount: summary.pageCount,
    avgQualityScore: summary.avgQualityScore,
    avgProcessingMs: summary.avgProcessingMs,
    p50ProcessingMs: summary.p50ProcessingMs,
    p95ProcessingMs: summary.p95ProcessingMs,
    avgAttemptCount: summary.avgAttemptCount,
    avgFinalCharCount: summary.avgFinalCharCount,
    regionRetryRate: summary.regionRetryRate,
    timeoutRate: summary.timeoutRate,
    lowQualityPageCount: summary.lowQualityPageCount,
    sourceBreakdown: summary.sourceBreakdown,
    kindBreakdown: summary.kindBreakdown,
  };
};
