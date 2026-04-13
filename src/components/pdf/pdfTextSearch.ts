import type { PdfJsTextContent, PdfJsTextItem, PdfPageSearchMatch } from "@/components/pdf/pdfViewerTypes";
import { isPdfTextItem } from "@/components/pdf/pdfViewerTypes";

type SearchSegment = {
  itemIndex: number;
  start: number;
  end: number;
};

const toSearchableText = (value: string) => value.toLocaleLowerCase();

export const extractTextItems = (content: PdfJsTextContent): PdfJsTextItem[] =>
  content.items.filter(isPdfTextItem);

export const findPageSearchMatches = ({
  pageNumber,
  textItems,
  query,
  globalOffset,
}: {
  pageNumber: number;
  textItems: PdfJsTextItem[];
  query: string;
  globalOffset: number;
}): PdfPageSearchMatch[] => {
  const normalizedQuery = toSearchableText(query.trim());
  if (!normalizedQuery) {
    return [];
  }

  let combined = "";
  const segments: SearchSegment[] = [];

  textItems.forEach((item, itemIndex) => {
    if (combined.length > 0) {
      combined += item.hasEOL ? "\n" : " ";
    }

    const start = combined.length;
    combined += item.str;
    const end = combined.length;

    segments.push({
      itemIndex,
      start,
      end,
    });
  });

  const searchableCombined = toSearchableText(combined);
  const matches: PdfPageSearchMatch[] = [];

  let cursor = 0;
  while (cursor < searchableCombined.length) {
    const foundAt = searchableCombined.indexOf(normalizedQuery, cursor);
    if (foundAt < 0) {
      break;
    }

    const matchEnd = foundAt + normalizedQuery.length;

    for (const segment of segments) {
      if (segment.end <= foundAt || segment.start >= matchEnd) {
        continue;
      }

      const localStart = Math.max(0, foundAt - segment.start);
      const localEnd = Math.max(localStart, Math.min(segment.end, matchEnd) - segment.start);

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
