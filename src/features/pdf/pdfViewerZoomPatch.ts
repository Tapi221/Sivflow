import { PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import { computeNextScaleFromGesture, computeNextScaleFromWheel } from "./pdfZoom.utils";

type PatchedPdfViewerConstructor = typeof PDFViewer & {
  __sivflowZoomPatchApplied?: boolean;
};

type PatchedPdfViewerPrototype = InstanceType<typeof PDFViewer> & {
  __sivflowIsSettingScale?: boolean;
  __sivflowSuppressScaleScrollUntil?: number;
  container?: HTMLElement;
  currentScale?: number;
  currentScaleValue?: string;
  scrollPageIntoView?: (...args: unknown[]) => unknown;
  setDocument?: (...args: unknown[]) => unknown;
};

type PdfViewerScaleDescriptor = PropertyDescriptor & {
  get?: (this: PatchedPdfViewerPrototype) => unknown;
  set?: (this: PatchedPdfViewerPrototype, value: unknown) => void;
};

type PdfZoomAnchor = {
  fallbackContentX: number;
  fallbackContentY: number;
  localX: number;
  localY: number;
  pageNumber?: number;
  pageXRatio?: number;
  pageYRatio?: number;
  scale: number;
};

type PdfGestureEvent = Event & {
  clientX?: number;
  clientY?: number;
  scale?: number;
};

const PDF_SCALE_SCROLL_SUPPRESSION_WINDOW_MS = 800;
const PDF_VIEWER_SCALE_PROPERTY_NAMES = ["currentScale", "currentScaleValue"] as const;
const PDF_WHEEL_DELTA_LINE_HEIGHT_PX = 16;
const PDF_WHEEL_DELTA_MODE_LINE = 1;
const PDF_WHEEL_DELTA_MODE_PAGE = 2;
const PDF_ZOOM_MAX_SCALE = 5;
const PDF_ZOOM_MIN_SCALE = 0.25;
const PDF_ZOOM_STEP = 0.2;
const PDF_ZOOMING_CLASS_NAME = "pdf-pane--zooming";

const pdfZoomViewers = new Set<PatchedPdfViewerPrototype>();
const pdfGestureBaseScales = new WeakMap<PatchedPdfViewerPrototype, number>();

const getPdfZoomPatchNow = (): number => {
  return typeof globalThis.performance?.now === "function" ? globalThis.performance.now() : Date.now();
};

const markPdfViewerScaleScrollSuppressed = (pdfViewer: PatchedPdfViewerPrototype): void => {
  pdfViewer.__sivflowSuppressScaleScrollUntil = getPdfZoomPatchNow() + PDF_SCALE_SCROLL_SUPPRESSION_WINDOW_MS;
};

const getPdfZoomViewerElement = (pdfViewer: PatchedPdfViewerPrototype): HTMLElement | null => {
  return pdfViewer.container?.querySelector<HTMLElement>(".pdfViewer") ?? null;
};

const getPdfZoomScale = (pdfViewer: PatchedPdfViewerPrototype): number => {
  const currentScale = Number(pdfViewer.currentScale);
  return Number.isFinite(currentScale) && currentScale > 0 ? currentScale : 1;
};

const getPdfZoomClientPoint = (container: HTMLElement, clientX?: number, clientY?: number): { clientX: number; clientY: number } => {
  const containerRect = container.getBoundingClientRect();
  return {
    clientX: typeof clientX === "number" && Number.isFinite(clientX) ? clientX : containerRect.left + container.clientWidth / 2,
    clientY: typeof clientY === "number" && Number.isFinite(clientY) ? clientY : containerRect.top + container.clientHeight / 2,
  };
};

const getNormalizedPdfWheelDeltaY = (event: WheelEvent, container: HTMLElement): number => {
  if (event.deltaMode === PDF_WHEEL_DELTA_MODE_LINE) return event.deltaY * PDF_WHEEL_DELTA_LINE_HEIGHT_PX;
  if (event.deltaMode === PDF_WHEEL_DELTA_MODE_PAGE) return event.deltaY * Math.max(container.clientHeight, 1);
  return event.deltaY;
};

const readPdfPageNumber = (pageElement: HTMLElement): number | null => {
  const rawPageNumber = pageElement.dataset.pageNumber ?? pageElement.getAttribute("data-page-number");
  const pageNumber = Number(rawPageNumber);
  return Number.isFinite(pageNumber) ? pageNumber : null;
};

const getPdfZoomPageElement = (viewerElement: HTMLElement, clientX: number, clientY: number): HTMLElement | null => {
  let closestPageElement: HTMLElement | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const pageElement of viewerElement.querySelectorAll<HTMLElement>(".page")) {
    const rect = pageElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return pageElement;

    const distanceX = clientX < rect.left ? rect.left - clientX : Math.max(clientX - rect.right, 0);
    const distanceY = clientY < rect.top ? rect.top - clientY : Math.max(clientY - rect.bottom, 0);
    const distance = distanceX + distanceY;
    if (distance >= closestDistance) continue;
    closestDistance = distance;
    closestPageElement = pageElement;
  }

  return closestPageElement;
};

const createPdfZoomAnchor = (pdfViewer: PatchedPdfViewerPrototype, container: HTMLElement, viewerElement: HTMLElement, clientX?: number, clientY?: number): PdfZoomAnchor => {
  const containerRect = container.getBoundingClientRect();
  const clientPoint = getPdfZoomClientPoint(container, clientX, clientY);
  const localX = Math.min(Math.max(clientPoint.clientX - containerRect.left, 0), container.clientWidth);
  const localY = Math.min(Math.max(clientPoint.clientY - containerRect.top, 0), container.clientHeight);
  const pageElement = getPdfZoomPageElement(viewerElement, clientPoint.clientX, clientPoint.clientY);
  const pageNumber = pageElement ? readPdfPageNumber(pageElement) : null;
  const pageRect = pageElement?.getBoundingClientRect();
  const pageXRatio = pageElement && pageRect && pageRect.width > 0 ? Math.min(Math.max((clientPoint.clientX - pageRect.left) / pageRect.width, 0), 1) : undefined;
  const pageYRatio = pageElement && pageRect && pageRect.height > 0 ? Math.min(Math.max((clientPoint.clientY - pageRect.top) / pageRect.height, 0), 1) : undefined;

  return {
    fallbackContentX: container.scrollLeft + localX - viewerElement.offsetLeft,
    fallbackContentY: container.scrollTop + localY - viewerElement.offsetTop,
    localX,
    localY,
    pageNumber: pageNumber ?? undefined,
    pageXRatio,
    pageYRatio,
    scale: getPdfZoomScale(pdfViewer),
  };
};

const restorePdfZoomAnchor = (pdfViewer: PatchedPdfViewerPrototype, container: HTMLElement, viewerElement: HTMLElement, anchor: PdfZoomAnchor): void => {
  if (typeof anchor.pageNumber === "number" && typeof anchor.pageXRatio === "number" && typeof anchor.pageYRatio === "number") {
    const pageElement = viewerElement.querySelector<HTMLElement>(`.page[data-page-number="${anchor.pageNumber}"]`);
    if (pageElement) {
      container.scrollLeft = Math.max(0, viewerElement.offsetLeft + pageElement.offsetLeft + pageElement.offsetWidth * anchor.pageXRatio - anchor.localX);
      container.scrollTop = Math.max(0, viewerElement.offsetTop + pageElement.offsetTop + pageElement.offsetHeight * anchor.pageYRatio - anchor.localY);
      return;
    }
  }

  const nextScale = getPdfZoomScale(pdfViewer);
  const scaleRatio = nextScale / anchor.scale;
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) return;
  container.scrollLeft = Math.max(0, viewerElement.offsetLeft + anchor.fallbackContentX * scaleRatio - anchor.localX);
  container.scrollTop = Math.max(0, viewerElement.offsetTop + anchor.fallbackContentY * scaleRatio - anchor.localY);
};

const restorePdfZoomAnchorAfterScale = (pdfViewer: PatchedPdfViewerPrototype, container: HTMLElement, viewerElement: HTMLElement, anchor: PdfZoomAnchor): void => {
  window.requestAnimationFrame(() => {
    restorePdfZoomAnchor(pdfViewer, container, viewerElement, anchor);
    window.requestAnimationFrame(() => restorePdfZoomAnchor(pdfViewer, container, viewerElement, anchor));
  });
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

const applyPdfScaleWithAnchor = (pdfViewer: PatchedPdfViewerPrototype, container: HTMLElement, viewerElement: HTMLElement, scale: number, clientX?: number, clientY?: number): void => {
  const anchor = createPdfZoomAnchor(pdfViewer, container, viewerElement, clientX, clientY);
  markPdfViewerScaleScrollSuppressed(pdfViewer);
  pdfViewer.currentScaleValue = String(scale);
  markPdfViewerScaleScrollSuppressed(pdfViewer);
  restorePdfZoomAnchorAfterScale(pdfViewer, container, viewerElement, anchor);
};

const handlePdfWheelZoomCapture = (event: WheelEvent): void => {
  if (!event.ctrlKey && !event.metaKey) return;
  const pdfViewer = getPdfZoomViewerForTarget(event.target);
  const container = pdfViewer?.container;
  const viewerElement = pdfViewer ? getPdfZoomViewerElement(pdfViewer) : null;
  if (!pdfViewer || !container || !viewerElement) return;

  const deltaY = getNormalizedPdfWheelDeltaY(event, container);
  const currentScale = getPdfZoomScale(pdfViewer);
  const nextScale = computeNextScaleFromWheel({ currentScale, deltaY, zoomStep: PDF_ZOOM_STEP, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE });
  if (nextScale === null || Math.abs(nextScale - currentScale) < 0.001) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  applyPdfScaleWithAnchor(pdfViewer, container, viewerElement, nextScale, event.clientX, event.clientY);
};

const handlePdfGestureStartCapture = (event: PdfGestureEvent): void => {
  const pdfViewer = getPdfZoomViewerForTarget(event.target);
  if (!pdfViewer) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  pdfGestureBaseScales.set(pdfViewer, getPdfZoomScale(pdfViewer));
};

const handlePdfGestureChangeCapture = (event: PdfGestureEvent): void => {
  const pdfViewer = getPdfZoomViewerForTarget(event.target);
  const container = pdfViewer?.container;
  const viewerElement = pdfViewer ? getPdfZoomViewerElement(pdfViewer) : null;
  if (!pdfViewer || !container || !viewerElement) return;

  const gestureScale = Number(event.scale);
  const currentScale = getPdfZoomScale(pdfViewer);
  const nextScale = computeNextScaleFromGesture({ currentScale, baseScale: pdfGestureBaseScales.get(pdfViewer) ?? null, gestureScale, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE });
  if (nextScale === null || Math.abs(nextScale - currentScale) < 0.001) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  applyPdfScaleWithAnchor(pdfViewer, container, viewerElement, nextScale, event.clientX, event.clientY);
};

const handlePdfGestureEndCapture = (event: PdfGestureEvent): void => {
  const pdfViewer = getPdfZoomViewerForTarget(event.target);
  if (!pdfViewer) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  pdfGestureBaseScales.delete(pdfViewer);
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

const patchPdfViewerScaleSetter = (prototype: PatchedPdfViewerPrototype, propertyName: (typeof PDF_VIEWER_SCALE_PROPERTY_NAMES)[number]): void => {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName) as PdfViewerScaleDescriptor | undefined;
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

  prototype.setDocument = function setDocumentWithZoomRegistration(...args: unknown[]) {
    if (this.container) pdfZoomViewers.add(this);
    return originalSetDocument.apply(this, args);
  };
};

const addPdfZoomCaptureListeners = (): void => {
  if (typeof window === "undefined") return;
  window.addEventListener("wheel", handlePdfWheelZoomCapture, { capture: true, passive: false });
  window.addEventListener("gesturestart", handlePdfGestureStartCapture as EventListener, { capture: true, passive: false });
  window.addEventListener("gesturechange", handlePdfGestureChangeCapture as EventListener, { capture: true, passive: false });
  window.addEventListener("gestureend", handlePdfGestureEndCapture as EventListener, { capture: true, passive: false });
};

const applyPdfViewerZoomPatch = (): void => {
  const viewerConstructor = PDFViewer as PatchedPdfViewerConstructor;
  if (viewerConstructor.__sivflowZoomPatchApplied) return;

  const prototype = viewerConstructor.prototype as PatchedPdfViewerPrototype;
  const originalScrollPageIntoView = prototype.scrollPageIntoView;
  if (typeof originalScrollPageIntoView !== "function") return;

  prototype.scrollPageIntoView = function scrollPageIntoViewWithoutScaleJump(...args: unknown[]) {
    if (shouldSuppressPdfViewerScaleScroll(this)) return undefined;
    return originalScrollPageIntoView.apply(this, args);
  };

  for (const propertyName of PDF_VIEWER_SCALE_PROPERTY_NAMES) patchPdfViewerScaleSetter(prototype, propertyName);
  patchPdfViewerSetDocument(prototype);
  addPdfZoomCaptureListeners();
  viewerConstructor.__sivflowZoomPatchApplied = true;
};

export { applyPdfViewerZoomPatch };
