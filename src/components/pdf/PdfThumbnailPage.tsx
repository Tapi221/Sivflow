import { useEffect, useRef } from "react";
import type { PageSize, PdfJsPage, PdfJsRenderTask } from "./pdfViewerTypes";
import {
  getCachedPdfThumbnailBitmap,
  setCachedPdfThumbnailBitmap,
} from "./pdfThumbnailBitmapCache";
import {
  isPdfThumbnailRenderCancelledError,
  schedulePdfThumbnailRender,
  type PdfThumbnailQueuedRender,
} from "./pdfThumbnailRenderQueue";

interface PdfThumbnailPageProps {
  documentKey: string;
  pageNumber: number;
  boxWidthPx: number;
  boxHeightPx: number;
  baseSize?: PageSize;
  renderPriority: number;
  renderVersion: number;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
}

const MAX_THUMBNAIL_DEVICE_PIXEL_RATIO = 2;

const readDevicePixelRatio = () => {
  if (typeof window === "undefined") {
    return 1;
  }

  const value = window.devicePixelRatio;
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.min(value, MAX_THUMBNAIL_DEVICE_PIXEL_RATIO);
};

const normalizePositiveFinite = (value: number, fallback: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
};

const arePageSizesEqual = (left: PageSize, right: PageSize) => {
  return left.width === right.width && left.height === right.height;
};

const resolveContainLayout = ({
  pageSize,
  boxWidthPx,
  boxHeightPx,
}: {
  pageSize: PageSize;
  boxWidthPx: number;
  boxHeightPx: number;
}) => {
  const safePageWidthPx = normalizePositiveFinite(pageSize.width, boxWidthPx);
  const safePageHeightPx = normalizePositiveFinite(pageSize.height, boxHeightPx);
  const widthScale = boxWidthPx / safePageWidthPx;
  const heightScale = boxHeightPx / safePageHeightPx;
  const scale = Math.min(widthScale, heightScale);

  return {
    scale,
    cssWidthPx: Math.max(1, safePageWidthPx * scale),
    cssHeightPx: Math.max(1, safePageHeightPx * scale),
  };
};

const buildRenderIdentity = ({
  documentKey,
  pageNumber,
  boxWidthPx,
  boxHeightPx,
  devicePixelRatio,
}: {
  documentKey: string;
  pageNumber: number;
  boxWidthPx: number;
  boxHeightPx: number;
  devicePixelRatio: number;
}) => {
  return [
    documentKey,
    pageNumber,
    boxWidthPx,
    boxHeightPx,
    devicePixelRatio.toFixed(3),
  ].join("::");
};

const resolveCanvasPixelSize = ({
  cssWidthPx,
  cssHeightPx,
  devicePixelRatio,
}: {
  cssWidthPx: number;
  cssHeightPx: number;
  devicePixelRatio: number;
}) => {
  return {
    canvasWidthPx: Math.max(1, Math.ceil(cssWidthPx * devicePixelRatio)),
    canvasHeightPx: Math.max(1, Math.ceil(cssHeightPx * devicePixelRatio)),
  };
};

const applyCanvasSize = ({
  canvas,
  cssWidthPx,
  cssHeightPx,
  canvasWidthPx,
  canvasHeightPx,
}: {
  canvas: HTMLCanvasElement;
  cssWidthPx: number;
  cssHeightPx: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
}) => {
  canvas.style.width = `${cssWidthPx}px`;
  canvas.style.height = `${cssHeightPx}px`;

  if (canvas.width !== canvasWidthPx) {
    canvas.width = canvasWidthPx;
  }

  if (canvas.height !== canvasHeightPx) {
    canvas.height = canvasHeightPx;
  }
};

const commitCachedBitmapToCanvas = ({
  canvas,
  bitmap,
  cssWidthPx,
  cssHeightPx,
  canvasWidthPx,
  canvasHeightPx,
}: {
  canvas: HTMLCanvasElement;
  bitmap: HTMLCanvasElement | ImageBitmap;
  cssWidthPx: number;
  cssHeightPx: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
}) => {
  applyCanvasSize({
    canvas,
    cssWidthPx,
    cssHeightPx,
    canvasWidthPx,
    canvasHeightPx,
  });

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return false;
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvasWidthPx, canvasHeightPx);
  context.drawImage(bitmap, 0, 0);
  return true;
};

const prepareCanvasForPdfRender = ({
  canvas,
  cssWidthPx,
  cssHeightPx,
  canvasWidthPx,
  canvasHeightPx,
  devicePixelRatio,
}: {
  canvas: HTMLCanvasElement;
  cssWidthPx: number;
  cssHeightPx: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  devicePixelRatio: number;
}) => {
  applyCanvasSize({
    canvas,
    cssWidthPx,
    cssHeightPx,
    canvasWidthPx,
    canvasHeightPx,
  });

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return null;
  }

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, cssWidthPx, cssHeightPx);
  return context;
};

const throwIfAborted = (signal: AbortSignal) => {
  if (signal.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new Error("PDF thumbnail render was cancelled");
  }
};

export const PdfThumbnailPage = ({
  documentKey,
  pageNumber,
  boxWidthPx,
  boxHeightPx,
  baseSize,
  renderPriority,
  renderVersion,
  acquirePage,
  onPageSize,
}: PdfThumbnailPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderPassRef = useRef(0);
  const lastRenderIdentityRef = useRef<string | null>(null);
  const baseSizeRef = useRef<PageSize | undefined>(baseSize);

  useEffect(() => {
    baseSizeRef.current = baseSize;
  }, [baseSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const devicePixelRatio = readDevicePixelRatio();
    const renderIdentity = buildRenderIdentity({
      documentKey,
      pageNumber,
      boxWidthPx,
      boxHeightPx,
      devicePixelRatio,
    });

    const commitCachedRender = (pageSize: PageSize) => {
      const layout = resolveContainLayout({
        pageSize,
        boxWidthPx,
        boxHeightPx,
      });
      const { canvasWidthPx, canvasHeightPx } = resolveCanvasPixelSize({
        cssWidthPx: layout.cssWidthPx,
        cssHeightPx: layout.cssHeightPx,
        devicePixelRatio,
      });
      const cachedBitmap = getCachedPdfThumbnailBitmap({
        key: renderIdentity,
        width: canvasWidthPx,
        height: canvasHeightPx,
      });

      if (!cachedBitmap) {
        return false;
      }

      return commitCachedBitmapToCanvas({
        canvas,
        bitmap: cachedBitmap.bitmap,
        cssWidthPx: layout.cssWidthPx,
        cssHeightPx: layout.cssHeightPx,
        canvasWidthPx,
        canvasHeightPx,
      });
    };

    const baseSizeSnapshot = baseSizeRef.current;

    if (baseSizeSnapshot && commitCachedRender(baseSizeSnapshot)) {
      lastRenderIdentityRef.current = renderIdentity;
      return;
    }

    if (lastRenderIdentityRef.current === renderIdentity) {
      return;
    }

    lastRenderIdentityRef.current = renderIdentity;

    const renderPass = renderPassRef.current + 1;
    renderPassRef.current = renderPass;

    let disposed = false;
    let renderTask: PdfJsRenderTask | null = null;
    let queuedRender: PdfThumbnailQueuedRender<void> | null = null;
    let releasePage: (() => void) | null = null;

    const isStale = () => disposed || renderPassRef.current !== renderPass;

    const releaseActivePage = () => {
      const release = releasePage;
      releasePage = null;
      release?.();
    };

    const cancelRenderTask = () => {
      try {
        renderTask?.cancel?.();
      } catch {
        // noop
      }
    };

    const run = async ({ signal }: { signal: AbortSignal }) => {
      const handleAbort = () => {
        cancelRenderTask();
        releaseActivePage();
      };

      signal.addEventListener("abort", handleAbort, { once: true });

      try {
        throwIfAborted(signal);
        const pageLease = await acquirePage(pageNumber);

        if (isStale() || signal.aborted) {
          pageLease.release();
          throwIfAborted(signal);
          return;
        }

        releasePage = pageLease.release;

        const page = pageLease.page;
        const baseViewport = page.getViewport({ scale: 1 });
        const pageSize = {
          width: baseViewport.width,
          height: baseViewport.height,
        };

        const activeBaseSize = baseSizeRef.current;
        if (!activeBaseSize || !arePageSizesEqual(activeBaseSize, pageSize)) {
          onPageSize(pageNumber, pageSize);
        }

        const layout = resolveContainLayout({
          pageSize,
          boxWidthPx,
          boxHeightPx,
        });
        const viewport = page.getViewport({ scale: layout.scale });
        const { canvasWidthPx, canvasHeightPx } = resolveCanvasPixelSize({
          cssWidthPx: layout.cssWidthPx,
          cssHeightPx: layout.cssHeightPx,
          devicePixelRatio,
        });

        if (isStale()) {
          return;
        }
        throwIfAborted(signal);

        const cachedBitmap = getCachedPdfThumbnailBitmap({
          key: renderIdentity,
          width: canvasWidthPx,
          height: canvasHeightPx,
        });

        if (cachedBitmap) {
          commitCachedBitmapToCanvas({
            canvas,
            bitmap: cachedBitmap.bitmap,
            cssWidthPx: layout.cssWidthPx,
            cssHeightPx: layout.cssHeightPx,
            canvasWidthPx,
            canvasHeightPx,
          });
          return;
        }

        const context = prepareCanvasForPdfRender({
          canvas,
          cssWidthPx: layout.cssWidthPx,
          cssHeightPx: layout.cssHeightPx,
          canvasWidthPx,
          canvasHeightPx,
          devicePixelRatio,
        });

        if (!context) {
          return;
        }

        renderTask = page.render({
          canvasContext: context,
          viewport,
          intent: "display",
        });

        await renderTask.promise;

        if (isStale()) {
          return;
        }
        throwIfAborted(signal);

        void setCachedPdfThumbnailBitmap({
          key: renderIdentity,
          documentKey,
          canvas,
        }).catch(() => {
          // Cache failures must not break thumbnail rendering.
        });
      } finally {
        signal.removeEventListener("abort", handleAbort);
        releaseActivePage();
      }
    };

    queuedRender = schedulePdfThumbnailRender({
      priority: renderPriority,
      run,
    });

    void queuedRender.promise.catch((errorValue) => {
      if (lastRenderIdentityRef.current === renderIdentity) {
        lastRenderIdentityRef.current = null;
      }

      if (isPdfThumbnailRenderCancelledError(errorValue)) {
        return;
      }
    });

    return () => {
      disposed = true;

      if (renderPassRef.current === renderPass) {
        renderPassRef.current += 1;
      }

      queuedRender?.cancel();
      cancelRenderTask();
      releaseActivePage();

      if (lastRenderIdentityRef.current === renderIdentity) {
        lastRenderIdentityRef.current = null;
      }
    };
  }, [
    acquirePage,
    boxHeightPx,
    boxWidthPx,
    documentKey,
    onPageSize,
    pageNumber,
    renderPriority,
    renderVersion,
  ]);

  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-lg bg-slate-100"
      style={{
        width: `${boxWidthPx}px`,
        height: `${boxHeightPx}px`,
      }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};
