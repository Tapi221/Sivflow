import {
  CARD_VIEW_DEFAULT_ZOOM_PERCENT,
  CARD_VIEW_MIN_ZOOM_PERCENT,
  CARD_VIEW_ZOOM_STEP_PERCENT,
} from "@constants/shared/cardSetView";
import { CANONICAL_CARD_WIDTH } from "@constants/shared/flashcard";
import { describe, expect, it } from "vitest";

import {
  clampZoomPercent,
  computeDynamicMaxZoomPercent,
  normalizeZoomPercent,
  zoomPercentToFactor,
  zoomPercentToFixedCardWidthPx,
} from "@/features/cardsetview/cardSetViewZoom";

describe("cardSetViewZoom", () => {
  describe("default/min constants", () => {
    it("keeps the current visual defaults by mapping existing width defaults to percent", () => {
      expect(CARD_VIEW_DEFAULT_ZOOM_PERCENT).toBeGreaterThan(100);
      expect(CARD_VIEW_MIN_ZOOM_PERCENT).toBeLessThan(
        CARD_VIEW_DEFAULT_ZOOM_PERCENT,
      );
      expect(CARD_VIEW_ZOOM_STEP_PERCENT).toBe(5);
    });
  });

  describe("zoomPercentToFactor", () => {
    it("converts percent to scale factor", () => {
      expect(zoomPercentToFactor(100)).toBe(1);
      expect(zoomPercentToFactor(125)).toBe(1.25);
    });
  });

  describe("zoomPercentToFixedCardWidthPx", () => {
    it("converts zoom percent to fixed card width using the canonical card width", () => {
      expect(zoomPercentToFixedCardWidthPx(100)).toBe(CANONICAL_CARD_WIDTH);
      expect(zoomPercentToFixedCardWidthPx(125)).toBe(
        Math.round(CANONICAL_CARD_WIDTH * 1.25),
      );
    });
  });

  describe("computeDynamicMaxZoomPercent", () => {
    it("rounds down to the nearest 5% step", () => {
      expect(
        computeDynamicMaxZoomPercent({
          availableWidthPx: 719,
          baseCardWidthPx: 480,
          stepPercent: 5,
        }),
      ).toBe(145);
    });

    it("never returns less than one step", () => {
      expect(
        computeDynamicMaxZoomPercent({
          availableWidthPx: 10,
          baseCardWidthPx: 480,
          stepPercent: 5,
        }),
      ).toBe(5);
    });
  });

  describe("clampZoomPercent", () => {
    it("clamps to min and max", () => {
      expect(
        clampZoomPercent({
          value: 60,
          minZoomPercent: 75,
          maxZoomPercent: 140,
        }),
      ).toBe(75);

      expect(
        clampZoomPercent({
          value: 160,
          minZoomPercent: 75,
          maxZoomPercent: 140,
        }),
      ).toBe(140);
    });
  });

  describe("normalizeZoomPercent", () => {
    it("snaps to 5% increments before clamping", () => {
      expect(
        normalizeZoomPercent({
          value: 123,
          minZoomPercent: 75,
          maxZoomPercent: 160,
          stepPercent: 5,
        }),
      ).toBe(125);
    });

    it("supports dynamic max lower than the normal minimum", () => {
      expect(
        normalizeZoomPercent({
          value: 120,
          minZoomPercent: 70,
          maxZoomPercent: 65,
          stepPercent: 5,
        }),
      ).toBe(70);
    });
  });
});
