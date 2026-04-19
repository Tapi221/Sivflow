import { describe, expect, it } from "vitest";

import {
  resolveCardScaleRenderingStrategy,
} from "@/components/card/frame/cardScaleRenderingStrategy";

describe("resolveCardScaleRenderingStrategy", () => {
  it("returns none when scaling is disabled", () => {
    const result = resolveCardScaleRenderingStrategy({
      disableScale: true,
      effectiveScale: 1.5,
      supportsCssZoom: true,
    });

    expect(result.mode).toBe("none");
    expect(result.zoom).toBeUndefined();
    expect(result.transform).toBe("none");
    expect(result.willChange).toBeUndefined();
  });

  it("prefers css zoom when supported so fixed card rendering stays sharp", () => {
    const result = resolveCardScaleRenderingStrategy({
      disableScale: false,
      effectiveScale: 1.35,
      supportsCssZoom: true,
    });

    expect(result.mode).toBe("zoom");
    expect(result.zoom).toBe(1.35);
    expect(result.transform).toBe("none");
    expect(result.willChange).toBeUndefined();
  });

  it("falls back to transform when css zoom is unavailable", () => {
    const result = resolveCardScaleRenderingStrategy({
      disableScale: false,
      effectiveScale: 1.35,
      supportsCssZoom: false,
    });

    expect(result.mode).toBe("transform");
    expect(result.zoom).toBeUndefined();
    expect(result.transform).toBe("scale(1.35)");
    expect(result.willChange).toBe("transform");
  });

  it("treats near-1 scales as no-op to avoid layout churn", () => {
    const result = resolveCardScaleRenderingStrategy({
      disableScale: false,
      effectiveScale: 1.00001,
      supportsCssZoom: true,
    });

    expect(result.mode).toBe("none");
  });
});
