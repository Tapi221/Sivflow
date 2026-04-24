import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsPage,
  PdfJsRenderTask,
} from "./pdfViewerTypes";

interface PdfThumbnailPageProps {
  documentKey: string;
  pdf: PdfJsDocument;
  pageNumber: number;
  boxWidthPx: number;
  boxHeightPx: number;
  baseSize?: PageSize;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
}

const readDevicePixelRatio = () => {
  if (typeof window === "undefined") {
    return 1;
  }

  const value = window.devicePixelRatio;
  return Number.isFinite(value) && value > 0 ? value : 1;
};

const normalizePositiveFinite = (value: number, fallback: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
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
  scale,
  boxWidthPx,
  boxHeightPx,
  devicePixelRatio,
}: {
  documentKey: string;
  pageNumber: number;
  scale: number;
  boxWidthPx: number;
  boxHeightPx: number;
  devicePixelRatio: number;
}) => {
  return [
    documentKey,
    pageNumber,
    scale.toFixed(6),
    boxWidthPx,
    boxHeightPx,
    devicePixelRatio.toFixed(3),
  ].join("::");
};

export const PdfThumbnailPage = ({
  documentKey,
  pdf: _pdf,
  pageNumber,
  boxWidthPx,
  boxHeightPx,
  baseSize,
  acquirePage,
  onPageSize,
}: PdfThumbnailPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderPassRef = useRef(0);
  const lastRenderIdentityRef = useRef<string | null>(null);
  const [measuredSize, setMeasuredSize] = useState<PageSize | null>(
    baseSize ?? null,
  );

  const resolvedSize = baseSize ?? measuredSize;

  const layout = useMemo(() => {
    if (!resolvedSize) {
      return null;
    }

    return resolveContainLayout({
      pageSize: resolvedSize,
      boxWidthPx,
      boxHeightPx,
    });
  }, [boxHeightPx, boxWidthPx, resolvedSize]);

  useEffect(() => {
    if (baseSize) {
      setMeasuredSize((previousSize) => {
        if (
          previousSize &&
          previousSize.width === baseSize.width &&
          previousSize.height === baseSize.height
        ) {
          return previousSize;
        }

        return baseSize;
      });
      return;
    }

    let disposed = false;

    void acquirePage(pageNumber)
      .then(({ page, release }) => {
        try {
          if (disposed) {
            return;
          }

          const viewport = page.getViewport({ scale: 1 });
          const nextSize = {
            width: viewport.width,
            height: viewport.height,
          };

          setMeasuredSize(nextSize);
          onPageSize(pageNumber, nextSize);
        } finally {
          release();
        }
      })
      .catch(() => {
        if (disposed) {
          return;
        }

        const fallbackSize = { width: boxWidthPx, height: boxHeightPx };
        setMeasuredSize(fallbackSize);
        onPageSize(pageNumber, fallbackSize);
      });

    return () => {
      disposed = true;
    };
  }, [acquirePage, baseSize, boxHeightPx, boxWidthPx, onPageSize, pageNumber]);

  useEffect(() => {
    if (!layout) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const devicePixelRatio = readDevicePixelRatio();
    const renderIdentity = buildRenderIdentity({
      documentKey,
      pageNumber,
      scale: layout.scale,
      boxWidthPx,
      boxHeightPx,
      devicePixelRatio,
    });

    canvas.style.width = `${layout.cssWidthPx}px`;
    canvas.style.height = `${layout.cssHeightPx}px`;

    if (lastRenderIdentityRef.current === renderIdentity) {
      return;
    }

    lastRenderIdentityRef.current = renderIdentity;

    const renderPass = renderPassRef.current + 1;
    renderPassRef.current = renderPass;

    let disposed = false;
    let renderTask: PdfJsRenderTask | null = null;
    let releasePage: (() => void) | null = null;

    const isStale = () => disposed || renderPassRef.current !== renderPass;

    const run = async () => {
      const pageLease = await acquirePage(pageNumber);

      if (isStale()) {
        pageLease.release();
        return;
      }

      releasePage = pageLease.release;

      const page = pageLease.page;
      const viewport = page.getViewport({ scale: layout.scale });
      const canvasWidthPx = Math.max(1, Math.ceil(layout.cssWidthPx * devicePixelRatio));
      const canvasHeightPx = Math.max(1, Math.ceil(layout.cssHeightPx * devicePixelRatio));

      canvas.width = canvasWidthPx;
      canvas.height = canvasHeightPx;

      const context = canvas.getContext("2d", { alpha: true });
      if (!context) {
        return;
      }

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, layout.cssWidthPx, layout.cssHeightPx);

      renderTask = page.render({
        canvasContext: context,
        viewport,
        intent: "display",
      });

      await renderTask.promise;
    };

    void run().catch(() => {
      if (lastRenderIdentityRef.current === renderIdentity) {
        lastRenderIdentityRef.current = null;
      }
    });

    return () => {
      disposed = true;

      if (renderPassRef.current === renderPass) {
        renderPassRef.current += 1;
      }

      try {
        renderTask?.cancel?.();
      } catch {
        // noop
      }

      releasePage?.();
    };
  }, [acquirePage, boxHeightPx, boxWidthPx, documentKey, layout, pageNumber]);

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
