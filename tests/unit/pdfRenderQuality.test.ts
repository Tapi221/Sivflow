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
});
