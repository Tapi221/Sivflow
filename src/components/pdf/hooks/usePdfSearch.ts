import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPageSearchIndex,
  findPageSearchMatches,
  type PdfPageSearchIndex,
} from "@/components/pdf/pdfTextSearch";
import type {
  PdfJsDocument,
  PdfJsTextContent,
  PdfPageSearchMatch,
} from "@/components/pdf/pdfViewerTypes";

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
    return globalWindow.requestIdleCallback(callback, { timeout: 120 }) as number;
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

const buildMatchesForPage = ({
  pageNumber,
  searchIndex,
  query,
}: {
  pageNumber: number;
  searchIndex: PdfPageSearchIndex;
  query: string;
}) => {
  return findPageSearchMatches({
    pageNumber,
    searchIndex,
    query,
    globalOffset: 0,
  }).map((match) => ({
    ...match,
    globalIndex: 0,
  }));
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
  const [searchState, setSearchState] = useState<SearchState>(INITIAL_SEARCH_STATE);

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

  const searchIndexCacheRef = useRef<Map<number, PdfPageSearchIndex>>(new Map());
  const searchIndexPromiseCacheRef = useRef<Map<number, Promise<PdfPageSearchIndex>>>(
    new Map(),
  );
  const activeRunIdRef = useRef(0);
  const lastSearchNavTokenRef = useRef(searchNavToken);

  const getPageSearchIndex = async (pageNumber: number) => {
    const cachedIndex = searchIndexCacheRef.current.get(pageNumber);
    if (cachedIndex) {
      return cachedIndex;
    }

    const existingPromise = searchIndexPromiseCacheRef.current.get(pageNumber);
    if (existingPromise) {
      return existingPromise;
    }

    const nextPromise = getPageTextContent(pageNumber)
      .then((textContent) => {
        const searchIndex = buildPageSearchIndex(textContent);
        searchIndexCacheRef.current.set(pageNumber, searchIndex);
        searchIndexPromiseCacheRef.current.delete(pageNumber);
        return searchIndex;
      })
      .catch((errorValue) => {
        searchIndexPromiseCacheRef.current.delete(pageNumber);
        throw errorValue;
      });

    searchIndexPromiseCacheRef.current.set(pageNumber, nextPromise);
    return nextPromise;
  };

  useEffect(() => {
    activeRunIdRef.current += 1;
    searchIndexCacheRef.current.clear();
    searchIndexPromiseCacheRef.current.clear();
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

      const nextBatch = orderedPageNumbers.slice(cursor, cursor + SEARCH_BATCH_SIZE);

      await Promise.all(
        nextBatch.map(async (pageNumber) => {
          try {
            const searchIndex = await getPageSearchIndex(pageNumber);
            if (cancelled || runId !== activeRunIdRef.current) {
              return;
            }

            pageMatches[pageNumber] = buildMatchesForPage({
              pageNumber,
              searchIndex,
              query: normalizedSearchQuery,
            });
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
