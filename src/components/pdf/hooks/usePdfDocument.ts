import { useCallback, useEffect, useRef, useState } from "react";
import { clearPdfPageBitmapCacheForDocument } from "@/components/pdf/pdfPageBitmapCache";
import { createPdfPageResourceCache } from "@/components/pdf/pdfPageResourceCache";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsGetDocumentParams,
  PdfJsLoadingTask,
  PdfJsPage,
  PdfJsPageLease,
  PdfJsTextContent,
  PdfViewerOptions,
  PdfViewerSourceMeta,
  SourceLoadErrorKind,
} from "@/components/pdf/pdfViewerTypes";
import {
  destroyPdfResource,
  disposePdfDocumentResource,
  getErrorMessage,
  getPdfDocument,
  isPdfAbortError,
} from "@/components/pdf/pdfViewerTypes";

interface UsePdfDocumentOptions {
  source: {
    url?: string | null;
    data?: Uint8Array | null;
  };
  viewerOptions?: PdfViewerOptions;
  sourceMeta?: PdfViewerSourceMeta;
  onNumPages: (n: number) => void;
  onFirstPageSize?: (size: PageSize | null) => void;
  onSourceLoadError?: (details: {
    kind: SourceLoadErrorKind;
    url: string | null;
    message: string;
  }) => void;
}

interface PrefetchPageResourceOptions {
  includeTextContent?: boolean;
}

interface UsePdfDocumentResult {
  doc: PdfJsDocument | null;
  documentKey: string;
  numPages: number;
  pageSizes: Record<number, PageSize>;
  loading: boolean;
  error: string | null;
  setPageSize: (pageNumber: number, size: PageSize) => void;
  acquirePage: (pageNumber: number) => Promise<PdfJsPageLease>;
  getPageTextContent: (pageNumber: number) => Promise<PdfJsTextContent>;
  prefetchPageResources: (
    pageNumbers: number[],
    options?: PrefetchPageResourceOptions,
  ) => void;
}

type PdfPageCache = ReturnType<typeof createPdfPageResourceCache<PdfJsPage>>;

const normalizeSourceToken = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildStableDocumentKey = ({
  pdf,
  sourceUrl,
  sourceDataLength,
  sourceMeta,
}: {
  pdf: PdfJsDocument;
  sourceUrl: string;
  sourceDataLength: number;
  sourceMeta?: PdfViewerSourceMeta;
}) => {
  const fingerprint = pdf.fingerprints?.[0] ?? null;
  if (typeof fingerprint === "string" && fingerprint.length > 0) {
    return `fingerprint:${fingerprint}`;
  }

  const localFileId = normalizeSourceToken(sourceMeta?.localFileId);
  if (localFileId) {
    return `local:${localFileId}`;
  }

  const remoteUrl =
    normalizeSourceToken(sourceMeta?.remoteUrl) ??
    normalizeSourceToken(sourceMeta?.url) ??
    normalizeSourceToken(sourceUrl);
  if (remoteUrl) {
    return `url:${remoteUrl}`;
  }

  return `bytes:${sourceDataLength}`;
};

const disposeDocumentArtifacts = ({
  documentKey,
  resource,
}: {
  documentKey: string | null;
  resource: PdfJsDocument | null | undefined;
}) => {
  if (documentKey) {
    clearPdfPageBitmapCacheForDocument(documentKey);
  }

  disposePdfDocumentResource(resource);
};

const createPageCache = (pdf: PdfJsDocument): PdfPageCache => {
  return createPdfPageResourceCache<PdfJsPage>({
    loadPage: (pageNumber) => pdf.getPage(pageNumber),
    cleanupPage: (page) => {
      try {
        page.cleanup?.();
      } catch {
        // noop
      }
    },
  });
};

export const usePdfDocument = ({
  source,
  viewerOptions,
  sourceMeta,
  onNumPages,
  onFirstPageSize,
  onSourceLoadError,
}: UsePdfDocumentOptions): UsePdfDocumentResult => {
  const docRef = useRef<PdfJsDocument | null>(null);
  const documentKeyRef = useRef<string | null>(null);
  const onNumPagesRef = useRef(onNumPages);
  const onFirstPageSizeRef = useRef(onFirstPageSize);
  const onSourceLoadErrorRef = useRef(onSourceLoadError);
  const sourceMetaRef = useRef(sourceMeta);
  const pageCacheRef = useRef<PdfPageCache | null>(null);
  const textContentPromiseCacheRef = useRef<
    Map<number, Promise<PdfJsTextContent>>
  >(new Map());
  const pendingPageSizesRef = useRef<Map<number, PageSize>>(new Map());
  const pageSizeFlushRafRef = useRef<number | null>(null);

  const [doc, setDoc] = useState<PdfJsDocument | null>(null);
  const [documentKey, setDocumentKey] = useState("unloaded");
  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceUrl = typeof source?.url === "string" ? source.url.trim() : "";
  const sourceData = source?.data instanceof Uint8Array ? source.data : null;
  const sourceDataLength = sourceData?.byteLength ?? 0;

  const enableXfa = viewerOptions?.enableXfa ?? false;
  const useSystemFonts = viewerOptions?.useSystemFonts ?? false;
  const cMapUrl = viewerOptions?.cMapUrl;
  const cMapPacked = viewerOptions?.cMapPacked ?? true;
  const standardFontDataUrl = viewerOptions?.standardFontDataUrl;
  const disableFontFace = viewerOptions?.disableFontFace ?? false;
  const verbosity = viewerOptions?.verbosity;

  useEffect(() => {
    onNumPagesRef.current = onNumPages;
  }, [onNumPages]);

  useEffect(() => {
    onFirstPageSizeRef.current = onFirstPageSize;
  }, [onFirstPageSize]);

  useEffect(() => {
    onSourceLoadErrorRef.current = onSourceLoadError;
  }, [onSourceLoadError]);

  useEffect(() => {
    sourceMetaRef.current = sourceMeta;
  }, [sourceMeta]);

  const cancelScheduledPageSizeFlush = useCallback(() => {
    if (pageSizeFlushRafRef.current !== null) {
      cancelAnimationFrame(pageSizeFlushRafRef.current);
      pageSizeFlushRafRef.current = null;
    }
  }, []);

  const flushPendingPageSizes = useCallback(() => {
    cancelScheduledPageSizeFlush();

    if (pendingPageSizesRef.current.size === 0) {
      return;
    }

    const nextEntries = Array.from(pendingPageSizesRef.current.entries());
    pendingPageSizesRef.current.clear();

    setPageSizes((previous) => {
      let changed = false;
      const nextState = { ...previous };

      nextEntries.forEach(([pageNumber, size]) => {
        const existing = nextState[pageNumber];
        if (
          existing &&
          existing.width === size.width &&
          existing.height === size.height
        ) {
          return;
        }

        nextState[pageNumber] = size;
        changed = true;
      });

      return changed ? nextState : previous;
    });
  }, [cancelScheduledPageSizeFlush]);

  const schedulePageSizeFlush = useCallback(() => {
    if (pageSizeFlushRafRef.current !== null) {
      return;
    }

    pageSizeFlushRafRef.current = window.requestAnimationFrame(() => {
      pageSizeFlushRafRef.current = null;
      flushPendingPageSizes();
    });
  }, [flushPendingPageSizes]);

  const resetResourceCaches = useCallback(() => {
    pageCacheRef.current?.clear();
    pageCacheRef.current = null;
    textContentPromiseCacheRef.current.clear();
    pendingPageSizesRef.current.clear();
    cancelScheduledPageSizeFlush();
  }, [cancelScheduledPageSizeFlush]);

  const acquirePage = useCallback(
    (pageNumber: number): Promise<PdfJsPageLease> => {
      const pageCache = pageCacheRef.current;
      if (!pageCache) {
        return Promise.reject(new Error("PDF document is not loaded"));
      }

      return pageCache.acquirePage(pageNumber).then(({ page, release }) => ({
        page,
        release,
      }));
    },
    [],
  );

  const getPageTextContent = useCallback(
    (pageNumber: number): Promise<PdfJsTextContent> => {
      const safePageNumber = Math.max(1, Math.floor(pageNumber));
      const existingPromise =
        textContentPromiseCacheRef.current.get(safePageNumber);

      if (existingPromise) {
        return existingPromise;
      }

      const nextPromise = acquirePage(safePageNumber)
        .then(async ({ page, release }) => {
          try {
            return await page.getTextContent();
          } finally {
            release();
          }
        })
        .catch((errorValue) => {
          textContentPromiseCacheRef.current.delete(safePageNumber);
          throw errorValue;
        });

      textContentPromiseCacheRef.current.set(safePageNumber, nextPromise);
      return nextPromise;
    },
    [acquirePage],
  );

  const prefetchPageResources = useCallback(
    (pageNumbers: number[], options?: PrefetchPageResourceOptions) => {
      const pdf = docRef.current;
      const pageCache = pageCacheRef.current;
      if (!pdf || !pageCache || pageNumbers.length === 0) {
        return;
      }

      const uniquePageNumbers = Array.from(
        new Set(
          pageNumbers
            .filter((pageNumber) => Number.isFinite(pageNumber))
            .map((pageNumber) => Math.max(1, Math.floor(pageNumber))),
        ),
      ).filter((pageNumber) => pageNumber <= pdf.numPages);

      uniquePageNumbers.forEach((pageNumber) => {
        pageCache.prefetchPage(pageNumber);

        if (options?.includeTextContent) {
          void getPageTextContent(pageNumber);
        }
      });
    },
    [getPageTextContent],
  );

  const setPageSize = useCallback(
    (pageNumber: number, size: PageSize) => {
      const safePageNumber = Math.max(1, Math.floor(pageNumber));
      const pendingSize = pendingPageSizesRef.current.get(safePageNumber);
      if (
        pendingSize &&
        pendingSize.width === size.width &&
        pendingSize.height === size.height
      ) {
        return;
      }

      pendingPageSizesRef.current.set(safePageNumber, size);
      schedulePageSizeFlush();
    },
    [schedulePageSizeFlush],
  );

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PdfJsLoadingTask | null = null;

    const previousDocument = docRef.current;
    const previousDocumentKey = documentKeyRef.current;

    docRef.current = null;
    documentKeyRef.current = null;
    resetResourceCaches();

    disposeDocumentArtifacts({
      documentKey: previousDocumentKey,
      resource: previousDocument,
    });

    setDoc(null);
    setDocumentKey("unloaded");
    setNumPages(0);
    setPageSizes({});
    setError(null);

    const hasUrl = sourceUrl.length > 0;
    const hasData = sourceDataLength > 0;

    if (!hasUrl && !hasData) {
      setLoading(false);
      setError("PDFソースが見つかりません（URL/データが空）");
      onNumPagesRef.current(0);
      onFirstPageSizeRef.current?.(null);
      return () => {
        cancelled = true;
      };
    }

    const loadFirstPageSize = async (pageCount: number) => {
      if (pageCount <= 0) {
        setPageSizes({});
        onFirstPageSizeRef.current?.(null);
        return;
      }

      try {
        const pageLease = await acquirePage(1);
        if (cancelled) {
          pageLease.release();
          return;
        }

        try {
          const viewport = pageLease.page.getViewport({ scale: 1 });
          const size = { width: viewport.width, height: viewport.height };
          pendingPageSizesRef.current.set(1, size);
          flushPendingPageSizes();
          onFirstPageSizeRef.current?.(size);
        } finally {
          pageLease.release();
        }
      } catch {
        if (cancelled) {
          return;
        }

        const fallback = { width: 1, height: 1 };
        pendingPageSizesRef.current.set(1, fallback);
        flushPendingPageSizes();
        onFirstPageSizeRef.current?.(fallback);
      }
    };

    const buildGetDocumentParams =
      async (): Promise<PdfJsGetDocumentParams> => {
        const params: PdfJsGetDocumentParams = {
          enableXfa,
          useSystemFonts,
          cMapUrl,
          cMapPacked,
          standardFontDataUrl,
          disableFontFace,
          verbosity,
        };

        if (hasData && sourceData) {
          params.data = sourceData;
          return params;
        }

        if (!hasUrl) {
          throw new Error("missing pdf source");
        }

        if (sourceUrl.startsWith("blob:")) {
          const response = await fetch(sourceUrl);
          if (!response.ok) {
            throw new Error(`blob fetch failed: ${response.status}`);
          }

          const buffer = await response.arrayBuffer();
          params.data = new Uint8Array(buffer);
          return params;
        }

        params.url = sourceUrl;
        return params;
      };

    const run = async () => {
      setLoading(true);

      console.info("[PdfViewer] source diagnostic", {
        sourceUrl,
        dataByteLength: sourceDataLength,
        sourceMeta: {
          url: sourceMetaRef.current?.url ?? null,
          blobUrl: sourceMetaRef.current?.blobUrl ?? null,
          localFileId: sourceMetaRef.current?.localFileId ?? null,
          remoteUrl: sourceMetaRef.current?.remoteUrl ?? null,
        },
      });

      try {
        const params = await buildGetDocumentParams();
        if (cancelled) {
          return;
        }

        loadingTask = getPdfDocument(params);
        const pdf = await loadingTask.promise;

        if (cancelled) {
          disposeDocumentArtifacts({ documentKey: null, resource: pdf });
          return;
        }

        const nextDocumentKey = buildStableDocumentKey({
          pdf,
          sourceUrl,
          sourceDataLength,
          sourceMeta: sourceMetaRef.current,
        });

        docRef.current = pdf;
        documentKeyRef.current = nextDocumentKey;
        pageCacheRef.current = createPageCache(pdf);
        textContentPromiseCacheRef.current.clear();
        pendingPageSizesRef.current.clear();

        const pageCount = Math.max(0, pdf.numPages || 0);

        setDoc(pdf);
        setDocumentKey(nextDocumentKey);
        setNumPages(pageCount);
        onNumPagesRef.current(pageCount);
        setError(null);

        await loadFirstPageSize(pageCount);
      } catch (errorValue: unknown) {
        if (cancelled || isPdfAbortError(errorValue)) {
          return;
        }

        const message = getErrorMessage(errorValue);

        console.error("[PdfViewer] load error", {
          error: errorValue,
          hasUrl,
          hasData,
          dataByteLength: sourceDataLength,
          url: sourceMetaRef.current?.url ?? (sourceUrl || null),
          blobUrl: sourceMetaRef.current?.blobUrl ?? null,
          localFileId: sourceMetaRef.current?.localFileId ?? null,
          remoteUrl: sourceMetaRef.current?.remoteUrl ?? null,
        });

        setDoc(null);
        setDocumentKey("unloaded");
        setNumPages(0);
        setPageSizes({});
        setError(`PDFの読み込みに失敗しました: ${message}`);
        onNumPagesRef.current(0);
        onFirstPageSizeRef.current?.(null);

        const kind: SourceLoadErrorKind = hasData
          ? "data"
          : hasUrl && sourceUrl.startsWith("blob:")
            ? "blob-url"
            : hasUrl
              ? "remote-url"
              : "unknown";

        try {
          onSourceLoadErrorRef.current?.({
            kind,
            url: hasUrl ? sourceUrl : null,
            message,
          });
        } catch (callbackError) {
          console.warn(
            "[PdfViewer] onSourceLoadError callback failed",
            callbackError,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;

      const currentDocument = docRef.current;
      const currentDocumentKey = documentKeyRef.current;

      docRef.current = null;
      documentKeyRef.current = null;
      resetResourceCaches();

      disposeDocumentArtifacts({
        documentKey: currentDocumentKey,
        resource: currentDocument,
      });
      destroyPdfResource(loadingTask);
    };
  }, [
    acquirePage,
    cMapPacked,
    cMapUrl,
    disableFontFace,
    enableXfa,
    flushPendingPageSizes,
    resetResourceCaches,
    sourceData,
    sourceDataLength,
    sourceUrl,
    standardFontDataUrl,
    useSystemFonts,
    verbosity,
  ]);

  useEffect(() => {
    return () => {
      cancelScheduledPageSizeFlush();
    };
  }, [cancelScheduledPageSizeFlush]);

  return {
    doc,
    documentKey,
    numPages,
    pageSizes,
    loading,
    error,
    setPageSize,
    acquirePage,
    getPageTextContent,
    prefetchPageResources,
  };
};
