import { CARD_VIEW_DEFAULT_ZOOM_PERCENT, CARD_VIEW_MIN_ZOOM_PERCENT, CARD_VIEW_ZOOM_STEP_PERCENT } from "@constants/shared/cardSetView";
import { CANONICAL_CARD_WIDTH } from "@constants/shared/flashcard";
import { describe, expect, it } from "vitest";
import { clampZoomPercent, computeDynamicMaxZoomPercent, normalizeZoomPercent, zoomPercentToFactor, zoomPercentToFixedCardWidthPx } from "@/features/cardsetview/cardSetViewZoom";

describe("cardSetViewZoom", () => {
  describe("default/min constants", () => {
    it("既存の幅デフォルトを percent に対応させて現在の視覚デフォルトを維持する", () => {
      expect(CARD_VIEW_DEFAULT_ZOOM_PERCENT).toBeGreaterThan(100);
      expect(CARD_VIEW_MIN_ZOOM_PERCENT).toBeLessThan(
        CARD_VIEW_DEFAULT_ZOOM_PERCENT,
      );
      expect(CARD_VIEW_ZOOM_STEP_PERCENT).toBe(5);
    });
  });

  describe("zoomPercentToFactor", () => {
    it("percent を scale factor に変換する", () => {
      expect(zoomPercentToFactor(100)).toBe(1);
      expect(zoomPercentToFactor(125)).toBe(1.25);
    });
  });

  describe("zoomPercentToFixedCardWidthPx", () => {
    it("canonical card width を使って zoom percent を固定カード幅に変換する", () => {
      expect(zoomPercentToFixedCardWidthPx(100)).toBe(CANONICAL_CARD_WIDTH);
      expect(zoomPercentToFixedCardWidthPx(125)).toBe(
        Math.round(CANONICAL_CARD_WIDTH * 1.25),
      );
    });
  });

  describe("computeDynamicMaxZoomPercent", () => {
    it("最も近い 5% ステップへ切り下げる", () => {
      expect(
        computeDynamicMaxZoomPercent({
          availableWidthPx: 719,
          baseCardWidthPx: 480,
          stepPercent: 5,
        }),
      ).toBe(145);
    });

    it("1 ステップ未満を返さない", () => {
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
    it("最小値と最大値に clamp する", () => {
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
    it("clamp 前に 5% 単位へ snap する", () => {
      expect(
        normalizeZoomPercent({
          value: 123,
          minZoomPercent: 75,
          maxZoomPercent: 160,
          stepPercent: 5,
        }),
      ).toBe(125);
    });

    it("通常の最小値より低い dynamic max に対応する", () => {
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
