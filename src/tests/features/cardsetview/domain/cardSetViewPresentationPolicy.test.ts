import { describe, expect, it } from "vitest";

import {
  resolvePresentationWidthPx,
  resolveSplitMinimumRequiredWidthPx,
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
});
