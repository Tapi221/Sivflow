type PdfPageWindowOffsetMetric = {
  pageNumber: number;
  offsetTop: number;
  offsetHeight: number;
};
type PdfPageWindowBoundingMetric = {
  pageNumber: number;
  top: number;
  bottom: number;
};
type PdfPageWindowMetric = PdfPageWindowOffsetMetric | PdfPageWindowBoundingMetric;
type PdfPageWindowOptions = {
  fallbackPageNumber?: number | null;
  overscanPageCount?: number;
};
type PdfPageWindowKeepSet = {
  (pageMetrics: PdfPageWindowMetric[], viewportTop: number, viewportHeight: number, pageCount: number, options?: PdfPageWindowOptions): Set<number>;
  (fallbackPageNumber: number, pageCount: number, overscanPageCount?: number): Set<number>;
};



const DEFAULT_PDF_PAGE = 1;
const DEFAULT_PDF_PAGE_WINDOW_OVERSCAN = 1;



const getSafePdfPageNumber = (pageNumber: number | null | undefined, pageCount?: number | null): number => {
  const normalizedPageNumber = Math.floor(pageNumber ?? DEFAULT_PDF_PAGE);
  const safePageNumber = Number.isFinite(normalizedPageNumber) ? normalizedPageNumber : DEFAULT_PDF_PAGE;
  const safePageCount = typeof pageCount === "number" && Number.isFinite(pageCount) ? Math.max(Math.floor(pageCount), DEFAULT_PDF_PAGE) : Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(safePageNumber, DEFAULT_PDF_PAGE), safePageCount);
};
const getNormalizedPdfPageWindowOverscan = (overscanPageCount: number | null | undefined): number => {
  if (typeof overscanPageCount !== "number" || !Number.isFinite(overscanPageCount)) return DEFAULT_PDF_PAGE_WINDOW_OVERSCAN;
  return Math.max(0, Math.floor(overscanPageCount));
};
const getMetricOffsetTop = (metric: PdfPageWindowMetric): number => "offsetTop" in metric ? metric.offsetTop : metric.top;
const getMetricOffsetHeight = (metric: PdfPageWindowMetric): number => "offsetHeight" in metric ? metric.offsetHeight : metric.bottom - metric.top;
const isValidPdfPageWindowMetric = (metric: PdfPageWindowMetric, pageCount: number): boolean => {
  const offsetTop = getMetricOffsetTop(metric);
  const offsetHeight = getMetricOffsetHeight(metric);
  return Number.isFinite(metric.pageNumber) && Number.isFinite(offsetTop) && Number.isFinite(offsetHeight) && offsetHeight > 0 && metric.pageNumber >= DEFAULT_PDF_PAGE && metric.pageNumber <= pageCount;
};
const isPdfPageMetricVisible = (metric: PdfPageWindowMetric, viewportTop: number, viewportBottom: number): boolean => {
  const offsetTop = getMetricOffsetTop(metric);
  const pageBottom = offsetTop + getMetricOffsetHeight(metric);
  return pageBottom > viewportTop && offsetTop < viewportBottom;
};
const getPdfPageWindowScanStartIndex = (pageMetrics: PdfPageWindowMetric[], viewportTop: number): number => {
  let low = 0;
  let high = pageMetrics.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const metric = pageMetrics[middle];
    const pageBottom = getMetricOffsetTop(metric) + getMetricOffsetHeight(metric);

    if (pageBottom < viewportTop) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
};
const getPdfVisiblePageNumbers = (pageMetrics: PdfPageWindowMetric[], viewportTop: number, viewportBottom: number, pageCount: number): number[] => {
  const visiblePageNumbers: number[] = [];
  const startIndex = getPdfPageWindowScanStartIndex(pageMetrics, viewportTop);

  for (let index = startIndex; index < pageMetrics.length; index += 1) {
    const metric = pageMetrics[index];
    if (!isValidPdfPageWindowMetric(metric, pageCount)) continue;
    if (getMetricOffsetTop(metric) > viewportBottom) break;
    if (isPdfPageMetricVisible(metric, viewportTop, viewportBottom)) visiblePageNumbers.push(getSafePdfPageNumber(metric.pageNumber, pageCount));
  }

  return visiblePageNumbers;
};
const getPdfPageWindowAroundPage = (pageNumber: number, pageCount: number, overscanPageCount?: number): Set<number> => {
  const safePageCount = Math.max(pageCount, DEFAULT_PDF_PAGE);
  const safePageNumber = getSafePdfPageNumber(pageNumber, safePageCount);
  const overscan = getNormalizedPdfPageWindowOverscan(overscanPageCount);
  const firstPage = Math.max(DEFAULT_PDF_PAGE, safePageNumber - overscan);
  const lastPage = Math.min(safePageCount, safePageNumber + overscan);
  const pageWindow = new Set<number>();

  for (let page = firstPage; page <= lastPage; page += 1) pageWindow.add(page);
  return pageWindow;
};
const getPdfPageWindowKeepSet: PdfPageWindowKeepSet = (first: PdfPageWindowMetric[] | number, second: number, third?: number, fourth?: number | PdfPageWindowOptions, fifth: PdfPageWindowOptions = {}): Set<number> => {
  if (typeof first === "number") {
    return getPdfPageWindowAroundPage(first, second, third);
  }

  const pageMetrics = first;
  const viewportTop = second;
  const viewportHeight = third ?? 0;
  const pageCount = typeof fourth === "number" ? fourth : DEFAULT_PDF_PAGE;
  const options = typeof fourth === "object" && fourth !== null ? fourth : fifth;
  const safePageCount = Math.max(pageCount, DEFAULT_PDF_PAGE);
  const safeViewportTop = Number.isFinite(viewportTop) ? viewportTop : 0;
  const safeViewportHeight = Number.isFinite(viewportHeight) ? Math.max(0, viewportHeight) : 0;
  const viewportBottom = safeViewportTop + safeViewportHeight;
  const visiblePageNumbers = getPdfVisiblePageNumbers(pageMetrics, safeViewportTop, viewportBottom, safePageCount);

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
