import { describe, expect, it } from "vitest";
import { resolvePdfRenderBackingStore } from "@/components/pdf/pdfRenderQuality";

describe("resolvePdfRenderBackingStore", () => {
  it("CSS layout size の関心事を backing-store 計算から分離する", () => {
    const result = resolvePdfRenderBackingStore({
      viewportWidthPx: 1200,
      viewportHeightPx: 1800,
      devicePixelRatio: 2,
    });

    expect(result.canvasWidthPx).toBe(2400);
    expect(result.canvasHeightPx).toBe(3600);
    expect(result.scaleX).toBe(2);
    expect(result.scaleY).toBe(2);
  });

  it("指定された device pixel ratio が無効なら 1x にフォールバックする", () => {
    const result = resolvePdfRenderBackingStore({
      viewportWidthPx: 1024,
      viewportHeightPx: 768,
      devicePixelRatio: Number.NaN,
    });

    expect(result.devicePixelRatio).toBe(1);
    expect(result.canvasWidthPx).toBe(1024);
    expect(result.canvasHeightPx).toBe(768);
  });
});
