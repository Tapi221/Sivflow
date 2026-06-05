import { describe, expect, it } from "vitest";
import { resolvePdfRenderBackingStore } from "@/features/pdf/pdfRenderQuality";

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

  it("PDF表示用に最低 backing-store 倍率を指定できる", () => {
    const result = resolvePdfRenderBackingStore({
      viewportWidthPx: 900,
      viewportHeightPx: 1200,
      devicePixelRatio: 1,
      minimumDevicePixelRatio: 2,
    });

    expect(result.devicePixelRatio).toBe(2);
    expect(result.canvasWidthPx).toBe(1800);
    expect(result.canvasHeightPx).toBe(2400);
  });

  it("巨大ページでは最大キャンバスピクセル数で backing-store 倍率を抑える", () => {
    const result = resolvePdfRenderBackingStore({
      viewportWidthPx: 2000,
      viewportHeightPx: 2000,
      devicePixelRatio: 3,
      minimumDevicePixelRatio: 2,
      maximumCanvasPixels: 4_000_000,
    });

    expect(result.devicePixelRatio).toBe(1);
    expect(result.canvasWidthPx).toBe(2000);
    expect(result.canvasHeightPx).toBe(2000);
  });
});
