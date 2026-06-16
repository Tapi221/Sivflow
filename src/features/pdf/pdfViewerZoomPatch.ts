import { PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import { PDF_TRACKPAD_ZOOM_SENSITIVITY, PDF_ZOOM_MAX_SCALE, PDF_ZOOM_MIN_SCALE, PDF_ZOOM_SCALE_EPSILON, PDF_ZOOM_STEP } from "./pdfZoom.constants";
import { computeNextScaleFromWheel, resolveTrackpadDeltaYForScaleRatio } from "./pdfZoom.utils";



type PdfViewerMethod = (...args: unknown[]) => unknown;
type PatchedPdfViewerConstructor = typeof PDFViewer & {
  __sivflowZoomPatchApplied?: boolean;
};
type PatchedPdfViewerPrototype = InstanceType<typeof PDFViewer> & {
  __sivflowIsSettingScale?: boolean;
  __sivflowSuppressScaleScrollUntil?: number;
  container?: HTMLElement;
  currentScale?: number;
  scrollPageIntoView?: PdfViewerMethod;
  setDocument?: PdfViewerMethod;
};
type PdfViewerScaleDescriptor = PropertyDescriptor & {
  get?: (this: PatchedPdfViewerPrototype) => unknown;
  set?: (this: PatchedPdfViewerPrototype, value: unknown) => void;
};



const PDF_SCALE_SCROLL_SUPPRESSION_WINDOW_MS = 800;
const PDF_VIEWER_SCALE_PROPERTY_NAMES = ["currentScale", "currentScaleValue"] as const;
const PDF_WHEEL_DELTA_LINE_HEIGHT_PX = 16;
const PDF_WHEEL_DELTA_MODE_PIXEL = 0;
const PDF_WHEEL_DELTA_MODE_LINE = 1;
const PDF_WHEEL_DELTA_MODE_PAGE = 2;
const PDF_ZOOMING_CLASS_NAME = "pdf-pane--zooming";
const pdfZoomViewers = new Set<PatchedPdfViewerPrototype>();



const getPdfZoomPatchNow = (): number => {
  return typeof globalThis.performance?.now === "function" ? globalThis.performance.now() : Date.now();
};
const markPdfViewerScaleScrollSuppressed = (pdfViewer: PatchedPdfViewerPrototype): void => {
  pdfViewer.__sivflowSuppressScaleScrollUntil = getPdfZoomPatchNow() + PDF_SCALE_SCROLL_SUPPRESSION_WINDOW_MS;
};
const getPdfZoomScale = (pdfViewer: PatchedPdfViewerPrototype): number => {
  const currentScale = Number(pdfViewer.currentScale);
  return Number.isFinite(currentScale) && currentScale > 0 ? currentScale : 1;
};
const getNormalizedPdfWheelDeltaY = (event: WheelEvent, container: HTMLElement): number => {
  if (event.deltaMode === PDF_WHEEL_DELTA_MODE_LINE) return event.deltaY * PDF_WHEEL_DELTA_LINE_HEIGHT_PX;
  if (event.deltaMode === PDF_WHEEL_DELTA_MODE_PAGE) return event.deltaY * Math.max(container.clientHeight, 1);
  return event.deltaY;
};
const getPdfZoomViewerForTarget = (target: EventTarget | null): PatchedPdfViewerPrototype | null => {
  if (!(target instanceof Node)) return null;
  for (const pdfViewer of pdfZoomViewers) {
    const container = pdfViewer.container;
    if (!container?.isConnected) {
      pdfZoomViewers.delete(pdfViewer);
      continue;
    }
    if (container.contains(target)) return pdfViewer;
  }
  return null;
};
const rewritePdfWheelZoomEventDelta = (event: WheelEvent, deltaY: number): boolean => {
  try {
    Object.defineProperty(event, "deltaY", {
      configurable: true,
      value: deltaY,
    });
    Object.defineProperty(event, "deltaMode", {
      configurable: true,
      value: PDF_WHEEL_DELTA_MODE_PIXEL,
    });
    return true;
  } catch {
    return false;
  }
};
const preventPdfWheelZoomBrowserDefault = (event: WheelEvent): void => {
  if (event.cancelable) event.preventDefault();
};
const handlePdfWheelZoomCapture = (event: WheelEvent): void => {
  if (!event.ctrlKey && !event.metaKey) return;
  const pdfViewer = getPdfZoomViewerForTarget(event.target);
  const container = pdfViewer?.container;
  if (!pdfViewer || !container) return;
  preventPdfWheelZoomBrowserDefault(event);
  const currentScale = getPdfZoomScale(pdfViewer);
  const nextScale = computeNextScaleFromWheel({ currentScale, deltaY: getNormalizedPdfWheelDeltaY(event, container), zoomStep: PDF_ZOOM_STEP, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE });
  if (nextScale === null || Math.abs(nextScale - currentScale) < PDF_ZOOM_SCALE_EPSILON) return;
  const deltaY = resolveTrackpadDeltaYForScaleRatio({ scaleRatio: nextScale / currentScale, sensitivity: PDF_TRACKPAD_ZOOM_SENSITIVITY });
  if (deltaY === null) return;
  if (!rewritePdfWheelZoomEventDelta(event, deltaY)) return;
  markPdfViewerScaleScrollSuppressed(pdfViewer);
};
const isPdfViewerZooming = (pdfViewer: PatchedPdfViewerPrototype): boolean => {
  return Boolean(pdfViewer.container?.classList.contains(PDF_ZOOMING_CLASS_NAME));
};
const isPdfViewerScaleScrollSuppressed = (pdfViewer: PatchedPdfViewerPrototype): boolean => {
  const suppressUntil = pdfViewer.__sivflowSuppressScaleScrollUntil;
  return typeof suppressUntil === "number" && getPdfZoomPatchNow() <= suppressUntil;
};
const shouldSuppressPdfViewerScaleScroll = (pdfViewer: PatchedPdfViewerPrototype): boolean => {
  return Boolean(pdfViewer.__sivflowIsSettingScale || isPdfViewerZooming(pdfViewer) || isPdfViewerScaleScrollSuppressed(pdfViewer));
};
const createPdfViewerSetDocumentProxy = (originalSetDocument: PdfViewerMethod): PdfViewerMethod => {
  return new Proxy(originalSetDocument, {
    apply(target, thisArg: PatchedPdfViewerPrototype, argArray: unknown[]) {
      if (thisArg.container) pdfZoomViewers.add(thisArg);
      return Reflect.apply(target, thisArg, argArray);
    },
  });
};
const createPdfViewerScrollPageIntoViewProxy = (originalScrollPageIntoView: PdfViewerMethod): PdfViewerMethod => {
  return new Proxy(originalScrollPageIntoView, {
    apply(target, thisArg: PatchedPdfViewerPrototype, argArray: unknown[]) {
      if (shouldSuppressPdfViewerScaleScroll(thisArg)) return undefined;
      return Reflect.apply(target, thisArg, argArray);
    },
  });
};
const getPdfViewerScaleDescriptor = (prototype: object, propertyName: (typeof PDF_VIEWER_SCALE_PROPERTY_NAMES)[number]): PdfViewerScaleDescriptor | null => {
  let currentPrototype: object | null = prototype;
  while (currentPrototype) {
    const descriptor = Object.getOwnPropertyDescriptor(currentPrototype, propertyName) as PdfViewerScaleDescriptor | undefined;
    if (descriptor) return descriptor;
    currentPrototype = Object.getPrototypeOf(currentPrototype);
  }
  return null;
};
const patchPdfViewerScaleSetter = (prototype: PatchedPdfViewerPrototype, propertyName: (typeof PDF_VIEWER_SCALE_PROPERTY_NAMES)[number]): void => {
  const descriptor = getPdfViewerScaleDescriptor(prototype, propertyName);
  if (!descriptor?.set) return;
  Object.defineProperty(prototype, propertyName, {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value: unknown) {
      this.__sivflowIsSettingScale = true;
      markPdfViewerScaleScrollSuppressed(this);
      try {
        descriptor.set?.call(this, value);
      } finally {
        markPdfViewerScaleScrollSuppressed(this);
        this.__sivflowIsSettingScale = false;
      }
    },
  });
};
const patchPdfViewerSetDocument = (prototype: PatchedPdfViewerPrototype): void => {
  const originalSetDocument = prototype.setDocument;
  if (typeof originalSetDocument !== "function") return;
  prototype.setDocument = createPdfViewerSetDocumentProxy(originalSetDocument);
};
const addPdfZoomCaptureListeners = (): void => {
  if (typeof window === "undefined") return;
  window.addEventListener("wheel", handlePdfWheelZoomCapture, { capture: true, passive: false });
};
const applyPdfViewerZoomPatch = (): void => {
  const viewerConstructor = PDFViewer as PatchedPdfViewerConstructor;
  if (viewerConstructor.__sivflowZoomPatchApplied) return;
  const prototype = viewerConstructor.prototype as PatchedPdfViewerPrototype;
  const originalScrollPageIntoView = prototype.scrollPageIntoView;
  if (typeof originalScrollPageIntoView !== "function") return;
  prototype.scrollPageIntoView = createPdfViewerScrollPageIntoViewProxy(originalScrollPageIntoView);
  for (const propertyName of PDF_VIEWER_SCALE_PROPERTY_NAMES) patchPdfViewerScaleSetter(prototype, propertyName);
  patchPdfViewerSetDocument(prototype);
  addPdfZoomCaptureListeners();
  viewerConstructor.__sivflowZoomPatchApplied = true;
};



export { applyPdfViewerZoomPatch };
