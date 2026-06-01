import { applySelectionCaptureMask } from "@/features/selection-capture/selectionCaptureCanvasMask";
import type { SelectionCaptureArea, SelectionCaptureRect } from "@/features/selection-capture/selectionCapture.types";

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Failed to create selected PDF image."));
    }, "image/png");
  });
};

const intersectRects = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  otherLeft: number,
  otherTop: number,
  otherRight: number,
  otherBottom: number,
) => {
  const x = Math.max(left, otherLeft);
  const y = Math.max(top, otherTop);
  const width = Math.min(right, otherRight) - x;
  const height = Math.min(bottom, otherBottom) - y;

  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
};

export const capturePdfViewerAreaToBlob = async (
  container: HTMLElement,
  area: SelectionCaptureArea,
): Promise<Blob> => {
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = Math.max(1, Math.round(area.rect.width));
  outputCanvas.height = Math.max(1, Math.round(area.rect.height));

  const context = outputCanvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  const containerBounds = container.getBoundingClientRect();
  const canvases = Array.from(container.querySelectorAll("canvas"));
  let drewImage = false;

  for (const canvas of canvases) {
    const canvasBounds = canvas.getBoundingClientRect();
    const canvasLeft = canvasBounds.left - containerBounds.left;
    const canvasTop = canvasBounds.top - containerBounds.top;
    const canvasRight = canvasLeft + canvasBounds.width;
    const canvasBottom = canvasTop + canvasBounds.height;
    const intersection = intersectRects(
      area.rect.x,
      area.rect.y,
      area.rect.x + area.rect.width,
      area.rect.y + area.rect.height,
      canvasLeft,
      canvasTop,
      canvasRight,
      canvasBottom,
    );

    if (!intersection) continue;

    const sourceScaleX = canvas.width / canvasBounds.width;
    const sourceScaleY = canvas.height / canvasBounds.height;
    const sourceX = (intersection.x - canvasLeft) * sourceScaleX;
    const sourceY = (intersection.y - canvasTop) * sourceScaleY;
    const sourceWidth = intersection.width * sourceScaleX;
    const sourceHeight = intersection.height * sourceScaleY;
    const outputX = intersection.x - area.rect.x;
    const outputY = intersection.y - area.rect.y;

    context.drawImage(
      canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      outputX,
      outputY,
      intersection.width,
      intersection.height,
    );
    drewImage = true;
  }

  if (!drewImage) {
    throw new Error("No PDF canvas was found in the selected area.");
  }

  applySelectionCaptureMask(context, area);
  return toBlob(outputCanvas);
};

export const capturePdfViewerRectToBlob = async (
  container: HTMLElement,
  rect: SelectionCaptureRect,
): Promise<Blob> => {
  return capturePdfViewerAreaToBlob(container, { shape: "rectangle", rect });
};
