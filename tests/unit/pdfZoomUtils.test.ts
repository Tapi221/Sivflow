import { describe, expect, it } from "vitest";
import { clampScale, computeNextScaleFromGesture, computeNextScaleFromWheel, normalizeScale } from "@/components/pdf/pdfZoomUtils";

describe("pdfZoomUtils", () => {
  describe("normalizeScale", () => {
    it("小数第3位に丸める", () => {
      expect(normalizeScale(1.23456)).toBe(1.235);
      expect(normalizeScale(1.23444)).toBe(1.234);
    });
  });

  describe("clampScale", () => {
    it("最小値・最大値に clamp し、反転した境界にも対応する", () => {
      expect(clampScale(0.4, 0.5, 3)).toBe(0.5);
      expect(clampScale(4, 0.5, 3)).toBe(3);
      expect(clampScale(2, 3, 0.5)).toBe(2);
    });
  });

  describe("computeNextScaleFromWheel", () => {
    it("正の deltaY では縮小し、負の deltaY では拡大する", () => {
      expect(
        computeNextScaleFromWheel({
          currentScale: 1,
          deltaY: 100,
          zoomStep: 0.1,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBe(0.9);

      expect(
        computeNextScaleFromWheel({
          currentScale: 1,
          deltaY: -100,
          zoomStep: 0.1,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBe(1.1);
    });

    it("方向が 0 の場合は null を返す", () => {
      expect(
        computeNextScaleFromWheel({
          currentScale: 1,
          deltaY: 0,
          zoomStep: 0.1,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBeNull();
    });

    it("clamp と 3 桁正規化を適用する", () => {
      expect(
        computeNextScaleFromWheel({
          currentScale: 0.52,
          deltaY: 100,
          zoomStep: 0.1,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBe(0.5);

      expect(
        computeNextScaleFromWheel({
          currentScale: 2.97,
          deltaY: -100,
          zoomStep: 0.1,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBe(3);

      expect(
        computeNextScaleFromWheel({
          currentScale: 1,
          deltaY: -120,
          zoomStep: 0.3333,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBe(1.667);
    });

    it("delta の大きさに応じてホイールステップ数をスケールする", () => {
      expect(
        computeNextScaleFromWheel({
          currentScale: 1,
          deltaY: -240,
          zoomStep: 0.1,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBe(1.3);
    });
  });

  describe("computeNextScaleFromGesture", () => {
    it("baseScale * gestureScale を使用して正規化する", () => {
      expect(
        computeNextScaleFromGesture({
          currentScale: 1,
          baseScale: 1.2,
          gestureScale: 1.25,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBe(1.5);
    });

    it("baseScale が null の場合は currentScale にフォールバックする", () => {
      expect(
        computeNextScaleFromGesture({
          currentScale: 1.23456,
          baseScale: null,
          gestureScale: 1,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBe(1.235);
    });

    it("無効な gesture scale では null を返す", () => {
      expect(
        computeNextScaleFromGesture({
          currentScale: 1,
          baseScale: 1,
          gestureScale: 0,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBeNull();
    });

    it("clamp を適用する", () => {
      expect(
        computeNextScaleFromGesture({
          currentScale: 2.9,
          baseScale: 2.9,
          gestureScale: 1.5,
          minScale: 0.5,
          maxScale: 3,
        }),
      ).toBe(3);
    });
  });
});
