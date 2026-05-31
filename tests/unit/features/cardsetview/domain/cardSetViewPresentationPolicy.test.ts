import { CANONICAL_CARD_WIDTH } from "@constants/shared/flashcard";
import { describe, expect, it } from "vitest";
import { resolvePresentationWidthPx, resolveSplitMinimumRequiredWidthPx, resolveZoomDefaultPercent, resolveZoomMinBaseWidthPx } from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";

describe("cardSetViewPresentationPolicy", () => {
  it("card layout 間で単一列 zoom floor を共有する", () => {
    expect(
      resolveZoomMinBaseWidthPx({
        cardLayoutMode: "flip",
      }),
    ).toBe(360);

    expect(
      resolveZoomMinBaseWidthPx({
        cardLayoutMode: "stack",
      }),
    ).toBe(360);

    expect(
      resolveZoomMinBaseWidthPx({
        cardLayoutMode: "split",
      }),
    ).toBe(360);
  });

  it("fluid mode では共有しきい値で split availability を維持する", () => {
    expect(
      resolveSplitMinimumRequiredWidthPx({
        displayMode: "fluid",
      }),
    ).toBe(784);
  });

  it("fixed mode では共有しきい値で split availability を維持する", () => {
    expect(
      resolveSplitMinimumRequiredWidthPx({
        displayMode: "fixed",
      }),
    ).toBe(808);
  });

  it("共有 zoom floor から split を解決できる", () => {
    expect(
      resolvePresentationWidthPx({
        zoomPercent: 0,
        cardLayoutMode: "split",
        maxPresentationWidthPx: 1200,
      }),
    ).toBe(360);
  });

  it("canonical width を描画するデフォルト zoom percent を解決する", () => {
    const zoomPercent = resolveZoomDefaultPercent({
      cardLayoutMode: "flip",
      maxPresentationWidthPx: 1360,
    });

    expect(zoomPercent).toBeCloseTo(12, 5);
    expect(
      resolvePresentationWidthPx({
        zoomPercent,
        cardLayoutMode: "flip",
        maxPresentationWidthPx: 1360,
      }),
    ).toBe(CANONICAL_CARD_WIDTH);
  });

  it("canonical width が収まらない場合はデフォルト zoom percent を clamp する", () => {
    const zoomPercent = resolveZoomDefaultPercent({
      cardLayoutMode: "flip",
      maxPresentationWidthPx: 440,
    });

    expect(zoomPercent).toBe(100);
  });
});
