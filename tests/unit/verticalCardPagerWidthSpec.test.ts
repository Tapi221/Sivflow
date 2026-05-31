import { describe, expect, it } from "vitest";
import { buildVerticalCardPagerItemStyle, resolveVerticalCardPagerItemWidthSpec } from "@/features/review/verticalCardPagerWidthSpec";

describe("resolveVerticalCardPagerItemWidthSpec", () => {
  it("幅戦略が指定されていない場合は固定幅にフォールバックする", () => {
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

  it("getCardWidthSpec が stretch を返す場合は stretch mode を使用する", () => {
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

  it("固定幅を少なくとも 1px に clamp する", () => {
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
  it("固定幅 item style を構築する", () => {
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

  it("stretch 幅 item style を構築する", () => {
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
