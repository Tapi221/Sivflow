import { describe, expect, it } from "vitest";

import { CANONICAL_CARD_WIDTH } from "@constants/shared/cardGeometry";
import {
  resolvePresentationWidthPx,
  resolveSplitMinimumRequiredWidthPx,
  resolveZoomDefaultPercent,
  resolveZoomMinBaseWidthPx,
} from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";

describe("cardSetViewPresentationPolicy", () => {
  it("uses the single-column zoom floor for split in view mode", () => {
    expect(
      resolveZoomMinBaseWidthPx({
        interactionMode: "view",
        cardLayoutMode: "split",
      }),
    ).toBe(360);
  });

  it("uses the single-column zoom floor for split in edit mode", () => {
    expect(
      resolveZoomMinBaseWidthPx({
        interactionMode: "edit",
        cardLayoutMode: "split",
      }),
    ).toBe(400);
  });

  it("keeps split availability on a dedicated threshold in fluid mode", () => {
    expect(
      resolveSplitMinimumRequiredWidthPx({
        interactionMode: "view",
        displayMode: "fluid",
      }),
    ).toBe(784);

    expect(
      resolveSplitMinimumRequiredWidthPx({
        interactionMode: "edit",
        displayMode: "fluid",
      }),
    ).toBe(864);
  });

  it("keeps split availability on a dedicated threshold in fixed mode", () => {
    expect(
      resolveSplitMinimumRequiredWidthPx({
        interactionMode: "view",
        displayMode: "fixed",
      }),
    ).toBe(808);

    expect(
      resolveSplitMinimumRequiredWidthPx({
        interactionMode: "edit",
        displayMode: "fixed",
      }),
    ).toBe(888);
  });

  it("allows split to resolve from the smaller zoom floor", () => {
    expect(
      resolvePresentationWidthPx({
        zoomPercent: 0,
        interactionMode: "view",
        cardLayoutMode: "split",
        maxPresentationWidthPx: 1200,
      }),
    ).toBe(360);
  });

  it("resolves a default zoom percent that renders the canonical width in view mode", () => {
    const zoomPercent = resolveZoomDefaultPercent({
      interactionMode: "view",
      cardLayoutMode: "flip",
      maxPresentationWidthPx: 1360,
    });

    expect(zoomPercent).toBeCloseTo(12, 5);
    expect(
      resolvePresentationWidthPx({
        zoomPercent,
        interactionMode: "view",
        cardLayoutMode: "flip",
        maxPresentationWidthPx: 1360,
      }),
    ).toBe(CANONICAL_CARD_WIDTH);
  });

  it("resolves a default zoom percent that renders the canonical width in edit mode", () => {
    const zoomPercent = resolveZoomDefaultPercent({
      interactionMode: "edit",
      cardLayoutMode: "flip",
      maxPresentationWidthPx: 1360,
    });

    expect(zoomPercent).toBeCloseTo(8.333333, 5);
    expect(
      resolvePresentationWidthPx({
        zoomPercent,
        interactionMode: "edit",
        cardLayoutMode: "flip",
        maxPresentationWidthPx: 1360,
      }),
    ).toBe(CANONICAL_CARD_WIDTH);
  });

  it("clamps the default zoom percent when the canonical width does not fit", () => {
    const zoomPercent = resolveZoomDefaultPercent({
      interactionMode: "view",
      cardLayoutMode: "flip",
      maxPresentationWidthPx: 440,
    });

    expect(zoomPercent).toBe(100);
  });
});
