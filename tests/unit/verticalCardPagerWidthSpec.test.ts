import { describe, expect, it } from "vitest";

import {
  buildVerticalCardPagerItemStyle,
  resolveVerticalCardPagerItemWidthSpec,
} from "@/features/review/verticalCardPagerWidthSpec";

describe("resolveVerticalCardPagerItemWidthSpec", () => {
  it("falls back to fixed width when no width strategy is provided", () => {
    const widthSpec = resolveVerticalCardPagerItemWidthSpec({
      card: { id: "card-1" },
      idx: 0,
      isActive: true,
      cardWidth: 480,
    });

    expect(widthSpec).toEqual({
      mode: "fixed",
      widthPx: 480,
    });
  });

  it("uses stretch mode when getCardWidthSpec returns stretch", () => {
    const widthSpec = resolveVerticalCardPagerItemWidthSpec({
      card: { id: "card-1" },
      idx: 0,
      isActive: false,
      cardWidth: 480,
      getCardWidthSpec: () => ({ mode: "stretch" }),
    });

    expect(widthSpec).toEqual({
      mode: "stretch",
    });
  });

  it("clamps fixed widths to at least 1px", () => {
    const widthSpec = resolveVerticalCardPagerItemWidthSpec({
      card: { id: "card-1" },
      idx: 0,
      isActive: false,
      cardWidth: 480,
      getCardWidthSpec: () => ({ mode: "fixed", widthPx: 0 }),
    });

    expect(widthSpec).toEqual({
      mode: "fixed",
      widthPx: 1,
    });
  });
});

describe("buildVerticalCardPagerItemStyle", () => {
  it("builds a fixed-width item style", () => {
    expect(
      buildVerticalCardPagerItemStyle({
        mode: "fixed",
        widthPx: 640,
      }),
    ).toEqual({
      width: 640,
      maxWidth: "100%",
      minWidth: 0,
      alignSelf: "center",
    });
  });

  it("builds a stretch-width item style", () => {
    expect(
      buildVerticalCardPagerItemStyle({
        mode: "stretch",
      }),
    ).toEqual({
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      alignSelf: "stretch",
    });
  });
});
