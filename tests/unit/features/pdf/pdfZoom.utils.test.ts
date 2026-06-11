import { describe, expect, it } from "vitest";



import { PDF_TRACKPAD_ZOOM_SENSITIVITY, PDF_ZOOM_MAX_SCALE, PDF_ZOOM_MIN_SCALE, PDF_ZOOM_STEP } from "@/features/pdf/pdfZoom.constants";



import { computeNextScaleFromGesture, computeNextScaleFromWheel, resolveTrackpadDeltaYForScaleRatio } from "@/features/pdf/pdfZoom.utils";

describe("computeNextScaleFromWheel", () => {
  it("wheel up 1 step で Sioyek と同じ 1.2 倍にする", () => {
    expect(computeNextScaleFromWheel({ currentScale: 1, deltaY: -120, zoomStep: PDF_ZOOM_STEP, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE })).toBe(1.2);
  });

  it("wheel down 1 step で Sioyek と同じ 1.2 除算にする", () => {
    expect(computeNextScaleFromWheel({ currentScale: 1.2, deltaY: 120, zoomStep: PDF_ZOOM_STEP, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE })).toBe(1);
  });

  it("複数 wheel step では 1 + step * zoomStep の倍率を使う", () => {
    expect(computeNextScaleFromWheel({ currentScale: 1, deltaY: -240, zoomStep: PDF_ZOOM_STEP, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE })).toBe(1.4);
  });

  it("min / max scale で clamp する", () => {
    expect(computeNextScaleFromWheel({ currentScale: 4.9, deltaY: -120, zoomStep: PDF_ZOOM_STEP, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE })).toBe(PDF_ZOOM_MAX_SCALE);
    expect(computeNextScaleFromWheel({ currentScale: 0.3, deltaY: 120, zoomStep: PDF_ZOOM_STEP, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE })).toBe(PDF_ZOOM_MIN_SCALE);
  });
});

describe("computeNextScaleFromGesture", () => {
  it("gesture scale は base scale へ掛ける", () => {
    expect(computeNextScaleFromGesture({ currentScale: 1, baseScale: 1.5, gestureScale: 2, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE })).toBe(3);
  });

  it("base scale がない場合は current scale を使う", () => {
    expect(computeNextScaleFromGesture({ currentScale: 2, baseScale: null, gestureScale: 1.5, minScale: PDF_ZOOM_MIN_SCALE, maxScale: PDF_ZOOM_MAX_SCALE })).toBe(3);
  });
});

describe("resolveTrackpadDeltaYForScaleRatio", () => {
  it("PdfPane の Math.exp 式で同じ scale ratio になる deltaY を返す", () => {
    const deltaY = resolveTrackpadDeltaYForScaleRatio({ scaleRatio: 1.2, sensitivity: PDF_TRACKPAD_ZOOM_SENSITIVITY });

    expect(deltaY).not.toBeNull();
    expect(Math.exp(-(deltaY ?? 0) * PDF_TRACKPAD_ZOOM_SENSITIVITY)).toBeCloseTo(1.2);
  });

  it("無効な scale ratio と sensitivity は null を返す", () => {
    expect(resolveTrackpadDeltaYForScaleRatio({ scaleRatio: 0, sensitivity: PDF_TRACKPAD_ZOOM_SENSITIVITY })).toBeNull();
    expect(resolveTrackpadDeltaYForScaleRatio({ scaleRatio: 1.2, sensitivity: 0 })).toBeNull();
  });
});
