import type { SelectionCaptureRect } from "./selectionCapture.types";



const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Failed to create image blob."));
    }, "image/png");
  });
};
const cropCanvasToBlob = async (sourceCanvas: HTMLCanvasElement, sourceRect: SelectionCaptureRect): Promise<Blob> => {
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = Math.max(1, Math.round(sourceRect.width));
  outputCanvas.height = Math.max(1, Math.round(sourceRect.height));

  const context = outputCanvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  context.drawImage(
    sourceCanvas,
    sourceRect.x,
    sourceRect.y,
    sourceRect.width,
    sourceRect.height,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height,
  );

  return toBlob(outputCanvas);
};



export { cropCanvasToBlob };
