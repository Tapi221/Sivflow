import type { PdfDocumentController } from "@/components/pdf/hooks/usePdfDocument";

const OCR_DEFAULT_SCALE = 2;
const OCR_MAX_CANVAS_PIXELS = 4_000_000;

export const renderPdfPageForOcr = async ({
  acquirePage,
  pageNumber,
  scale = OCR_DEFAULT_SCALE,
}: {
  acquirePage: PdfDocumentController["acquirePage"];
  pageNumber: number;
  scale?: number;
}) => {
  const pageLease = await acquirePage(pageNumber);

  try {
    const baseViewport = pageLease.page.getViewport({ scale });
    const basePixels = Math.max(1, baseViewport.width * baseViewport.height);
    const normalizedScale =
      basePixels > OCR_MAX_CANVAS_PIXELS
        ? scale * Math.sqrt(OCR_MAX_CANVAS_PIXELS / basePixels)
        : scale;
    const viewport = pageLease.page.getViewport({ scale: normalizedScale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Failed to create OCR canvas context");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderTask = pageLease.page.render({
      canvasContext: context,
      viewport,
      intent: "display",
    });

    await renderTask.promise;

    return {
      canvas,
      width: canvas.width,
      height: canvas.height,
      scale: normalizedScale,
    };
  } finally {
    pageLease.release();
  }
};
