import { useEffect, useMemo, useRef, useState } from "react";
import {
  PDF_PAGE_OBSERVER_ROOT_MARGIN,
  PDF_PAGE_OBSERVER_THRESHOLDS,
} from "@/components/pdf/pdfViewerConstants";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsRenderTask,
} from "@/components/pdf/pdfViewerTypes";
import { getErrorMessage } from "@/components/pdf/pdfViewerTypes";

interface PdfPageProps {
  pdf: PdfJsDocument;
  pageNumber: number;
  scale: number;
  opaqueCanvas: boolean;
  baseSize?: PageSize;
  rootEl: HTMLDivElement | null;
  onPageSize?: (pageNumber: number, size: PageSize) => void;
  onVisibilityChange?: (pageNumber: number, ratio: number) => void;
}

type MeasuredPageState = {
  pageIdentity: string;
  size: PageSize | null;
};

type RenderState = {
  renderIdentity: string;
  rendered: boolean;
  error: string | null;
};

const buildPageIdentity = (pdf: PdfJsDocument, pageNumber: number) =>
  `${pageNumber}::${String(pdf)}`;

const buildRenderIdentity = (
  pdf: PdfJsDocument,
  pageNumber: number,
  scale: number,
  opaqueCanvas: boolean,
) =>
  `${pageNumber}::${scale}::${opaqueCanvas ? "opaque" : "alpha"}::${String(pdf)}`;

export const PdfPage = ({
  pdf,
  pageNumber,
  scale,
  opaqueCanvas,
  baseSize,
  rootEl,
  onPageSize,
  onVisibilityChange,
}: PdfPageProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [shouldRender, setShouldRender] = useState(false);

  const pageIdentity = useMemo(
    () => buildPageIdentity(pdf, pageNumber),
    [pageNumber, pdf],
  );

  const renderIdentity = useMemo(
    () => buildRenderIdentity(pdf, pageNumber, scale, opaqueCanvas),
    [opaqueCanvas, pageNumber, pdf, scale],
  );

  const [measuredPageState, setMeasuredPageState] = useState<MeasuredPageState>(
    {
      pageIdentity: "",
      size: null,
    },
  );

  const [renderState, setRenderState] = useState<RenderState>({
    renderIdentity: "",
    rendered: false,
    error: null,
  });

  const resolvedPageSize =
    baseSize ??
    (measuredPageState.pageIdentity === pageIdentity
      ? measuredPageState.size
      : null);

  const activeRenderState =
    renderState.renderIdentity === renderIdentity
      ? renderState
      : {
          renderIdentity,
          rendered: false,
          error: null,
        };

  useEffect(() => {
    if (baseSize) {
      onPageSize?.(pageNumber, baseSize);
      return;
    }

    if (
      measuredPageState.pageIdentity === pageIdentity &&
      measuredPageState.size !== null
    ) {
      return;
    }

    let cancelled = false;

    void pdf
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const nextSize = { width: viewport.width, height: viewport.height };

        setMeasuredPageState({
          pageIdentity,
          size: nextSize,
        });
        onPageSize?.(pageNumber, nextSize);
      })
      .catch(() => {
        if (cancelled) return;

        const fallback = { width: 1, height: 1 };
        setMeasuredPageState({
          pageIdentity,
          size: fallback,
        });
        onPageSize?.(pageNumber, fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [
    baseSize,
    measuredPageState.pageIdentity,
    measuredPageState.size,
    onPageSize,
    pageIdentity,
    pageNumber,
    pdf,
  ]);

  useEffect(() => {
    const target = containerRef.current;
    if (!rootEl || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const ratio = entry.intersectionRatio;

        onVisibilityChange?.(pageNumber, ratio);

        if (entry.isIntersecting || ratio > 0) {
          setShouldRender(true);
        }
      },
      {
        root: rootEl,
        rootMargin: PDF_PAGE_OBSERVER_ROOT_MARGIN,
        threshold: PDF_PAGE_OBSERVER_THRESHOLDS,
      },
    );

    observer.observe(target);

    return () => {
      onVisibilityChange?.(pageNumber, 0);
      observer.disconnect();
    };
  }, [onVisibilityChange, pageNumber, rootEl]);

  useEffect(() => {
    if (!shouldRender || scale <= 0) return;

    let cancelled = false;
    let renderTask: PdfJsRenderTask | null = null;

    const run = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = opaqueCanvas
          ? canvas.getContext("2d", { alpha: false })
          : canvas.getContext("2d");

        if (!context) return;

        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        renderTask = page.render({
          canvasContext: context,
          viewport,
          intent: "display",
        });

        await renderTask.promise;
        if (cancelled) return;

        setRenderState({
          renderIdentity,
          rendered: true,
          error: null,
        });
      } catch (errorValue: unknown) {
        if (cancelled) return;

        const message = getErrorMessage(errorValue);
        if (
          message.includes("cancelled") ||
          message.includes("Rendering cancelled")
        ) {
          return;
        }

        console.error("[PdfViewer] render error", errorValue);
        setRenderState({
          renderIdentity,
          rendered: false,
          error: "PDFの描画に失敗しました",
        });
      }
    };

    void run();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel?.();
      } catch {
        // noop
      }
    };
  }, [opaqueCanvas, pageNumber, pdf, renderIdentity, scale, shouldRender]);

  const placeholderHeight =
    resolvedPageSize && resolvedPageSize.height > 0
      ? Math.max(1, Math.floor(resolvedPageSize.height * scale))
      : 0;

  return (
    <div
      ref={containerRef}
      className="flex w-full justify-center"
      style={
        placeholderHeight > 0
          ? { minHeight: `${placeholderHeight}px` }
          : undefined
      }
    >
      <div className="inline-block rounded-lg border border-slate-200 bg-white shadow-sm">
        {activeRenderState.error && !activeRenderState.rendered && (
          <div className="px-3 py-2 text-xs text-rose-500">
            {activeRenderState.error}
          </div>
        )}
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
};
