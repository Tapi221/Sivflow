import { describe, expect, it } from "vitest";
import { getPdfPageWindowKeepSet, getSafePdfPageNumber } from "@/features/pdf/pdfPageWindow";
import type { PdfPageWindowMetric } from "@/features/pdf/pdfPageWindow";

const createPageMetrics = (pageCount: number, pageHeight: number): PdfPageWindowMetric[] => {
  return Array.from({ length: pageCount }, (_, index) => ({
    pageNumber: index + 1,
    offsetTop: index * pageHeight,
    offsetHeight: pageHeight,
  }));
};

const toSortedPages = (pages: Set<number>): number[] => {
  return [...pages].sort((a, b) => a - b);
};

describe("getSafePdfPageNumber", () => {
  it("ページ番号をPDFの範囲内に丸める", () => {
    expect(getSafePdfPageNumber(-10, 20)).toBe(1);
    expect(getSafePdfPageNumber(4.8, 20)).toBe(4);
    expect(getSafePdfPageNumber(30, 20)).toBe(20);
  });
});

describe("getPdfPageWindowKeepSet", () => {
  it("可視ページを中心に保持対象を作る", () => {
    const pages = getPdfPageWindowKeepSet([
      { pageNumber: 1, offsetTop: 0, offsetHeight: 1000 },
      { pageNumber: 2, offsetTop: 1040, offsetHeight: 1000 },
      { pageNumber: 3, offsetTop: 2080, offsetHeight: 1000 },
      { pageNumber: 4, offsetTop: 3120, offsetHeight: 1000 },
      { pageNumber: 5, offsetTop: 4160, offsetHeight: 1000 },
    ], 1500, 900, 5, { overscanPageCount: 1 });

    expect(toSortedPages(pages)).toEqual([1, 2, 3, 4]);
  });

  it("可視ページが取れない場合はfallbackページだけを保持する", () => {
    const pages = getPdfPageWindowKeepSet([], 1500, 900, 5, { fallbackPageNumber: 4, overscanPageCount: 2 });

    expect(toSortedPages(pages)).toEqual([4]);
  });

  it("overscanがページ範囲を越えても範囲外ページを含めない", () => {
    const pages = getPdfPageWindowKeepSet([
      { pageNumber: 1, offsetTop: 0, offsetHeight: 1000 },
      { pageNumber: 2, offsetTop: 1040, offsetHeight: 1000 },
    ], 0, 500, 2, { overscanPageCount: 10 });

    expect(toSortedPages(pages)).toEqual([1, 2]);
  });

  it("巨大PDFでもviewportより前のページを走査対象から外す", () => {
    const pages = getPdfPageWindowKeepSet(createPageMetrics(1_000, 100), 50_000, 100, 1_000, { overscanPageCount: 1 });

    expect(toSortedPages(pages)).toEqual([500, 501, 502, 503]);
  });
});
