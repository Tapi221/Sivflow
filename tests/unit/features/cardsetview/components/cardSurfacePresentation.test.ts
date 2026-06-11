import { describe, expect, it } from "vitest";
import { buildCardSurfaceMetrics, buildSharedCardSurfaceMetrics } from "@/features/cardsetview/presentation/web/ui/components/cardSurfacePresentation";

describe("cardSurfacePresentation", () => {
  it("fixed split で view と edit の geometry を同一に保つ", () => {
    const viewMetrics = buildCardSurfaceMetrics({ displayMode: "fixed", cardLayoutMode: "split", interactionMode: "view", zoomScale: 1.25, fitScale: 0.8, showInk: true });
    const editMetrics = buildCardSurfaceMetrics({ displayMode: "fixed", cardLayoutMode: "split", interactionMode: "edit", zoomScale: 1.25, fitScale: 0.8, showInk: false });
    expect(editMetrics.baseFixedScale).toBe(viewMetrics.baseFixedScale);
    expect(editMetrics.baseContentZoom).toBe(viewMetrics.baseContentZoom);
    expect(editMetrics.baseHeaderIconVisualScale).toBe(viewMetrics.baseHeaderIconVisualScale);
    expect(editMetrics.sideFixedScale).toBe(viewMetrics.sideFixedScale);
    expect(editMetrics.sideContentZoom).toBe(viewMetrics.sideContentZoom);
    expect(editMetrics.sideHeaderIconVisualScale).toBe(viewMetrics.sideHeaderIconVisualScale);
  });

  it("fluid split で view と edit の geometry を同一に保つ", () => {
    const viewMetrics = buildCardSurfaceMetrics({ displayMode: "fluid", cardLayoutMode: "split", interactionMode: "view", zoomScale: 1.4, fitScale: 0.7 });
    const editMetrics = buildCardSurfaceMetrics({ displayMode: "fluid", cardLayoutMode: "split", interactionMode: "edit", zoomScale: 1.4, fitScale: 0.7 });
    expect(editMetrics.baseFixedScale).toBe(viewMetrics.baseFixedScale);
    expect(editMetrics.baseContentZoom).toBe(viewMetrics.baseContentZoom);
    expect(editMetrics.baseHeaderIconVisualScale).toBe(viewMetrics.baseHeaderIconVisualScale);
    expect(editMetrics.sideFixedScale).toBe(viewMetrics.sideFixedScale);
    expect(editMetrics.sideContentZoom).toBe(viewMetrics.sideContentZoom);
    expect(editMetrics.sideHeaderIconVisualScale).toBe(viewMetrics.sideHeaderIconVisualScale);
  });

  it("fixed surface metrics に fitScale を適用する", () => {
    const metrics = buildCardSurfaceMetrics({ displayMode: "fixed", cardLayoutMode: "split", interactionMode: "edit", zoomScale: 1.5, fitScale: 0.5, showInk: false });
    expect(metrics.baseFixedScale).toBeCloseTo(0.75, 6);
    expect(metrics.baseHeaderIconVisualScale).toBeCloseTo(0.75, 6);
    expect(metrics.sideFixedScale).toBeCloseTo(0.375, 6);
    expect(metrics.sideHeaderIconVisualScale).toBeCloseTo(0.375, 6);
  });

  it("共有 helper の後方互換性を維持する", () => {
    const sharedMetrics = buildSharedCardSurfaceMetrics({ displayMode: "fixed", cardLayoutMode: "flip", zoomScale: 1.1 });
    const genericMetrics = buildCardSurfaceMetrics({ displayMode: "fixed", cardLayoutMode: "flip", interactionMode: "view", zoomScale: 1.1, fitScale: 1, showInk: true });
    expect(sharedMetrics.baseFixedScale).toBe(genericMetrics.baseFixedScale);
    expect(sharedMetrics.baseContentZoom).toBe(genericMetrics.baseContentZoom);
    expect(sharedMetrics.baseHeaderIconVisualScale).toBe(genericMetrics.baseHeaderIconVisualScale);
    expect(sharedMetrics.sideFixedScale).toBe(genericMetrics.sideFixedScale);
    expect(sharedMetrics.sideContentZoom).toBe(genericMetrics.sideContentZoom);
    expect(sharedMetrics.sideHeaderIconVisualScale).toBe(genericMetrics.sideHeaderIconVisualScale);
  });
});
