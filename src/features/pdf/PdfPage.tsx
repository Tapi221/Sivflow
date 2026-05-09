import { memo, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pdfjsLib } from "@/lib/pdfjs";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsPage,
  PdfJsRenderTask,
  PdfJsTextContent,
  PdfPageSearchMatch,
} from "@/features/pdf/pdfViewerTypes";
import {
  getPdfErrorDetails,
  isPdfAbortError,
  isPdfTextItem,
} from "@/features/pdf/pdfViewerTypes";
import { resolvePdfRenderBackingStore } from "@/features/pdf/pdfRenderQuality";
import {
  getCachedPdfPageBitmap,
  setCachedPdfPageBitmap,
} from "@/features/pdf/pdfPageBitmapCache";
import {
  applyPdfOverlayViewportStyles,
  applyPdfTextLayerViewportStyles,
  commitPdfBitmapToCanvas,
  createDetachedPdfCanvasSurface,
  prepareDetachedPdfCanvasSurfaceForRender,
} from "@/features/pdf/pdfCanvasRenderUtils";

interface PdfPageProps {
  documentKey: string;
  pdf: PdfJsDocument;
  pageNumber: number;
  scale: number;
  opaqueCanvas: boolean;
  renderTextLayer: boolean;
  className?: string;
  baseSize?: PageSize;
  searchMatches?: PdfPageSearchMatch[];
  activeSearchMatchIndex?: number;
  acquirePage: (pageNumber: number) => Promise<{
    page: PdfJsPage;
    release: () => void;
  }>;
  getPageTextContent: (pageNumber: number) => Promise<PdfJsTextContent>;
  onPageSize?: (pageNumber: number, size: PageSize) => void;
}

type MeasuredPageState = {
  pageIdentity: string;
  size: PageSize | null;
};

type CanvasRenderState = {
  renderIdentity: string;
  rendered: boolean;
  error: string | null;
};

type TextLayerState = {
  textLayerIdentity: string;
  ready: boolean;
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

const buildPageIdentity = (documentKey: string, pageNumber: number) =>
  `${documentKey}::${pageNumber}`;

const buildRenderIdentity = (
  documentKey: string,
  pageNumber: number,
  scale: number,
  opaqueCanvas: boolean,
  devicePixelRatio: number,
) =>
  `${documentKey}::${pageNumber}::${scale}::${
    opaqueCanvas ? "opaque" : "alpha"
  }::${devicePixelRatio.toFixed(3)}`;

const buildTextLayerIdentity = (
  documentKey: string,
  pageNumber: number,
  scale: number,
) => `${documentKey}::${pageNumber}::text::${scale}`;

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
  documentKey,
  pdf,
  pageNumber,
  scale,
  opaqueCanvas,
  renderTextLayer,
  className,
  baseSize,
  searchMatches = [],
  activeSearchMatchIndex,
  acquirePage,
  getPageTextContent,
  onPageSize,
}: PdfPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const searchLayerRef = useRef<HTMLDivElement>(null);
  const canvasRenderPassIdRef = useRef(0);
  const textLayerPassIdRef = useRef(0);

  const documentFingerprint = useMemo(() => {
    const fingerprint = pdf.fingerprints?.[0] ?? null;
    return typeof fingerprint === "string" && fingerprint.length > 0
      ? fingerprint
      : null;
  }, [pdf]);

  const pageIdentity = useMemo(
    () => buildPageIdentity(documentKey, pageNumber),
    [documentKey, pageNumber],
  );

  const [renderDevicePixelRatio, setRenderDevicePixelRatio] = useState<number>(
    () => readWindowDevicePixelRatio(),
  );

  const renderIdentity = useMemo(
    () =>
      buildRenderIdentity(
        documentKey,
        pageNumber,
        scale,
        opaqueCanvas,
        renderDevicePixelRatio,
      ),
    [documentKey, opaqueCanvas, pageNumber, renderDevicePixelRatio, scale],
  );

  const textLayerIdentity = useMemo(
    () => buildTextLayerIdentity(documentKey, pageNumber, scale),
    [documentKey, pageNumber, scale],
  );

  const [measuredPageState, setMeasuredPageState] = useState<MeasuredPageState>(
    {
      pageIdentity: "",
      size: null,
    },
  );

  const [canvasRenderState, setCanvasRenderState] = useState<CanvasRenderState>(
    {
      renderIdentity: "",
      rendered: false,
      error: null,
    },
  );

  const [textLayerState, setTextLayerState] = useState<TextLayerState>({
    textLayerIdentity: "",
    ready: false,
    warning: null,
  });

  const resolvedPageSize =
    baseSize ??
    (measuredPageState.pageIdentity === pageIdentity
      ? measuredPageState.size
      : null);

  const activeCanvasRenderState =
    canvasRenderState.renderIdentity === renderIdentity
      ? canvasRenderState
      : {
          renderIdentity,
          rendered: false,
          error: null,
        };

  const activeTextLayerState =
    textLayerState.textLayerIdentity === textLayerIdentity
      ? textLayerState
      : {
          textLayerIdentity,
          ready: false,
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

    void acquirePage(pageNumber)
      .then(({ page, release }) => {
        if (cancelled) {
          release();
          return;
        }

        try {
          const viewport = page.getViewport({ scale: 1 });
          const nextSize = { width: viewport.width, height: viewport.height };

          setMeasuredPageState({
            pageIdentity,
            size: nextSize,
          });
          onPageSize?.(pageNumber, nextSize);
        } finally {
          release();
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

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
    acquirePage,
    baseSize,
    measuredPageState.pageIdentity,
    measuredPageState.size,
    onPageSize,
    pageIdentity,
    pageNumber,
  ]);

  useEffect(() => {
    if (scale <= 0) {
      return;
    }

    const renderPassId = canvasRenderPassIdRef.current + 1;
    canvasRenderPassIdRef.current = renderPassId;

    let disposed = false;
    let renderTask: PdfJsRenderTask | null = null;
    let renderStartRafId: number | null = null;
    let activePageRelease: (() => void) | null = null;

    const releasePage = () => {
      if (!activePageRelease) {
        return;
      }

      const release = activePageRelease;
      activePageRelease = null;
      release();
    };

    const isStale = () =>
      disposed || canvasRenderPassIdRef.current !== renderPassId;

    const commitBitmap = ({
      bitmap,
      viewport,
      renderBackingStore,
    }: {
      bitmap: HTMLCanvasElement | ImageBitmap;
      viewport: ReturnType<PdfJsPage["getViewport"]>;
      renderBackingStore: ReturnType<typeof resolvePdfRenderBackingStore>;
    }) => {
      if (isStale()) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("PDF の描画先 canvas を取得できません");
      }

      const didCommit = commitPdfBitmapToCanvas({
        targetCanvas: canvas,
        bitmap,
        viewport,
        renderBackingStore,
        opaqueCanvas,
      });

      if (!didCommit) {
        throw new Error("PDF の描画先 canvas を初期化できません");
      }

      if (isStale()) {
        return;
      }

      setCanvasRenderState({
        renderIdentity,
        rendered: true,
        error: null,
      });
    };

    const run = async () => {
      try {
        const pageLease = await acquirePage(pageNumber);
        if (isStale()) {
          pageLease.release();
          return;
        }

        activePageRelease = pageLease.release;
        const page = pageLease.page;
        const viewport = page.getViewport({ scale });
        const visibleCanvas = canvasRef.current;
        if (visibleCanvas) {
          visibleCanvas.style.width = `${viewport.width}px`;
          visibleCanvas.style.height = `${viewport.height}px`;
        }

        const renderBackingStore = resolvePdfRenderBackingStore({
          viewportWidthPx: viewport.width,
          viewportHeightPx: viewport.height,
          devicePixelRatio: renderDevicePixelRatio,
        });

        const cacheKey = renderIdentity;
        const cachedBitmap = getCachedPdfPageBitmap(cacheKey);

        if (
          cachedBitmap &&
          cachedBitmap.width === renderBackingStore.canvasWidthPx &&
          cachedBitmap.height === renderBackingStore.canvasHeightPx
        ) {
          commitBitmap({
            bitmap: cachedBitmap,
            viewport,
            renderBackingStore,
          });
          return;
        }

        const renderSurface = createDetachedPdfCanvasSurface({
          renderBackingStore,
          opaqueCanvas,
        });

        if (!renderSurface) {
          throw new Error("PDF のバックバッファを作成できません");
        }

        prepareDetachedPdfCanvasSurfaceForRender({
          surface: renderSurface,
          renderBackingStore,
          opaqueCanvas,
        });

        renderTask = page.render({
          canvasContext: renderSurface.context,
          viewport,
          intent: "display",
        });

        await renderTask.promise;
        if (isStale()) {
          return;
        }

        commitBitmap({
          bitmap: renderSurface.canvas,
          viewport,
          renderBackingStore,
        });

        if (isStale()) {
          return;
        }

        void setCachedPdfPageBitmap(
          cacheKey,
          documentKey,
          renderSurface.canvas,
        ).catch(() => {
          // noop
        });
      } catch (errorValue: unknown) {
        if (isStale() || isPdfAbortError(errorValue)) {
          return;
        }

        const errorDetails = getPdfErrorDetails(errorValue);

        console.error("[PdfViewer] render error", {
          pageNumber,
          scale,
          opaqueCanvas,
          renderIdentity,
          documentKey,
          documentFingerprint,
          devicePixelRatio: renderDevicePixelRatio,
          error: errorDetails,
          rawError: errorValue,
        });

        if (isStale()) {
          return;
        }

        setCanvasRenderState({
          renderIdentity,
          rendered: false,
          error: "PDFの描画に失敗しました",
        });
      } finally {
        releasePage();
      }
    };

    renderStartRafId = window.requestAnimationFrame(() => {
      if (isStale()) {
        return;
      }

      renderStartRafId = null;
      void run();
    });

    return () => {
      disposed = true;

      if (canvasRenderPassIdRef.current === renderPassId) {
        canvasRenderPassIdRef.current += 1;
      }

      if (renderStartRafId !== null) {
        window.cancelAnimationFrame(renderStartRafId);
      }

      try {
        renderTask?.cancel?.();
      } catch {
        // noop
      }

      releasePage();
    };
  }, [
    acquirePage,
    documentFingerprint,
    documentKey,
    opaqueCanvas,
    pageNumber,
    renderDevicePixelRatio,
    renderIdentity,
    scale,
  ]);

  useEffect(() => {
    const textLayerEl = textLayerRef.current;
    const searchLayerEl = searchLayerRef.current;

    if (!renderTextLayer) {
      clearElement(textLayerEl);
      clearElement(searchLayerEl);
      setTextLayerState({
        textLayerIdentity,
        ready: false,
        warning: null,
      });
      return;
    }

    const textLayerPassId = textLayerPassIdRef.current + 1;
    textLayerPassIdRef.current = textLayerPassId;

    let disposed = false;
    let rafId: number | null = null;
    let activePageRelease: (() => void) | null = null;

    const releasePage = () => {
      if (!activePageRelease) {
        return;
      }

      const release = activePageRelease;
      activePageRelease = null;
      release();
    };

    const isStale = () =>
      disposed || textLayerPassIdRef.current !== textLayerPassId;

    const run = async () => {
      try {
        const [pageLease, textContent] = await Promise.all([
          acquirePage(pageNumber),
          getPageTextContent(pageNumber),
        ]);

        if (isStale()) {
          pageLease.release();
          return;
        }

        activePageRelease = pageLease.release;
        const nextTextLayerEl = textLayerRef.current;
        const nextSearchLayerEl = searchLayerRef.current;
        const canvas = canvasRef.current;
        if (!nextTextLayerEl || !nextSearchLayerEl || !canvas) {
          return;
        }

        const viewport = pageLease.page.getViewport({ scale });

        const stagedTextLayerEl = document.createElement("div");
        applyPdfTextLayerViewportStyles({
          element: stagedTextLayerEl,
          viewport,
        });

        const TextLayerCtor = getTextLayerCtor();
        const textLayer = new TextLayerCtor({
          container: stagedTextLayerEl,
          textContentSource: textContent,
          viewport,
        });

        await textLayer.render();
        if (isStale()) {
          return;
        }

        const textItemCount = textContent.items.filter(
          (item) => isPdfTextItem(item) && item.str.trim().length > 0,
        ).length;
        const textSpanCount = stagedTextLayerEl.querySelectorAll("span").length;
        const textLayerReady = textItemCount === 0 || textSpanCount > 0;
        const warning = textLayerReady
          ? null
          : "PDFテキストレイヤーの構築に失敗した可能性があります";

        applyPdfTextLayerViewportStyles({
          element: nextTextLayerEl,
          viewport,
        });
        nextTextLayerEl.replaceChildren(
          ...Array.from(stagedTextLayerEl.childNodes),
        );
        nextTextLayerEl.dataset.textLayerReady = textLayerReady
          ? "true"
          : "false";
        nextTextLayerEl.dataset.textLayerExpectedText =
          textItemCount > 0 ? "true" : "false";

        applyPdfOverlayViewportStyles({
          element: nextSearchLayerEl,
          viewport,
        });
        nextSearchLayerEl.replaceChildren();

        if (isStale()) {
          return;
        }

        setTextLayerState({
          textLayerIdentity,
          ready: textLayerReady,
          warning,
        });
      } catch (errorValue: unknown) {
        if (isStale() || isPdfAbortError(errorValue)) {
          return;
        }

        const errorDetails = getPdfErrorDetails(errorValue);

        console.error("[PdfViewer] text layer error", {
          pageNumber,
          scale,
          textLayerIdentity,
          documentKey,
          documentFingerprint,
          error: errorDetails,
          rawError: errorValue,
        });

        if (isStale()) {
          return;
        }

        setTextLayerState({
          textLayerIdentity,
          ready: false,
          warning: "PDFテキストレイヤーの構築に失敗しました",
        });
      } finally {
        releasePage();
      }
    };

    rafId = window.requestAnimationFrame(() => {
      if (isStale()) {
        return;
      }

      rafId = null;
      void run();
    });

    return () => {
      disposed = true;

      if (textLayerPassIdRef.current === textLayerPassId) {
        textLayerPassIdRef.current += 1;
      }

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      releasePage();
    };
  }, [
    acquirePage,
    documentFingerprint,
    documentKey,
    getPageTextContent,
    pageNumber,
    renderTextLayer,
    scale,
    textLayerIdentity,
  ]);

  useEffect(() => {
    const searchLayerEl = searchLayerRef.current;

    if (!searchLayerEl) {
      return;
    }

    if (
      !renderTextLayer ||
      !activeCanvasRenderState.rendered ||
      !activeTextLayerState.ready
    ) {
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
    activeCanvasRenderState.rendered,
    activeSearchMatchIndex,
    activeTextLayerState.ready,
    renderTextLayer,
    searchMatches,
    textLayerIdentity,
  ]);

  const placeholderHeight =
    resolvedPageSize && resolvedPageSize.height > 0
      ? Math.max(1, Math.floor(resolvedPageSize.height * scale))
      : 0;

  return (
    <div
      className={cn("flex justify-center", className)}
      style={
        placeholderHeight > 0
          ? { minHeight: `${placeholderHeight}px` }
          : undefined
      }
    >
      <div className="relative inline-block rounded-lg border border-slate-200 bg-white shadow-sm">
        {activeCanvasRenderState.error && !activeCanvasRenderState.rendered && (
          <div className="px-3 py-2 text-xs text-rose-500">
            {activeCanvasRenderState.error}
          </div>
        )}

        {activeTextLayerState.warning && renderTextLayer && (
          <div className="px-3 py-2 text-xs text-amber-600">
            {activeTextLayerState.warning}
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
  left.documentKey === right.documentKey &&
  left.pdf === right.pdf &&
  left.pageNumber === right.pageNumber &&
  left.scale === right.scale &&
  left.opaqueCanvas === right.opaqueCanvas &&
  left.renderTextLayer === right.renderTextLayer &&
  left.className === right.className &&
  arePageSizesEqual(left.baseSize, right.baseSize) &&
  left.searchMatches === right.searchMatches &&
  left.activeSearchMatchIndex === right.activeSearchMatchIndex &&
  left.acquirePage === right.acquirePage &&
  left.getPageTextContent === right.getPageTextContent &&
  left.onPageSize === right.onPageSize;

export const PdfPage = memo(PdfPageComponent, arePdfPagePropsEqual);
