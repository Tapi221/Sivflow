type PdfPageWindowMetric = {
  pageNumber: number;
  offsetTop: number;
  offsetHeight: number;
};

type PdfPageWindowOptions = {
  fallbackPageNumber?: number | null;
  overscanPageCount?: number;
};

const DEFAULT_PDF_PAGE = 1;
const DEFAULT_PDF_PAGE_WINDOW_OVERSCAN = 1;

const getSafePdfPageNumber = (pageNumber: number | null | undefined, pageCount: number): number => {
  const normalizedPageNumber = Math.floor(pageNumber ?? DEFAULT_PDF_PAGE);
  return Math.min(Math.max(normalizedPageNumber, DEFAULT_PDF_PAGE), Math.max(pageCount, DEFAULT_PDF_PAGE));
};

const getNormalizedPdfPageWindowOverscan = (overscanPageCount: number | null | undefined): number => {
  if (typeof overscanPageCount !== "number" || !Number.isFinite(overscanPageCount)) return DEFAULT_PDF_PAGE_WINDOW_OVERSCAN;
  return Math.max(0, Math.floor(overscanPageCount));
};

const isPdfPageMetricVisible = (metric: PdfPageWindowMetric, viewportTop: number, viewportBottom: number): boolean => {
  if (metric.offsetHeight <= 0) return false;
  const pageBottom = metric.offsetTop + metric.offsetHeight;
  return pageBottom >= viewportTop && metric.offsetTop <= viewportBottom;
};

const getPdfPageWindowKeepSet = (pageMetrics: PdfPageWindowMetric[], viewportTop: number, viewportHeight: number, pageCount: number, options: PdfPageWindowOptions = {}): Set<number> => {
  const safePageCount = Math.max(pageCount, DEFAULT_PDF_PAGE);
  const safeViewportTop = Number.isFinite(viewportTop) ? viewportTop : 0;
  const safeViewportHeight = Number.isFinite(viewportHeight) ? Math.max(0, viewportHeight) : 0;
  const viewportBottom = safeViewportTop + safeViewportHeight;
  const visiblePageNumbers = pageMetrics
    .filter((metric) => Number.isFinite(metric.pageNumber) && Number.isFinite(metric.offsetTop) && Number.isFinite(metric.offsetHeight))
    .filter((metric) => metric.pageNumber >= DEFAULT_PDF_PAGE && metric.pageNumber <= safePageCount)
    .filter((metric) => isPdfPageMetricVisible(metric, safeViewportTop, viewportBottom))
    .map((metric) => getSafePdfPageNumber(metric.pageNumber, safePageCount));

  if (visiblePageNumbers.length === 0) return new Set([getSafePdfPageNumber(options.fallbackPageNumber, safePageCount)]);

  const overscan = getNormalizedPdfPageWindowOverscan(options.overscanPageCount);
  const firstVisiblePage = Math.min(...visiblePageNumbers);
  const lastVisiblePage = Math.max(...visiblePageNumbers);
  const firstPage = Math.max(DEFAULT_PDF_PAGE, firstVisiblePage - overscan);
  const lastPage = Math.min(safePageCount, lastVisiblePage + overscan);
  const idsToKeep = new Set<number>();

  for (let page = firstPage; page <= lastPage; page += 1) idsToKeep.add(page);
  return idsToKeep;
};

export { getPdfPageWindowKeepSet, getSafePdfPageNumber };
export type { PdfPageWindowMetric, PdfPageWindowOptions };
