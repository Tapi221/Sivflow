import { describe, expect, it } from "vitest";
import {
  clampZoomPercent,
  computeDynamicMaxZoomPercent,
} from "@/pages/card-view/hooks/useCardViewZoom";

describe("card view zoom", () => {
  describe("computeDynamicMaxZoomPercent", () => {
    it("snaps down to 5% steps based on content area width", () => {
      expect(computeDynamicMaxZoomPercent(576)).toBe(120);
      expect(computeDynamicMaxZoomPercent(600)).toBe(125);
      expect(computeDynamicMaxZoomPercent(479)).toBe(95);
    });

    it("never drops below one step", () => {
      expect(computeDynamicMaxZoomPercent(1)).toBe(5);
      expect(computeDynamicMaxZoomPercent(0)).toBe(120);
    });
  });

  describe("clampZoomPercent", () => {
    it("clamps to min/max and snaps to 5% steps", () => {
      expect(
        clampZoomPercent(123, {
          minPercent: 75,
          maxPercent: 140,
        }),
      ).toBe(125);

      expect(
        clampZoomPercent(72, {
          minPercent: 75,
          maxPercent: 140,
        }),
      ).toBe(75);

      expect(
        clampZoomPercent(999, {
          minPercent: 75,
          maxPercent: 140,
        }),
      ).toBe(140);
    });

    it("supports cases where dynamic max is below the normal minimum", () => {
      expect(
        clampZoomPercent(75, {
          minPercent: 60,
          maxPercent: 60,
        }),
      ).toBe(60);
    });
  });
});
