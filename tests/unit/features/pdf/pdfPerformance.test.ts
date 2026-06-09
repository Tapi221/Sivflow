import { afterEach, describe, expect, it, vi } from "vitest";
import { createPdfPerformanceTraceName, recordPdfPerformanceMark, recordPdfPerformanceMeasure } from "@/features/pdf/pdfPerformance";

describe("pdfPerformance", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PDF performance trace 名を重複しない名前で生成する", () => {
    const firstTraceName = createPdfPerformanceTraceName("viewer.load");
    const secondTraceName = createPdfPerformanceTraceName("viewer.load");

    expect(firstTraceName).not.toBe(secondTraceName);
    expect(firstTraceName).toMatch(/^viewer\.load\.\d+$/);
    expect(secondTraceName).toMatch(/^viewer\.load\.\d+$/);
  });

  it("performance mark は Sivflow PDF prefix と detail を付けて記録する", () => {
    const markMock = vi.fn();
    vi.stubGlobal("performance", { mark: markMock, measure: vi.fn() });

    recordPdfPerformanceMark("source.resolve.start", { detail: { sourceType: "url" } });

    expect(markMock).toHaveBeenCalledWith("sivflow.pdf.source.resolve.start", { detail: { sourceType: "url" } });
  });

  it("debugOnly の mark は debug storage flag が無い場合は記録しない", () => {
    const markMock = vi.fn();
    const getItemMock = vi.fn(() => null);
    vi.stubGlobal("localStorage", { getItem: getItemMock });
    vi.stubGlobal("performance", { mark: markMock, measure: vi.fn() });

    recordPdfPerformanceMark("viewer.pagechanging", { debugOnly: true });

    expect(getItemMock).toHaveBeenCalledWith("sivflow.pdf.debugPerformance");
    expect(markMock).not.toHaveBeenCalled();
  });

  it("debugOnly の mark は debug storage flag が有効な場合だけ記録する", () => {
    const markMock = vi.fn();
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => "1") });
    vi.stubGlobal("performance", { mark: markMock, measure: vi.fn() });

    recordPdfPerformanceMark("viewer.pagechanging", { debugOnly: true });

    expect(markMock).toHaveBeenCalledWith("sivflow.pdf.viewer.pagechanging");
  });

  it("performance measure は missing mark などの例外を PDF 表示側へ伝播しない", () => {
    vi.stubGlobal("performance", { mark: vi.fn(), measure: vi.fn(() => { throw new Error("missing mark"); }) });

    expect(() => recordPdfPerformanceMeasure("viewer.load.duration", "viewer.load.start", "viewer.load.end")).not.toThrow();
  });
});
