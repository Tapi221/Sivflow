import { PDF_PAGE_PREFETCH_EXTRA_PAGES, PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS } from "@/features/pdf";

export const EMPTY_PDF_RENDER_PAGE_NUMBERS: number[] = [];

export const buildPdfRenderedPageNumbers = ({
  currentPage,
  activeMatchPageNumber,
  numPages,
  pageTopOffsets,
  pageBottomOffsets,
  visualPageNumbers,
  scrollTop,
  viewportHeight,
}: {
  currentPage: number;
  activeMatchPageNumber: number | null;
  numPages: number;
  pageTopOffsets: number[];
  pageBottomOffsets: number[];
  visualPageNumbers: number[];
  scrollTop: number;
  viewportHeight: number;
}) => {
  if (numPages <= 0) {
    return EMPTY_PDF_RENDER_PAGE_NUMBERS;
  }

  const minTop = scrollTop - viewportHeight * PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS;
  const maxBottom = scrollTop + viewportHeight * (1 + PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS);
  const pages = new Set<number>([currentPage]);

  if (activeMatchPageNumber !== null) {
    pages.add(activeMatchPageNumber);
  }

  visualPageNumbers.forEach((pageNumber, index) => {
    const top = pageTopOffsets[index] ?? 0;
    const bottom = pageBottomOffsets[index] ?? top;

    if (bottom >= minTop && top <= maxBottom) {
      pages.add(pageNumber);
    }
  });

  return Array.from(pages).filter(
    (pageNumber) => pageNumber >= 1 && pageNumber <= numPages,
  );
};

export const buildPdfPrefetchPageNumbers = ({
  renderedPageNumbers,
  numPages,
}: {
  renderedPageNumbers: number[];
  numPages: number;
}) => {
  if (numPages <= 0 || renderedPageNumbers.length === 0) {
    return EMPTY_PDF_RENDER_PAGE_NUMBERS;
  }

  const pages = new Set<number>();

  renderedPageNumbers.forEach((pageNumber) => {
    for (
      let offset = -PDF_PAGE_PREFETCH_EXTRA_PAGES;
      offset <= PDF_PAGE_PREFETCH_EXTRA_PAGES;
      offset += 1
    ) {
      const candidate = pageNumber + offset;
      if (candidate >= 1 && candidate <= numPages) {
        pages.add(candidate);
      }
    }
  });

  return Array.from(pages).sort((left, right) => left - right);
};
