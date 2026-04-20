export interface PdfPageResourceLease<Page> {
  page: Page;
  release: () => void;
}

interface PdfPageResourceCacheEntry<Page> {
  pageNumber: number;
  pagePromise: Promise<Page>;
  lastAccessToken: number;
  retainCount: number;
}

interface CreatePdfPageResourceCacheOptions<Page> {
  loadPage: (pageNumber: number) => Promise<Page>;
  cleanupPage?: (page: Page) => void | Promise<void>;
  maxEntries?: number;
}

interface ClearPdfPageResourceCacheOptions {
  cleanupEvictedPages?: boolean;
}

export interface PdfPageResourceCache<Page> {
  getPage: (pageNumber: number) => Promise<Page>;
  acquirePage: (pageNumber: number) => Promise<PdfPageResourceLease<Page>>;
  prefetchPage: (pageNumber: number) => void;
  clear: (options?: ClearPdfPageResourceCacheOptions) => void;
  getSize: () => number;
}

const DEFAULT_MAX_PAGE_CACHE_ENTRIES = 12;

const normalizePageNumber = (pageNumber: number) =>
  Math.max(1, Math.floor(pageNumber));

export const createPdfPageResourceCache = <Page>({
  loadPage,
  cleanupPage,
  maxEntries = DEFAULT_MAX_PAGE_CACHE_ENTRIES,
}: CreatePdfPageResourceCacheOptions<Page>): PdfPageResourceCache<Page> => {
  const entries = new Map<number, PdfPageResourceCacheEntry<Page>>();
  let accessToken = 0;

  const markEntryAsUsed = (entry: PdfPageResourceCacheEntry<Page>) => {
    accessToken += 1;
    entry.lastAccessToken = accessToken;
  };

  const scheduleCleanup = (entry: PdfPageResourceCacheEntry<Page>) => {
    if (!cleanupPage) {
      return;
    }

    void entry.pagePromise
      .then(async (page) => {
        await cleanupPage(page);
      })
      .catch(() => {
        // noop
      });
  };

  const evictIfNeeded = () => {
    if (entries.size <= maxEntries) {
      return;
    }

    const evictionCandidates = Array.from(entries.values())
      .filter((entry) => entry.retainCount === 0)
      .sort((left, right) => left.lastAccessToken - right.lastAccessToken);

    while (entries.size > maxEntries && evictionCandidates.length > 0) {
      const entry = evictionCandidates.shift();
      if (!entry) {
        break;
      }

      const activeEntry = entries.get(entry.pageNumber);
      if (activeEntry !== entry || entry.retainCount > 0) {
        continue;
      }

      entries.delete(entry.pageNumber);
      scheduleCleanup(entry);
    }
  };

  const getOrCreateEntry = (pageNumber: number) => {
    const safePageNumber = normalizePageNumber(pageNumber);
    const existingEntry = entries.get(safePageNumber);
    if (existingEntry) {
      markEntryAsUsed(existingEntry);
      return existingEntry;
    }

    const nextEntry: PdfPageResourceCacheEntry<Page> = {
      pageNumber: safePageNumber,
      pagePromise: Promise.resolve().then(() => loadPage(safePageNumber)),
      lastAccessToken: 0,
      retainCount: 0,
    };

    nextEntry.pagePromise = nextEntry.pagePromise.catch((errorValue) => {
      const activeEntry = entries.get(safePageNumber);
      if (activeEntry === nextEntry) {
        entries.delete(safePageNumber);
      }

      throw errorValue;
    });

    markEntryAsUsed(nextEntry);
    entries.set(safePageNumber, nextEntry);
    evictIfNeeded();

    return nextEntry;
  };

  const releaseEntry = (entry: PdfPageResourceCacheEntry<Page>) => {
    if (entry.retainCount > 0) {
      entry.retainCount -= 1;
    }

    markEntryAsUsed(entry);
    evictIfNeeded();
  };

  return {
    getPage: (pageNumber: number) => getOrCreateEntry(pageNumber).pagePromise,
    acquirePage: async (pageNumber: number) => {
      const entry = getOrCreateEntry(pageNumber);
      entry.retainCount += 1;
      markEntryAsUsed(entry);

      let released = false;

      try {
        const page = await entry.pagePromise;

        return {
          page,
          release: () => {
            if (released) {
              return;
            }

            released = true;
            releaseEntry(entry);
          },
        };
      } catch (errorValue) {
        if (!released) {
          released = true;
          releaseEntry(entry);
        }

        throw errorValue;
      }
    },
    prefetchPage: (pageNumber: number) => {
      const entry = getOrCreateEntry(pageNumber);
      void entry.pagePromise.catch(() => {
        // noop
      });
      evictIfNeeded();
    },
    clear: (options?: ClearPdfPageResourceCacheOptions) => {
      const cleanupEvictedPages = options?.cleanupEvictedPages ?? false;
      const entriesToClear = Array.from(entries.values());

      entries.clear();

      if (!cleanupEvictedPages) {
        return;
      }

      entriesToClear
        .filter((entry) => entry.retainCount === 0)
        .forEach((entry) => {
          scheduleCleanup(entry);
        });
    },
    getSize: () => entries.size,
  };
};
