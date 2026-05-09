import type {
  PdfJsTextContent,
  PdfJsTextItem,
  PdfPageSearchMatch,
} from "@/features/pdf/pdfViewerTypes";
import { isPdfTextItem } from "@/features/pdf/pdfViewerTypes";

type SearchSegment = {
  itemIndex: number;
  start: number;
  end: number;
};

export type PdfPageSearchIndex = {
  textItems: PdfJsTextItem[];
  combinedText: string;
  searchableCombinedText: string;
  segments: SearchSegment[];
};

const toSearchableText = (value: string) => value.toLocaleLowerCase();

export const extractTextItems = (content: PdfJsTextContent): PdfJsTextItem[] =>
  content.items.filter(isPdfTextItem);

export const buildPageSearchIndex = (
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

export const findPageSearchMatches = ({
  pageNumber,
  searchIndex,
  query,
  globalOffset,
}: {
  pageNumber: number;
  searchIndex: PdfPageSearchIndex;
  query: string;
  globalOffset: number;
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
        globalIndex: globalOffset + matches.length,
      });
    }

    cursor = foundAt + Math.max(1, normalizedQuery.length);
  }

  return matches.filter((match) => match.end > match.start);
};
