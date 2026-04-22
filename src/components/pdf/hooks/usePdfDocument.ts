import { useCallback, useEffect, useRef, useState } from "react";
import { acquirePdfDocumentSession } from "@/components/pdf/pdfDocumentSessionRegistry";
import { createPdfPageResourceCache } from "@/components/pdf/pdfPageResourceCache";
import type {
  PageSize,
  PdfJsDestinationReference,
  PdfJsDocument,
  PdfJsExplicitDestination,
  PdfJsGetDocumentParams,
  PdfJsOutlineDestination,
  PdfJsOutlineNode,
  PdfJsPage,
  PdfJsPageLease,
  PdfJsTextContent,
  PdfJsTextItem,
  PdfViewerOptions,
  PdfViewerSourceMeta,
  SourceLoadErrorKind,
} from "@/components/pdf/pdfViewerTypes";
import {
  getErrorMessage,
  isPdfAbortError,
  isPdfTextItem,
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

export interface PrefetchPageResourceOptions {
  includeTextContent?: boolean;
}

export type PdfDocumentOutlineItemSource = "pdf-outline" | "derived";

export interface PdfDocumentOutlineItem {
  id: string;
  title: string;
  pageNumber: number | null;
  depth: number;
  source: PdfDocumentOutlineItemSource;
  children: PdfDocumentOutlineItem[];
}

export interface PdfDocumentMarkdownSection {
  id: string;
  pageNumber: number;
  title: string;
  markdown: string;
  preview: string;
}

export interface PdfDocumentMarkdown {
  content: string;
  sections: PdfDocumentMarkdownSection[];
}

export interface PdfDocumentController {
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
  getDocumentOutline: () => Promise<PdfDocumentOutlineItem[]>;
  getDocumentMarkdown: () => Promise<PdfDocumentMarkdown>;
}

type UsePdfDocumentResult = PdfDocumentController;
type PdfPageCache = ReturnType<typeof createPdfPageResourceCache<PdfJsPage>>;

type PdfTextToken = {
  text: string;
  x: number;
  y: number;
  height: number;
};

type PdfTextLineBucket = {
  y: number;
  threshold: number;
  tokens: PdfTextToken[];
};

const OUTLINE_TITLE_MAX_LENGTH = 96;
const MARKDOWN_PREVIEW_MAX_LENGTH = 180;

const clampPositiveInteger = (value: number) => {
  return Math.max(1, Math.trunc(value));
};

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const normalizePdfText = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

const normalizePdfLineText = (tokens: PdfTextToken[]) => {
  const joined = tokens
    .map((token) => token.text)
    .filter((text) => text.length > 0)
    .join(" ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  return joined;
};

const extractPdfTextTokens = (
  textContent: PdfJsTextContent,
): PdfTextToken[] => {
  return textContent.items
    .filter(isPdfTextItem)
    .map((item) => {
      const text = normalizePdfText(item.str);
      const x = typeof item.transform[4] === "number" ? item.transform[4] : 0;
      const y = typeof item.transform[5] === "number" ? item.transform[5] : 0;
      const height =
        typeof item.height === "number" && Number.isFinite(item.height)
          ? Math.max(1, item.height)
          : Math.max(1, Math.abs(item.transform[3] ?? 0));

      return {
        text,
        x,
        y,
        height,
      } satisfies PdfTextToken;
    })
    .filter((token) => token.text.length > 0);
};

const buildPdfTextLines = (textContent: PdfJsTextContent): string[] => {
  const tokens = extractPdfTextTokens(textContent);
  const lineBuckets: PdfTextLineBucket[] = [];

  tokens.forEach((token) => {
    const nextThreshold = Math.max(2.5, token.height * 0.45);
    const existingBucket = lineBuckets.find((lineBucket) => {
      return (
        Math.abs(lineBucket.y - token.y) <=
        Math.max(lineBucket.threshold, nextThreshold)
      );
    });

    if (existingBucket) {
      existingBucket.tokens.push(token);
      existingBucket.y =
        (existingBucket.y * (existingBucket.tokens.length - 1) + token.y) /
        existingBucket.tokens.length;
      existingBucket.threshold = Math.max(
        existingBucket.threshold,
        nextThreshold,
      );
      return;
    }

    lineBuckets.push({
      y: token.y,
      threshold: nextThreshold,
      tokens: [token],
    });
  });

  return lineBuckets
    .sort((left, right) => right.y - left.y)
    .map((lineBucket) => {
      const sortedTokens = [...lineBucket.tokens].sort(
        (left, right) => left.x - right.x,
      );
      return normalizePdfLineText(sortedTokens);
    })
    .filter((line) => line.length > 0);
};

const buildMarkdownSection = ({
  pageNumber,
  lines,
}: {
  pageNumber: number;
  lines: string[];
}): PdfDocumentMarkdownSection => {
  const fallbackTitle = `Page ${pageNumber}`;
  const firstMeaningfulLine =
    lines.find((line) => line.length > 0) ?? fallbackTitle;
  const title = truncateText(firstMeaningfulLine, OUTLINE_TITLE_MAX_LENGTH);
  const bodyLines =
    lines.length > 0 ? lines : ["(テキストを抽出できませんでした)"];
  const markdown = [`## ${fallbackTitle}`, "", ...bodyLines].join("\n");
  const preview = truncateText(
    bodyLines.join(" "),
    MARKDOWN_PREVIEW_MAX_LENGTH,
  );

  return {
    id: `pdf-markdown-page-${pageNumber}`,
    pageNumber,
    title,
    markdown,
    preview,
  };
};

const buildDerivedOutlineItems = (
  sections: PdfDocumentMarkdownSection[],
): PdfDocumentOutlineItem[] => {
  return sections.map((section) => {
    return {
      id: `pdf-outline-derived-${section.pageNumber}`,
      title: section.title,
      pageNumber: section.pageNumber,
      depth: 0,
      source: "derived",
      children: [],
    } satisfies PdfDocumentOutlineItem;
  });
};

const isPdfDestinationReference = (
  value: unknown,
): value is PdfJsDestinationReference => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "num" in value &&
    "gen" in value &&
    typeof (value as { num?: unknown }).num === "number" &&
    typeof (value as { gen?: unknown }).gen === "number"
  );
};

const resolveOutlineDestinationPageNumber = async (
  pdf: PdfJsDocument,
  destination: PdfJsOutlineDestination,
): Promise<number | null> => {
  if (destination === null || destination === undefined) {
    return null;
  }

  if (typeof destination === "string") {
    if (typeof pdf.getDestination !== "function") {
      return null;
    }

    const explicitDestination = await pdf.getDestination(destination);
    return resolveOutlineDestinationPageNumber(pdf, explicitDestination);
  }

  if (!Array.isArray(destination) || destination.length === 0) {
    return null;
  }

  const [firstDestinationToken] = destination as PdfJsExplicitDestination;

  if (
    typeof firstDestinationToken === "number" &&
    Number.isFinite(firstDestinationToken)
  ) {
    return clampPositiveInteger(firstDestinationToken + 1);
  }

  if (
    isPdfDestinationReference(firstDestinationToken) &&
    typeof pdf.getPageIndex === "function"
  ) {
    try {
      const pageIndex = await pdf.getPageIndex(firstDestinationToken);
      return clampPositiveInteger(pageIndex + 1);
    } catch {
      return null;
    }
  }

  return null;
};

const buildOutlineTitle = (
  title: string | null | undefined,
  pageNumber: number | null,
) => {
  const normalizedTitle = normalizePdfText(title ?? "");

  if (normalizedTitle.length > 0) {
    return truncateText(normalizedTitle, OUTLINE_TITLE_MAX_LENGTH);
  }

  if (typeof pageNumber === "number") {
    return `Page ${pageNumber}`;
  }

  return "Untitled";
};

const mapPdfOutlineNodes = async ({
  pdf,
  nodes,
  depth,
  idPrefix,
}: {
  pdf: PdfJsDocument;
  nodes: PdfJsOutlineNode[];
  depth: number;
  idPrefix: string;
}): Promise<PdfDocumentOutlineItem[]> => {
  const nextOutlineItems = await Promise.all(
    nodes.map(async (node, index) => {
      const pageNumber = await resolveOutlineDestinationPageNumber(
        pdf,
        node.dest ?? null,
      );
      const children = await mapPdfOutlineNodes({
        pdf,
        nodes: Array.isArray(node.items) ? node.items : [],
        depth: depth + 1,
        idPrefix: `${idPrefix}-${index}`,
      });

      return {
        id: `${idPrefix}-${index}`,
        title: buildOutlineTitle(node.title, pageNumber),
        pageNumber,
        depth,
        source: "pdf-outline",
        children,
      } satisfies PdfDocumentOutlineItem;
    }),
  );

  return nextOutlineItems;
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
  const outlinePromiseCacheRef = useRef<Promise<
    PdfDocumentOutlineItem[]
  > | null>(null);
  const markdownPromiseCacheRef = useRef<Promise<PdfDocumentMarkdown> | null>(
    null,
  );

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

    setPageSizes((previousPageSizes) => {
      let hasChanged = false;
      const nextPageSizes = { ...previousPageSizes };

      nextEntries.forEach(([pageNumber, size]) => {
        const currentSize = nextPageSizes[pageNumber];
        if (
          currentSize &&
          currentSize.width === size.width &&
          currentSize.height === size.height
        ) {
          return;
        }

        nextPageSizes[pageNumber] = size;
        hasChanged = true;
      });

      return hasChanged ? nextPageSizes : previousPageSizes;
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
    outlinePromiseCacheRef.current = null;
    markdownPromiseCacheRef.current = null;
    pendingPageSizesRef.current.clear();
    cancelScheduledPageSizeFlush();
  }, [cancelScheduledPageSizeFlush]);

  const acquirePage = useCallback(
    (pageNumber: number): Promise<PdfJsPageLease> => {
      const pageCache = pageCacheRef.current;
      if (!pageCache) {
        return Promise.reject(new Error("PDF document is not loaded"));
      }

      return pageCache.acquirePage(pageNumber).then(({ page, release }) => {
        return {
          page,
          release,
        } satisfies PdfJsPageLease;
      });
    },
    [],
  );

  const getPageTextContent = useCallback(
    (pageNumber: number): Promise<PdfJsTextContent> => {
      const safePageNumber = clampPositiveInteger(pageNumber);
      const cachedPromise =
        textContentPromiseCacheRef.current.get(safePageNumber);

      if (cachedPromise) {
        return cachedPromise;
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

  const getDocumentMarkdown =
    useCallback(async (): Promise<PdfDocumentMarkdown> => {
      const cachedPromise = markdownPromiseCacheRef.current;
      if (cachedPromise) {
        return cachedPromise;
      }

      const nextPromise = (async () => {
        const pdf = docRef.current;
        if (!pdf) {
          throw new Error("PDF document is not loaded");
        }

        const sections: PdfDocumentMarkdownSection[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const textContent = await getPageTextContent(pageNumber);
          const textLines = buildPdfTextLines(textContent);
          sections.push(
            buildMarkdownSection({
              pageNumber,
              lines: textLines,
            }),
          );
        }

        return {
          content: sections.map((section) => section.markdown).join("\n\n"),
          sections,
        } satisfies PdfDocumentMarkdown;
      })().catch((errorValue) => {
        markdownPromiseCacheRef.current = null;
        throw errorValue;
      });

      markdownPromiseCacheRef.current = nextPromise;
      return nextPromise;
    }, [getPageTextContent]);

  const getDocumentOutline = useCallback(async (): Promise<
    PdfDocumentOutlineItem[]
  > => {
    const cachedPromise = outlinePromiseCacheRef.current;
    if (cachedPromise) {
      return cachedPromise;
    }

    const nextPromise = (async () => {
      const pdf = docRef.current;
      if (!pdf) {
        throw new Error("PDF document is not loaded");
      }

      if (typeof pdf.getOutline === "function") {
        const rawOutlineItems = await pdf.getOutline();
        if (Array.isArray(rawOutlineItems) && rawOutlineItems.length > 0) {
          const mappedOutlineItems = await mapPdfOutlineNodes({
            pdf,
            nodes: rawOutlineItems,
            depth: 0,
            idPrefix: "pdf-outline",
          });

          if (mappedOutlineItems.length > 0) {
            return mappedOutlineItems;
          }
        }
      }

      const markdownDocument = await getDocumentMarkdown();
      return buildDerivedOutlineItems(markdownDocument.sections);
    })().catch((errorValue) => {
      outlinePromiseCacheRef.current = null;
      throw errorValue;
    });

    outlinePromiseCacheRef.current = nextPromise;
    return nextPromise;
  }, [getDocumentMarkdown]);

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
            .map((pageNumber) => clampPositiveInteger(pageNumber)),
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
      const safePageNumber = clampPositiveInteger(pageNumber);
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
    let releaseSession: (() => void) | null = null;

    docRef.current = null;
    documentKeyRef.current = null;
    resetResourceCaches();

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

        const fallbackSize = { width: 1, height: 1 } satisfies PageSize;
        pendingPageSizesRef.current.set(1, fallbackSize);
        flushPendingPageSizes();
        onFirstPageSizeRef.current?.(fallbackSize);
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

        const sessionLease = acquirePdfDocumentSession({
          source: {
            url: hasUrl ? sourceUrl : null,
            data: sourceData,
          },
          sourceMeta: sourceMetaRef.current,
          getDocumentParams: params,
        });

        releaseSession = sessionLease.release;

        const { pdf, documentKey: nextDocumentKey } =
          await sessionLease.documentPromise;

        if (cancelled) {
          return;
        }

        docRef.current = pdf;
        documentKeyRef.current = nextDocumentKey;
        pageCacheRef.current = createPdfPageResourceCache<PdfJsPage>({
          loadPage: (pageNumber) => pdf.getPage(pageNumber),
          cleanupPage: (page) => {
            try {
              page.cleanup?.();
            } catch {
              // noop
            }
          },
        });
        textContentPromiseCacheRef.current.clear();
        outlinePromiseCacheRef.current = null;
        markdownPromiseCacheRef.current = null;
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
      docRef.current = null;
      documentKeyRef.current = null;
      resetResourceCaches();
      releaseSession?.();
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
    getDocumentOutline,
    getDocumentMarkdown,
  };
};
