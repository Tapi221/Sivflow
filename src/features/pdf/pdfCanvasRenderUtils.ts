import type { PdfPageBitmap } from "./pdfPageBitmapCache";
import type { PdfRenderBackingStore } from "./pdfRenderQuality";
import type { PdfJsRenderTransform, PdfJsViewport } from "./pdfViewer.types";

export interface PdfDetachedCanvasSurface {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
}

const PDF_RENDER_TRANSFORM_EPSILON = 0.0001;

const getCanvas2dContext = ({
  canvas,
  opaqueCanvas,
}: {
  canvas: HTMLCanvasElement;
  opaqueCanvas: boolean;
}) => {
  return opaqueCanvas
    ? canvas.getContext("2d", { alpha: false })
    : canvas.getContext("2d");
};

const resetCanvasSurface = ({
  canvas,
  context,
  opaqueCanvas,
}: {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  opaqueCanvas: boolean;
}) => {
  context.setTransform(1, 0, 0, 1, 0, 0);

  if (opaqueCanvas) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
};

export const createDetachedPdfCanvasSurface = ({
  renderBackingStore,
  opaqueCanvas,
}: {
  renderBackingStore: PdfRenderBackingStore;
  opaqueCanvas: boolean;
}): PdfDetachedCanvasSurface | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = renderBackingStore.canvasWidthPx;
  canvas.height = renderBackingStore.canvasHeightPx;

  const context = getCanvas2dContext({ canvas, opaqueCanvas });
  if (!context) {
    return null;
  }

  resetCanvasSurface({
    canvas,
    context,
    opaqueCanvas,
  });

  return {
    canvas,
    context,
  };
};

export const prepareDetachedPdfCanvasSurfaceForRender = ({
  surface,
  renderBackingStore,
  opaqueCanvas,
}: {
  surface: PdfDetachedCanvasSurface;
  renderBackingStore: PdfRenderBackingStore;
  opaqueCanvas: boolean;
}) => {
  surface.canvas.width = renderBackingStore.canvasWidthPx;
  surface.canvas.height = renderBackingStore.canvasHeightPx;

  resetCanvasSurface({
    canvas: surface.canvas,
    context: surface.context,
    opaqueCanvas,
  });
};

export const resolvePdfRenderTransform = (
  renderBackingStore: PdfRenderBackingStore,
): PdfJsRenderTransform | undefined => {
  if (
    Math.abs(renderBackingStore.scaleX - 1) < PDF_RENDER_TRANSFORM_EPSILON &&
    Math.abs(renderBackingStore.scaleY - 1) < PDF_RENDER_TRANSFORM_EPSILON
  ) {
    return undefined;
  }

  return [renderBackingStore.scaleX, 0, 0, renderBackingStore.scaleY, 0, 0];
};

export const commitPdfBitmapToCanvas = ({
  targetCanvas,
  bitmap,
  viewport,
  renderBackingStore,
  opaqueCanvas,
}: {
  targetCanvas: HTMLCanvasElement;
  bitmap: PdfPageBitmap | HTMLCanvasElement;
  viewport: PdfJsViewport;
  renderBackingStore: PdfRenderBackingStore;
  opaqueCanvas: boolean;
}) => {
  targetCanvas.width = renderBackingStore.canvasWidthPx;
  targetCanvas.height = renderBackingStore.canvasHeightPx;
  targetCanvas.style.width = `${viewport.width}px`;
  targetCanvas.style.height = `${viewport.height}px`;

  const context = getCanvas2dContext({
    canvas: targetCanvas,
    opaqueCanvas,
  });

  if (!context) {
    return false;
  }

  resetCanvasSurface({
    canvas: targetCanvas,
    context,
    opaqueCanvas,
  });

  context.drawImage(bitmap, 0, 0);
  return true;
};

export const applyPdfTextLayerViewportStyles = ({
  element,
  viewport,
}: {
  element: HTMLDivElement;
  viewport: PdfJsViewport;
}) => {
  element.style.width = `${viewport.width}px`;
  element.style.height = `${viewport.height}px`;
  element.style.setProperty("--scale-factor", String(viewport.scale));
};

export const applyPdfOverlayViewportStyles = ({
  element,
  viewport,
}: {
  element: HTMLDivElement;
  viewport: PdfJsViewport;
}) => {
  element.style.width = `${viewport.width}px`;
  element.style.height = `${viewport.height}px`;
};
