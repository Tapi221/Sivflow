import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPageSearchIndex,
  findPageSearchMatches,
} from "@/components/pdf/pdfTextSearch";
import type {
  PdfJsDocument,
  PdfJsTextContent,
  PdfPageSearchMatch,
} from "@/components/pdf/pdfViewerTypes";
import type {
  PdfSearchWorkerRequest,
  PdfSearchWorkerResponse,
} from "@/components/pdf/pdfSearchWorkerProtocol";

type SearchState = {
  pageMatches: Record<number, PdfPageSearchMatch[]>;
  flattenedMatches: PdfPageSearchMatch[];
  activeMatchIndex: number;
};

type UsePdfSearchOptions = {
  doc: PdfJsDocument | null;
  numPages: number;
  currentPage: number;
  renderedPageNumbers: number[];
  searchQuery: string;
  searchNavToken: number;
  searchNavDirection: "next" | "prev";
  getPageTextContent: (pageNumber: number) => Promise<PdfJsTextContent>;
};

const INITIAL_SEARCH_STATE: SearchState = {
  pageMatches: {},
  flattenedMatches: [],
  activeMatchIndex: -1,
};

const SEARCH_BATCH_SIZE = 2;

type IdleHandle = number;

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleDeadlineLike) => void;

const scheduleIdle = (callback: IdleCallback): IdleHandle => {
  const globalWindow = typeof window !== "undefined" ? window : null;
  if (
    globalWindow &&
    "requestIdleCallback" in globalWindow &&
    typeof globalWindow.requestIdleCallback === "function"
  ) {
    return globalWindow.requestIdleCallback(callback, {
      timeout: 120,
    }) as number;
  }

  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 0,
    });
  }, 16);
};

const cancelIdle = (handle: IdleHandle) => {
  const globalWindow = typeof window !== "undefined" ? window : null;
  if (
    globalWindow &&
    "cancelIdleCallback" in globalWindow &&
    typeof globalWindow.cancelIdleCallback === "function"
  ) {
    globalWindow.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
};

const toOrderedUniquePageNumbers = (pageNumbers: number[]) => {
  const seen = new Set<number>();
  const ordered: number[] = [];

  pageNumbers.forEach((pageNumber) => {
    if (!Number.isFinite(pageNumber)) {
      return;
    }

    const safePageNumber = Math.max(1, Math.floor(pageNumber));
    if (seen.has(safePageNumber)) {
      return;
    }

    seen.add(safePageNumber);
    ordered.push(safePageNumber);
  });

  return ordered;
};

const buildPrioritizedPageNumbers = ({
  numPages,
  currentPage,
  renderedPageNumbers,
}: {
  numPages: number;
  currentPage: number;
  renderedPageNumbers: number[];
}) => {
  const allPages = Array.from({ length: numPages }, (_, index) => index + 1);
  const nearbyPages = [
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    ...renderedPageNumbers,
  ].filter((pageNumber) => pageNumber >= 1 && pageNumber <= numPages);

  const prioritized = toOrderedUniquePageNumbers(nearbyPages);
  const prioritizedSet = new Set(prioritized);

  allPages.forEach((pageNumber) => {
    if (!prioritizedSet.has(pageNumber)) {
      prioritized.push(pageNumber);
    }
  });

  return prioritized;
};

const buildFlattenedMatches = ({
  pageMatches,
  orderedPageNumbers,
}: {
  pageMatches: Record<number, PdfPageSearchMatch[]>;
  orderedPageNumbers: number[];
}) => {
  const flattenedMatches: PdfPageSearchMatch[] = [];
  let globalIndex = 0;

  orderedPageNumbers.forEach((pageNumber) => {
    const matches = pageMatches[pageNumber] ?? [];
    matches.forEach((match) => {
      flattenedMatches.push({
        ...match,
        globalIndex,
      });
      globalIndex += 1;
    });
  });

  return flattenedMatches;
};

const buildFallbackMatchesForPage = ({
  pageNumber,
  content,
  query,
}: {
  pageNumber: number;
  content: PdfJsTextContent;
  query: string;
}) => {
  return findPageSearchMatches({
    pageNumber,
    searchIndex: buildPageSearchIndex(content),
    query,
    globalOffset: 0,
  }).map((match) => ({
    ...match,
    globalIndex: 0,
  }));
};

const createRequestId = () =>
  `req:${Math.random().toString(36).slice(2)}:${Date.now()}`;

type WorkerRequestResolver = {
  resolve: (message: PdfSearchWorkerResponse) => void;
  reject: (error: Error) => void;
};

export const usePdfSearch = ({
  doc,
  numPages,
  currentPage,
  renderedPageNumbers,
  searchQuery,
  searchNavToken,
  searchNavDirection,
  getPageTextContent,
}: UsePdfSearchOptions) => {
  const [searchState, setSearchState] =
    useState<SearchState>(INITIAL_SEARCH_STATE);

  const normalizedSearchQuery = searchQuery.trim();
  const orderedPageNumbers = useMemo(
    () =>
      normalizedSearchQuery
        ? buildPrioritizedPageNumbers({
            numPages,
            currentPage,
            renderedPageNumbers,
          })
        : [],
    [currentPage, numPages, normalizedSearchQuery, renderedPageNumbers],
  );

  const activeRunIdRef = useRef(0);
  const lastSearchNavTokenRef = useRef(searchNavToken);
  const indexedPagesRef = useRef<Set<number>>(new Set());
  const pendingResolversRef = useRef<Map<string, WorkerRequestResolver>>(
    new Map(),
  );
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof Worker === "undefined") {
      workerRef.current = null;
      return;
    }

    const worker = new Worker(
      new URL("../pdfSearch.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<PdfSearchWorkerResponse>) => {
      const response = event.data;
      const resolver = pendingResolversRef.current.get(response.requestId);

      if (!resolver) {
        return;
      }

      pendingResolversRef.current.delete(response.requestId);

      if (response.type === "error") {
        resolver.reject(new Error(response.message));
        return;
      }

      resolver.resolve(response);
    };

    const handleError = () => {
      pendingResolversRef.current.forEach(({ reject }) => {
        reject(new Error("pdf search worker failed"));
      });
      pendingResolversRef.current.clear();
      workerRef.current = null;
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
      workerRef.current = null;
      pendingResolversRef.current.clear();
    };
  }, []);

  const postWorkerRequest = async (request: PdfSearchWorkerRequest) => {
    const worker = workerRef.current;
    if (!worker || request.type === "reset") {
      worker?.postMessage(request);
      return null;
    }

    return new Promise<PdfSearchWorkerResponse>((resolve, reject) => {
      pendingResolversRef.current.set(request.requestId, {
        resolve,
        reject,
      });
      worker.postMessage(request);
    });
  };

  const ensurePageIndexed = async (pageNumber: number) => {
    if (indexedPagesRef.current.has(pageNumber)) {
      return true;
    }

    const content = await getPageTextContent(pageNumber);

    const indexPageRequest: PdfSearchWorkerRequest = {
      type: "index-page",
      requestId: createRequestId(),
      pageNumber,
      content,
    };

    try {
      const response = await postWorkerRequest(indexPageRequest);
      if (response && response.type !== "index-page:done") {
        return false;
      }
      indexedPagesRef.current.add(pageNumber);
      return true;
    } catch {
      return false;
    }
  };

  const searchPage = async ({
    pageNumber,
    query,
  }: {
    pageNumber: number;
    query: string;
  }) => {
    const isWorkerIndexed = await ensurePageIndexed(pageNumber);

    if (isWorkerIndexed && workerRef.current) {
      const searchRequest: PdfSearchWorkerRequest = {
        type: "search-page",
        requestId: createRequestId(),
        pageNumber,
        query,
      };

      const response = await postWorkerRequest(searchRequest);
      if (response && response.type === "search-page:done") {
        return response.matches;
      }
    }

    const content = await getPageTextContent(pageNumber);
    return buildFallbackMatchesForPage({
      pageNumber,
      content,
      query,
    });
  };

  useEffect(() => {
    activeRunIdRef.current += 1;
    indexedPagesRef.current.clear();
    pendingResolversRef.current.clear();
    void postWorkerRequest({ type: "reset" });
    setSearchState(INITIAL_SEARCH_STATE);
  }, [doc]);

  useEffect(() => {
    activeRunIdRef.current += 1;
    const runId = activeRunIdRef.current;

    if (!doc || !normalizedSearchQuery || orderedPageNumbers.length === 0) {
      setSearchState(INITIAL_SEARCH_STATE);
      return;
    }

    let idleHandle: IdleHandle | null = null;
    let cancelled = false;
    const pageMatches: Record<number, PdfPageSearchMatch[]> = {};

    const processBatch = async (cursor: number) => {
      if (cancelled || runId !== activeRunIdRef.current) {
        return;
      }

      const nextBatch = orderedPageNumbers.slice(
        cursor,
        cursor + SEARCH_BATCH_SIZE,
      );

      await Promise.all(
        nextBatch.map(async (pageNumber) => {
          try {
            const matches = await searchPage({
              pageNumber,
              query: normalizedSearchQuery,
            });

            if (cancelled || runId !== activeRunIdRef.current) {
              return;
            }

            pageMatches[pageNumber] = matches;
          } catch {
            if (!cancelled && runId === activeRunIdRef.current) {
              pageMatches[pageNumber] = [];
            }
          }
        }),
      );

      if (cancelled || runId !== activeRunIdRef.current) {
        return;
      }

      setSearchState((previousState) => {
        const nextFlattenedMatches = buildFlattenedMatches({
          pageMatches,
          orderedPageNumbers,
        });

        const nextActiveMatchIndex =
          nextFlattenedMatches.length === 0
            ? -1
            : previousState.activeMatchIndex >= 0 &&
                previousState.activeMatchIndex < nextFlattenedMatches.length
              ? previousState.activeMatchIndex
              : 0;

        return {
          pageMatches: { ...pageMatches },
          flattenedMatches: nextFlattenedMatches,
          activeMatchIndex: nextActiveMatchIndex,
        };
      });

      if (cursor + SEARCH_BATCH_SIZE >= orderedPageNumbers.length) {
        return;
      }

      idleHandle = scheduleIdle(() => {
        void processBatch(cursor + SEARCH_BATCH_SIZE);
      });
    };

    idleHandle = scheduleIdle(() => {
      void processBatch(0);
    });

    return () => {
      cancelled = true;
      if (idleHandle !== null) {
        cancelIdle(idleHandle);
      }
    };
  }, [doc, getPageTextContent, normalizedSearchQuery, orderedPageNumbers]);

  useEffect(() => {
    if (searchNavToken === lastSearchNavTokenRef.current) {
      return;
    }

    lastSearchNavTokenRef.current = searchNavToken;

    setSearchState((previousState) => {
      if (previousState.flattenedMatches.length === 0) {
        return previousState;
      }

      const baseIndex =
        previousState.activeMatchIndex < 0 ? 0 : previousState.activeMatchIndex;
      const delta = searchNavDirection === "prev" ? -1 : 1;
      const nextIndex =
        (baseIndex + delta + previousState.flattenedMatches.length) %
        previousState.flattenedMatches.length;

      if (nextIndex === previousState.activeMatchIndex) {
        return previousState;
      }

      return {
        ...previousState,
        activeMatchIndex: nextIndex,
      };
    });
  }, [searchNavDirection, searchNavToken]);

  return {
    pageMatches: searchState.pageMatches,
    flattenedMatches: searchState.flattenedMatches,
    activeMatchIndex: searchState.activeMatchIndex,
  };
};
