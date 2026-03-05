import { describe, expect, it } from "vitest";
import {
  clampScale,
  computeNextScaleFromGesture,
  computeNextScaleFromWheel,
  normalizeScale,
} from "@/components/pdf/pdfZoomUtils";

describe("pdfZoomUtils", () => {
  describe("normalizeScale", () => {
    it("rounds to 3 decimal places", () => {
      expect(normalizeScale(1.23456)).toBe(1.235);
      expect(normalizeScale(1.23444)).toBe(1.234);
    });
  });

  describe("clampScale", () => {
    it("clamps to min/max and supports inverted bounds", () => {
      expect(clampScale(0.4, 0.5, 3)).toBe(0.5);
      expect(clampScale(4, 0.5, 3)).toBe(3);
      expect(clampScale(2, 3, 0.5)).toBe(2);
    });
  });

  describe("computeNextScaleFromWheel", () => {
    it("decreases scale for positive deltaY and increases for negative deltaY", () => {
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

    it("returns null when direction is 0", () => {
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

    it("applies clamp and 3-digit normalization", () => {
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
      ).toBe(1.333);
    });
  });

  describe("computeNextScaleFromGesture", () => {
    it("uses baseScale * gestureScale and normalizes", () => {
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

    it("falls back to currentScale when baseScale is null", () => {
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

    it("returns null for invalid gesture scale", () => {
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

    it("applies clamp", () => {
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
