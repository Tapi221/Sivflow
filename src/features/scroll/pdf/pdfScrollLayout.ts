import { PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT } from "@/features/pdf";
import type { PageSize } from "@/features/pdf/pdfViewer.types";
import type { PdfPageLayoutMode } from "@/types";

export type PdfPageLayoutMetrics = {
  visualPageNumbers: number[];
  visualPageAnchorPageNumbers: number[];
  visualPageTopOffsets: number[];
  visualPageBottomOffsets: number[];
  pageScrollTopsByPageNumber: Record<number, number>;
  pageRowIndexesByPageNumber: Record<number, number>;
  rowTopOffsets: number[];
  rowBottomOffsets: number[];
  rowHeights: number[];
  rowPageNumbers: number[][];
  totalContentHeight: number;
};

const EMPTY_PDF_PAGE_NUMBERS: number[] = [];

export const normalizePdfPageOrder = (
  pageOrder: number[] | undefined,
  numPages: number,
): number[] => {
  if (numPages <= 0) {
    return EMPTY_PDF_PAGE_NUMBERS;
  }

  if (!pageOrder || pageOrder.length === 0) {
    return Array.from({ length: numPages }, (_, index) => index + 1);
  }

  const seen = new Set<number>();
  const normalized: number[] = [];

  for (const value of pageOrder) {
    if (!Number.isInteger(value) || value < 1 || value > numPages) {
      continue;
    }

    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    normalized.push(value);
  }

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
    if (!seen.has(pageNumber)) {
      normalized.push(pageNumber);
    }
  }

  return normalized;
};

export const getPdfPageSizeOrFallback = (
  pageSizes: Record<number, PageSize>,
  pageNumber: number,
): PageSize =>
  pageSizes[pageNumber] ?? {
    width: 1,
    height: PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT,
  };

export const buildPdfPageLayoutMetrics = ({
  orderedPageNumbers,
  pageSizes,
  scale,
  pageGap,
  pageLayoutMode,
}: {
  orderedPageNumbers: number[];
  pageSizes: Record<number, PageSize>;
  scale: number;
  pageGap: number;
  pageLayoutMode: PdfPageLayoutMode;
}): PdfPageLayoutMetrics => {
  const rows: number[][] = [];

  if (pageLayoutMode === "double") {
    for (let index = 0; index < orderedPageNumbers.length; index += 2) {
      rows.push(orderedPageNumbers.slice(index, index + 2));
    }
  } else {
    orderedPageNumbers.forEach((pageNumber) => rows.push([pageNumber]));
  }

  const visualPageNumbers: number[] = [];
  const visualPageAnchorPageNumbers: number[] = [];
  const visualPageTopOffsets: number[] = [];
  const visualPageBottomOffsets: number[] = [];
  const pageScrollTopsByPageNumber: Record<number, number> = {};
  const pageRowIndexesByPageNumber: Record<number, number> = {};
  const rowTopOffsets: number[] = [];
  const rowBottomOffsets: number[] = [];
  const rowHeights: number[] = [];

  let top = 0;

  rows.forEach((row, rowIndex) => {
    const rowHeight = row.reduce((maxHeight, pageNumber) => {
      const pageSize = getPdfPageSizeOrFallback(pageSizes, pageNumber);
      return Math.max(maxHeight, pageSize.height * scale);
    }, 0);

    rowTopOffsets.push(top);
    rowBottomOffsets.push(top + rowHeight);
    rowHeights.push(rowHeight);

    row.forEach((pageNumber) => {
      visualPageNumbers.push(pageNumber);
      visualPageAnchorPageNumbers.push(pageNumber);
      visualPageTopOffsets.push(top);
      visualPageBottomOffsets.push(top + rowHeight);
      pageScrollTopsByPageNumber[pageNumber] = top;
      pageRowIndexesByPageNumber[pageNumber] = rowIndex;
    });

    top += rowHeight + pageGap;
  });

  return {
    visualPageNumbers,
    visualPageAnchorPageNumbers,
    visualPageTopOffsets,
    visualPageBottomOffsets,
    pageScrollTopsByPageNumber,
    pageRowIndexesByPageNumber,
    rowTopOffsets,
    rowBottomOffsets,
    rowHeights,
    rowPageNumbers: rows,
    totalContentHeight: Math.max(0, top - pageGap),
  };
};
