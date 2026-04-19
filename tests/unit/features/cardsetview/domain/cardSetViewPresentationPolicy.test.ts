import { describe, expect, it } from "vitest";

import { CANONICAL_CARD_WIDTH } from "@constants/shared/flashcard";
import {
  resolvePresentationWidthPx,
  resolveSplitMinimumRequiredWidthPx,
  resolveZoomDefaultPercent,
  resolveZoomMinBaseWidthPx,
} from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";

describe("cardSetViewPresentationPolicy", () => {
  it("uses a shared single-column zoom floor across card layouts", () => {
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

  it("keeps split availability on a shared threshold in fluid mode", () => {
    expect(
      resolveSplitMinimumRequiredWidthPx({
        displayMode: "fluid",
      }),
    ).toBe(784);
  });

  it("keeps split availability on a shared threshold in fixed mode", () => {
    expect(
      resolveSplitMinimumRequiredWidthPx({
        displayMode: "fixed",
      }),
    ).toBe(808);
  });

  it("allows split to resolve from the shared zoom floor", () => {
    expect(
      resolvePresentationWidthPx({
        zoomPercent: 0,
        cardLayoutMode: "split",
        maxPresentationWidthPx: 1200,
      }),
    ).toBe(360);
  });

  it("resolves a default zoom percent that renders the canonical width", () => {
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

  it("clamps the default zoom percent when the canonical width does not fit", () => {
    const zoomPercent = resolveZoomDefaultPercent({
      cardLayoutMode: "flip",
      maxPresentationWidthPx: 440,
    });

    expect(zoomPercent).toBe(100);
  });
});
