import { useEffect, useMemo, useRef, useState } from "react";
import {
  PDF_PAGE_OBSERVER_ROOT_MARGIN,
  PDF_PAGE_OBSERVER_THRESHOLDS,
} from "@/components/pdf/pdfViewerConstants";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsRenderTask,
  PdfJsTextItem,
  PdfPageSearchMatch,
} from "@/components/pdf/pdfViewerTypes";
import { getErrorMessage } from "@/components/pdf/pdfViewerTypes";

interface PdfPageProps {
  pdf: PdfJsDocument;
  pageNumber: number;
  scale: number;
  opaqueCanvas: boolean;
  baseSize?: PageSize;
  rootEl: HTMLDivElement | null;
  searchMatches?: PdfPageSearchMatch[];
  activeSearchMatchIndex?: number;
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

type TextLayerState = {
  pageIdentity: string;
  items: PdfJsTextItem[];
  styles: Record<string, { fontFamily?: string; ascent?: number; descent?: number }>;
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

const multiplyTransform = (left: number[], right: number[]) => {
  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;

  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
};

const renderTextFragments = ({
  text,
  matches,
  activeSearchMatchIndex,
}: {
  text: string;
  matches: PdfPageSearchMatch[];
  activeSearchMatchIndex: number | undefined;
}) => {
  if (matches.length === 0) {
    return text;
  }

  const fragments: Array<string | JSX.Element> = [];
  let cursor = 0;

  matches
    .slice()
    .sort((left, right) => left.start - right.start)
    .forEach((match, index) => {
      if (match.start > cursor) {
        fragments.push(text.slice(cursor, match.start));
      }

      fragments.push(
        <mark
          key={`${match.globalIndex}-${index}`}
          className={
            match.globalIndex === activeSearchMatchIndex
              ? "rounded bg-amber-300/90 text-transparent"
              : "rounded bg-yellow-200/80 text-transparent"
          }
        >
          {text.slice(match.start, match.end)}
        </mark>,
      );

      cursor = Math.max(cursor, match.end);
    });

  if (cursor < text.length) {
    fragments.push(text.slice(cursor));
  }

  return fragments;
};

export const PdfPage = ({
  pdf,
  pageNumber,
  scale,
  opaqueCanvas,
  baseSize,
  rootEl,
  searchMatches = [],
  activeSearchMatchIndex,
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

  const [measuredPageState, setMeasuredPageState] = useState<MeasuredPageState>({
    pageIdentity: "",
    size: null,
  });

  const [renderState, setRenderState] = useState<RenderState>({
    renderIdentity: "",
    rendered: false,
    error: null,
  });

  const [textLayerState, setTextLayerState] = useState<TextLayerState>({
    pageIdentity: "",
    items: [],
    styles: {},
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
    if (!shouldRender) return;
    if (textLayerState.pageIdentity === pageIdentity && textLayerState.items.length > 0) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        if (cancelled) return;

        setTextLayerState({
          pageIdentity,
          items: textContent.items.filter(
            (item): item is PdfJsTextItem => typeof (item as PdfJsTextItem).str === "string",
          ),
          styles: textContent.styles ?? {},
        });
      } catch (errorValue) {
        if (cancelled) return;
        console.warn("[PdfViewer] text layer load error", errorValue);
        setTextLayerState({
          pageIdentity,
          items: [],
          styles: {},
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [pageIdentity, pageNumber, pdf, shouldRender, textLayerState.items.length, textLayerState.pageIdentity]);

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
      <div className="relative inline-block rounded-lg border border-slate-200 bg-white shadow-sm">
        {activeRenderState.error && !activeRenderState.rendered && (
          <div className="px-3 py-2 text-xs text-rose-500">
            {activeRenderState.error}
          </div>
        )}
        <canvas ref={canvasRef} className="block" />

        {activeRenderState.rendered && textLayerState.items.length > 0 && (
          <div
            className="pointer-events-auto absolute inset-0 overflow-hidden select-text"
            style={{
              width: `${Math.floor((resolvedPageSize?.width ?? 0) * scale)}px`,
              height: `${Math.floor((resolvedPageSize?.height ?? 0) * scale)}px`,
            }}
          >
            {textLayerState.items.map((item, itemIndex) => {
              const viewport = {
                width: (resolvedPageSize?.width ?? 1) * scale,
                height: (resolvedPageSize?.height ?? 1) * scale,
                scale,
                transform: [scale, 0, 0, -scale, 0, (resolvedPageSize?.height ?? 1) * scale],
              };

              const transform = multiplyTransform(viewport.transform, item.transform);
              const angle = Math.atan2(transform[1], transform[0]);
              const fontHeight = Math.max(1, Math.hypot(transform[2], transform[3]));
              const fontFamily =
                textLayerState.styles[item.fontName ?? ""]?.fontFamily ?? "sans-serif";
              const left = transform[4];
              const top = transform[5] - fontHeight;
              const itemMatches = searchMatches.filter((match) => match.itemIndex === itemIndex);

              return (
                <span
                  key={`${pageNumber}-${itemIndex}-${item.str.slice(0, 12)}`}
                  className="absolute whitespace-pre"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    fontSize: `${fontHeight}px`,
                    fontFamily,
                    transform: `rotate(${angle}rad)`,
                    transformOrigin: "left bottom",
                    color: "transparent",
                    WebkitTextStroke: "0 transparent",
                    userSelect: "text",
                    pointerEvents: "auto",
                  }}
                >
                  {renderTextFragments({
                    text: item.str,
                    matches: itemMatches,
                    activeSearchMatchIndex,
                  })}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
