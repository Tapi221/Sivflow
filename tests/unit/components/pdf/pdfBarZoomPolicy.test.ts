import { describe, expect, it } from "vitest";

import {
  clampPdfBarZoomPercent,
  resolvePdfBarRenderScale,
  resolvePdfBarZoomPercentFromRenderScale,
} from "@/components/pdf/pdfBarZoomPolicy";

describe("pdfBarZoomPolicy", () => {
  it("0-100% の UI 値を安全に clamp する", () => {
    expect(clampPdfBarZoomPercent(-10)).toBe(0);
    expect(clampPdfBarZoomPercent(37.6)).toBe(38);
    expect(clampPdfBarZoomPercent(180)).toBe(100);
  });

  it("100% を現在の fitScale に対応する最大表示として扱う", () => {
    expect(
      resolvePdfBarRenderScale({
        zoomPercent: 100,
        fitScale: 1.25,
      }),
    ).toBe(1.25);

    expect(
      resolvePdfBarRenderScale({
        zoomPercent: 0,
        fitScale: 1.25,
      }),
    ).toBe(0.25);
  });

  it("旧 scale ベースの状態を 0-100% UI に逆変換できる", () => {
    expect(
      resolvePdfBarZoomPercentFromRenderScale({
        renderScale: 1.25,
        fitScale: 1.25,
      }),
    ).toBe(100);

    expect(
      resolvePdfBarZoomPercentFromRenderScale({
        renderScale: 0.25,
        fitScale: 1.25,
      }),
    ).toBe(0);
  });
});
