/// <reference lib="webworker" />

import type {
  PdfSearchWorkerRequest,
  PdfSearchWorkerResponse,
} from "./pdfSearchWorkerProtocol";
import type {
  PdfJsTextContent,
  PdfJsTextItem,
  PdfPageSearchMatch,
} from "./pdfViewerTypes";

type SearchSegment = {
  itemIndex: number;
  start: number;
  end: number;
};

type PdfPageSearchIndex = {
  textItems: PdfJsTextItem[];
  combinedText: string;
  searchableCombinedText: string;
  segments: SearchSegment[];
};

type PdfJsTextMarkedContent = {
  type: string;
};

const toSearchableText = (value: string) => value.toLocaleLowerCase();

const isPdfTextItem = (
  item: PdfJsTextItem | PdfJsTextMarkedContent,
): item is PdfJsTextItem => typeof (item as PdfJsTextItem).str === "string";

const extractTextItems = (content: PdfJsTextContent): PdfJsTextItem[] =>
  content.items.filter(isPdfTextItem);

const buildPageSearchIndex = (
  content: PdfJsTextContent,
): PdfPageSearchIndex => {
  const textItems = extractTextItems(content);
  let combinedText = "";
  const segments: SearchSegment[] = [];

  textItems.forEach((item, itemIndex) => {
    if (combinedText.length > 0) {
      combinedText += item.hasEOL ? "\n" : " ";
    }

    const start = combinedText.length;
    combinedText += item.str;
    const end = combinedText.length;

    segments.push({
      itemIndex,
      start,
      end,
    });
  });

  return {
    textItems,
    combinedText,
    searchableCombinedText: toSearchableText(combinedText),
    segments,
  };
};

const findPageSearchMatches = ({
  pageNumber,
  searchIndex,
  query,
}: {
  pageNumber: number;
  searchIndex: PdfPageSearchIndex;
  query: string;
}): PdfPageSearchMatch[] => {
  const normalizedQuery = toSearchableText(query.trim());
  if (!normalizedQuery) {
    return [];
  }

  const matches: PdfPageSearchMatch[] = [];
  let cursor = 0;

  while (cursor < searchIndex.searchableCombinedText.length) {
    const foundAt = searchIndex.searchableCombinedText.indexOf(
      normalizedQuery,
      cursor,
    );
    if (foundAt < 0) {
      break;
    }

    const matchEnd = foundAt + normalizedQuery.length;

    for (const segment of searchIndex.segments) {
      if (segment.end <= foundAt || segment.start >= matchEnd) {
        continue;
      }

      const localStart = Math.max(0, foundAt - segment.start);
      const localEnd = Math.max(
        localStart,
        Math.min(segment.end, matchEnd) - segment.start,
      );

      matches.push({
        pageNumber,
        itemIndex: segment.itemIndex,
        start: localStart,
        end: localEnd,
        globalIndex: 0,
      });
    }

    cursor = foundAt + Math.max(1, normalizedQuery.length);
  }

  return matches.filter((match) => match.end > match.start);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return String(error ?? "");
};

const searchIndexCache = new Map<number, PdfPageSearchIndex>();

const postResponse = (response: PdfSearchWorkerResponse) => {
  self.postMessage(response);
};

self.addEventListener(
  "message",
  (event: MessageEvent<PdfSearchWorkerRequest>) => {
    const payload = event.data;

    switch (payload.type) {
      case "reset": {
        searchIndexCache.clear();
        return;
      }

      case "index-page": {
        try {
          searchIndexCache.set(
            payload.pageNumber,
            buildPageSearchIndex(payload.content),
          );
          postResponse({
            type: "index-page:done",
            requestId: payload.requestId,
            pageNumber: payload.pageNumber,
          });
        } catch (errorValue: unknown) {
          postResponse({
            type: "error",
            requestId: payload.requestId,
            message: getErrorMessage(errorValue),
          });
        }
        return;
      }

      case "search-page": {
        try {
          const searchIndex = searchIndexCache.get(payload.pageNumber);

          if (!searchIndex) {
            throw new Error(`page ${payload.pageNumber} is not indexed`);
          }

          postResponse({
            type: "search-page:done",
            requestId: payload.requestId,
            pageNumber: payload.pageNumber,
            matches: findPageSearchMatches({
              pageNumber: payload.pageNumber,
              searchIndex,
              query: payload.query,
            }),
          });
        } catch (errorValue: unknown) {
          postResponse({
            type: "error",
            requestId: payload.requestId,
            message: getErrorMessage(errorValue),
          });
        }
        return;
      }

      default: {
        const exhaustiveCheck: never = payload;
        return exhaustiveCheck;
      }
    }
  },
);
