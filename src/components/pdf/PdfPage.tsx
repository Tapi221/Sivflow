import { memo, useEffect, useMemo, useRef, useState } from "react";
import { pdfjsLib } from "@/lib/pdfjs";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsPage,
  PdfJsRenderTask,
  PdfJsTextContent,
  PdfPageSearchMatch,
} from "@/components/pdf/pdfViewerTypes";
import {
  getErrorMessage,
  isPdfTextItem,
} from "@/components/pdf/pdfViewerTypes";
import { resolvePdfRenderBackingStore } from "@/components/pdf/pdfRenderQuality";
import {
  getCachedPdfPageBitmap,
  setCachedPdfPageBitmap,
} from "@/components/pdf/pdfPageBitmapCache";

interface PdfPageProps {
  pdf: PdfJsDocument;
  pageNumber: number;
  scale: number;
  opaqueCanvas: boolean;
  baseSize?: PageSize;
  searchMatches?: PdfPageSearchMatch[];
  activeSearchMatchIndex?: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
  getPageTextContent: (pageNumber: number) => Promise<PdfJsTextContent>;
  onPageSize?: (pageNumber: number, size: PageSize) => void;
}

type MeasuredPageState = {
  pageIdentity: string;
  size: PageSize | null;
};

type RenderState = {
  renderIdentity: string;
  rendered: boolean;
  error: string | null;
  warning: string | null;
};

type PdfJsTextLayerInstance = {
  render: () => Promise<void>;
};

type PdfJsTextLayerCtor = new (args: {
  container: HTMLDivElement;
  textContentSource: unknown;
  viewport: unknown;
}) => PdfJsTextLayerInstance;

type PdfJsLibWithTextLayer = {
  TextLayer?: PdfJsTextLayerCtor;
};

const buildPageIdentity = (pdf: PdfJsDocument, pageNumber: number) =>
  `${pageNumber}::${String(pdf)}`;

const buildRenderIdentity = (
  pdf: PdfJsDocument,
  pageNumber: number,
  scale: number,
  opaqueCanvas: boolean,
  devicePixelRatio: number,
) =>
  `${pageNumber}::${scale}::${opaqueCanvas ? "opaque" : "alpha"}::${devicePixelRatio.toFixed(3)}::${String(pdf)}`;

const getTextLayerCtor = () => {
  const ctor = (pdfjsLib as unknown as PdfJsLibWithTextLayer).TextLayer;

  if (!ctor) {
    throw new Error("PDF.js TextLayer API が利用できません");
  }

  return ctor;
};

const clearElement = (element: HTMLElement | null) => {
  element?.replaceChildren();
};

const arePageSizesEqual = (
  left: PageSize | undefined,
  right: PageSize | undefined,
) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return !left && !right;
  }

  return left.width === right.width && left.height === right.height;
};

const renderSearchHighlights = ({
  textLayerEl,
  overlayEl,
  matches,
  activeSearchMatchIndex,
}: {
  textLayerEl: HTMLDivElement;
  overlayEl: HTMLDivElement;
  matches: PdfPageSearchMatch[];
  activeSearchMatchIndex: number | undefined;
}) => {
  overlayEl.replaceChildren();

  if (matches.length === 0) {
    return;
  }

  const explicitTextSpans = Array.from(
    textLayerEl.querySelectorAll<HTMLSpanElement>("span[role='presentation']"),
  );
  const textSpans =
    explicitTextSpans.length > 0
      ? explicitTextSpans
      : Array.from(textLayerEl.querySelectorAll<HTMLSpanElement>("span"));

  if (textSpans.length === 0) {
    return;
  }

  const layerRect = textLayerEl.getBoundingClientRect();

  matches.forEach((match) => {
    const span = textSpans[match.itemIndex];
    const textNode = Array.from(span?.childNodes ?? []).find(
      (node) => node.nodeType === Node.TEXT_NODE,
    );

    if (!span || !textNode) {
      return;
    }

    const text = textNode.textContent ?? "";
    const start = Math.max(0, Math.min(match.start, text.length));
    const end = Math.max(start, Math.min(match.end, text.length));

    if (end <= start) {
      return;
    }

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);

    Array.from(range.getClientRects()).forEach((rect) => {
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const highlightEl = document.createElement("div");
      highlightEl.className =
        match.globalIndex === activeSearchMatchIndex
          ? "pdf-search-highlight is-active"
          : "pdf-search-highlight";
      highlightEl.style.left = `${rect.left - layerRect.left}px`;
      highlightEl.style.top = `${rect.top - layerRect.top}px`;
      highlightEl.style.width = `${rect.width}px`;
      highlightEl.style.height = `${rect.height}px`;

      overlayEl.append(highlightEl);
    });
  });
};

const readWindowDevicePixelRatio = () => {
  if (typeof window === "undefined") {
    return 1;
  }

  const rawDevicePixelRatio = window.devicePixelRatio;
  if (!Number.isFinite(rawDevicePixelRatio) || rawDevicePixelRatio <= 0) {
    return 1;
  }

  return rawDevicePixelRatio;
};

const PdfPageComponent = ({
  pdf,
  pageNumber,
  scale,
  opaqueCanvas,
  baseSize,
  searchMatches = [],
  activeSearchMatchIndex,
  getPage,
  getPageTextContent,
  onPageSize,
}: PdfPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const searchLayerRef = useRef<HTMLDivElement>(null);

  const pageIdentity = useMemo(
    () => buildPageIdentity(pdf, pageNumber),
    [pageNumber, pdf],
  );

  const [renderDevicePixelRatio, setRenderDevicePixelRatio] = useState<number>(
    () => readWindowDevicePixelRatio(),
  );

  const renderIdentity = useMemo(
    () =>
      buildRenderIdentity(
        pdf,
        pageNumber,
        scale,
        opaqueCanvas,
        renderDevicePixelRatio,
      ),
    [opaqueCanvas, pageNumber, pdf, renderDevicePixelRatio, scale],
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
    warning: null,
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
          warning: null,
        };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let animationFrameId: number | null = null;

    const syncRenderDevicePixelRatio = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;

        const nextDevicePixelRatio = readWindowDevicePixelRatio();
        setRenderDevicePixelRatio((previousDevicePixelRatio) =>
          Math.abs(previousDevicePixelRatio - nextDevicePixelRatio) < 0.001
            ? previousDevicePixelRatio
            : nextDevicePixelRatio,
        );
      });
    };

    syncRenderDevicePixelRatio();

    window.addEventListener("resize", syncRenderDevicePixelRatio, {
      passive: true,
    });
    window.visualViewport?.addEventListener(
      "resize",
      syncRenderDevicePixelRatio,
    );

    return () => {
      window.removeEventListener("resize", syncRenderDevicePixelRatio);
      window.visualViewport?.removeEventListener(
        "resize",
        syncRenderDevicePixelRatio,
      );

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

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

    void getPage(pageNumber)
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
    getPage,
    measuredPageState.pageIdentity,
    measuredPageState.size,
    onPageSize,
    pageIdentity,
    pageNumber,
  ]);

  useEffect(() => {
    if (scale <= 0) return;

    let cancelled = false;
    let renderTask: PdfJsRenderTask | null = null;
    let renderStartRafId: number | null = null;

    const run = async () => {
      try {
        const [page, textContent] = await Promise.all([
          getPage(pageNumber),
          getPageTextContent(pageNumber),
        ]);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const textLayerEl = textLayerRef.current;
        const searchLayerEl = searchLayerRef.current;

        if (!canvas || !textLayerEl || !searchLayerEl) {
          return;
        }

        const context = opaqueCanvas
          ? canvas.getContext("2d", { alpha: false })
          : canvas.getContext("2d");

        if (!context) {
          return;
        }

        const renderBackingStore = resolvePdfRenderBackingStore({
          viewportWidthPx: viewport.width,
          viewportHeightPx: viewport.height,
          devicePixelRatio: renderDevicePixelRatio,
        });

        canvas.width = renderBackingStore.canvasWidthPx;
        canvas.height = renderBackingStore.canvasHeightPx;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        textLayerEl.replaceChildren();
        searchLayerEl.replaceChildren();
        textLayerEl.dataset.textLayerReady = "pending";
        textLayerEl.dataset.textLayerExpectedText = "false";

        textLayerEl.style.width = `${viewport.width}px`;
        textLayerEl.style.height = `${viewport.height}px`;
        textLayerEl.style.setProperty("--scale-factor", String(viewport.scale));

        searchLayerEl.style.width = `${viewport.width}px`;
        searchLayerEl.style.height = `${viewport.height}px`;

        const cacheKey = renderIdentity;
        const cachedBitmap = getCachedPdfPageBitmap(cacheKey);

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (
          cachedBitmap &&
          cachedBitmap.width === canvas.width &&
          cachedBitmap.height === canvas.height
        ) {
          context.drawImage(cachedBitmap, 0, 0);
        } else {
          context.setTransform(
            renderBackingStore.scaleX,
            0,
            0,
            renderBackingStore.scaleY,
            0,
            0,
          );

          renderTask = page.render({
            canvasContext: context,
            viewport,
            intent: "display",
          });

          await renderTask.promise;
          if (cancelled) return;

          setCachedPdfPageBitmap(cacheKey, canvas);
        }

        const TextLayerCtor = getTextLayerCtor();
        const textLayer = new TextLayerCtor({
          container: textLayerEl,
          textContentSource: textContent,
          viewport,
        });

        await textLayer.render();
        if (cancelled) return;

        const textItemCount = textContent.items.filter(
          (item) => isPdfTextItem(item) && item.str.trim().length > 0,
        ).length;
        const textSpanCount = textLayerEl.querySelectorAll("span").length;
        const textLayerReady = textItemCount === 0 || textSpanCount > 0;
        const warning = textLayerReady
          ? null
          : "PDFテキストレイヤーの構築に失敗した可能性があります";

        textLayerEl.dataset.textLayerReady = textLayerReady ? "true" : "false";
        textLayerEl.dataset.textLayerExpectedText =
          textItemCount > 0 ? "true" : "false";

        setRenderState({
          renderIdentity,
          rendered: true,
          error: null,
          warning,
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
        clearElement(textLayerRef.current);
        clearElement(searchLayerRef.current);

        setRenderState({
          renderIdentity,
          rendered: false,
          error: "PDFの描画に失敗しました",
          warning: null,
        });
      }
    };

    renderStartRafId = window.requestAnimationFrame(() => {
      renderStartRafId = null;
      void run();
    });

    return () => {
      cancelled = true;

      if (renderStartRafId !== null) {
        window.cancelAnimationFrame(renderStartRafId);
      }

      try {
        renderTask?.cancel?.();
      } catch {
        // noop
      }

      clearElement(textLayerRef.current);
      clearElement(searchLayerRef.current);
    };
  }, [
    getPage,
    getPageTextContent,
    opaqueCanvas,
    pageNumber,
    renderDevicePixelRatio,
    renderIdentity,
    scale,
  ]);

  useEffect(() => {
    const searchLayerEl = searchLayerRef.current;

    if (!searchLayerEl) {
      return;
    }

    if (!activeRenderState.rendered) {
      clearElement(searchLayerEl);
      return;
    }

    const textLayerEl = textLayerRef.current;
    if (!textLayerEl) {
      clearElement(searchLayerEl);
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      renderSearchHighlights({
        textLayerEl,
        overlayEl: searchLayerEl,
        matches: searchMatches,
        activeSearchMatchIndex,
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [
    activeRenderState.rendered,
    activeSearchMatchIndex,
    renderIdentity,
    searchMatches,
  ]);

  const placeholderHeight =
    resolvedPageSize && resolvedPageSize.height > 0
      ? Math.max(1, Math.floor(resolvedPageSize.height * scale))
      : 0;

  return (
    <div
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

        {activeRenderState.warning && activeRenderState.rendered && (
          <div className="px-3 py-2 text-xs text-amber-600">
            {activeRenderState.warning}
          </div>
        )}

        <canvas ref={canvasRef} className="block" />

        <div
          ref={textLayerRef}
          className="pdf-text-layer pointer-events-auto absolute inset-0 overflow-hidden select-text"
        />

        <div
          ref={searchLayerRef}
          aria-hidden="true"
          className="pdf-search-layer absolute inset-0 overflow-hidden"
        />
      </div>
    </div>
  );
};

const arePdfPagePropsEqual = (left: PdfPageProps, right: PdfPageProps) =>
  left.pdf === right.pdf &&
  left.pageNumber === right.pageNumber &&
  left.scale === right.scale &&
  left.opaqueCanvas === right.opaqueCanvas &&
  arePageSizesEqual(left.baseSize, right.baseSize) &&
  left.searchMatches === right.searchMatches &&
  left.activeSearchMatchIndex === right.activeSearchMatchIndex &&
  left.getPage === right.getPage &&
  left.getPageTextContent === right.getPageTextContent &&
  left.onPageSize === right.onPageSize;

export const PdfPage = memo(PdfPageComponent, arePdfPagePropsEqual);
