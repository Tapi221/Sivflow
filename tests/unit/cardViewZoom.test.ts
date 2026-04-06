import {
  buildTypographyStyle,
  normalizeCardViewZoom,
  scaleTypographyNumberPx,
  scaleTypographyValuePx,
} from "@/components/card/common/cardViewZoom";
import { describe, expect, it } from "vitest";

describe("cardViewZoom", () => {
  it("normalizes invalid values to 1", () => {
    expect(normalizeCardViewZoom()).toBe(1);
    expect(normalizeCardViewZoom(Number.NaN)).toBe(1);
  });

  it("clamps zoom to safe bounds", () => {
    expect(normalizeCardViewZoom(0.01)).toBe(0.5);
    expect(normalizeCardViewZoom(10)).toBe(4);
  });

  it("scales typography values as px strings", () => {
    expect(scaleTypographyValuePx(16, 1)).toBe("16px");
    expect(scaleTypographyValuePx(16, 1.25)).toBe("20px");
    expect(scaleTypographyValuePx(24, 0.75)).toBe("18px");
  });

  it("scales ruled row sizes as numbers", () => {
    expect(scaleTypographyNumberPx(24, 1)).toBe(24);
    expect(scaleTypographyNumberPx(24, 1.25)).toBe(30);
    expect(scaleTypographyNumberPx(24, 0.5)).toBe(12);
  });

  it("builds typography style with scaled font size and line height", () => {
    expect(
      buildTypographyStyle({
        fontSizePx: 12,
        lineHeightPx: 18,
        zoom: 1.5,
      }),
    ).toEqual({
      fontSize: "18px",
      lineHeight: "27px",
    });
  });
});