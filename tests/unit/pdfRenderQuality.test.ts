import { describe, expect, it } from "vitest";

import { resolvePdfRenderBackingStore } from "@/components/pdf/pdfRenderQuality";

describe("resolvePdfRenderBackingStore", () => {
  it("keeps css layout size concerns out of the backing-store calculation", () => {
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

  it("falls back to 1x when the provided device pixel ratio is invalid", () => {
    const result = resolvePdfRenderBackingStore({
      viewportWidthPx: 1024,
      viewportHeightPx: 768,
      devicePixelRatio: Number.NaN,
    });

    expect(result.devicePixelRatio).toBe(1);
    expect(result.canvasWidthPx).toBe(1024);
    expect(result.canvasHeightPx).toBe(768);
  });

  it("limits raster size by edge length without changing viewport dimensions", () => {
    const result = resolvePdfRenderBackingStore({
      viewportWidthPx: 3000,
      viewportHeightPx: 2000,
      devicePixelRatio: 4,
      constraints: {
        maxCanvasEdgePx: 8192,
        maxCanvasPixels: 50_000_000,
        maxPreferredDevicePixelRatio: 4,
      },
    });

    expect(result.devicePixelRatio).toBeCloseTo(8192 / 3000, 6);
    expect(result.canvasWidthPx).toBeLessThanOrEqual(8192);
    expect(result.canvasHeightPx).toBeLessThanOrEqual(8192);
  });

  it("limits raster size by total pixel budget without dropping below 1x", () => {
    const result = resolvePdfRenderBackingStore({
      viewportWidthPx: 2400,
      viewportHeightPx: 3200,
      devicePixelRatio: 4,
      constraints: {
        maxCanvasPixels: 16_777_216,
        maxCanvasEdgePx: 20_000,
        maxPreferredDevicePixelRatio: 4,
      },
    });

    expect(result.devicePixelRatio).toBeCloseTo(
      Math.sqrt(16_777_216 / (2400 * 3200)),
      6,
    );
    expect(result.devicePixelRatio).toBeGreaterThanOrEqual(1);
    expect(result.canvasWidthPx * result.canvasHeightPx).toBeLessThanOrEqual(
      16_777_216,
    );
  });
});
