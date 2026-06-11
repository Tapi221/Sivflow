import { describe, expect, it } from "vitest";
import { computeNextScaleFromGesture, computeNextScaleFromWheel } from "@/features/pdf/pdfZoom.utils";

describe("computeNextScaleFromWheel", () => {
  it("wheel up 1 step で Sioyek と同じ 1.2 倍にする", () => {
    expect(computeNextScaleFromWheel({ currentScale: 1, deltaY: -120, zoomStep: 0.2, minScale: 0.25, maxScale: 5 })).toBe(1.2);
  });

  it("wheel down 1 step で Sioyek と同じ 1.2 除算にする", () => {
    expect(computeNextScaleFromWheel({ currentScale: 1.2, deltaY: 120, zoomStep: 0.2, minScale: 0.25, maxScale: 5 })).toBe(1);
  });

  it("複数 wheel step では 1 + step * zoomStep の倍率を使う", () => {
    expect(computeNextScaleFromWheel({ currentScale: 1, deltaY: -240, zoomStep: 0.2, minScale: 0.25, maxScale: 5 })).toBe(1.4);
  });

  it("min / max scale で clamp する", () => {
    expect(computeNextScaleFromWheel({ currentScale: 4.9, deltaY: -120, zoomStep: 0.2, minScale: 0.25, maxScale: 5 })).toBe(5);
    expect(computeNextScaleFromWheel({ currentScale: 0.3, deltaY: 120, zoomStep: 0.2, minScale: 0.25, maxScale: 5 })).toBe(0.25);
  });
});

describe("computeNextScaleFromGesture", () => {
  it("gesture scale は base scale へ掛ける", () => {
    expect(computeNextScaleFromGesture({ currentScale: 1, baseScale: 1.5, gestureScale: 2, minScale: 0.25, maxScale: 5 })).toBe(3);
  });

  it("base scale がない場合は current scale を使う", () => {
    expect(computeNextScaleFromGesture({ currentScale: 2, baseScale: null, gestureScale: 1.5, minScale: 0.25, maxScale: 5 })).toBe(3);
  });
});
