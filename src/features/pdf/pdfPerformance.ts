import { PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";

type PdfPerformanceDetail = Record<string, unknown>;

type PdfPerformanceMarkOptions = {
  debugOnly?: boolean;
  detail?: PdfPerformanceDetail;
};

type PatchedPdfViewerConstructor = typeof PDFViewer & {
  __sivflowNoScrollScalePatchApplied?: boolean;
};

type PatchedPdfViewerPrototype = InstanceType<typeof PDFViewer> & {
  __sivflowIsSettingScale?: boolean;
  container?: HTMLElement;
  scrollPageIntoView?: (...args: unknown[]) => unknown;
};

type PdfViewerScaleDescriptor = PropertyDescriptor & {
  get?: (this: PatchedPdfViewerPrototype) => unknown;
  set?: (this: PatchedPdfViewerPrototype, value: unknown) => void;
};

const PDF_PERFORMANCE_ENTRY_PREFIX = "sivflow.pdf";
const PDF_PERFORMANCE_DEBUG_STORAGE_KEY = "sivflow.pdf.debugPerformance";
const PDF_VIEWER_SCALE_PROPERTY_NAMES = ["currentScale", "currentScaleValue"] as const;
const PDF_ZOOMING_CLASS_NAME = "pdf-pane--zooming";

let pdfPerformanceTraceCounter = 0;

const isPdfViewerZooming = (pdfViewer: PatchedPdfViewerPrototype): boolean => {
  return Boolean(pdfViewer.container?.classList.contains(PDF_ZOOMING_CLASS_NAME));
};

const shouldSuppressPdfViewerScaleScroll = (pdfViewer: PatchedPdfViewerPrototype): boolean => {
  return Boolean(pdfViewer.__sivflowIsSettingScale || isPdfViewerZooming(pdfViewer));
};

const patchPdfViewerScaleSetter = (prototype: PatchedPdfViewerPrototype, propertyName: (typeof PDF_VIEWER_SCALE_PROPERTY_NAMES)[number]): void => {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName) as PdfViewerScaleDescriptor | undefined;
  if (!descriptor?.set) return;

  Object.defineProperty(prototype, propertyName, {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value: unknown) {
      this.__sivflowIsSettingScale = true;
      try {
        descriptor.set?.call(this, value);
      } finally {
        this.__sivflowIsSettingScale = false;
      }
    },
  });
};

const applyPdfViewerNoScrollScalePatch = (): void => {
  const viewerConstructor = PDFViewer as PatchedPdfViewerConstructor;
  if (viewerConstructor.__sivflowNoScrollScalePatchApplied) return;

  const prototype = viewerConstructor.prototype as PatchedPdfViewerPrototype;
  const originalScrollPageIntoView = prototype.scrollPageIntoView;
  if (typeof originalScrollPageIntoView !== "function") return;

  prototype.scrollPageIntoView = function scrollPageIntoViewWithoutScaleJump(...args: unknown[]) {
    if (shouldSuppressPdfViewerScaleScroll(this)) return undefined;
    return originalScrollPageIntoView.apply(this, args);
  };

  for (const propertyName of PDF_VIEWER_SCALE_PROPERTY_NAMES) patchPdfViewerScaleSetter(prototype, propertyName);
  viewerConstructor.__sivflowNoScrollScalePatchApplied = true;
};

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

applyPdfViewerNoScrollScalePatch();

export { createPdfPerformanceTraceName, recordPdfPerformanceMark, recordPdfPerformanceMeasure };
