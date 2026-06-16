import { applyPdfViewerZoomPatch } from "./pdfViewerZoomPatch";



type PdfPerformanceDetail = Record<string, unknown>;
type PdfPerformanceMarkOptions = {
  debugOnly?: boolean;
  detail?: PdfPerformanceDetail;
};



const PDF_PERFORMANCE_ENTRY_PREFIX = "sivflow.pdf";
const PDF_PERFORMANCE_DEBUG_STORAGE_KEY = "sivflow.pdf.debugPerformance";
let pdfPerformanceTraceCounter = 0;



const createPdfPerformanceTraceName = (scope: string): string => {
  pdfPerformanceTraceCounter += 1;
  return `${scope}.${pdfPerformanceTraceCounter}`;
};
const getPdfPerformanceEntryName = (name: string): string => `${PDF_PERFORMANCE_ENTRY_PREFIX}.${name}`;
const isPdfPerformanceDebugEnabled = (): boolean => {
  try {
    return globalThis.localStorage?.getItem(PDF_PERFORMANCE_DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};
const recordPdfPerformanceMark = (name: string, options: PdfPerformanceMarkOptions = {}): void => {
  if (options.debugOnly && !isPdfPerformanceDebugEnabled()) return;
  if (typeof globalThis.performance?.mark !== "function") return;

  const entryName = getPdfPerformanceEntryName(name);

  try {
    if (options.detail) {
      globalThis.performance.mark(entryName, { detail: options.detail });
      return;
    }

    globalThis.performance.mark(entryName);
  } catch {
    try {
      globalThis.performance.mark(entryName);
    } catch {
      // Performance marks are diagnostic only and must never block PDF rendering.
    }
  }
};
const recordPdfPerformanceMeasure = (name: string, startName: string, endName: string, options: Pick<PdfPerformanceMarkOptions, "debugOnly"> = {}): void => {
  if (options.debugOnly && !isPdfPerformanceDebugEnabled()) return;
  if (typeof globalThis.performance?.measure !== "function") return;

  try {
    globalThis.performance.measure(getPdfPerformanceEntryName(name), getPdfPerformanceEntryName(startName), getPdfPerformanceEntryName(endName));
  } catch {
    // Missing marks or unsupported Performance APIs should not affect the viewer.
  }
};
applyPdfViewerZoomPatch();



export { createPdfPerformanceTraceName, recordPdfPerformanceMark, recordPdfPerformanceMeasure };
